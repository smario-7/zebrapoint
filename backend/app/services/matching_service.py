import logging
from dataclasses import dataclass
import uuid as uuid_module
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.symptom_profile import SymptomProfile
from app.services.group_naming import generate_group_name, generate_group_color
from app.services.group_characteristics import update_group_characteristics

logger = logging.getLogger(__name__)


class GroupAssignConflict(ValueError):
    """Konflikt integralności przy zapisie group_members (np. duplikat klucza)."""


SIMILARITY_THRESHOLD = 0.72
TOP_K = 5
TOP_K_CANDIDATES = 3


@dataclass
class GroupMatch:
    """Jedna propozycja grupy w TOP 3 dopasowań."""
    group_id: str
    name: str
    accent_color: str
    score: float
    score_pct: int
    member_count: int
    avg_match_score: float | None
    keywords: list[str]
    age_range: str | None
    symptom_category: str | None
    ai_description: str | None
    admin_note: str | None
    is_new_group: bool


def find_matching_group(
    db: Session,
    embedding: list[float],
    user_id: UUID
) -> dict:
    """
    Główna funkcja matchingu.
    Szuka najbardziej pasującej grupy dla nowego opisu objawów.

    Returns:
        {
            "group_id": str,
            "score": float,
            "is_new": bool,
            "group_name": str
        }
    """

    embedding_literal = _format_embedding(embedding)

    similar_profiles = _query_similar_profiles(
        db, embedding_literal, user_id, TOP_K
    )

    if not similar_profiles:
        logger.info(f"Brak podobnych profili w bazie — tworzę nową grupę dla user {user_id}")
        new_group = _create_new_group(db)
        return _build_match_response(new_group, 0.0, True)

    best = similar_profiles[0]
    best_score = float(best.similarity)

    logger.info(f"Najlepsze dopasowanie: score={best_score:.4f}, group_id={best.group_id}")

    if best_score < SIMILARITY_THRESHOLD:
        logger.info(f"Score {best_score:.4f} < threshold {SIMILARITY_THRESHOLD} — nowa grupa")
        new_group = _create_new_group(db)
        return _build_match_response(new_group, 0.0, True)

    group = db.query(Group).filter(Group.id == best.group_id).first()
    if not group or not group.is_active:
        new_group = _create_new_group(db)
        return _build_match_response(new_group, 0.0, True)

    logger.info(f"Dopasowano do grupy '{group.name}' (score={best_score:.4f})")
    return _build_match_response(group, best_score, False)


def add_user_to_group(
    db: Session,
    user_id: UUID,
    group_id: UUID
) -> None:
    """
    Dodaje użytkownika do grupy.
    Używa merge() żeby uniknąć duplikatów w group_members.
    Inkrementuje licznik członków grupy.
    """
    if isinstance(user_id, str):
        user_id = UUID(user_id)
    if isinstance(group_id, str):
        group_id = UUID(group_id)

    existing = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id
    ).first()

    if existing:
        logger.info(f"User {user_id} już jest w grupie {group_id}")
        return

    member = GroupMember(user_id=user_id, group_id=group_id)
    db.add(member)

    db.query(Group).filter(Group.id == group_id).update(
        {Group.member_count: Group.member_count + 1}
    )

    logger.info("Dodano user %s do grupy %s", user_id, group_id)


def _format_embedding(embedding: list[float]) -> str:
    """Formatuje listę floatów do formatu pgvector: '[0.1,0.2,...]'"""
    return "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"


def _query_similar_profiles(
    db: Session,
    embedding_literal: str,
    user_id: UUID,
    top_k: int
):
    """
    Zapytanie pgvector — TOP-K najbliższych sąsiadów.
    Operator <=> to cosine distance (0 = identyczne, 2 = przeciwne).
    Konwertujemy na similarity: 1 - distance.
    """
    result = db.execute(text("""
        SELECT
            sp.id          AS profile_id,
            sp.group_id,
            sp.user_id,
            1 - (sp.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM symptom_profiles sp
        WHERE sp.user_id   != :user_id
          AND sp.group_id  IS NOT NULL
          AND sp.embedding IS NOT NULL
        ORDER BY sp.embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
    """), {
        "embedding": embedding_literal,
        "user_id": str(user_id),
        "top_k": top_k
    })

    return result.fetchall()


def _create_new_group(db: Session) -> Group:
    """Tworzy nową grupę z deterministyczną nazwą i kolorem."""
    group_id = uuid_module.uuid4()
    group = Group(
        id=group_id,
        name=generate_group_name(str(group_id)),
        accent_color=generate_group_color(str(group_id)),
        description="Grupa tymczasowa. Zostanie uzupełniona przy retrain.",
        is_active=True,
        member_count=0
    )
    db.add(group)
    db.flush()

    logger.info("Utworzono nową grupę: %s", group.id)
    return group


def _build_match_response(group: Group, score: float, is_new: bool) -> dict:
    return {
        "group_id": str(group.id),
        "score": score,
        "is_new": is_new,
        "group_name": group.name,
    }


def find_top_matches(
    db: Session,
    embedding: list[float],
    exclude_user_id: str | None = None,
    top_k: int = TOP_K_CANDIDATES
) -> list[GroupMatch]:
    """
    Zwraca TOP K grup najbardziej pasujących do embeddingu.
    Używane w drawerze zarządzania grupą i po aktualizacji opisu.
    """
    embedding_str = _format_embedding(embedding)
    base_query = """
        SELECT
            sp.group_id,
            1 - (sp.embedding <=> CAST(:emb AS vector)) AS similarity
        FROM symptom_profiles sp
        WHERE sp.embedding IS NOT NULL
          AND sp.group_id IS NOT NULL
        ORDER BY sp.embedding <=> CAST(:emb AS vector)
        LIMIT 50
    """
    if exclude_user_id:
        rows = db.execute(
            text(
                base_query.replace(
                    "ORDER BY",
                    "AND sp.user_id != :exclude_user_id\n        ORDER BY",
                )
            ),
            {"emb": embedding_str, "exclude_user_id": exclude_user_id},
        ).fetchall()
    else:
        rows = db.execute(text(base_query), {"emb": embedding_str}).fetchall()

    best_per_group: dict[str, float] = {}
    for row in rows:
        gid = str(row.group_id)
        score = float(row.similarity)
        if gid not in best_per_group or score > best_per_group[gid]:
            best_per_group[gid] = score

    top_groups = sorted(best_per_group.items(), key=lambda x: -x[1])[:top_k]
    results: list[GroupMatch] = []
    group_ids = [group_id for group_id, _ in top_groups]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    groups_by_id = {str(group.id): group for group in groups}

    for group_id, score in top_groups:
        group = groups_by_id.get(group_id)
        if not group or not group.is_active:
            continue
        results.append(GroupMatch(
            group_id=str(group.id),
            name=group.name,
            accent_color=group.accent_color or "#0d9488",
            score=round(score, 3),
            score_pct=int(score * 100),
            member_count=group.member_count or 0,
            avg_match_score=group.avg_match_score,
            keywords=group.keywords or [],
            age_range=group.age_range,
            symptom_category=group.symptom_category,
            ai_description=group.ai_description,
            admin_note=group.admin_note,
            is_new_group=False
        ))

    return results


def merge_current_group_into_matches(
    db: Session,
    profile: SymptomProfile,
    matches: list[GroupMatch],
) -> list[GroupMatch]:
    """
    Wstawia bieżącą grupę użytkownika na początek listy, jeśli find_top_matches jej nie zwrócił
    (w zapytaniu pomijany jest własny wiersz symptom_profiles — przy jednym członku grupa znika z TOP).
    Gdy grupa już jest w wynikach, przenosi ją na początek.
    """
    if not profile or not profile.group_id:
        return matches
    gid = str(profile.group_id)
    same = [m for m in matches if m.group_id == gid]
    rest = [m for m in matches if m.group_id != gid]
    if same:
        return same + rest
    group = db.query(Group).filter(Group.id == profile.group_id).first()
    if not group or not group.is_active:
        return matches
    score_raw = float(profile.match_score) if profile.match_score is not None else 0.0
    score_pct = min(100, max(0, int(round(score_raw * 100))))
    current = GroupMatch(
        group_id=gid,
        name=group.name,
        accent_color=group.accent_color or "#0d9488",
        score=round(score_raw, 3),
        score_pct=score_pct,
        member_count=group.member_count or 0,
        avg_match_score=group.avg_match_score,
        keywords=group.keywords or [],
        age_range=group.age_range,
        symptom_category=group.symptom_category,
        ai_description=group.ai_description,
        admin_note=group.admin_note,
        is_new_group=False,
    )
    return [current] + matches


def _build_new_group_match() -> GroupMatch:
    """Placeholder dla nowej grupy — zostanie utworzona przy wyborze."""
    import uuid as uuid_module
    fake_id = str(uuid_module.uuid4())
    return GroupMatch(
        group_id="__new__",
        name=generate_group_name(fake_id),
        accent_color=generate_group_color(fake_id),
        score=0.0,
        score_pct=0,
        member_count=0,
        avg_match_score=None,
        keywords=[],
        age_range=None,
        symptom_category=None,
        ai_description=None,
        admin_note=None,
        is_new_group=True
    )


def assign_user_to_group(
    db: Session,
    user_id: str,
    group_id: str,
    profile_id: str,
    match_score: float
) -> Group:
    """
    Przypisuje użytkownika do wybranej grupy (zmiana grupy).
    Usuwa z poprzedniej grupy, dodaje do nowej, aktualizuje profil i liczniki.
    """
    uid = UUID(user_id) if isinstance(user_id, str) else user_id

    try:
        profile_uuid = UUID(str(profile_id))
    except ValueError as exc:
        raise ValueError("Nieprawidłowy identyfikator profilu") from exc

    if group_id == "__new__":
        group = _create_new_group(db)
        group_id = str(group.id)
    else:
        try:
            target_gid = UUID(str(group_id))
        except ValueError as exc:
            raise ValueError(f"Nieprawidłowy identyfikator grupy: {group_id}") from exc
        group = db.query(Group).filter(Group.id == target_gid).first()
        if not group:
            raise ValueError(f"Grupa {group_id} nie istnieje")

    old_memberships = (
        db.query(GroupMember).filter(GroupMember.user_id == uid).all()
    )
    for om in old_memberships:
        og = db.query(Group).filter(Group.id == om.group_id).first()
        if og and (og.member_count or 0) > 0:
            db.query(Group).filter(Group.id == om.group_id).update(
                {Group.member_count: Group.member_count - 1}
            )
    db.query(GroupMember).filter(GroupMember.user_id == uid).delete()

    gid_uuid = UUID(str(group_id)) if isinstance(group_id, str) else group_id
    db.add(GroupMember(user_id=uid, group_id=gid_uuid))
    db.query(Group).filter(Group.id == gid_uuid).update(
        {Group.member_count: Group.member_count + 1}
    )

    profile = db.query(SymptomProfile).filter(
        SymptomProfile.id == profile_uuid,
        SymptomProfile.user_id == uid
    ).first()
    if profile:
        profile.group_id = gid_uuid
        profile.match_score = match_score

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.warning("IntegrityError przy zmianie grupy user=%s: %s", uid, exc)
        raise GroupAssignConflict(
            "Nie udało się zapisać członkostwa w grupie. Odśwież stronę i spróbuj ponownie."
        ) from exc

    db.refresh(group)

    try:
        update_group_characteristics(db, str(group.id))
    except Exception:
        logger.exception(
            "update_group_characteristics po zmianie grupy — pomijam, przypisanie zapisane"
        )

    return group
