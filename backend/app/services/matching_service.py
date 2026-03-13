import logging
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.symptom_profile import SymptomProfile

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.72
TOP_K = 5


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
        return _create_new_group(db)

    best = similar_profiles[0]
    best_score = float(best.similarity)

    logger.info(f"Najlepsze dopasowanie: score={best_score:.4f}, group_id={best.group_id}")

    if best_score < SIMILARITY_THRESHOLD:
        logger.info(f"Score {best_score:.4f} < threshold {SIMILARITY_THRESHOLD} — nowa grupa")
        return _create_new_group(db)

    group = db.query(Group).filter(Group.id == best.group_id).first()
    if not group or not group.is_active:
        return _create_new_group(db)

    logger.info(f"Dopasowano do grupy '{group.name}' (score={best_score:.4f})")
    return {
        "group_id": str(group.id),
        "score": best_score,
        "is_new": False,
        "group_name": group.name
    }


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

    logger.info(f"Dodano user {user_id} do grupy {group_id}")


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


def _create_new_group(db: Session) -> dict:
    """Tworzy nową, pustą grupę (tymczasową)."""
    group = Group(
        name="Nowa grupa — oczekuje na dopasowania",
        description="Grupa tymczasowa. Zostanie nazwana gdy zbierze więcej członków.",
        is_active=True,
        member_count=0
    )
    db.add(group)
    db.flush()

    logger.info(f"Utworzono nową grupę: {group.id}")
    return {
        "group_id": str(group.id),
        "score": 0.0,
        "is_new": True,
        "group_name": group.name
    }
