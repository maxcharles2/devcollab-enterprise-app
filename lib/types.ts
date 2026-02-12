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
}
