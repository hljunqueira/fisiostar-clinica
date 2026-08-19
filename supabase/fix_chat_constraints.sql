-- Fix constraints on chat_channels and chat_participants
ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_created_by_fkey;
ALTER TABLE chat_channels ALTER COLUMN created_by DROP NOT NULL;

-- Ensure system_users references are correct
ALTER TABLE chat_participants DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;
ALTER TABLE chat_participants ADD CONSTRAINT chat_participants_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE;

-- Ensure RLS is disabled or allows public for demo / anon
ALTER TABLE chat_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
