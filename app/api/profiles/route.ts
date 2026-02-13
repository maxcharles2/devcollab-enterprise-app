import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

/** List profiles for participant selection (e.g. calendar events). Supports optional search. */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''

    let query = supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url')
      .order('name', { ascending: true })

    if (q) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: profiles, error } = await query.limit(50)

    if (error) {
      console.error('Failed to fetch profiles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      )
    }

    const normalized = (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name ?? 'Unknown',
      avatar_url: p.avatar_url ?? null,
    }))

    return NextResponse.json(normalized)
  } catch (err) {
    console.error('GET /api/profiles error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
