import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session, joinedload
from uuid import UUID

from app.auth.dependencies import get_current_user
from app.auth.session import user_from_access_token
from app.config import settings
from app.database import get_db
from app.models.group_member import GroupMember
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageHistoryResponse, MessageOut
from app.websocket.chat_manager import manager


logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])
rest_router = APIRouter(prefix="/groups", tags=["Chat"])

MAX_MESSAGE_LENGTH = 500
HISTORY_LIMIT = 50


def _is_group_member(db: Session, user_id, group_id: str) -> bool:
    """Sprawdza, czy użytkownik należy do wskazanej grupy."""
    return (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.group_id == group_id,
        )
        .first()
        is not None
    )


def _load_history_dicts(db: Session, group_id: str, limit: int) -> List[Dict[str, Any]]:
    """Pobiera ostatnie wiadomości czatu dla grupy jako słowniki."""
    messages = (
        db.query(Message)
        .options(joinedload(Message.user))
        .filter(Message.group_id == group_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(msg.id),
            "group_id": str(msg.group_id),
            "user_id": str(msg.user_id),
            "display_name": msg.user.display_name,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in reversed(messages)
    ]


def _load_history_models(
    db: Session,
    group_id: str,
    limit: int,
    before_message: Optional[Message] = None,
) -> List[Message]:
    """Pobiera wiadomości jako obiekty ORM (do REST)."""
    query = (
        db.query(Message)
        .options(joinedload(Message.user))
        .filter(Message.group_id == group_id)
    )

    if before_message:
        query = query.filter(Message.created_at < before_message.created_at)

    messages = (
        query.order_by(Message.created_at.desc()).limit(limit).all()
    )

    return list(reversed(messages))


@router.websocket("/ws/chat/{group_id}")
async def websocket_chat(
    websocket: WebSocket,
    group_id: str,
    db: Session = Depends(get_db),
) -> None:
    """
    Endpoint WebSocket dla czatu grupowego.

    Autoryzacja: JWT w ciasteczku HttpOnly (jak REST), bez tokenu w URL.
    Flow: accept → weryfikacja cookie → członkostwo → rejestracja → historia → pętla wiadomości.
    """

    await websocket.accept()
    token = websocket.cookies.get(settings.access_token_cookie_name)
    user = user_from_access_token(token, db)
    if not user:
        await websocket.send_json(
            {
                "type": "error",
                "code": "UNAUTHORIZED",
                "message": "Nieprawidłowy lub wygasły token",
            }
        )
        await websocket.close(code=4001)
        return

    if not _is_group_member(db, user.id, group_id):
        await websocket.send_json(
            {
                "type": "error",
                "code": "FORBIDDEN",
                "message": "Nie jesteś członkiem tej grupy",
            }
        )
        await websocket.close(code=4003)
        return

    manager.register_accepted(
        websocket,
        group_id=group_id,
        user_id=str(user.id),
        display_name=user.display_name,
    )

    await manager.send_personal(
        {
            "type": "connected",
            "group_id": group_id,
            "user_id": str(user.id),
        },
        websocket,
    )

    history = _load_history_dicts(db, group_id, HISTORY_LIMIT)
    await manager.send_personal({"type": "history", "messages": history}, websocket)

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_personal(
                    {
                        "type": "error",
                        "code": "INVALID_JSON",
                        "message": "Nieprawidłowy format wiadomości",
                    },
                    websocket,
                )
                continue

            msg_type = data.get("type", "message")

            if msg_type == "ping":
                await manager.send_personal({"type": "pong"}, websocket)
                continue

            if msg_type == "message":
                content = str(data.get("content", "")).strip()

                if not content:
                    continue

                if len(content) > MAX_MESSAGE_LENGTH:
                    await manager.send_personal(
                        {
                            "type": "error",
                            "code": "TOO_LONG",
                            "message": f"Wiadomość może mieć maksymalnie {MAX_MESSAGE_LENGTH} znaków",
                        },
                        websocket,
                    )
                    continue

                message = Message(
                    group_id=group_id,
                    user_id=user.id,
                    content=content,
                )
                db.add(message)
                db.commit()
                db.refresh(message)

                payload = {
                    "type": "message",
                    "id": str(message.id),
                    "group_id": group_id,
                    "user_id": str(user.id),
                    "display_name": user.display_name,
                    "content": message.content,
                    "created_at": message.created_at.isoformat(),
                }
                await manager.broadcast(payload, group_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(
            "Użytkownik %s odłączył się od grupy %s",
            user.display_name,
            group_id,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Nieoczekiwany błąd WebSocket: %s", exc)
        manager.disconnect(websocket)


@rest_router.get(
    "/{group_id}/messages",
    response_model=MessageHistoryResponse,
    summary="Historia wiadomości grupy",
)
def get_message_history(
    group_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    before_id: Optional[UUID] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageHistoryResponse:
    """
    Zwraca historię wiadomości dla podanej grupy.

    - tylko dla członków tej grupy,
    - paginacja przez `limit` i opcjonalne `before_id`.
    """

    if not _is_group_member(db, current_user.id, str(group_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie jesteś członkiem tej grupy",
        )

    pivot: Optional[Message] = None
    if before_id is not None:
        pivot = (
            db.query(Message)
            .filter(Message.id == before_id)
            .first()
        )

    total = (
        db.query(Message)
        .filter(Message.group_id == group_id)
        .count()
    )

    messages = _load_history_models(
        db,
        str(group_id),
        limit=limit + 1,
        before_message=pivot,
    )

    has_more = len(messages) > limit
    messages = messages[:limit]

    return MessageHistoryResponse(
        messages=[
            MessageOut(
                id=m.id,
                group_id=m.group_id,
                user_id=m.user_id,
                display_name=m.user.display_name,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
        total=total,
        has_more=has_more,
        oldest_id=messages[0].id if messages else None,
    )


