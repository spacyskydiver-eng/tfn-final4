import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { id } = await params
    const kvk = await prisma.kvkSetup.findUnique({ where: { id } })
    if (!kvk) return NextResponse.json({ error: 'KvK not found' }, { status: 404 })
    if (!user.isAdmin && kvk.createdById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { label, cronExpr, scanType, topN, enabled } = body as {
      label: string; cronExpr: string; scanType: string; topN?: number; enabled?: boolean
    }

    if (!label || !cronExpr || !scanType) {
      return NextResponse.json({ error: 'label, cronExpr, scanType are required' }, { status: 400 })
    }

    const schedule = await prisma.scanSchedule.create({
      data: { kvkId: id, label, cronExpr, scanType, topN: topN ?? 300, enabled: enabled ?? true },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (err) {
    console.error('[POST /api/kvk/:id/schedule]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const schedules = await prisma.scanSchedule.findMany({
      where: { kvkId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ schedules })
  } catch (err) {
    console.error('[GET /api/kvk/:id/schedule]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, _params: unknown) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { scheduleId, enabled, deleted } = await req.json()

    if (deleted) {
      await prisma.scanSchedule.delete({ where: { id: scheduleId } })
      return NextResponse.json({ deleted: true })
    }

    const updated = await prisma.scanSchedule.update({ where: { id: scheduleId }, data: { enabled } })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/kvk/:id/schedule]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
