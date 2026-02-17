import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createDailyRoom, createMeetingToken } from '@/lib/daily'
import type { CreateCallInput, CreateCallResponse, Call } from '@/lib/types'

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
 * POST /api/calls - Create a new call
 *
 * Request body (CreateCallInput):
 * - title?: string - Optional call title
 * - participantIds: string[] - Profile IDs to invite
 * - calendarEventId?: string - Link to calendar event
 * - chatId?: string - Link to chat/DM
 *
 * Response (CreateCallResponse):
 * - id: string - Call ID
 * - roomUrl: string - Daily room URL
 * - token: string - Join token for creator
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

    // Get the creator's profile for the meeting token
    const creatorProfile = await getProfileById(profileId)
    if (!creatorProfile) {
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      )
    }

    const body: CreateCallInput = await request.json()
    const { title, participantIds = [], calendarEventId, chatId } = body

    // Validate participantIds is an array
    const validParticipantIds = Array.isArray(participantIds)
      ? participantIds.filter((id): id is string => typeof id === 'string')
      : []

    // Ensure creator is always a participant
    const allParticipantIds = new Set<string>([profileId, ...validParticipantIds])

    // Create Daily room
    let dailyRoom
    try {
      dailyRoom = await createDailyRoom()
    } catch (error) {
      console.error('Failed to create Daily room:', error)
      return NextResponse.json(
        { error: 'Failed to create video room' },
        { status: 500 }
      )
    }

    // Insert call record into database
    const { data: newCall, error: insertError } = await supabaseAdmin
      .from('calls')
      .insert({
        daily_room_name: dailyRoom.name,
        daily_room_url: dailyRoom.url,
        title: title?.trim() || null,
        started_by: profileId,
        calendar_event_id: calendarEventId || null,
        chat_id: chatId || null,
        status: 'active',
      })
      .select('id')
      .single()

    if (insertError || !newCall) {
      console.error('Failed to create call record:', insertError)
      // Try to clean up the Daily room since we couldn't save the call
      return NextResponse.json(
        { error: 'Failed to create call' },
        { status: 500 }
      )
    }

    // Add all participants to the call
    const participantRows = Array.from(allParticipantIds).map((uid) => ({
      call_id: newCall.id,
      user_id: uid,
    }))

    if (participantRows.length > 0) {
      const { error: participantsError } = await supabaseAdmin
        .from('call_participants')
        .insert(participantRows)

      if (participantsError) {
        console.error('Failed to add call participants:', participantsError)
        // Call was created; continue but log the error
      }
    }

    // Update calendar event with call reference if provided
    if (calendarEventId) {
      const { error: updateError } = await supabaseAdmin
        .from('calendar_events')
        .update({ call_id: newCall.id })
        .eq('id', calendarEventId)

      if (updateError) {
        console.error('Failed to link call to calendar event:', updateError)
        // Non-critical error, continue
      }
    }

    // Generate meeting token for the creator
    let token
    try {
      token = await createMeetingToken({
        properties: {
          room_name: dailyRoom.name,
          user_name: creatorProfile.name,
          user_id: profileId,
          is_owner: true, // Creator is the room owner
        },
      })
    } catch (error) {
      console.error('Failed to create meeting token:', error)
      return NextResponse.json(
        { error: 'Failed to generate meeting token' },
        { status: 500 }
      )
    }

    const response: CreateCallResponse = {
      id: newCall.id,
      roomUrl: dailyRoom.url,
      token,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('POST /api/calls error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/calls - List active calls for the current user
 *
 * Query parameters:
 * - status?: 'active' | 'ended' | 'all' - Filter by status (default: 'active')
 *
 * Response: Call[]
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

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'active'

    // Get call IDs where user is a participant
    const { data: participantRows } = await supabaseAdmin
      .from('call_participants')
      .select('call_id')
      .eq('user_id', profileId)

    const participantCallIds = (participantRows ?? []).map((r) => r.call_id)

    // Build OR conditions: user started the call OR is a participant
    const orConditions = [`started_by.eq.${profileId}`]
    if (participantCallIds.length > 0) {
      orConditions.push(`id.in.(${participantCallIds.join(',')})`)
    }

    // Build query
    let query = supabaseAdmin
      .from('calls')
      .select(
        `
        id,
        daily_room_name,
        daily_room_url,
        title,
        started_by,
        calendar_event_id,
        chat_id,
        status,
        started_at,
        ended_at,
        created_at,
        starter:started_by (
          id,
          name,
          avatar_url
        ),
        call_participants (
          id,
          user_id,
          joined_at,
          left_at,
          user:user_id (
            id,
            name,
            avatar_url
          )
        )
      `
      )
      .or(orConditions.join(','))
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter === 'active') {
      query = query.eq('status', 'active')
    } else if (statusFilter === 'ended') {
      query = query.eq('status', 'ended')
    }
    // 'all' returns both statuses

    const { data: calls, error } = await query

    if (error) {
      console.error('Failed to fetch calls:', error)
      return NextResponse.json(
        { error: 'Failed to fetch calls' },
        { status: 500 }
      )
    }

    // Normalize the response
    const normalized: Call[] = (calls ?? []).map((c) => {
      const starter = Array.isArray(c.starter) ? c.starter[0] : c.starter
      const participants = (c.call_participants ?? []).map(
        (p: { id: string; user_id: string; joined_at: string; left_at: string | null; user?: unknown }) => {
          const user = Array.isArray(p.user) ? p.user[0] : p.user
          return {
            id: p.id,
            user_id: p.user_id,
            joined_at: p.joined_at,
            left_at: p.left_at,
            user: user
              ? {
                  id: (user as { id: string }).id,
                  name: (user as { name: string }).name,
                  avatar_url: (user as { avatar_url: string | null }).avatar_url,
                }
              : undefined,
          }
        }
      )

      return {
        id: c.id,
        daily_room_name: c.daily_room_name,
        daily_room_url: c.daily_room_url,
        title: c.title,
        started_by: c.started_by,
        calendar_event_id: c.calendar_event_id,
        chat_id: c.chat_id,
        status: c.status,
        started_at: c.started_at,
        ended_at: c.ended_at,
        created_at: c.created_at,
        starter: starter
          ? {
              id: (starter as { id: string }).id,
              name: (starter as { name: string }).name,
              avatar_url: (starter as { avatar_url: string | null }).avatar_url,
            }
          : undefined,
        participants,
      }
    })

    return NextResponse.json(normalized)
  } catch (err) {
    console.error('GET /api/calls error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
