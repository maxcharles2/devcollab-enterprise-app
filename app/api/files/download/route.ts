import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storagePath = searchParams.get('path') ?? searchParams.get('storagePath')

    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json(
        { error: 'Missing path parameter. Use ?path= or ?storagePath=' },
        { status: 400 }
      )
    }

    // Prevent path traversal
    if (storagePath.includes('..') || storagePath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const { data } = supabaseAdmin.storage
      .from('attachments')
      .getPublicUrl(storagePath)

    return NextResponse.redirect(data.publicUrl)
  } catch (err) {
    console.error('GET /api/files/download error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
