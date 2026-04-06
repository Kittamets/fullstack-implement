import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/server/auth/requireAuth'
import { uploadFileToGridFS } from '@/server/gridfs'

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileId = await uploadFileToGridFS(buffer, file.name, file.type)

    return NextResponse.json({ url: `/api/files/${fileId}` }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
