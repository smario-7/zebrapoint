-- Edycja progu automatycznego retrainu ML z panelu admina

CREATE TABLE IF NOT EXISTS ml_admin_settings (
    id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    retrain_every_n   INTEGER NOT NULL DEFAULT 10,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ml_admin_settings (id, retrain_every_n) VALUES (1, 10)
ON CONFLICT (id) DO NOTHING;
