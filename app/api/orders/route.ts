import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

// ─── Product key generation ────────────────────────────────────────────────────

function generateProductKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/1/0 to avoid confusion
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `TFN-${seg()}-${seg()}-${seg()}`
}

// ─── POST /api/orders ──────────────────────────────────────────────────────────
// Creates one order per cart item, each with a unique product key.

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    type CartItem = {
      toolId: string
      bundle?: string
      isSoC?: boolean
      price: number
    }

    const { items } = body as { items: CartItem[] }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    // Create all orders in a transaction
    const orders = await prisma.$transaction(
      items.map(item =>
        prisma.order.create({
          data: {
            userId: user.id,
            productKey: generateProductKey(),
            toolType: item.toolId,
            bundle: item.bundle ?? null,
            isSoC: item.isSoC ?? null,
            priceUsd: item.price,
            status: 'pending',
          },
        })
      )
    )

    return NextResponse.json({ orders }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/orders ───────────────────────────────────────────────────────────
// Staff/admin: all orders. Regular users: own orders only.

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q')?.trim()

    const where = user.isAdmin
      ? search
        ? { OR: [{ productKey: { contains: search, mode: 'insensitive' as const } }] }
        : {}
      : { userId: user.id }

    const orders = await prisma.order.findMany({
      where,
      include: { user: { select: { id: true, username: true, discordId: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (err) {
    console.error('[GET /api/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
