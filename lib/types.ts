// File attachment (from file_attachments table)
export interface FileAttachment {
  id: string
  name: string
  type: 'image' | 'doc' | 'pdf' | 'pptx' | 'xlsx'
  size: string
  storage_path: string
}

// API message shape from GET /api/messages
export interface ApiMessage {
  id: string
  content: string
  created_at: string
  sender: {
    id: string
    name: string
    avatar_url: string | null
  } | null
  file_attachment: FileAttachment | null
}

// Calendar event participant (from API response)
export interface CalendarEventParticipant {
  id: string
  name: string
  avatar_url: string | null
}

// API calendar event shape from GET /api/calendar/events and GET /api/calendar/events/[id]
export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string
  end_time: string
  color: string | null
  created_by: string | null
  created_at: string
  participants: CalendarEventParticipant[]
  call_id: string | null
  call?: Call
}

// Input for POST /api/calendar/events
export interface CreateCalendarEventInput {
  title: string
  description?: string
  eventDate: string
  startTime: string
  endTime: string
  color?: string
  participantIds?: string[]
}

// Input for PATCH /api/calendar/events/[id]
export interface UpdateCalendarEventInput {
  title?: string
  description?: string
  eventDate?: string
  startTime?: string
  endTime?: string
  color?: string
  participantIds?: string[]
}

// Call participant (from call_participants table)
export interface CallParticipant {
  id: string
  user_id: string
  joined_at: string
  left_at: string | null
  user?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

// Call session (from calls table)
export interface Call {
  id: string
  daily_room_name: string
  daily_room_url: string
  title: string | null
  started_by: string | null
  calendar_event_id: string | null
  chat_id: string | null
  status: 'active' | 'ended'
  started_at: string
  ended_at: string | null
  created_at: string
  participants?: CallParticipant[]
  starter?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

// Input for POST /api/calls
export interface CreateCallInput {
  title?: string
  participantIds: string[]
  calendarEventId?: string
  chatId?: string
}

// Response from POST /api/calls
export interface CreateCallResponse {
  id: string
  roomUrl: string
  token: string
}
