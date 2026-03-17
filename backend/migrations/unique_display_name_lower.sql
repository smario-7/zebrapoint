-- Unikalność nicku (display_name) bez rozróżniania wielkości liter.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name_lower
    ON users (lower(display_name));
