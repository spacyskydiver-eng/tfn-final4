import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

// ─── PATCH /api/orders/[id] ────────────────────────────────────────────────────
// Staff only. Updates status, adds kvkSetupId, or adds notes.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staff = await prisma.user.findUnique({ where: { id: session.id } })
    if (!staff?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { status, kvkSetupId, notes } = body as {
      status?: string
      kvkSetupId?: string
      notes?: string
    }

    const existing = await prisma.order.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(kvkSetupId !== undefined && { kvkSetupId }),
        ...(notes !== undefined && { notes }),
        // Mark confirmedBy when moving to confirmed/active
        ...((status === 'confirmed' || status === 'active') && !existing.confirmedById
          ? { confirmedById: staff.id, confirmedAt: new Date() }
          : {}),
      },
      include: { user: { select: { id: true, username: true, discordId: true } } },
    })

    return NextResponse.json({ order: updated })
  } catch (err) {
    console.error('[PATCH /api/orders/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/orders/[id] ──────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, username: true, discordId: true } } },
    })

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!user.isAdmin && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (err) {
    console.error('[GET /api/orders/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
