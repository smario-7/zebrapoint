-- Wymaga projektu Supabase: funkcja auth.uid() i schemat auth (JWT).
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hpo_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

CREATE POLICY users_update_self ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY posts_select ON posts
    FOR SELECT USING (
        status = 'published'
        OR author_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

CREATE POLICY posts_insert ON posts
    FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY posts_update ON posts
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY comments_select ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = comments.post_id
            AND (
                posts.status = 'published'
                OR posts.author_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
                )
            )
        )
    );

CREATE POLICY comments_insert ON comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = comments.post_id
            AND (
                posts.status = 'published'
                OR posts.author_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
                )
            )
        )
    );

CREATE POLICY comments_update ON comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY comments_delete ON comments
    FOR DELETE USING (
        author_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

CREATE POLICY messages_select ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR recipient_id = auth.uid()
    );

CREATE POLICY messages_insert ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY chats_select ON dynamic_chats
    FOR SELECT USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM dynamic_chat_members
            WHERE chat_id = dynamic_chats.id
              AND user_id = auth.uid()
              AND status = 'accepted'
        )
    );

CREATE POLICY chats_insert ON dynamic_chats
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY chats_update ON dynamic_chats
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY chat_members_select ON dynamic_chat_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM dynamic_chats dc
            WHERE dc.id = dynamic_chat_members.chat_id AND dc.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM dynamic_chat_members dcm
            WHERE dcm.chat_id = dynamic_chat_members.chat_id
              AND dcm.user_id = auth.uid()
              AND dcm.status = 'accepted'
        )
    );

CREATE POLICY chat_members_insert ON dynamic_chat_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM dynamic_chats dc
            WHERE dc.id = dynamic_chat_members.chat_id AND dc.creator_id = auth.uid()
        )
    );

CREATE POLICY chat_members_update_self ON dynamic_chat_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY chat_messages_select ON dynamic_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM dynamic_chat_members
            WHERE chat_id = dynamic_chat_messages.chat_id
              AND user_id = auth.uid()
              AND status = 'accepted'
        )
        OR EXISTS (
            SELECT 1 FROM dynamic_chats
            WHERE id = dynamic_chat_messages.chat_id
              AND creator_id = auth.uid()
        )
    );

CREATE POLICY chat_messages_insert ON dynamic_chat_messages
    FOR INSERT WITH CHECK (
        author_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM dynamic_chat_members
                WHERE chat_id = dynamic_chat_messages.chat_id
                  AND user_id = auth.uid()
                  AND status = 'accepted'
            )
            OR EXISTS (
                SELECT 1 FROM dynamic_chats
                WHERE id = dynamic_chat_messages.chat_id
                  AND creator_id = auth.uid()
            )
        )
    );

CREATE POLICY hpo_profile_select ON user_hpo_profile
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY hpo_profile_insert ON user_hpo_profile
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY proposals_select ON lens_proposals
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY proposals_insert ON lens_proposals
    FOR INSERT WITH CHECK (user_id = auth.uid());
