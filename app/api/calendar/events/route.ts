import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createDailyRoom, createMeetingToken } from '@/lib/daily'

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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query params are required' },
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

    // Get event IDs where user is a participant
    const { data: participantRows } = await supabaseAdmin
      .from('event_participants')
      .select('event_id')
      .eq('user_id', profileId)

    const participantEventIds = (participantRows ?? []).map((r) => r.event_id)
    const orConditions = [`created_by.eq.${profileId}`]
    if (participantEventIds.length > 0) {
      orConditions.push(`id.in.(${participantEventIds.join(',')})`)
    }

    const { data: events, error } = await supabaseAdmin
      .from('calendar_events')
      .select(
        `
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        color,
        created_by,
        created_at,
        call_id,
        calls:call_id (
          id,
          daily_room_url,
          status
        ),
        event_participants (
          id,
          user_id,
          profiles:user_id (
            id,
            name,
            avatar_url
          )
        )
      `
      )
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .or(orConditions.join(','))
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Failed to fetch calendar events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Normalize participants shape (Supabase returns nested arrays for relations)
    const normalized = (events ?? []).map((e) => {
      const call = Array.isArray(e.calls) ? e.calls[0] : e.calls
      return {
        id: e.id,
        title: e.title,
        description: e.description ?? null,
        event_date: e.event_date,
        start_time: e.start_time,
        end_time: e.end_time,
        color: e.color ?? null,
        created_by: e.created_by ?? null,
        created_at: e.created_at,
        call_id: e.call_id ?? null,
        call: call
          ? {
              id: (call as { id: string }).id,
              daily_room_url: (call as { daily_room_url: string }).daily_room_url,
              status: (call as { status: string }).status,
            }
          : null,
        participants: (e.event_participants ?? []).map((p: { profiles?: unknown }) => {
          const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
          return profile
            ? {
                id: (profile as { id: string }).id,
                name: (profile as { name: string }).name,
                avatar_url: (profile as { avatar_url: string | null }).avatar_url ?? null,
              }
            : null
        }).filter(Boolean),
      }
    })

    return NextResponse.json(normalized)
  } catch (err) {
    console.error('GET /api/calendar/events error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      color,
      participantIds = [],
      attachCall = false,
    } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }
    if (!eventDate || typeof eventDate !== 'string') {
      return NextResponse.json(
        { error: 'eventDate is required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }
    if (!startTime || typeof startTime !== 'string') {
      return NextResponse.json(
        { error: 'startTime is required (HH:mm)' },
        { status: 400 }
      )
    }
    if (!endTime || typeof endTime !== 'string') {
      return NextResponse.json(
        { error: 'endTime is required (HH:mm)' },
        { status: 400 }
      )
    }

    const participantIdsArr = Array.isArray(participantIds)
      ? participantIds.filter((id): id is string => typeof id === 'string')
      : []

    // Ensure creator is always in participants (if using profile IDs)
    const allParticipantIds = new Set<string>([profileId, ...participantIdsArr])

    const insertPayload = {
      title: title.trim(),
      description: description && typeof description === 'string' ? description.trim() : null,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      color: color && typeof color === 'string' ? color.trim() : null,
      created_by: profileId,
    }

    const { data: newEvent, error: insertError } = await supabaseAdmin
      .from('calendar_events')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to create calendar event:', insertError)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    if (!newEvent?.id) {
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    // Add participants (creator + selected participants)
    const participantRows = Array.from(allParticipantIds).map((uid) => ({
      event_id: newEvent.id,
      user_id: uid,
    }))

    if (participantRows.length > 0) {
      const { error: participantsError } = await supabaseAdmin
        .from('event_participants')
        .insert(participantRows)

      if (participantsError) {
        console.error('Failed to add event participants:', participantsError)
        // Event was created; we could optionally rollback or leave as creator-only
        return NextResponse.json(
          { error: 'Event created but failed to add some participants' },
          { status: 500 }
        )
      }
    }

    // Create a video call if attachCall is true
    let callId: string | undefined
    let callUrl: string | undefined

    if (attachCall) {
      try {
        // Create Daily room
        const dailyRoom = await createDailyRoom()

        // Insert call record into database
        const { data: newCall, error: callInsertError } = await supabaseAdmin
          .from('calls')
          .insert({
            daily_room_name: dailyRoom.name,
            daily_room_url: dailyRoom.url,
            title: title.trim(),
            started_by: profileId,
            calendar_event_id: newEvent.id,
            status: 'active',
          })
          .select('id')
          .single()

        if (callInsertError || !newCall) {
          console.error('Failed to create call record:', callInsertError)
          // Event was created; continue without call
        } else {
          callId = newCall.id
          callUrl = dailyRoom.url

          // Update the calendar event with the call reference
          await supabaseAdmin
            .from('calendar_events')
            .update({ call_id: newCall.id })
            .eq('id', newEvent.id)

          // Add all participants to the call
          const callParticipantRows = Array.from(allParticipantIds).map((uid) => ({
            call_id: newCall.id,
            user_id: uid,
          }))

          if (callParticipantRows.length > 0) {
            const { error: callParticipantsError } = await supabaseAdmin
              .from('call_participants')
              .insert(callParticipantRows)

            if (callParticipantsError) {
              console.error('Failed to add call participants:', callParticipantsError)
              // Call was created; continue but log the error
            }
          }
        }
      } catch (error) {
        console.error('Failed to create Daily room for calendar event:', error)
        // Event was created; continue without call
      }
    }

    return NextResponse.json({
      id: newEvent.id,
      success: true,
      call_id: callId,
      call_url: callUrl,
    })
  } catch (err) {
    console.error('POST /api/calendar/events error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
