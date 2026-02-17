/**
 * Daily.co API helpers for server-side room and token management.
 *
 * This module wraps the Daily REST API to:
 * - Create rooms with appropriate settings
 * - Generate meeting tokens for participants
 * - Delete rooms when calls end
 */

const DAILY_API_KEY = process.env.DAILY_API_KEY
const DAILY_API_BASE = 'https://api.daily.co/v1'

if (!DAILY_API_KEY) {
  console.warn('DAILY_API_KEY is not set. Video calls will not work.')
}

export interface DailyRoom {
  id: string
  name: string
  url: string
  created_at: string
  config: {
    max_participants?: number
    enable_screenshare?: boolean
    enable_chat?: boolean
    enable_knocking?: boolean
    start_video_off?: boolean
    start_audio_off?: boolean
    exp?: number
  }
}

export interface DailyRoomConfig {
  name?: string
  privacy?: 'public' | 'private'
  properties?: {
    max_participants?: number
    enable_screenshare?: boolean
    enable_chat?: boolean
    enable_knocking?: boolean
    start_video_off?: boolean
    start_audio_off?: boolean
    exp?: number // Unix timestamp for room expiration
    eject_at_room_exp?: boolean
  }
}

export interface DailyMeetingToken {
  token: string
}

export interface DailyMeetingTokenConfig {
  properties: {
    room_name: string
    user_name?: string
    user_id?: string
    is_owner?: boolean
    enable_screenshare?: boolean
    start_video_off?: boolean
    start_audio_off?: boolean
    exp?: number // Unix timestamp for token expiration
  }
}

/**
 * Create a new Daily room with the specified configuration.
 */
export async function createDailyRoom(
  config: DailyRoomConfig = {}
): Promise<DailyRoom> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured')
  }

  // Generate a unique room name if not provided
  const roomName =
    config.name || `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Default room settings for enterprise collaboration
  const roomConfig: DailyRoomConfig = {
    name: roomName,
    privacy: config.privacy || 'private',
    properties: {
      max_participants: 6, // Keep calls manageable
      enable_screenshare: true,
      enable_chat: true,
      enable_knocking: false, // Users join directly with tokens
      start_video_off: false,
      start_audio_off: false,
      // Room expires after 24 hours by default
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      eject_at_room_exp: true,
      ...config.properties,
    },
  }

  const response = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify(roomConfig),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to create Daily room:', error)
    throw new Error(`Failed to create Daily room: ${response.status}`)
  }

  return response.json()
}

/**
 * Get an existing Daily room by name.
 */
export async function getDailyRoom(roomName: string): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured')
  }

  const response = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to get Daily room:', error)
    throw new Error(`Failed to get Daily room: ${response.status}`)
  }

  return response.json()
}

/**
 * Delete a Daily room by name.
 */
export async function deleteDailyRoom(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured')
  }

  const response = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    console.error('Failed to delete Daily room:', error)
    throw new Error(`Failed to delete Daily room: ${response.status}`)
  }
}

/**
 * Generate a meeting token for a participant.
 * Tokens are required for private rooms and provide user identity.
 */
export async function createMeetingToken(
  config: DailyMeetingTokenConfig
): Promise<string> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured')
  }

  // Default token settings
  const tokenConfig: DailyMeetingTokenConfig = {
    properties: {
      room_name: config.properties.room_name,
      user_name: config.properties.user_name,
      user_id: config.properties.user_id,
      is_owner: config.properties.is_owner ?? false,
      enable_screenshare: config.properties.enable_screenshare ?? true,
      start_video_off: config.properties.start_video_off ?? false,
      start_audio_off: config.properties.start_audio_off ?? false,
      // Token expires in 1 hour by default
      exp: config.properties.exp || Math.floor(Date.now() / 1000) + 60 * 60,
    },
  }

  const response = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify(tokenConfig),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to create meeting token:', error)
    throw new Error(`Failed to create meeting token: ${response.status}`)
  }

  const data: DailyMeetingToken = await response.json()
  return data.token
}
