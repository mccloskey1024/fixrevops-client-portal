import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'
import { Readable } from 'stream'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const engagementId = formData.get('engagementId') as string
    const uploadedBy = formData.get('uploadedBy') as string || 'internal'

    if (!file || !engagementId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, engagementId' },
        { status: 400 }
      )
    }

    // Initialize Google Drive client
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || '{}'),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    const drive = google.drive({ version: 'v3', auth })

    // Get engagement to determine folder path
    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      include: { client: true },
    })

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Create or find folder structure (simplified: upload to root for now)
    // TODO: Implement folder creation logic

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

    // Make file accessible to service account
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
      },
    })

    // Save to database
    const dbFile = await prisma.file.create({
      data: {
        engagementId,
        uploadedBy,
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
