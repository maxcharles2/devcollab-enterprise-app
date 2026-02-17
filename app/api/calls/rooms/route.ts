import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createDailyRoom, getDailyRoom, createMeetingToken } from '@/lib/daily'

/** Helper to get or create profile ID from Clerk userId */
async function getOrCreateProfileId(userId: string): Promise<string | null> {
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (existingProfile?.id) return existingProfile.id

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const name =
    clerkUser.firstName && clerkUser.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
      : clerkUser.firstName ?? clerkUser.username ?? 'Unknown'
  const email =
    clerkUser.emailAddresses?.[0]?.emailAddress ?? `${userId}@placeholder.local`
  const avatarUrl = clerkUser.imageUrl ?? null

  const { data: newProfile, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      clerk_user_id: userId,
      name,
      email,
      avatar_url: avatarUrl,
    })
    .select('id')
    .single()

  if (error || !newProfile) return null
  return newProfile.id
}

/** Helper to get profile details by ID */
async function getProfileById(
  profileId: string
): Promise<{ id: string; name: string; avatar_url: string | null } | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('id', profileId)
    .single()

  return data
}

/**
 * POST /api/calls/rooms - Create a Daily room only (without full call record)
 *
 * This is useful for:
 * - Pre-creating rooms for scheduled calendar events
 * - Creating temporary rooms for quick calls
 *
 * Request body:
 * - roomName?: string - Optional custom room name
 * - expiresIn?: number - Hours until room expires (default: 24)
 *
 * Response:
 * - roomName: string
 * - roomUrl: string
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileId = await getOrCreateProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Failed to resolve user profile' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { roomName, expiresIn = 24 } = body

    // Validate expiresIn
    const hours = typeof expiresIn === 'number' && expiresIn > 0 ? Math.min(expiresIn, 168) : 24 // Max 1 week

    try {
      const room = await createDailyRoom({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + hours * 60 * 60,
        },
      })

      return NextResponse.json({
        roomName: room.name,
        roomUrl: room.url,
        expiresAt: new Date((room.config.exp || 0) * 1000).toISOString(),
      })
    } catch (error) {
      console.error('Failed to create Daily room:', error)
      return NextResponse.json(
        { error: 'Failed to create room' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('POST /api/calls/rooms error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/calls/rooms - Get room info and generate a token
 *
 * Query parameters:
 * - roomName: string - The Daily room name
 *
 * Response:
 * - roomName: string
 * - roomUrl: string
 * - token: string - Meeting token for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileId = await getOrCreateProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Failed to resolve user profile' },
        { status: 500 }
      )
    }

    const userProfile = await getProfileById(profileId)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const roomName = searchParams.get('roomName')

    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName query parameter is required' },
        { status: 400 }
      )
    }

    // Check if room exists
    const room = await getDailyRoom(roomName)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Generate meeting token
    let token
    try {
      token = await createMeetingToken({
        properties: {
          room_name: roomName,
          user_name: userProfile.name,
          user_id: profileId,
          is_owner: false,
        },
      })
    } catch (error) {
      console.error('Failed to create meeting token:', error)
      return NextResponse.json(
        { error: 'Failed to generate meeting token' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      roomName: room.name,
      roomUrl: room.url,
      token,
    })
  } catch (err) {
    console.error('GET /api/calls/rooms error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
