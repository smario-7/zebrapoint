CREATE TYPE proposal_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE lens_proposals (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name             TEXT NOT NULL,
    type             lens_type NOT NULL,
    justification    TEXT NOT NULL,

    status           proposal_status NOT NULL DEFAULT 'pending',
    admin_comment    TEXT,
    reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMPTZ,

    created_lens_id  UUID REFERENCES lenses(id) ON DELETE SET NULL,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
