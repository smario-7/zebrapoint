-- Sprint 10: Moderacja treści — tabele zgłoszeń, akcji admina, ostrzeżeń
-- Uruchom w Supabase → SQL Editor

-- Zgłoszenia treści
CREATE TABLE IF NOT EXISTS reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type  VARCHAR(20) NOT NULL,
    target_id    UUID NOT NULL,
    reason       VARCHAR(50) NOT NULL,
    description  TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by  UUID REFERENCES users(id),
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Akcje moderacyjne (historia decyzji admina)
CREATE TABLE IF NOT EXISTS admin_actions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    report_id     UUID REFERENCES reports(id) ON DELETE SET NULL,
    action_type   VARCHAR(30) NOT NULL,
    reason        TEXT,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Ostrzeżenia użytkowników
CREATE TABLE IF NOT EXISTS user_warnings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message    TEXT NOT NULL,
    report_id  UUID REFERENCES reports(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rozszerzenie tabeli users o pola moderacji
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_banned     BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS banned_until  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ban_reason    TEXT;

-- role może już istnieć z add_user_role.sql — dodaj tylko jeśli brak
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
  END IF;
END $$;

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_reports_status_created
    ON reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_target
    ON reports(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user
    ON admin_actions(target_user_id, created_at DESC);
