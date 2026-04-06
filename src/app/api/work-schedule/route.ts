import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/server/auth/requireAuth'
import * as wsService from '@/server/services/workSchedule.service'

export async function GET(request: NextRequest) {
  try {
    const payload = await requireAuth(request)
    const isAdmin = payload.role === 'admin' || payload.role === 'owner'

    let employeeId = request.nextUrl.searchParams.get('employeeId') ?? undefined

    if (!isAdmin) {
      const ownEmployeeId = await wsService.getEmployeeIdByUserId(payload.sub)
      if (employeeId && employeeId !== ownEmployeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      employeeId = ownEmployeeId ?? 'none'
    }

    const schedules = await wsService.listWorkSchedules({ employeeId })
    return NextResponse.json({ schedules })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await requireAuth(request)
    const data = await request.json()

    const schedule = await wsService.createWorkSchedule({
      ...data,
      userId: payload.sub,
    })
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
