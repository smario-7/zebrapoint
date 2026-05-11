-- Indeksy wektorowe po seed data (IVFFlat).
-- W produkcji przy dużych tabelach możesz użyć CREATE INDEX CONCURRENTLY
-- (osobne sesje, poza transakcją).

CREATE INDEX idx_lenses_embedding
    ON lenses USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX idx_posts_embedding
    ON posts USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_users_hpo_vector
    ON users USING ivfflat (hpo_vector vector_cosine_ops)
    WITH (lists = 30);

CREATE INDEX idx_users_post_vector
    ON users USING ivfflat (post_vector vector_cosine_ops)
    WITH (lists = 30);

CREATE INDEX idx_dynamic_chats_query_embedding
    ON dynamic_chats USING ivfflat (query_embedding vector_cosine_ops)
    WITH (lists = 20);

CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);

CREATE INDEX idx_post_lens_matches_post_id ON post_lens_matches(post_id);
CREATE INDEX idx_post_lens_matches_lens_id ON post_lens_matches(lens_id);
CREATE INDEX idx_post_lens_matches_score ON post_lens_matches(lens_id, match_score DESC);

CREATE INDEX idx_user_lens_scores_user_id ON user_lens_scores(user_id);
CREATE INDEX idx_user_lens_scores_score ON user_lens_scores(user_id, score DESC);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

CREATE INDEX idx_reactions_entity ON reactions(entity_type, entity_id);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);

CREATE INDEX idx_dynamic_chats_creator ON dynamic_chats(creator_id, status);
CREATE INDEX idx_chat_members_user ON dynamic_chat_members(user_id, status);
CREATE INDEX idx_chat_members_chat ON dynamic_chat_members(chat_id, status);
CREATE INDEX idx_chat_messages_chat ON dynamic_chat_messages(chat_id, created_at ASC);

CREATE INDEX idx_user_hpo_profile_user ON user_hpo_profile(user_id);
CREATE INDEX idx_lens_proposals_user ON lens_proposals(user_id, status);
CREATE INDEX idx_lens_proposals_status ON lens_proposals(status, created_at DESC);

CREATE INDEX idx_users_searchable_active
    ON users(last_login_at DESC)
    WHERE searchable = TRUE AND status = 'active';
