CREATE TYPE chat_status AS ENUM ('active', 'closed');
CREATE TYPE chat_member_status AS ENUM ('pending', 'accepted', 'rejected', 'left');
CREATE TYPE chat_member_role AS ENUM ('creator', 'invited');

CREATE TABLE dynamic_chats (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    query_text       TEXT NOT NULL,
    query_embedding  vector(384),

    target_count     INTEGER NOT NULL
        CHECK (target_count IN (5, 10, 15, 20)),
    include_location BOOLEAN NOT NULL DEFAULT FALSE,

    status           chat_status NOT NULL DEFAULT 'active',
    closed_at        TIMESTAMPTZ,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dynamic_chat_members (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id          UUID NOT NULL REFERENCES dynamic_chats(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role             chat_member_role NOT NULL,
    status           chat_member_status NOT NULL DEFAULT 'pending',
    match_score      NUMERIC(4,3),
    invited_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at     TIMESTAMPTZ,

    UNIQUE(chat_id, user_id)
);

CREATE TABLE dynamic_chat_messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id          UUID NOT NULL REFERENCES dynamic_chats(id) ON DELETE CASCADE,
    author_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content          TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
