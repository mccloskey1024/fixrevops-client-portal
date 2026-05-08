import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

// Upload constraints. Tweak these in one place if needed.
const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXTENSIONS = new Set([
  // Documents
  'pdf',
  'doc', 'docx',
  'xls', 'xlsx',
  'ppt', 'pptx',
  'odt', 'ods', 'odp',
  'rtf',
  'txt', 'md', 'csv', 'tsv', 'json',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif',
  // Archives
  'zip',
  // Media (small clips only — capped by MAX_FILE_BYTES)
  'mp4', 'mov', 'mp3', 'wav',
])

function getExtension(name: string): string {
  const lastDot = name.lastIndexOf('.')
  if (lastDot < 0 || lastDot === name.length - 1) return ''
  return name.slice(lastDot + 1).toLowerCase()
}

// POST /api/admin/files/upload
// Multipart form with `file`, `engagementId`, optional `uploadedBy`.
// Stores the file in Vercel Blob (public-read) and persists a `File` row.
export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const engagementId = formData.get('engagementId') as string | null
    const uploadedBy = (formData.get('uploadedBy') as string) || 'internal'

    if (!file || !engagementId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, engagementId' },
        { status: 400 }
      )
    }

    // Size guard
    if (file.size > MAX_FILE_BYTES) {
      const limitMb = Math.round(MAX_FILE_BYTES / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large. Max ${limitMb} MB.` },
        { status: 413 }
      )
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty.' }, { status: 400 })
    }

    // Extension allowlist (positive list — anything not in the set is rejected)
    const ext = getExtension(file.name)
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `File type "${ext || 'unknown'}" is not allowed. Allowed: ${Array.from(ALLOWED_EXTENSIONS).sort().join(', ')}.`,
        },
        { status: 415 }
      )
    }

    // Confirm the engagement exists (also gives us the clientId for the path)
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      select: { id: true, clientId: true },
    })
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Path scheme: clients/<clientId>/engagements/<engagementId>/<timestamp>-<filename>
    const safeName = file.name.replaceAll('/', '_').slice(0, 200)
    const path = `clients/${engagement.clientId}/engagements/${engagement.id}/${Date.now()}-${safeName}`

    const blob = await put(path, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    })

    const dbFile = await prisma.file.create({
      data: {
        engagementId,
        uploadedBy,
        storageProvider: 'blob',
        storagePath: blob.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || null,
      },
    })

    return NextResponse.json({
      id: dbFile.id,
      fileName: file.name,
      fileSize: file.size,
      url: blob.url,
    })
  } catch (error) {
    console.error('Blob upload failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
