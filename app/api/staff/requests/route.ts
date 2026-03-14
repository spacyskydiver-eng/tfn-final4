import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const requests = await prisma.kvkSetup.findMany({
      include: {
        createdBy: { select: { id: true, username: true, discordId: true, avatar: true } },
        kingdoms: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Attach linked order info where orderId is set
    const orderIds = requests.map(r => r.orderId).filter(Boolean) as string[]
    const orders = orderIds.length
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, productKey: true, items: true, totalUsd: true, status: true },
        })
      : []
    const orderMap = Object.fromEntries(orders.map(o => [o.id, o]))

    const enriched = requests.map(r => ({
      ...r,
      order: r.orderId ? (orderMap[r.orderId] ?? null) : null,
    }))

    return NextResponse.json({ requests: enriched })
  } catch (err) {
    console.error('[GET /api/staff/requests]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
