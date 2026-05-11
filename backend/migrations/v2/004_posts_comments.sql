CREATE TYPE post_status AS ENUM ('draft', 'published', 'removed');
CREATE TYPE reaction_type AS ENUM ('heart', 'sad', 'strong', 'pray', 'think', 'thumbsup', 'target');
CREATE TYPE entity_type AS ENUM ('post', 'comment');

CREATE TABLE posts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title            TEXT NOT NULL,
    content          TEXT NOT NULL,
    status           post_status NOT NULL DEFAULT 'draft',

    embedding        vector(384),
    hpo_terms        TEXT[],
    context_tags     TEXT[],

    comment_count    INTEGER NOT NULL DEFAULT 0,
    published_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION increment_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE users SET post_count = post_count + 1 WHERE id = NEW.author_id;
        ELSIF OLD.status IS DISTINCT FROM 'published' THEN
            UPDATE users SET post_count = post_count + 1 WHERE id = NEW.author_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_count_on_publish
    AFTER INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION increment_user_post_count();

CREATE TABLE comments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id          UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id        UUID REFERENCES comments(id) ON DELETE CASCADE,

    content          TEXT NOT NULL,
    depth            INTEGER NOT NULL DEFAULT 0
        CHECK (depth BETWEEN 0 AND 1),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

CREATE TABLE reactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type      entity_type NOT NULL,
    entity_id        UUID NOT NULL,
    reaction         reaction_type NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, entity_type, entity_id, reaction)
);
