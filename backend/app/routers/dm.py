from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.database import get_db
from app.models.dm_conversation import DmConversation, DmMessage
from app.models.user import User

router = APIRouter(prefix="/dm", tags=["Direct Messages"])

MAX_MESSAGE_LENGTH = 2000


# ── Schemas ───────────────────────────────────────────────────────


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    other_user_id: UUID
    other_user_nick: str
    last_message_at: datetime
    last_message_text: str | None
    unread_count: int


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sender_id: UUID
    sender_nick: str
    content: str
    message_type: str
    image_url: str | None
    is_read: bool
    created_at: datetime


class SendMessageRequest(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Wiadomość nie może być pusta")
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f"Wiadomość max {MAX_MESSAGE_LENGTH} znaków")
        return v


# ── Helpers ───────────────────────────────────────────────────────


def _get_or_create_conversation(
    db: Session,
    user_a_id: UUID,
    user_b_id: UUID,
) -> DmConversation:
    """
    Pobiera istniejącą konwersację lub tworzy nową.
    Zawsze przechowuje user_a_id < user_b_id (sortowanie po stringu UUID).
    """
    a, b = sorted([str(user_a_id), str(user_b_id)])
    id_a, id_b = UUID(a), UUID(b)

    conv = (
        db.query(DmConversation)
        .filter(
            DmConversation.user_a_id == id_a,
            DmConversation.user_b_id == id_b,
        )
        .first()
    )

    if not conv:
        conv = DmConversation(user_a_id=id_a, user_b_id=id_b)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    return conv


def _serialize_conversation(
    conv: DmConversation,
    current_user_id: UUID,
) -> ConversationOut:
    """Serializuje konwersację z perspektywy current_user."""
    is_user_a = str(conv.user_a_id) == str(current_user_id)
    other_user = conv.user_b if is_user_a else conv.user_a
    unread = conv.unread_count_a if is_user_a else conv.unread_count_b

    return ConversationOut(
        id=conv.id,
        other_user_id=other_user.id,
        other_user_nick=str(other_user.display_name or "Użytkownik"),
        last_message_at=conv.last_message_at,
        last_message_text=conv.last_message_text,
        unread_count=unread,
    )


# ── Endpointy ─────────────────────────────────────────────────────


@router.get(
    "/conversations",
    response_model=list[ConversationOut],
    summary="Lista konwersacji current_user",
)
def list_conversations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Zwraca wszystkie konwersacje użytkownika posortowane
    od najnowszej wiadomości.
    """
    conversations = (
        db.query(DmConversation)
        .filter(
            or_(
                DmConversation.user_a_id == current_user.id,
                DmConversation.user_b_id == current_user.id,
            )
        )
        .order_by(DmConversation.last_message_at.desc())
        .all()
    )

    return [_serialize_conversation(conv, current_user.id) for conv in conversations]


@router.get(
    "/conversations/unread-count",
    summary="Łączna liczba nieprzeczytanych DM",
)
def get_total_unread(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Używane w navbar do pokazania badge z liczbą nieprzeczytanych."""
    total = (
        db.query(
            func.coalesce(
                func.sum(
                    case(
                        (DmConversation.user_a_id == current_user.id, DmConversation.unread_count_a),
                        else_=0,
                    )
                    + case(
                        (DmConversation.user_b_id == current_user.id, DmConversation.unread_count_b),
                        else_=0,
                    )
                ),
                0,
            )
        )
        .scalar()
    )
    return {"unread_count": int(total or 0)}


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageOut],
    summary="Historia wiadomości w konwersacji",
)
def get_messages(
    conversation_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    before_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Historia wiadomości. Obsługuje cursor-based pagination (before_id).
    Przy pobraniu automatycznie oznacza wiadomości jako przeczytane.
    """
    conv = (
        db.query(DmConversation)
        .filter(
            DmConversation.id == conversation_id,
            or_(
                DmConversation.user_a_id == current_user.id,
                DmConversation.user_b_id == current_user.id,
            ),
        )
        .first()
    )

    if not conv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Konwersacja nie istnieje")

    query = db.query(DmMessage).filter(DmMessage.conversation_id == conversation_id)

    if before_id:
        try:
            pivot = (
                db.query(DmMessage)
                .filter(DmMessage.id == before_id)
                .first()
            )
            if pivot:
                query = query.filter(DmMessage.created_at < pivot.created_at)
        except (ValueError, TypeError):
            pass

    messages = (
        query.order_by(DmMessage.created_at.desc()).limit(limit).all()
    )
    messages = list(reversed(messages))

    db.query(DmMessage).filter(
        DmMessage.conversation_id == conversation_id,
        DmMessage.sender_id != current_user.id,
        DmMessage.is_read.is_(False),
    ).update({"is_read": True}, synchronize_session=False)

    is_user_a = str(conv.user_a_id) == str(current_user.id)
    if is_user_a:
        conv.unread_count_a = 0
    else:
        conv.unread_count_b = 0

    db.commit()

    return [
        MessageOut(
            id=m.id,
            sender_id=m.sender_id,
            sender_nick=str((m.sender.display_name if m.sender else None) or "Użytkownik"),
            content=m.content,
            message_type=m.message_type or "text",
            image_url=m.image_url,
            is_read=m.is_read,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Wyślij wiadomość (REST — fallback gdy WS niedostępny)",
)
def send_message_rest(
    conversation_id: UUID,
    data: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    REST fallback do wysyłania wiadomości.
    Główna ścieżka to WebSocket — ten endpoint jest backup.
    """
    conv = (
        db.query(DmConversation)
        .filter(
            DmConversation.id == conversation_id,
            or_(
                DmConversation.user_a_id == current_user.id,
                DmConversation.user_b_id == current_user.id,
            ),
        )
        .first()
    )

    if not conv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Konwersacja nie istnieje")

    message = DmMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return MessageOut(
        id=message.id,
        sender_id=message.sender_id,
        sender_nick=current_user.display_name,
        content=message.content,
        message_type=message.message_type or "text",
        image_url=message.image_url,
        is_read=message.is_read,
        created_at=message.created_at,
    )


@router.post(
    "/start",
    response_model=ConversationOut,
    summary="Rozpocznij lub wróć do konwersacji z userem",
)
def start_conversation(
    other_user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Tworzy konwersację lub zwraca istniejącą.
    Używane gdy klikasz DM przy poście na forum.
    """
    if str(other_user_id) == str(current_user.id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nie możesz pisać do siebie")

    other = db.query(User).filter(User.id == other_user_id).first()
    if not other:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Użytkownik nie istnieje")

    conv = _get_or_create_conversation(db, current_user.id, other_user_id)
    return _serialize_conversation(conv, current_user.id)


@router.get(
    "/search-users",
    summary="Wyszukaj użytkownika po nicku",
)
def search_users(
    q: str = Query(min_length=2, max_length=30),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Wyszukiwanie użytkowników po nicku.
    Zwraca max 10 wyników z informacją o grupie.
    Dla każdego wyniku zaznacza czy to ta sama grupa co current_user.
    """
    from app.models.group_member import GroupMember
    from app.models.group import Group

    my_membership = (
        db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    )
    my_group_id = str(my_membership.group_id) if my_membership else None

    users = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            User.is_active.is_(True),
            func.lower(User.display_name).contains(q.lower()),
        )
        .limit(10)
        .all()
    )

    result = []
    for u in users:
        membership = (
            db.query(GroupMember).filter(GroupMember.user_id == u.id).first()
        )
        group_info = None
        is_same_group = False

        if membership:
            group = db.query(Group).filter(Group.id == membership.group_id).first()
            if group:
                group_info = {
                    "id": str(group.id),
                    "name": group.name,
                    "accent_color": group.accent_color or "#0d9488",
                }
                is_same_group = (
                    my_group_id is not None
                    and str(membership.group_id) == my_group_id
                )

        result.append({
            "id": str(u.id),
            "display_name": u.display_name,
            "group": group_info,
            "is_same_group": is_same_group,
        })

    return result
