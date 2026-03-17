-- ── ZebraPoint Sprint 8: Forum ─────────────────────────────────────────────

-- ── Posty forum ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    content     TEXT NOT NULL,
    is_pinned   BOOLEAN DEFAULT FALSE,
    is_locked   BOOLEAN DEFAULT FALSE,
    views       INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Komentarze ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reakcje (emoji na posty i komentarze) ─────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL,
    target_id   UUID NOT NULL,
    emoji       VARCHAR(10) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- ── Indeksy ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_group_created
    ON posts(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_created
    ON comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_reactions_target
    ON reactions(target_type, target_id);

-- ── Trigger: auto-update updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
