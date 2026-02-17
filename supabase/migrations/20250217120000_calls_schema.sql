-- Calls schema: video/audio call sessions with Daily.co integration

-- Calls table to track call sessions
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_room_name TEXT NOT NULL UNIQUE,
  daily_room_url TEXT NOT NULL,
  title TEXT,
  started_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Call participants for tracking who joined
CREATE TABLE call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(call_id, user_id)
);

-- Add call reference to calendar_events
ALTER TABLE calendar_events 
  ADD COLUMN call_id UUID REFERENCES calls(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_calendar_event ON calls(calendar_event_id);
CREATE INDEX idx_calls_chat ON calls(chat_id);
CREATE INDEX idx_calls_started_by ON calls(started_by);
CREATE INDEX idx_call_participants_call ON call_participants(call_id);
CREATE INDEX idx_call_participants_user ON call_participants(user_id);

-- Enable RLS on calls tables
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- Calls RLS policies
-- Users can view calls they started, participate in, or are linked to events/chats they have access to
CREATE POLICY "Users can view calls they have access to"
  ON calls FOR SELECT
  TO authenticated
  USING (
    started_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM call_participants cp
      WHERE cp.call_id = calls.id
        AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = calls.calendar_event_id
        AND (
          ce.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = ce.id AND ep.user_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM chat_participants chp
      WHERE chp.chat_id = calls.chat_id
        AND chp.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Call starter can update call"
  ON calls FOR UPDATE
  TO authenticated
  USING (started_by = auth.uid())
  WITH CHECK (started_by = auth.uid());

CREATE POLICY "Call starter can delete call"
  ON calls FOR DELETE
  TO authenticated
  USING (started_by = auth.uid());

-- Call participants RLS policies
CREATE POLICY "Users can view participants for calls they have access to"
  ON call_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calls c
      WHERE c.id = call_participants.call_id
        AND (
          c.started_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM call_participants cp2
            WHERE cp2.call_id = c.id AND cp2.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Authenticated users can join calls"
  ON call_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON call_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave calls"
  ON call_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
