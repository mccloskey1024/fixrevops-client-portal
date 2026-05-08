import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

// POST /api/admin/files/upload
// Multipart form with `file`, `engagementId`, optional `uploadedBy`.
// Stores the file in Vercel Blob (public-read), persists a `File` row pointing
// at the returned URL.
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

    // Confirm the engagement exists (also gives us the clientId for the path)
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      select: { id: true, clientId: true },
    })
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Path scheme: clients/<clientId>/engagements/<engagementId>/<timestamp>-<filename>
    // The timestamp prevents collisions when two uploads share a filename.
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
        storagePath: blob.url, // full public URL — fileUrl() returns this directly
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
