from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from app.database import get_db
from app.auth.dependencies import get_current_active_user
from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment
from app.models.reaction import Reaction
from app.models.group_member import GroupMember
from app.schemas.forum import (
    PostCreate, PostUpdate, PostOut, PostDetail,
    CommentCreate, CommentUpdate, CommentOut,
    ReactionToggle, ReactionOut,
)

router = APIRouter(prefix="/groups", tags=["Forum"])


def _require_membership(db: Session, user_id: UUID, group_id: UUID) -> None:
    member = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id
    ).first()
    if not member:
        raise HTTPException(
            status_code=403,
            detail="Nie jesteś członkiem tej grupy"
        )


def _get_reactions_summary(
    db: Session,
    target_type: str,
    target_ids: list[UUID]
) -> dict[UUID, dict]:
    if not target_ids:
        return {}

    rows = db.query(
        Reaction.target_id,
        Reaction.emoji,
        func.count(Reaction.id).label("cnt")
    ).filter(
        Reaction.target_type == target_type,
        Reaction.target_id.in_(target_ids)
    ).group_by(
        Reaction.target_id,
        Reaction.emoji
    ).all()

    result: dict[UUID, dict] = {}
    for row in rows:
        tid = row.target_id
        if tid not in result:
            result[tid] = {}
        result[tid][row.emoji] = row.cnt

    return result


def _get_user_reactions(
    db: Session,
    user_id: UUID,
    target_type: str,
    target_ids: list[UUID]
) -> dict[UUID, str]:
    if not target_ids:
        return {}

    rows = db.query(
        Reaction.target_id,
        Reaction.emoji
    ).filter(
        Reaction.user_id == user_id,
        Reaction.target_type == target_type,
        Reaction.target_id.in_(target_ids)
    ).all()

    return {row.target_id: row.emoji for row in rows}


def _serialize_post(
    post: Post,
    comment_count: int,
    reactions_summary: dict,
    user_reaction: str | None = None
) -> PostOut:
    return PostOut(
        id=post.id,
        group_id=post.group_id,
        user_id=post.user_id,
        display_name=post.user.display_name if post.user else "",
        title=post.title,
        is_pinned=post.is_pinned,
        is_locked=post.is_locked,
        views=post.views,
        comment_count=comment_count,
        reactions_summary=reactions_summary,
        created_at=post.created_at,
        updated_at=post.updated_at
    )


@router.get(
    "/{group_id}/posts",
    response_model=list[PostOut],
    summary="Lista postów grupy"
)
def list_posts(
    group_id:     UUID,
    page:         int = Query(default=1, ge=1),
    limit:        int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db:           Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)
    offset = (page - 1) * limit

    posts = (
        db.query(Post)
        .filter(Post.group_id == group_id)
        .order_by(Post.is_pinned.desc(), Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    if not posts:
        return []

    post_ids = [p.id for p in posts]

    comment_counts_rows = db.query(
        Comment.post_id,
        func.count(Comment.id).label("cnt")
    ).filter(
        Comment.post_id.in_(post_ids)
    ).group_by(Comment.post_id).all()

    comment_counts = {row.post_id: row.cnt for row in comment_counts_rows}

    reactions   = _get_reactions_summary(db, "post", post_ids)
    user_reacts = _get_user_reactions(db, current_user.id, "post", post_ids)

    return [
        _serialize_post(
            post=p,
            comment_count=comment_counts.get(p.id, 0),
            reactions_summary=reactions.get(p.id, {}),
            user_reaction=user_reacts.get(p.id)
        )
        for p in posts
    ]


@router.post(
    "/{group_id}/posts",
    response_model=PostOut,
    status_code=status.HTTP_201_CREATED,
    summary="Utwórz nowy post"
)
def create_post(
    group_id:     UUID,
    data:         PostCreate,
    current_user: User = Depends(get_current_active_user),
    db:           Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    post = Post(
        group_id=group_id,
        user_id=current_user.id,
        title=data.title,
        content=data.content
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    try:
        from app.tasks.notification_tasks import notify_new_post
        notify_new_post.apply_async(args=[str(post.id)], queue="notifications")
    except Exception:
        pass

    return _serialize_post(
        post=post,
        comment_count=0,
        reactions_summary={}
    )


@router.get(
    "/{group_id}/posts/{post_id}",
    response_model=PostDetail,
    summary="Szczegóły posta z komentarzami"
)
def get_post(
    group_id:     UUID,
    post_id:      UUID,
    current_user: User = Depends(get_current_active_user),
    db:           Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    post = db.query(Post).filter(
        Post.id == post_id,
        Post.group_id == group_id
    ).first()

    if not post:
        raise HTTPException(404, "Post nie istnieje")

    db.query(Post).filter(Post.id == post_id).update(
        {"views": Post.views + 1}
    )
    db.commit()
    db.refresh(post)

    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    comment_ids    = [c.id for c in comments]
    post_reactions = _get_reactions_summary(db, "post",    [post_id])
    comm_reactions = _get_reactions_summary(db, "comment", comment_ids)
    user_post_react  = _get_user_reactions(db, current_user.id, "post",    [post_id])
    user_comm_react  = _get_user_reactions(db, current_user.id, "comment", comment_ids)

    comments_out = [
        CommentOut(
            id=c.id,
            post_id=c.post_id,
            user_id=c.user_id,
            display_name=c.user.display_name if c.user else "",
            content=c.content,
            reactions_summary=comm_reactions.get(c.id, {}),
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in comments
    ]

    return PostDetail(
        id=post.id,
        group_id=post.group_id,
        user_id=post.user_id,
        display_name=post.user.display_name if post.user else "",
        title=post.title,
        content=post.content,
        is_pinned=post.is_pinned,
        is_locked=post.is_locked,
        views=post.views,
        comment_count=len(comments),
        reactions_summary=post_reactions.get(post_id, {}),
        created_at=post.created_at,
        updated_at=post.updated_at,
        comments=comments_out
    )


@router.patch(
    "/{group_id}/posts/{post_id}",
    response_model=PostOut,
    summary="Edytuj post"
)
def update_post(
    group_id:     UUID,
    post_id:      UUID,
    data:         PostUpdate,
    current_user: User = Depends(get_current_active_user),
    db:           Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    post = db.query(Post).filter(
        Post.id == post_id,
        Post.group_id == group_id
    ).first()

    if not post:
        raise HTTPException(404, "Post nie istnieje")
    if post.user_id != current_user.id and \
       getattr(current_user, "role", None) != "admin":
        raise HTTPException(403, "Możesz edytować tylko swoje posty")
    if post.is_locked:
        raise HTTPException(423, "Post jest zablokowany")

    if data.title is not None:
        post.title = data.title
    if data.content is not None:
        post.content = data.content

    db.commit()
    db.refresh(post)

    comment_count = db.query(func.count(Comment.id)).filter(
        Comment.post_id == post_id
    ).scalar() or 0

    return _serialize_post(post, comment_count, {})


@router.delete(
    "/{group_id}/posts/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Usuń post"
)
def delete_post(
    group_id:     UUID,
    post_id:      UUID,
    current_user: User = Depends(get_current_active_user),
    db:           Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    post = db.query(Post).filter(
        Post.id == post_id,
        Post.group_id == group_id
    ).first()

    if not post:
        raise HTTPException(404, "Post nie istnieje")
    if post.user_id != current_user.id and \
       getattr(current_user, "role", None) != "admin":
        raise HTTPException(403, "Możesz usunąć tylko swoje posty")

    db.delete(post)
    db.commit()


@router.post(
    "/{group_id}/posts/{post_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Dodaj komentarz"
)
def create_comment(
    group_id:     UUID,
    post_id:      UUID,
    data:         CommentCreate,
    current_user: User = Depends(get_current_active_user),
    db:           Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    post = db.query(Post).filter(
        Post.id == post_id,
        Post.group_id == group_id
    ).first()
    if not post:
        raise HTTPException(404, "Post nie istnieje")
    if post.is_locked:
        raise HTTPException(423, "Post jest zablokowany — komentowanie wyłączone")

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=data.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        display_name=current_user.display_name,
        content=comment.content,
        reactions_summary={},
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


@router.patch(
    "/{group_id}/posts/{post_id}/comments/{comment_id}",
    response_model=CommentOut,
    summary="Edytuj komentarz"
)
def update_comment(
    group_id:   UUID,
    post_id:    UUID,
    comment_id: UUID,
    data:       CommentUpdate,
    current_user: User = Depends(get_current_active_user),
    db:         Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.post_id == post_id
    ).first()

    if not comment:
        raise HTTPException(404, "Komentarz nie istnieje")
    if comment.user_id != current_user.id:
        raise HTTPException(403, "Możesz edytować tylko swoje komentarze")

    comment.content = data.content
    db.commit()
    db.refresh(comment)

    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        display_name=comment.user.display_name if comment.user else "",
        content=comment.content,
        reactions_summary={},
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


@router.delete(
    "/{group_id}/posts/{post_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Usuń komentarz"
)
def delete_comment(
    group_id:   UUID,
    post_id:    UUID,
    comment_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db:         Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.post_id == post_id
    ).first()

    if not comment:
        raise HTTPException(404, "Komentarz nie istnieje")
    if comment.user_id != current_user.id and \
       getattr(current_user, "role", None) != "admin":
        raise HTTPException(403, "Możesz usunąć tylko swoje komentarze")

    db.delete(comment)
    db.commit()


@router.post(
    "/{group_id}/posts/{post_id}/reactions",
    response_model=ReactionOut,
    summary="Toggle reakcji na post"
)
def toggle_post_reaction(
    group_id: UUID,
    post_id:  UUID,
    data:     ReactionToggle,
    current_user: User = Depends(get_current_active_user),
    db:       Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    post = db.query(Post).filter(
        Post.id == post_id, Post.group_id == group_id
    ).first()
    if not post:
        raise HTTPException(404, "Post nie istnieje")

    return _toggle_reaction(db, current_user.id, "post", post_id, data.emoji)


@router.post(
    "/{group_id}/posts/{post_id}/comments/{comment_id}/reactions",
    response_model=ReactionOut,
    summary="Toggle reakcji na komentarz"
)
def toggle_comment_reaction(
    group_id:   UUID,
    post_id:    UUID,
    comment_id: UUID,
    data:       ReactionToggle,
    current_user: User = Depends(get_current_active_user),
    db:         Session = Depends(get_db)
):
    _require_membership(db, current_user.id, group_id)

    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.post_id == post_id
    ).first()
    if not comment:
        raise HTTPException(404, "Komentarz nie istnieje")

    return _toggle_reaction(db, current_user.id, "comment", comment_id, data.emoji)


def _toggle_reaction(
    db:          Session,
    user_id:     UUID,
    target_type: str,
    target_id:   UUID,
    emoji:       str
) -> ReactionOut:
    existing = db.query(Reaction).filter(
        Reaction.user_id    == user_id,
        Reaction.target_type == target_type,
        Reaction.target_id  == target_id
    ).first()

    if existing:
        if existing.emoji == emoji:
            db.delete(existing)
        else:
            existing.emoji = emoji
    else:
        db.add(Reaction(
            user_id=user_id,
            target_type=target_type,
            target_id=target_id,
            emoji=emoji
        ))

    db.commit()

    summary_rows = db.query(
        Reaction.emoji,
        func.count(Reaction.id).label("cnt")
    ).filter(
        Reaction.target_type == target_type,
        Reaction.target_id   == target_id
    ).group_by(Reaction.emoji).all()

    reactions_summary = {row.emoji: row.cnt for row in summary_rows}

    user_reaction_row = db.query(Reaction.emoji).filter(
        Reaction.user_id    == user_id,
        Reaction.target_type == target_type,
        Reaction.target_id  == target_id
    ).first()

    return ReactionOut(
        target_type=target_type,
        target_id=target_id,
        reactions_summary=reactions_summary,
        user_reaction=user_reaction_row.emoji if user_reaction_row else None
    )
