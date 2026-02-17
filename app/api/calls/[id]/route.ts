import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createMeetingToken, deleteDailyRoom } from '@/lib/daily'
import type { Call } from '@/lib/types'

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
 * GET /api/calls/[id] - Get call details and generate a join token
 *
 * Response:
 * - call: Call - Full call details
 * - token: string - Meeting token for the current user
 * - roomUrl: string - Daily room URL
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    const profileId = await getOrCreateProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Failed to resolve user profile' },
        { status: 500 }
      )
    }

    // Get user profile for meeting token
    const userProfile = await getProfileById(profileId)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      )
    }

    // Fetch the call with participants
    const { data: call, error } = await supabaseAdmin
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
      .eq('id', id)
      .single()

    if (error || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Check if user has access to this call
    const isStarter = call.started_by === profileId
    const participantRows = (call.call_participants ?? []) as { user_id: string }[]
    const isParticipant = participantRows.some((p) => p.user_id === profileId)

    // Also check if user is a participant in linked chat or calendar event
    let hasLinkedAccess = false

    if (call.chat_id) {
      const { data: chatParticipant } = await supabaseAdmin
        .from('chat_participants')
        .select('id')
        .eq('chat_id', call.chat_id)
        .eq('user_id', profileId)
        .single()

      if (chatParticipant) hasLinkedAccess = true
    }

    if (!hasLinkedAccess && call.calendar_event_id) {
      const { data: eventParticipant } = await supabaseAdmin
        .from('event_participants')
        .select('id')
        .eq('event_id', call.calendar_event_id)
        .eq('user_id', profileId)
        .single()

      if (eventParticipant) hasLinkedAccess = true
    }

    if (!isStarter && !isParticipant && !hasLinkedAccess) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Check if call is still active
    if (call.status === 'ended') {
      return NextResponse.json(
        { error: 'This call has ended' },
        { status: 410 } // Gone
      )
    }

    // Generate meeting token for the current user
    let token
    try {
      token = await createMeetingToken({
        properties: {
          room_name: call.daily_room_name,
          user_name: userProfile.name,
          user_id: profileId,
          is_owner: isStarter, // Call starter is the room owner
        },
      })
    } catch (error) {
      console.error('Failed to create meeting token:', error)
      return NextResponse.json(
        { error: 'Failed to generate meeting token' },
        { status: 500 }
      )
    }

    // Add user as participant if not already
    if (!isParticipant) {
      const { error: addError } = await supabaseAdmin
        .from('call_participants')
        .upsert(
          {
            call_id: id,
            user_id: profileId,
            joined_at: new Date().toISOString(),
          },
          { onConflict: 'call_id,user_id' }
        )

      if (addError) {
        console.error('Failed to add user as participant:', addError)
        // Non-critical, continue
      }
    }

    // Normalize the call response
    const starter = Array.isArray(call.starter) ? call.starter[0] : call.starter
    const participants = (call.call_participants ?? []).map(
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

    const normalizedCall: Call = {
      id: call.id,
      daily_room_name: call.daily_room_name,
      daily_room_url: call.daily_room_url,
      title: call.title,
      started_by: call.started_by,
      calendar_event_id: call.calendar_event_id,
      chat_id: call.chat_id,
      status: call.status,
      started_at: call.started_at,
      ended_at: call.ended_at,
      created_at: call.created_at,
      starter: starter
        ? {
            id: (starter as { id: string }).id,
            name: (starter as { name: string }).name,
            avatar_url: (starter as { avatar_url: string | null }).avatar_url,
          }
        : undefined,
      participants,
    }

    return NextResponse.json({
      call: normalizedCall,
      token,
      roomUrl: call.daily_room_url,
    })
  } catch (err) {
    console.error('GET /api/calls/[id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/calls/[id] - Update call (end call, update participant status)
 *
 * Request body:
 * - action: 'end' | 'leave' - Action to perform
 *
 * For 'end': Ends the call for all participants (only call starter can do this)
 * For 'leave': Current user leaves the call
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    const profileId = await getOrCreateProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Failed to resolve user profile' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (!action || !['end', 'leave'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "end" or "leave"' },
        { status: 400 }
      )
    }

    // Fetch the call
    const { data: call, error: fetchError } = await supabaseAdmin
      .from('calls')
      .select('id, daily_room_name, started_by, status')
      .eq('id', id)
      .single()

    if (fetchError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    if (call.status === 'ended') {
      return NextResponse.json(
        { error: 'This call has already ended' },
        { status: 410 }
      )
    }

    if (action === 'end') {
      // Only the call starter can end the call
      if (call.started_by !== profileId) {
        return NextResponse.json(
          { error: 'Only the call starter can end the call' },
          { status: 403 }
        )
      }

      // Update call status to ended
      const { error: updateError } = await supabaseAdmin
        .from('calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        console.error('Failed to end call:', updateError)
        return NextResponse.json(
          { error: 'Failed to end call' },
          { status: 500 }
        )
      }

      // Update all participants as left
      const { error: participantsError } = await supabaseAdmin
        .from('call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', id)
        .is('left_at', null)

      if (participantsError) {
        console.error('Failed to update participants:', participantsError)
        // Non-critical, continue
      }

      // Optionally delete the Daily room to clean up resources
      try {
        await deleteDailyRoom(call.daily_room_name)
      } catch (error) {
        console.error('Failed to delete Daily room:', error)
        // Non-critical, the room will expire on its own
      }

      return NextResponse.json({ success: true, status: 'ended' })
    } else if (action === 'leave') {
      // Update user's participant record to mark them as left
      const { error: leaveError } = await supabaseAdmin
        .from('call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', id)
        .eq('user_id', profileId)

      if (leaveError) {
        console.error('Failed to record leave:', leaveError)
        return NextResponse.json(
          { error: 'Failed to leave call' },
          { status: 500 }
        )
      }

      // Check if all participants have left - if so, end the call
      const { data: activeParticipants } = await supabaseAdmin
        .from('call_participants')
        .select('id')
        .eq('call_id', id)
        .is('left_at', null)

      if (!activeParticipants || activeParticipants.length === 0) {
        // All participants have left, end the call
        const { error: endError } = await supabaseAdmin
          .from('calls')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (endError) {
          console.error('Failed to auto-end call:', endError)
          // Non-critical
        }

        // Clean up Daily room
        try {
          await deleteDailyRoom(call.daily_room_name)
        } catch (error) {
          console.error('Failed to delete Daily room:', error)
        }

        return NextResponse.json({ success: true, status: 'ended', autoEnded: true })
      }

      return NextResponse.json({ success: true, status: 'left' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('PATCH /api/calls/[id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/calls/[id] - Delete a call (only for cleanup, not typical usage)
 *
 * Only the call starter can delete. This is mainly for cleanup of abandoned calls.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    const profileId = await getOrCreateProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Failed to resolve user profile' },
        { status: 500 }
      )
    }

    // Fetch the call
    const { data: call, error: fetchError } = await supabaseAdmin
      .from('calls')
      .select('id, daily_room_name, started_by')
      .eq('id', id)
      .single()

    if (fetchError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Only the starter can delete
    if (call.started_by !== profileId) {
      return NextResponse.json(
        { error: 'Only the call starter can delete this call' },
        { status: 403 }
      )
    }

    // Delete the Daily room first
    try {
      await deleteDailyRoom(call.daily_room_name)
    } catch (error) {
      console.error('Failed to delete Daily room:', error)
      // Continue with database deletion even if Daily cleanup fails
    }

    // Delete the call (cascade will remove participants)
    const { error: deleteError } = await supabaseAdmin
      .from('calls')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete call:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete call' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/calls/[id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
