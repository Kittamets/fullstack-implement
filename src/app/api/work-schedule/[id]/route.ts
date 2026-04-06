import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError, requireAdmin } from '@/server/auth/requireAuth'
import * as wsService from '@/server/services/workSchedule.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const data = await request.json()

    // Bulk update
    if (data.ids && Array.isArray(data.ids)) {
      await wsService.bulkUpdateStatus(data.ids, data.update)
      return NextResponse.json({ success: true })
    }

    const schedule = await wsService.updateWorkSchedule(id, data)
    if (!schedule) {
      return NextResponse.json({ error: 'Work schedule not found' }, { status: 404 })
    }
    return NextResponse.json({ schedule })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request)
    const { id } = await params
    await wsService.deleteWorkSchedule(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
