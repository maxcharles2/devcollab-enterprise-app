import { NextResponse } from 'next/server'
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
