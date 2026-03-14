import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { action } = body as { action: 'assign' | 'unassign' | 'complete' }

    let data: Record<string, unknown> = {}

    if (action === 'assign') {
      data = {
        assignedToId: user.id,
        assignedToName: user.username,
        assignedAt: new Date(),
      }
    } else if (action === 'unassign') {
      data = {
        assignedToId: null,
        assignedToName: null,
        assignedAt: null,
      }
    } else if (action === 'complete') {
      data = {
        status: 'active',
        completedAt: new Date(),
        completedById: user.id,
        completedByName: user.username,
        // Clear assignment once complete
        assignedToId: user.id,
        assignedToName: user.username,
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updated = await prisma.kvkSetup.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, username: true, discordId: true, avatar: true } },
        kingdoms: true,
      },
    })

    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error('[PATCH /api/staff/requests/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
