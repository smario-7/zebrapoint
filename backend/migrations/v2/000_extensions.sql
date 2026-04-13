-- Sekcja 0.2 — rozszerzenia PostgreSQL (Supabase).
-- Kolejność uruchamiania: 000 → 002 → 001 → 003 … 008 → 011 → 009 → 010
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
