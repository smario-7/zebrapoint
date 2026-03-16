import time
import logging
from uuid import UUID

import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import SessionLocal
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.symptom_profile import SymptomProfile
from app.models.ml_pipeline_run import MlPipelineRun
from app.services.group_naming import generate_group_name, generate_group_color
from app.services.group_characteristics import update_group_characteristics

logger = logging.getLogger(__name__)

RETRAIN_EVERY_N = 10
MIN_PROFILES_START = 6
NOISE_SIMILARITY_THRESHOLD = 0.60


def should_retrain(db: Session) -> bool:
    """
    Sprawdza czy retrain jest potrzebny.
    Warunek: liczba nowych profili od ostatniego udanego run >= RETRAIN_EVERY_N.
    """
    total = db.query(SymptomProfile).count()

    if total < MIN_PROFILES_START:
        logger.debug(
            "Za mało profili do retrain: %s < %s",
            total, MIN_PROFILES_START
        )
        return False

    last_run = (
        db.query(MlPipelineRun)
        .filter(MlPipelineRun.status == "success")
        .order_by(MlPipelineRun.run_at.desc())
        .first()
    )

    if not last_run:
        logger.info("Pierwszy retrain — brak poprzednich run")
        return True

    new_count = (
        db.query(SymptomProfile)
        .filter(SymptomProfile.created_at > last_run.run_at)
        .count()
    )

    should = new_count >= RETRAIN_EVERY_N
    logger.info(
        "should_retrain: %s/%s nowych profili od %s → %s",
        new_count, RETRAIN_EVERY_N, last_run.run_at,
        "TAK" if should else "NIE"
    )
    return should


def run_pipeline(db: Session) -> dict:
    """
    Uruchamia pełny ML pipeline: embeddingi → HDBSCAN → mapowanie na grupy
    → soft assignment szumu → aktualizacja członkostw i centroidów → charakterystyki.
    """
    start_ms = int(time.time() * 1000)
    logger.info("=" * 60)
    logger.info("ML Pipeline START")

    try:
        profiles = (
            db.query(SymptomProfile)
            .filter(SymptomProfile.embedding.isnot(None))
            .all()
        )
        n_profiles = len(profiles)

        if n_profiles < MIN_PROFILES_START:
            logger.info(
                "Pipeline pominięty: %s < %s",
                n_profiles, MIN_PROFILES_START
            )
            _log_run(db, status="skipped", profiles_count=n_profiles)
            return {"status": "skipped", "reason": "za mało danych"}

        logger.info("Profili do klastrowania: %s", n_profiles)

        profile_ids = [str(p.id) for p in profiles]
        user_ids = [str(p.user_id) for p in profiles]
        embeddings = np.array(
            [list(p.embedding) if p.embedding is not None else [] for p in profiles],
            dtype=np.float32
        )
        if embeddings.size == 0 or embeddings.shape[1] != 384:
            _log_run(db, status="skipped", profiles_count=n_profiles)
            return {"status": "skipped", "reason": "brak poprawnych embeddingów"}

        labels = _run_hdbscan(embeddings)

        unique_cluster_ids = sorted(set(int(l) for l in labels) - {-1})
        noise_mask = labels == -1
        noise_count = int(noise_mask.sum())

        logger.info(
            "HDBSCAN: %s klastrów, %s szum (-1)",
            len(unique_cluster_ids), noise_count
        )

        cluster_to_group_id = _map_clusters_to_groups(
            db, labels, embeddings, unique_cluster_ids
        )

        if noise_count > 0:
            noise_assignments = _soft_assign_noise(
                db, embeddings, labels, noise_mask, cluster_to_group_id
            )
        else:
            noise_assignments = {}

        reassigned = _update_memberships(
            db, profiles, labels, cluster_to_group_id, noise_assignments
        )

        _update_centroids(db, labels, embeddings, cluster_to_group_id)

        active_group_ids = (
            list(cluster_to_group_id.values())
            + list(set(noise_assignments.values()))
        )
        for group_id in set(active_group_ids):
            update_group_characteristics(db, group_id)

        duration_ms = int(time.time() * 1000) - start_ms
        _log_run(
            db,
            status="success",
            profiles_count=n_profiles,
            clusters_found=len(unique_cluster_ids),
            noise_count=noise_count,
            reassigned=reassigned,
            duration_ms=duration_ms
        )

        result = {
            "status": "success",
            "profiles": n_profiles,
            "clusters": len(unique_cluster_ids),
            "noise": noise_count,
            "reassigned": reassigned,
            "duration_ms": duration_ms
        }
        logger.info("ML Pipeline zakończony: %s", result)
        logger.info("=" * 60)
        return result

    except Exception as exc:
        db.rollback()
        duration_ms = int(time.time() * 1000) - start_ms
        logger.error("ML Pipeline BŁĄD: %s", exc, exc_info=True)
        _log_run(
            db, status="error", error_message=str(exc), duration_ms=duration_ms
        )
        raise


def _run_hdbscan(embeddings: np.ndarray) -> np.ndarray:
    import hdbscan

    n = len(embeddings)
    min_cluster_size = 2 if n < 20 else 3

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=2,
        metric="euclidean",
        cluster_selection_method="eom",
        prediction_data=True,
        core_dist_n_jobs=1
    )
    labels = clusterer.fit_predict(embeddings)
    logger.info(
        "HDBSCAN parametry: min_cluster_size=%s, n_profiles=%s",
        min_cluster_size, n
    )
    return labels.astype(np.int32)


def _map_clusters_to_groups(
    db: Session,
    labels: np.ndarray,
    embeddings: np.ndarray,
    unique_cluster_ids: list[int]
) -> dict[int, str]:
    cluster_to_group: dict[int, str] = {}

    for cluster_id in unique_cluster_ids:
        mask = labels == cluster_id
        centroid = embeddings[mask].mean(axis=0).tolist()
        existing_group = _find_group_by_centroid(db, centroid)

        if existing_group:
            logger.debug(
                "Klaster %s → istniejąca grupa '%s' (%s)",
                cluster_id, existing_group.name, existing_group.id
            )
            cluster_to_group[cluster_id] = str(existing_group.id)
        else:
            import uuid as uuid_module
            group_id = uuid_module.uuid4()
            new_group = Group(
                id=group_id,
                name=generate_group_name(str(group_id)),
                accent_color=generate_group_color(str(group_id)),
                is_active=True,
                member_count=0
            )
            db.add(new_group)
            db.flush()
            logger.info(
                "Klaster %s → NOWA grupa '%s' (%s)",
                cluster_id, new_group.name, group_id
            )
            cluster_to_group[cluster_id] = str(group_id)

    return cluster_to_group


def _find_group_by_centroid(
    db: Session,
    centroid: list[float],
    threshold: float = 0.85
) -> Group | None:
    centroid_str = "[" + ",".join(f"{v:.8f}" for v in centroid) + "]"

    row = db.execute(text("""
        SELECT id,
               1 - (centroid <=> CAST(:c AS vector)) AS similarity
        FROM groups
        WHERE centroid IS NOT NULL
          AND is_active = TRUE
        ORDER BY centroid <=> CAST(:c AS vector)
        LIMIT 1
    """), {"c": centroid_str}).first()

    if row and float(row.similarity) >= threshold:
        return db.query(Group).filter(Group.id == row.id).first()
    return None


def _soft_assign_noise(
    db: Session,
    embeddings: np.ndarray,
    labels: np.ndarray,
    noise_mask: np.ndarray,
    cluster_to_group: dict[int, str]
) -> dict[int, str]:
    if not cluster_to_group:
        return {}

    noise_assignments: dict[int, str] = {}
    noise_indices = np.where(noise_mask)[0]

    cluster_centroids: dict[int, np.ndarray] = {}
    for cluster_id in cluster_to_group:
        mask = labels == cluster_id
        cluster_centroids[cluster_id] = embeddings[mask].mean(axis=0)

    for idx in noise_indices:
        emb = embeddings[idx]
        best_cluster_id = None
        best_similarity = -1.0

        for cluster_id, centroid in cluster_centroids.items():
            norm_emb = emb / (np.linalg.norm(emb) + 1e-8)
            norm_centroid = centroid / (np.linalg.norm(centroid) + 1e-8)
            similarity = float(np.dot(norm_emb, norm_centroid))

            if similarity > best_similarity:
                best_similarity = similarity
                best_cluster_id = cluster_id

        if (
            best_similarity >= NOISE_SIMILARITY_THRESHOLD
            and best_cluster_id is not None
        ):
            noise_assignments[int(idx)] = cluster_to_group[best_cluster_id]
            logger.debug(
                "Szum idx=%s → soft assign do klastra %s (similarity=%.3f)",
                idx, best_cluster_id, best_similarity
            )
        else:
            solo_group_id = _get_or_create_solo_group(db)
            noise_assignments[int(idx)] = solo_group_id
            logger.debug(
                "Szum idx=%s → solowa grupa (best_similarity=%.3f < %s)",
                idx, best_similarity, NOISE_SIMILARITY_THRESHOLD
            )

    return noise_assignments


def _get_or_create_solo_group(db: Session) -> str:
    import uuid as uuid_module

    solo = db.query(Group).filter(
        Group.name == "Oczekuje na dopasowanie",
        Group.is_active == True
    ).first()

    if solo:
        return str(solo.id)

    group_id = uuid_module.uuid4()
    solo = Group(
        id=group_id,
        name="Oczekuje na dopasowanie",
        accent_color="#94a3b8",
        is_active=True,
        member_count=0
    )
    db.add(solo)
    db.flush()
    return str(group_id)


def _update_memberships(
    db: Session,
    profiles: list[SymptomProfile],
    labels: np.ndarray,
    cluster_to_group: dict[int, str],
    noise_assignments: dict[int, str]
) -> int:
    reassigned = 0
    users_to_notify: list[tuple[str, str]] = []

    for idx, profile in enumerate(profiles):
        label = int(labels[idx])
        if label == -1:
            new_group_id = noise_assignments.get(idx)
        else:
            new_group_id = cluster_to_group.get(label)

        if not new_group_id:
            continue

        current_member = db.query(GroupMember).filter(
            GroupMember.user_id == profile.user_id
        ).first()

        old_group_id = str(current_member.group_id) if current_member else None

        if old_group_id == new_group_id:
            continue

        db.query(GroupMember).filter(
            GroupMember.user_id == profile.user_id
        ).delete()

        member = GroupMember(
            user_id=profile.user_id,
            group_id=UUID(new_group_id) if isinstance(new_group_id, str) else new_group_id
        )
        db.add(member)

        profile.group_id = (
            UUID(new_group_id) if isinstance(new_group_id, str) else new_group_id
        )
        reassigned += 1
        users_to_notify.append((str(profile.user_id), new_group_id))
        logger.debug("User %s: %s → %s", profile.user_id, old_group_id, new_group_id)

    _recalculate_member_counts(db)
    db.commit()

    _trigger_reassignment_notifications(users_to_notify)
    logger.info("Zaktualizowano przypisania: %s użytkowników przeniesiono", reassigned)
    return reassigned


def _recalculate_member_counts(db: Session) -> None:
    db.execute(text("""
        UPDATE groups g
        SET member_count = (
            SELECT COUNT(*)
            FROM group_members gm
            WHERE gm.group_id = g.id
        )
        WHERE g.is_active = TRUE
    """))


def _update_centroids(
    db: Session,
    labels: np.ndarray,
    embeddings: np.ndarray,
    cluster_to_group: dict[int, str]
) -> None:
    for cluster_id, group_id in cluster_to_group.items():
        mask = labels == cluster_id
        centroid = embeddings[mask].mean(axis=0).tolist()
        centroid_str = "[" + ",".join(f"{v:.8f}" for v in centroid) + "]"
        db.execute(text("""
            UPDATE groups
            SET centroid = CAST(:c AS vector)
            WHERE id = :gid
        """), {"c": centroid_str, "gid": group_id})


def _trigger_reassignment_notifications(
    users_to_notify: list[tuple[str, str]]
) -> None:
    if not users_to_notify:
        return
    try:
        from app.tasks.notification_tasks import notify_group_reassignment
        for user_id, group_id in users_to_notify:
            notify_group_reassignment.apply_async(
                args=[user_id, group_id],
                queue="notifications"
            )
        logger.info(
            "Zakolejkowano %s powiadomień o zmianie grupy",
            len(users_to_notify)
        )
    except Exception as e:
        logger.warning("Błąd kolejkowania powiadomień: %s", e)


def _log_run(
    db: Session,
    status: str,
    profiles_count: int = 0,
    clusters_found: int = 0,
    noise_count: int = 0,
    reassigned: int = 0,
    duration_ms: int | None = None,
    error_message: str | None = None
) -> None:
    run = MlPipelineRun(
        profiles_count=profiles_count,
        clusters_found=clusters_found,
        noise_count=noise_count,
        reassigned=reassigned,
        duration_ms=duration_ms,
        status=status,
        error_message=error_message
    )
    db.add(run)
    db.commit()
