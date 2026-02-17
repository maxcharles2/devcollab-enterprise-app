import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find current user's profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (profileError || !profile) {
    // User may not have a profile yet (e.g. first visit) - return empty list
    return NextResponse.json([])
  }

  // Get chat IDs where user is a participant
  const { data: participations, error: partError } = await supabaseAdmin
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', profile.id)

  if (partError) {
    console.error('Failed to fetch chat participations:', partError)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }

  if (!participations?.length) {
    return NextResponse.json([])
  }

  const chatIds = participations.map((p) => p.chat_id)

  // Fetch chats and their participants (many-to-many through chat_participants)
  const { data: chats, error: chatsError } = await supabaseAdmin
    .from('chats')
    .select(`
      id,
      name,
      is_group,
      profiles (
        id,
        name,
        avatar_url
      )
    `)
    .in('id', chatIds)

  if (chatsError) {
    console.error('Failed to fetch chats:', chatsError)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }

  // Normalize response: Supabase returns profiles as array for many-to-many
  const normalized = (chats ?? []).map((chat) => {
    const rawProfiles = chat.profiles
    const participants = Array.isArray(rawProfiles)
      ? rawProfiles.map((p: { id: string; name: string; avatar_url: string | null }) => ({
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
        }))
      : []

    return {
      id: chat.id,
      name: chat.name,
      isGroup: chat.is_group ?? false,
      participants,
    }
  })

  return NextResponse.json(normalized)
}

// POST /api/chats - Create or get existing DM
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let targetUserId: string
  try {
    const body = await request.json()
    targetUserId = body.targetUserId
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId is required' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  // Get current user's profile
  const { data: currentProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .eq('clerk_user_id', userId)
    .single()

  if (profileError || !currentProfile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    )
  }

  // Prevent creating DM with yourself
  if (currentProfile.id === targetUserId) {
    return NextResponse.json(
      { error: 'Cannot create DM with yourself' },
      { status: 400 }
    )
  }

  // Verify target user exists
  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('id', targetUserId)
    .single()

  if (targetError || !targetProfile) {
    return NextResponse.json(
      { error: 'Target user not found' },
      { status: 404 }
    )
  }

  // Check if DM already exists between these two users
  // Find all non-group chats where current user is a participant
  const { data: currentUserChats, error: chatsError } = await supabaseAdmin
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', currentProfile.id)

  if (chatsError) {
    console.error('Failed to fetch user chats:', chatsError)
    return NextResponse.json(
      { error: 'Failed to check existing chats' },
      { status: 500 }
    )
  }

  if (currentUserChats && currentUserChats.length > 0) {
    const chatIds = currentUserChats.map((p) => p.chat_id)

    // Find chats where target user is also a participant
    const { data: sharedChats, error: sharedError } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', targetUserId)
      .in('chat_id', chatIds)

    if (sharedError) {
      console.error('Failed to check shared chats:', sharedError)
      return NextResponse.json(
        { error: 'Failed to check existing chats' },
        { status: 500 }
      )
    }

    if (sharedChats && sharedChats.length > 0) {
      const sharedChatIds = sharedChats.map((p) => p.chat_id)

      // Check if any of these shared chats is a DM (not a group)
      const { data: existingDM, error: dmError } = await supabaseAdmin
        .from('chats')
        .select('id, name, is_group')
        .in('id', sharedChatIds)
        .eq('is_group', false)
        .limit(1)
        .single()

      if (!dmError && existingDM) {
        // DM already exists, return it with participant info
        return NextResponse.json({
          id: existingDM.id,
          name: existingDM.name,
          isGroup: false,
          participants: [
            {
              id: currentProfile.id,
              name: currentProfile.name,
              avatar_url: null,
            },
            {
              id: targetProfile.id,
              name: targetProfile.name,
              avatar_url: targetProfile.avatar_url,
            },
          ],
          isExisting: true,
        })
      }
    }
  }

  // No existing DM found, create a new one
  const { data: newChat, error: createError } = await supabaseAdmin
    .from('chats')
    .insert({
      name: null, // DMs typically don't have names, display target user's name in UI
      is_group: false,
    })
    .select('id, name, is_group')
    .single()

  if (createError || !newChat) {
    console.error('Failed to create chat:', createError)
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    )
  }

  // Add both participants to the chat
  const { error: participantsError } = await supabaseAdmin
    .from('chat_participants')
    .insert([
      { chat_id: newChat.id, user_id: currentProfile.id },
      { chat_id: newChat.id, user_id: targetUserId },
    ])

  if (participantsError) {
    console.error('Failed to add participants:', participantsError)
    // Clean up the created chat
    await supabaseAdmin.from('chats').delete().eq('id', newChat.id)
    return NextResponse.json(
      { error: 'Failed to create chat participants' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    id: newChat.id,
    name: newChat.name,
    isGroup: false,
    participants: [
      {
        id: currentProfile.id,
        name: currentProfile.name,
        avatar_url: null,
      },
      {
        id: targetProfile.id,
        name: targetProfile.name,
        avatar_url: targetProfile.avatar_url,
      },
    ],
    isExisting: false,
  })
}
