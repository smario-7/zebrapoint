CREATE TYPE lens_type AS ENUM ('diagnostic', 'symptomatic', 'topical');
CREATE TYPE lens_activity AS ENUM ('high', 'medium', 'low');

CREATE TABLE lenses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name             TEXT NOT NULL,
    description      TEXT,
    type             lens_type NOT NULL,
    emoji            TEXT,

    embedding        vector(384),
    hpo_cluster      TEXT[],

    orpha_id         INTEGER REFERENCES orpha_diseases(orpha_id) ON DELETE SET NULL,
    data_source      TEXT CHECK (data_source IN ('orphanet', 'hpo_cluster', 'admin', 'system')),
    source_url       TEXT,
    last_synced_at   TIMESTAMPTZ,

    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    activity_level   lens_activity NOT NULL DEFAULT 'low',
    post_count       INTEGER NOT NULL DEFAULT 0,

    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER lenses_updated_at
    BEFORE UPDATE ON lenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE user_lens_scores (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lens_id          UUID NOT NULL REFERENCES lenses(id) ON DELETE CASCADE,
    score            NUMERIC(4,3) NOT NULL,

    score_breakdown  JSONB DEFAULT '{}',

    calculated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, lens_id)
);
