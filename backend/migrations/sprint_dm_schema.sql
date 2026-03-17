-- Schema DM: konwersacje 1:1 i wiadomości prywatne
-- Zgodne z docs/ZebraPoint_DM_System.md — Zadanie 2

-- ── Konwersacje DM ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dm_conversations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    last_message_at  TIMESTAMPTZ DEFAULT NOW(),
    last_message_text TEXT,
    unread_count_a   INTEGER DEFAULT 0,
    unread_count_b   INTEGER DEFAULT 0,
    UNIQUE(user_a_id, user_b_id)
);

-- ── Wiadomości DM ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dm_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    message_type    VARCHAR(20) DEFAULT 'text',
    image_url       TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indeksy ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dm_conversations_user_a
    ON dm_conversations(user_a_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_conversations_user_b
    ON dm_conversations(user_b_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation
    ON dm_messages(conversation_id, created_at ASC);

-- ── Trigger: aktualizacja last_message_* i liczników nieprzeczytanych ───────
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dm_conversations
    SET
        last_message_at   = NEW.created_at,
        last_message_text = LEFT(NEW.content, 100),
        unread_count_a = CASE
            WHEN user_b_id = NEW.sender_id THEN unread_count_a + 1
            ELSE unread_count_a
        END,
        unread_count_b = CASE
            WHEN user_a_id = NEW.sender_id THEN unread_count_b + 1
            ELSE unread_count_b
        END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dm_message_after_insert
    AFTER INSERT ON dm_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();
