import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const MIME_TO_TYPE: Record<string, 'image' | 'doc' | 'pdf' | 'pptx' | 'xlsx'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

const ALLOWED_MIMES = new Set(Object.keys(MIME_TO_TYPE))

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Send as multipart/form-data with "file" field.' },
        { status: 400 }
      )
    }

    const mimeType = file.type
    if (!ALLOWED_MIMES.has(mimeType)) {
      return NextResponse.json(
        {
          error: `File type not allowed. Allowed: images, PDF, Word (.doc/.docx), PowerPoint (.pptx), Excel (.xlsx)`,
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
        },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${userId}/${timestamp}-${sanitizedName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('attachments')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    const type = MIME_TO_TYPE[mimeType]
    const size = formatFileSize(file.size)

    return NextResponse.json({
      storagePath,
      name: file.name,
      type,
      size,
    })
  } catch (err) {
    console.error('POST /api/files/upload error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
