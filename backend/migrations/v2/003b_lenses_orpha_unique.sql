-- Uruchom po 003_lenses.sql (Supabase SQL Editor lub psql).
-- Jedna soczewka diagnostyczna na chorobę Orphanet (seed / sync używają ON CONFLICT).

ALTER TABLE lenses
    ADD CONSTRAINT lenses_orpha_id_unique UNIQUE (orpha_id);
