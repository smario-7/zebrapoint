from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.database import get_db
from app.models.group import Group
from app.models.post import Post
from app.models.user import User
from app.schemas.moderation import GroupNoteUpdate, PostModerationUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/groups")
def list_all_groups(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista wszystkich aktywnych grup z charakterystykami."""
    groups = db.query(Group).filter(Group.is_active.is_(True)).order_by(Group.member_count.desc()).all()
    return [
        {
            "id": str(group.id),
            "name": group.name,
            "member_count": group.member_count,
            "keywords": group.keywords,
            "symptom_category": group.symptom_category,
            "age_range": group.age_range,
            "avg_match_score": group.avg_match_score,
            "admin_note": group.admin_note,
            "accent_color": group.accent_color,
            "ai_description": group.ai_description,
        }
        for group in groups
    ]


@router.patch("/groups/{group_id}/note")
def update_group_note(
    group_id: str,
    data: GroupNoteUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin dodaje lub aktualizuje notę do grupy."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupa nie istnieje")

    group.admin_note = data.admin_note
    group.admin_note_by = admin.id
    group.admin_note_at = datetime.now(timezone.utc)
    db.commit()
    return {"group_id": group_id, "admin_note": group.admin_note}


@router.patch("/posts/{post_id}/moderate")
def moderate_post(
    post_id: str,
    data: PostModerationUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin może:
    - Przypiąć post (is_pinned=True) — pojawi się na górze listy
    - Zablokować post (is_locked=True) — brak nowych komentarzy
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post nie istnieje")

    if data.is_pinned is not None:
        post.is_pinned = data.is_pinned
    if data.is_locked is not None:
        post.is_locked = data.is_locked

    db.commit()
    return {"post_id": post_id, "is_pinned": post.is_pinned, "is_locked": post.is_locked}
