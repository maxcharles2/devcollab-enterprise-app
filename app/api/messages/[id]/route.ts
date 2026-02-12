import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

async function getProfileId(clerkUserId: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()
  return data?.id ?? null
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
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    const profileId = await getProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 403 }
      )
    }

    const { data: message, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('sender_id')
      .eq('id', id)
      .single()

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.sender_id !== profileId) {
      return NextResponse.json(
        { error: 'You can only edit your own messages' },
        { status: 403 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ content: content.trim() })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update message:', updateError)
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/messages/[id] error:', err)
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
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    const profileId = await getProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 403 }
      )
    }

    const { data: message, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('sender_id')
      .eq('id', id)
      .single()

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.sender_id !== profileId) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete message:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/messages/[id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
