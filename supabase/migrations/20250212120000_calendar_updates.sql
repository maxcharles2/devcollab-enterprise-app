-- Calendar schema updates: add created_by, description, RLS policies, indexes

-- Add new columns to calendar_events
ALTER TABLE calendar_events
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN description TEXT;

-- Add indexes for efficient queries
CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);

-- Drop existing policies if any (initial schema enabled RLS but may not have calendar policies)
-- Calendar tables had RLS enabled but no explicit policies - default deny

-- calendar_events RLS policies
CREATE POLICY "Users can view events they created or participate in"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = calendar_events.id
        AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only event creator can update"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Only event creator can delete"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- event_participants RLS policies (for calendar-related access)
CREATE POLICY "Users can view participants for events they can see"
  ON event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events e
      WHERE e.id = event_participants.event_id
        AND (
          e.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM event_participants ep2
            WHERE ep2.event_id = e.id AND ep2.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Event creator can add participants"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events e
      WHERE e.id = event_participants.event_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "Event creator can remove participants"
  ON event_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events e
      WHERE e.id = event_participants.event_id
        AND e.created_by = auth.uid()
    )
  );
