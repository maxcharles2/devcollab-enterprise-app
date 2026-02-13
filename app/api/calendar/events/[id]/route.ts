import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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
        { error: 'Event ID is required' },
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

    const { data: event, error } = await supabaseAdmin
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
      .eq('id', id)
      .single()

    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // User must be creator or participant to view
    const isCreator = event.created_by === profileId
    const participantRows = (event.event_participants ?? []) as { user_id: string }[]
    const isParticipant = participantRows.some((p) => p.user_id === profileId)

    if (!isCreator && !isParticipant) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const participants = (event.event_participants ?? []).map(
      (p: { profiles?: unknown }) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
        return profile
          ? {
              id: (profile as { id: string }).id,
              name: (profile as { name: string }).name,
              avatar_url:
                (profile as { avatar_url: string | null }).avatar_url ?? null,
            }
          : null
      }
    ).filter(Boolean)

    const normalized = {
      id: event.id,
      title: event.title,
      description: event.description ?? null,
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      color: event.color ?? null,
      created_by: event.created_by ?? null,
      created_at: event.created_at,
      participants,
    }

    return NextResponse.json(normalized)
  } catch (err) {
    console.error('GET /api/calendar/events/[id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
        { error: 'Event ID is required' },
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

    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('calendar_events')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (existingEvent.created_by !== profileId) {
      return NextResponse.json(
        { error: 'Only the event creator can update this event' },
        { status: 403 }
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
      participantIds,
    } = body

    const updatePayload: Record<string, unknown> = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json(
          { error: 'title must be a non-empty string' },
          { status: 400 }
        )
      }
      updatePayload.title = title.trim()
    }

    if (description !== undefined) {
      updatePayload.description =
        description && typeof description === 'string'
          ? description.trim()
          : null
    }

    if (eventDate !== undefined) {
      if (typeof eventDate !== 'string') {
        return NextResponse.json(
          { error: 'eventDate must be YYYY-MM-DD' },
          { status: 400 }
        )
      }
      updatePayload.event_date = eventDate
    }

    if (startTime !== undefined) {
      if (typeof startTime !== 'string') {
        return NextResponse.json(
          { error: 'startTime must be HH:mm' },
          { status: 400 }
        )
      }
      updatePayload.start_time = startTime
    }

    if (endTime !== undefined) {
      if (typeof endTime !== 'string') {
        return NextResponse.json(
          { error: 'endTime must be HH:mm' },
          { status: 400 }
        )
      }
      updatePayload.end_time = endTime
    }

    if (color !== undefined) {
      updatePayload.color =
        color && typeof color === 'string' ? color.trim() : null
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('calendar_events')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        console.error('Failed to update calendar event:', updateError)
        return NextResponse.json(
          { error: 'Failed to update event' },
          { status: 500 }
        )
      }
    }

    // Handle participant list changes
    if (participantIds !== undefined) {
      const participantIdsArr = Array.isArray(participantIds)
        ? participantIds.filter((pid): pid is string => typeof pid === 'string')
        : []

      const allParticipantIds = new Set<string>([profileId, ...participantIdsArr])

      const { data: currentParticipants } = await supabaseAdmin
        .from('event_participants')
        .select('user_id')
        .eq('event_id', id)

      const currentIds = new Set(
        (currentParticipants ?? []).map((p) => p.user_id)
      )

      const toAdd = [...allParticipantIds].filter((uid) => !currentIds.has(uid))
      const toRemove = [...currentIds].filter((uid) => !allParticipantIds.has(uid))

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from('event_participants')
          .delete()
          .eq('event_id', id)
          .in('user_id', toRemove)

        if (deleteError) {
          console.error('Failed to remove event participants:', deleteError)
          return NextResponse.json(
            { error: 'Failed to update participants' },
            { status: 500 }
          )
        }
      }

      if (toAdd.length > 0) {
        const participantRows = toAdd.map((uid) => ({
          event_id: id,
          user_id: uid,
        }))

        const { error: insertError } = await supabaseAdmin
          .from('event_participants')
          .insert(participantRows)

        if (insertError) {
          console.error('Failed to add event participants:', insertError)
          return NextResponse.json(
            { error: 'Failed to update participants' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/calendar/events/[id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
        { error: 'Event ID is required' },
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

    const { data: event, error: fetchError } = await supabaseAdmin
      .from('calendar_events')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (event.created_by !== profileId) {
      return NextResponse.json(
        { error: 'Only the event creator can delete this event' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete calendar event:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/calendar/events/[id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
