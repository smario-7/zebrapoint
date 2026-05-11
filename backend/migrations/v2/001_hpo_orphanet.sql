-- Uruchom po 000_extensions.sql, przed 002_users.sql (users.orpha_id → orpha_diseases).

CREATE TABLE hpo_terms (
    hpo_id          TEXT PRIMARY KEY,
    label_en        TEXT NOT NULL,
    label_pl        TEXT,
    synonyms_en     TEXT[],
    parent_ids      TEXT[],
    depth           INTEGER,
    source_version  TEXT NOT NULL,
    is_clinical     BOOLEAN DEFAULT TRUE
);

CREATE TABLE orpha_diseases (
    orpha_id         INTEGER PRIMARY KEY,
    orpha_code       TEXT UNIQUE NOT NULL,
    name_pl          TEXT NOT NULL,
    name_en          TEXT NOT NULL,
    hpo_associations TEXT[],
    source_url       TEXT,
    last_synced_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
