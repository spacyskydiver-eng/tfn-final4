import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const response = await prisma.arkResponse.findUnique({ where: { id } })
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const assignment = await prisma.arkAssignment.upsert({
      where: { responseId: id },
      update: {
        teamId: body?.teamId ?? null,
        role: body?.role ?? 'member',
        assignedById: session.id,
        assignedAt: new Date(),
      },
      create: {
        responseId: id,
        govId: response.govId,
        teamId: body?.teamId ?? null,
        role: body?.role ?? 'member',
        assignedById: session.id,
      },
      include: { teamRef: { select: { id: true, name: true, color: true } } },
    })

    return NextResponse.json({ assignment })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
