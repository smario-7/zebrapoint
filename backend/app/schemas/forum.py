from __future__ import annotations
from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional


ALLOWED_EMOJI = {"❤️", "👍", "🙏", "💪", "😢", "🤗", "💡"}


class PostCreate(BaseModel):
    title:   str
    content: str

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Tytuł musi mieć minimum 5 znaków")
        if len(v) > 200:
            raise ValueError("Tytuł może mieć maksimum 200 znaków")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 20:
            raise ValueError("Treść musi mieć minimum 20 znaków")
        if len(v) > 10000:
            raise ValueError("Treść może mieć maksimum 10 000 znaków")
        return v


class PostUpdate(BaseModel):
    title:   Optional[str] = None
    content: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Tytuł min. 5 znaków")
        if len(v) > 200:
            raise ValueError("Tytuł max. 200 znaków")
        return v


class PostOut(BaseModel):
    id:            UUID
    group_id:      UUID
    user_id:       UUID
    display_name:  str = ""
    title:         str
    is_pinned:     bool
    is_locked:     bool
    views:         int
    comment_count: int = 0
    reactions_summary: dict = {}
    created_at:    datetime
    updated_at:    datetime

    class Config:
        from_attributes = True


class PostDetail(PostOut):
    content:   str
    comments:  list[CommentOut] = []


class CommentCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Komentarz musi mieć minimum 2 znaki")
        if len(v) > 3000:
            raise ValueError("Komentarz może mieć maksimum 3000 znaków")
        return v


class CommentUpdate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Min. 2 znaki")
        if len(v) > 3000:
            raise ValueError("Max. 3000 znaków")
        return v


class CommentOut(BaseModel):
    id:            UUID
    post_id:       UUID
    user_id:       UUID
    display_name:  str = ""
    content:       str
    reactions_summary: dict = {}
    created_at:    datetime
    updated_at:    datetime

    class Config:
        from_attributes = True


class ReactionToggle(BaseModel):
    emoji: str

    @field_validator("emoji")
    @classmethod
    def validate_emoji(cls, v: str) -> str:
        if v not in ALLOWED_EMOJI:
            raise ValueError(
                f"Niedozwolone emoji. Dozwolone: {', '.join(ALLOWED_EMOJI)}"
            )
        return v


class ReactionOut(BaseModel):
    target_type:       str
    target_id:         UUID
    reactions_summary: dict
    user_reaction:     str | None
