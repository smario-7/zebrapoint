import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.auth.dependencies import get_current_user_ws
from app.database import SessionLocal, get_db
from app.models.dm_conversation import DmConversation, DmMessage
from app.websocket.dm_manager import dm_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["DM WebSocket"])

MAX_MESSAGE_LENGTH = 2000


@router.websocket("/ws/dm/{conversation_id}")
async def dm_websocket(
    websocket: WebSocket,
    conversation_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    WebSocket dla DM. Token JWT w query: ?token=...
    Obsługuje typy: ping (pong), message (zapis do bazy + broadcast), read (oznaczenie jako przeczytane).
    """
    user = await get_current_user_ws(websocket, token, db)
    if not user:
        await websocket.accept()
        await websocket.send_json({"type": "error", "code": "UNAUTHORIZED"})
        await websocket.close(code=4001)
        return

    try:
        conv_uuid = UUID(conversation_id)
    except (ValueError, TypeError):
        await websocket.accept()
        await websocket.send_json({"type": "error", "code": "NOT_FOUND"})
        await websocket.close(code=4004)
        return

    conv = (
        db.query(DmConversation)
        .filter(
            DmConversation.id == conv_uuid,
            or_(
                DmConversation.user_a_id == user.id,
                DmConversation.user_b_id == user.id,
            ),
        )
        .first()
    )

    if not conv:
        await websocket.accept()
        await websocket.send_json({"type": "error", "code": "FORBIDDEN"})
        await websocket.close(code=4003)
        return

    await dm_manager.connect(websocket, conversation_id, str(user.id))

    await dm_manager.send_personal(
        {
            "type": "connected",
            "conversation_id": conversation_id,
            "user_id": str(user.id),
        },
        websocket,
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if data.get("type") == "ping":
                await dm_manager.send_personal({"type": "pong"}, websocket)
                continue

            if data.get("type") == "message":
                content = str(data.get("content", "")).strip()
                if not content or len(content) > MAX_MESSAGE_LENGTH:
                    continue

                msg_db = SessionLocal()
                try:
                    message = DmMessage(
                        conversation_id=conv_uuid,
                        sender_id=user.id,
                        content=content,
                    )
                    msg_db.add(message)
                    msg_db.commit()
                    msg_db.refresh(message)

                    payload = {
                        "type": "message",
                        "id": str(message.id),
                        "conversation_id": conversation_id,
                        "sender_id": str(user.id),
                        "sender_nick": user.display_name,
                        "content": message.content,
                        "is_read": False,
                        "created_at": message.created_at.isoformat(),
                    }
                    await dm_manager.broadcast_conversation(payload, conversation_id)
                finally:
                    msg_db.close()

            if data.get("type") == "read":
                db.query(DmMessage).filter(
                    DmMessage.conversation_id == conv_uuid,
                    DmMessage.sender_id != user.id,
                    DmMessage.is_read.is_(False),
                ).update({"is_read": True}, synchronize_session=False)

                is_user_a = str(conv.user_a_id) == str(user.id)
                if is_user_a:
                    conv.unread_count_a = 0
                else:
                    conv.unread_count_b = 0
                db.commit()

    except WebSocketDisconnect:
        dm_manager.disconnect(websocket)
