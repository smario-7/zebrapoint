-- Sprint 11: opis grupy generowany przez LLM (wypunktowane objawy)

ALTER TABLE groups ADD COLUMN IF NOT EXISTS ai_description TEXT;
