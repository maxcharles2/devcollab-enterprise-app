-- Enable Supabase Realtime for the messages table
-- This allows clients to subscribe to INSERT, UPDATE, DELETE events on messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Use full replica identity so realtime payloads include full row data (sender_id, content, etc.)
-- This avoids an extra API fetch when receiving new messages via subscription
ALTER TABLE messages REPLICA IDENTITY FULL;
