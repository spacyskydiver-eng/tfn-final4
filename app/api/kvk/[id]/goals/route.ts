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
    const { goals } = body as {
      goals: Array<{
        govId: string; playerName: string; alliance?: string
        dkpGoal?: number; t4KillGoal?: number; t5KillGoal?: number
        deadGoal?: number; honorGoal?: number
      }>
    }

    const upserts = await Promise.all(
      goals.map(g =>
        prisma.kvkPlayerGoal.upsert({
          where: { kvkId_govId: { kvkId: id, govId: g.govId } },
          create: { kvkId: id, setById: user.id, ...g },
          update: { setById: user.id, ...g },
        })
      )
    )

    return NextResponse.json({ updated: upserts.length })
  } catch (err) {
    console.error('[POST /api/kvk/:id/goals]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const goals = await prisma.kvkPlayerGoal.findMany({ where: { kvkId: id } })
    return NextResponse.json({ goals })
  } catch (err) {
    console.error('[GET /api/kvk/:id/goals]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
