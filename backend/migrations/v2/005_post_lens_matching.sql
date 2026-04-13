CREATE TABLE post_lens_matches (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id          UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    lens_id          UUID NOT NULL REFERENCES lenses(id) ON DELETE CASCADE,
    match_score      NUMERIC(4,3) NOT NULL,

    score_breakdown  JSONB DEFAULT '{}',

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(post_id, lens_id)
);

CREATE OR REPLACE FUNCTION update_lens_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lenses SET post_count = post_count + 1 WHERE id = NEW.lens_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE lenses SET post_count = post_count - 1 WHERE id = OLD.lens_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lens_post_count_trigger
    AFTER INSERT OR DELETE ON post_lens_matches
    FOR EACH ROW EXECUTE FUNCTION update_lens_post_count();
