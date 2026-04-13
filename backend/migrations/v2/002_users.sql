-- Uruchom po 001_hpo_orphanet.sql (wymaga orpha_diseases i hpo_terms).

CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_onboarding');

CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   TEXT UNIQUE NOT NULL,
    username                TEXT UNIQUE NOT NULL,
    password_hash           TEXT NOT NULL,
    role                    user_role NOT NULL DEFAULT 'user',
    status                  user_status NOT NULL DEFAULT 'pending_onboarding',

    onboarding_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    consent_data_processing BOOLEAN NOT NULL DEFAULT FALSE,
    consent_searchable_info BOOLEAN NOT NULL DEFAULT FALSE,

    symptom_description     TEXT,
    diagnosis_confirmed     BOOLEAN DEFAULT FALSE,
    orpha_id                INTEGER REFERENCES orpha_diseases(orpha_id) ON DELETE SET NULL,

    hpo_vector              vector(384),
    post_vector             vector(384),
    diagnosis_vector        vector(384),

    searchable              BOOLEAN NOT NULL DEFAULT FALSE,
    location_city           TEXT,
    location_country        TEXT DEFAULT 'PL',

    last_login_at           TIMESTAMPTZ,
    post_count              INTEGER NOT NULL DEFAULT 0,
    chat_response_rate      NUMERIC(3,2) DEFAULT NULL,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE user_hpo_profile (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hpo_id           TEXT NOT NULL REFERENCES hpo_terms(hpo_id) ON DELETE CASCADE,
    confidence       NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    source           TEXT NOT NULL CHECK (source IN ('manual', 'nlp', 'diagnosis')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, hpo_id)
);
