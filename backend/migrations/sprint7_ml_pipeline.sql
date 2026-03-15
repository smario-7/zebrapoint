-- Sprint 7: ML Pipeline — tabela logów + rozszerzenie groups/users

-- Tabela logów pipeline
CREATE TABLE IF NOT EXISTS ml_pipeline_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at          TIMESTAMPTZ DEFAULT NOW(),
    profiles_count  INTEGER NOT NULL DEFAULT 0,
    clusters_found  INTEGER NOT NULL DEFAULT 0,
    noise_count     INTEGER NOT NULL DEFAULT 0,
    reassigned      INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER,
    status          VARCHAR(20) DEFAULT 'success',
    error_message   TEXT
);

-- Rozszerzenie tabeli groups o charakterystyki i pgvector centroid
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS accent_color      VARCHAR(7)   DEFAULT '#0d9488',
    ADD COLUMN IF NOT EXISTS keywords          TEXT[],
    ADD COLUMN IF NOT EXISTS age_range         VARCHAR(20),
    ADD COLUMN IF NOT EXISTS symptom_category  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS avg_match_score   FLOAT,
    ADD COLUMN IF NOT EXISTS centroid          VECTOR(384),
    ADD COLUMN IF NOT EXISTS admin_note        TEXT,
    ADD COLUMN IF NOT EXISTS admin_note_by     UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS admin_note_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_groups_centroid
    ON groups USING ivfflat (centroid vector_cosine_ops)
    WITH (lists = 10);

-- Przedział wiekowy użytkownika (dla charakterystyk grupy)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS age_range VARCHAR(20);
