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
