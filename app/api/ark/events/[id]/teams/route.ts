import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const teams = await prisma.arkTeam.findMany({
      where: { eventId: id },
      orderBy: { order: 'asc' },
      include: {
        assignments: {
          include: {
            response: {
              include: { answers: true },
            },
          },
        },
      },
    })
    // Also get unassigned responses for this event
    const event = await prisma.arkEvent.findUnique({
      where: { id },
      include: { form: { select: { id: true } } },
    })
    let unassigned: unknown[] = []
    if (event?.form?.id) {
      unassigned = await prisma.arkResponse.findMany({
        where: {
          formId: event.form.id,
          assignment: null,
        },
        include: { answers: true },
      })
    }
    return NextResponse.json({ teams, unassigned })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const count = await prisma.arkTeam.count({ where: { eventId: id } })
    const team = await prisma.arkTeam.create({
      data: {
        eventId: id,
        name: body?.name ?? `Team ${count + 1}`,
        color: body?.color ?? '#6366f1',
        order: count,
      },
    })
    return NextResponse.json({ team }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
