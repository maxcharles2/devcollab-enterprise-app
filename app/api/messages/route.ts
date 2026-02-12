import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channelId = searchParams.get('channelId')
  const chatId = searchParams.get('chatId')

  if (!channelId && !chatId) {
    return NextResponse.json(
      { error: 'Either channelId or chatId is required' },
      { status: 400 }
    )
  }

  if (channelId && chatId) {
    return NextResponse.json(
      { error: 'Provide either channelId or chatId, not both' },
      { status: 400 }
    )
  }

  let query = supabaseAdmin
    .from('messages')
    .select(
      `
      id,
      content,
      created_at,
      sender:profiles (
        id,
        name,
        avatar_url
      )
    `
    )
    .order('created_at', { ascending: true })

  if (channelId) {
    query = query.eq('channel_id', channelId)
  } else if (chatId) {
    query = query.eq('chat_id', chatId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }

  // Normalize sender shape (Supabase returns array for single relation)
  const messages = (data ?? []).map((m) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
  }))

  return NextResponse.json(messages)
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, channelId, chatId } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    if (!channelId && !chatId) {
      return NextResponse.json(
        { error: 'Either channelId or chatId is required' },
        { status: 400 }
      )
    }

    if (channelId && chatId) {
      return NextResponse.json(
        { error: 'Provide either channelId or chatId, not both' },
        { status: 400 }
      )
    }

    // Find or create profile
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    let profileId = existingProfile?.id

    if (!profileId) {
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(userId)
      const name =
        clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
          : clerkUser.firstName ?? clerkUser.username ?? 'Unknown'
      const email =
        clerkUser.emailAddresses?.[0]?.emailAddress ?? `${userId}@placeholder.local`
      const avatarUrl = clerkUser.imageUrl ?? null

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          clerk_user_id: userId,
          name,
          email,
          avatar_url: avatarUrl,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Failed to create profile:', insertError)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }
      profileId = newProfile.id
    }

    const insertPayload: Record<string, unknown> = {
      sender_id: profileId,
      content: content.trim(),
    }

    if (channelId) {
      insertPayload.channel_id = channelId
    } else {
      insertPayload.chat_id = chatId
    }

    const { error: insertMsgError } = await supabaseAdmin
      .from('messages')
      .insert(insertPayload)

    if (insertMsgError) {
      console.error('Failed to insert message:', insertMsgError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/messages error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
