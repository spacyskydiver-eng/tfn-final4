import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function GET() {
  try {
    const events = await prisma.arkEvent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        form: { select: { id: true, shortCode: true, isOpen: true, _count: { select: { responses: true } } } },
        teams: { select: { id: true, name: true, color: true, order: true, _count: { select: { assignments: true } } } },
        _count: { select: {} },
      },
    })
    return NextResponse.json({ events })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const event = await prisma.arkEvent.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        status: 'planning',
        createdById: session.id,
      },
    })
    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
