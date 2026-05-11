"""
Router v2: Moje Tematy (Dynamic Chats).
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from redis.asyncio import Redis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user, get_db, get_redis_auth
from app.models.v2.chat import DynamicChat, DynamicChatMember, DynamicChatMessage
from app.models.v2.user import User
from app.schemas.v2.topic import (
    ChatConfirmRequest,
    ChatDetailOut,
    ChatMemberOut,
    ChatMessageCreate,
    ChatMessageOut,
    ChatOut,
    ChatSearchRequest,
    ChatSearchResult,
    InvitationActionRequest,
    InvitationOut,
)
from app.workers.v2.chat_tasks import score_users_for_chat

router = APIRouter(prefix="/api/v2/topics", tags=["Topics v2"])

_SEARCH_PREFIX = "chat_search:"


@router.post("/search", response_model=ChatSearchResult)
async def search_chat_candidates(
    data: ChatSearchRequest,
    redis: Redis = Depends(get_redis_auth),
    current_user: User = Depends(get_current_active_user),
):
    if data.target_count not in (5, 10, 15, 20):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_count musi być 5, 10, 15 lub 20",
        )

    search_id = str(uuid.uuid4())

    await redis.setex(
        f"{_SEARCH_PREFIX}{search_id}",
        600,
        json.dumps({"status": "pending"}),
    )

    score_users_for_chat.delay(
        search_id=search_id,
        requester_id=str(current_user.id),
        query_text=data.query,
        target_count=data.target_count,
        include_location=data.include_location,
    )

    return ChatSearchResult(
        search_id=search_id,
        found_count=0,
        target_count=data.target_count,
    )


@router.get("/search/{search_id}")
async def get_search_status(
    search_id: str,
    redis: Redis = Depends(get_redis_auth),
    current_user: User = Depends(get_current_active_user),
):
    raw = await redis.get(f"{_SEARCH_PREFIX}{search_id}")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wyszukiwanie wygasło lub nie istnieje",
        )
    data = json.loads(raw)
    out: dict = {
        "status": data["status"],
        "found_count": data.get("found_count", 0),
        "target_count": data.get("target_count", 0),
    }
    if data.get("status") == "error":
        out["error"] = data.get("error", "")
    return out


@router.post("/confirm", response_model=ChatOut, status_code=status.HTTP_201_CREATED)
async def confirm_chat_creation(
    data: ChatConfirmRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_auth),
    current_user: User = Depends(get_current_active_user),
):
    raw = await redis.get(f"{_SEARCH_PREFIX}{data.search_id}")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wyszukiwanie wygasło. Wyszukaj ponownie.",
        )
    search_data = json.loads(raw)
    if search_data.get("status") != "done":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wyszukiwanie jeszcze trwa. Poczekaj.",
        )

    candidates = search_data.get("candidates", [])
    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie znaleziono kandydatów. Spróbuj ponownie z innym zapytaniem.",
        )

    query_text = search_data.get("query_text") or ""
    include_location = bool(search_data.get("include_location", False))
    target_count = int(search_data.get("target_count", len(candidates)))

    chat = DynamicChat(
        creator_id=current_user.id,
        query_text=query_text,
        target_count=target_count,
        include_location=include_location,
        status="active",
    )
    db.add(chat)
    await db.flush()

    db.add(
        DynamicChatMember(
            chat_id=chat.id,
            user_id=current_user.id,
            role="creator",
            status="accepted",
        )
    )

    for candidate in candidates:
        db.add(
            DynamicChatMember(
                chat_id=chat.id,
                user_id=uuid.UUID(candidate["user_id"]),
                role="invited",
                status="pending",
                match_score=candidate["score"],
            )
        )

    await db.commit()
    await db.refresh(chat)

    await redis.delete(f"{_SEARCH_PREFIX}{data.search_id}")

    return ChatOut(
        id=chat.id,
        query_text=chat.query_text,
        target_count=chat.target_count,
        status=chat.status,
        created_at=chat.created_at,
        member_count=1,
        pending_count=len(candidates),
    )


@router.get("", response_model=list[ChatOut])
async def list_my_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(DynamicChat)
        .join(DynamicChatMember, DynamicChatMember.chat_id == DynamicChat.id)
        .where(DynamicChatMember.user_id == current_user.id)
        .where(DynamicChatMember.status == "accepted")
        .order_by(DynamicChat.created_at.desc())
    )
    chats = result.scalars().all()

    output: list[ChatOut] = []
    for chat in chats:
        members_result = await db.execute(
            select(DynamicChatMember).where(DynamicChatMember.chat_id == chat.id)
        )
        members = members_result.scalars().all()
        output.append(
            ChatOut(
                id=chat.id,
                query_text=chat.query_text,
                target_count=chat.target_count,
                status=chat.status,
                created_at=chat.created_at,
                member_count=sum(1 for m in members if m.status == "accepted"),
                pending_count=sum(1 for m in members if m.status == "pending"),
            )
        )
    return output


@router.get("/invitations", response_model=list[InvitationOut])
async def get_my_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(DynamicChatMember, DynamicChat, User.username)
        .join(DynamicChat, DynamicChat.id == DynamicChatMember.chat_id)
        .join(User, User.id == DynamicChat.creator_id)
        .where(DynamicChatMember.user_id == current_user.id)
        .where(DynamicChatMember.status == "pending")
        .where(DynamicChat.status == "active")
        .order_by(DynamicChatMember.invited_at.desc())
    )
    rows = result.all()
    return [
        InvitationOut(
            chat_id=row[0].chat_id,
            inviter_username=row[2],
            query_preview=(row[1].query_text or "")[:100],
            invited_at=row[0].invited_at,
        )
        for row in rows
    ]


@router.post("/invitations/{chat_id}/respond", status_code=status.HTTP_200_OK)
async def respond_to_invitation(
    chat_id: uuid.UUID,
    data: InvitationActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if data.action not in ("accept", "reject"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action musi być 'accept' lub 'reject'",
        )
    result = await db.execute(
        select(DynamicChatMember)
        .where(DynamicChatMember.chat_id == chat_id)
        .where(DynamicChatMember.user_id == current_user.id)
        .where(DynamicChatMember.status == "pending")
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie nie istnieje",
        )

    new_status = "accepted" if data.action == "accept" else "rejected"
    await db.execute(
        update(DynamicChatMember)
        .where(DynamicChatMember.id == member.id)
        .values(status=new_status, responded_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"status": new_status}


@router.get("/{chat_id}", response_model=ChatDetailOut)
async def get_chat_detail(
    chat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    chat, my_member = await _get_chat_and_member(chat_id, current_user.id, db)

    members_result = await db.execute(
        select(DynamicChatMember, User.username)
        .join(User, User.id == DynamicChatMember.user_id)
        .where(DynamicChatMember.chat_id == chat_id)
        .where(DynamicChatMember.status == "accepted")
    )
    members = [
        ChatMemberOut(
            username=row[1],
            role=row[0].role,
            status=row[0].status,
        )
        for row in members_result.all()
    ]
    return ChatDetailOut(
        id=chat.id,
        query_text=chat.query_text,
        target_count=chat.target_count,
        status=chat.status,
        created_at=chat.created_at,
        members=members,
        is_creator=my_member.role == "creator",
    )


@router.get("/{chat_id}/messages", response_model=list[ChatMessageOut])
async def get_chat_messages(
    chat_id: uuid.UUID,
    after: datetime | None = Query(
        default=None,
        description="ISO: pobierz wiadomości ściśle po tym czasie (polling)",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _get_chat_and_member(chat_id, current_user.id, db)

    q = (
        select(DynamicChatMessage, User.username)
        .join(User, User.id == DynamicChatMessage.author_id)
        .where(DynamicChatMessage.chat_id == chat_id)
    )
    if after is not None:
        q = q.where(DynamicChatMessage.created_at > after)
    q = q.order_by(DynamicChatMessage.created_at.asc())
    result = await db.execute(q)
    return [
        ChatMessageOut(
            id=row[0].id,
            author_username=row[1],
            content=row[0].content,
            created_at=row[0].created_at,
        )
        for row in result.all()
    ]


@router.post("/{chat_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: uuid.UUID,
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    chat, _my_member = await _get_chat_and_member(chat_id, current_user.id, db)
    if chat.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Czat jest zamknięty",
        )
    msg = DynamicChatMessage(
        chat_id=chat_id,
        author_id=current_user.id,
        content=data.content,
    )
    db.add(msg)
    await db.commit()
    return {"status": "sent"}


@router.post("/{chat_id}/close", status_code=status.HTTP_200_OK)
async def close_chat(
    chat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _chat, my_member = await _get_chat_and_member(chat_id, current_user.id, db)
    if my_member.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tylko twórca może zamknąć czat",
        )
    await db.execute(
        update(DynamicChat)
        .where(DynamicChat.id == chat_id)
        .values(status="closed", closed_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"status": "closed"}


@router.delete("/{chat_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    chat_id: uuid.UUID,
    member_user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _chat, my_member = await _get_chat_and_member(chat_id, current_user.id, db)
    if my_member.role != "creator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień")
    if member_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie możesz wyrzucić siebie — użyj zamknięcia czatu",
        )
    await db.execute(
        update(DynamicChatMember)
        .where(DynamicChatMember.chat_id == chat_id)
        .where(DynamicChatMember.user_id == member_user_id)
        .values(status="left")
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{chat_id}/leave", status_code=status.HTTP_200_OK)
async def leave_chat(
    chat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _chat, my_member = await _get_chat_and_member(chat_id, current_user.id, db)
    if my_member.role == "creator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Twórca nie może opuścić czatu — użyj zamknięcia czatu",
        )
    await db.execute(
        update(DynamicChatMember)
        .where(DynamicChatMember.chat_id == chat_id)
        .where(DynamicChatMember.user_id == current_user.id)
        .values(status="left")
    )
    await db.commit()
    return {"status": "left"}


async def _get_chat_and_member(
    chat_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[DynamicChat, DynamicChatMember]:
    result = await db.execute(select(DynamicChat).where(DynamicChat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Czat nie istnieje")

    result = await db.execute(
        select(DynamicChatMember)
        .where(DynamicChatMember.chat_id == chat_id)
        .where(DynamicChatMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member or member.status != "accepted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Brak dostępu do czatu",
        )

    return chat, member
