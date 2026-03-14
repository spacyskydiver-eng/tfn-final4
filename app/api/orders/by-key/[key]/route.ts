import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ─── GET /api/orders/by-key/[key] ─────────────────────────────────────────────
// Used by the Discord bot to look up an order by product key.
// Requires the x-bot-secret header to prevent public access.

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const secret = req.headers.get('x-bot-secret')
  if (!secret || secret !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const order = await prisma.order.findUnique({
    where: { productKey: params.key.toUpperCase() },
    include: { user: { select: { id: true, username: true, discordId: true } } },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ order })
}
