import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

// ─── PATCH /api/kvk/[id] — update status, formula, schedules ─────────────────

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json().catch(() => ({}))
    const allowed = ['status', 'dkpDeadWeight', 'dkpT4Weight', 'dkpT5Weight', 'startDate', 'endDate']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if ('status' in updates && !user.isAdmin) delete updates.status

    const updated = await prisma.kvkSetup.update({ where: { id }, data: updates })
    return NextResponse.json({ id: updated.id, status: updated.status })
  } catch (err) {
    console.error('[PATCH /api/kvk/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/kvk/[id] — admin only ───────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.kvkSetup.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[DELETE /api/kvk/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
