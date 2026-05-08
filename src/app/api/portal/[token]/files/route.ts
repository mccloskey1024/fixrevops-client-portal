import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken } from '@/lib/magic-link'
import { enforceRateLimit } from '@/lib/rate-limit'
import { google } from 'googleapis'
import { Readable } from 'stream'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: signedToken } = await params

    const blocked = enforceRateLimit(`portal:write:${signedToken}`, 10, 60_000)
    if (blocked) return blocked

    const formData = await request.formData()
    const file = formData.get('file') as File
    const engagementId = formData.get('engagementId') as string

    if (!file || !engagementId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, engagementId' },
        { status: 400 }
      )
    }

    // Verify magic link
    const verification = verifyMagicLinkToken(signedToken)
    if (!verification.valid || !verification.token) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 401 }
      )
    }

    // Find client and verify engagement belongs to them
    const client = await prisma.client.findUnique({
      where: { magicLinkToken: verification.token },
      include: { engagements: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const engagement = client.engagements.find(e => e.id === engagementId)
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Initialize Google Drive client
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || '{}'),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    const drive = google.drive({ version: 'v3', auth })

    // Upload file to Google Drive
    const buffer = Buffer.from(await file.arrayBuffer())
    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [process.env.GOOGLE_DRIVE_PORTAL_FOLDER_ID || 'root'],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
    })

    const fileId = response.data.id
    if (!fileId) {
      throw new Error('Failed to get file ID from Drive')
    }

    // Save to database
    const dbFile = await prisma.file.create({
      data: {
        engagementId,
        uploadedBy: 'client',
        storageProvider: 'drive',
        storagePath: fileId,
        fileName: file.name,
        fileSize: file.size,
      },
    })

    return NextResponse.json({
      id: dbFile.id,
      fileName: file.name,
      fileSize: file.size,
      driveUrl: `https://drive.google.com/file/d/${fileId}/view`,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
