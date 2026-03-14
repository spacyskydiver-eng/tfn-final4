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
      label: string
      bundle?: string
      isSoC?: boolean
      price: number
    }

    const { items } = body as { items: CartItem[] }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    const totalUsd = items.reduce((sum, i) => sum + i.price, 0)

    // Create a single order for the whole cart
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productKey: generateProductKey(),
        items: items as object[],
        totalUsd,
        status: 'pending',
      },
    })

    // Notify staff on Discord (non-blocking)
    notifyStaffNewOrder({
      productKey: order.productKey,
      username: user.username,
      discordId: user.discordId,
      items,
      totalUsd,
    }).catch(err => console.error('[order notify]', err))

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function notifyStaffNewOrder(order: {
  productKey: string
  username: string
  discordId: string
  items: Array<{ toolId: string; label: string; bundle?: string; isSoC?: boolean; price: number }>
  totalUsd: number
}) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const channelId = '1482492075822809128'
  if (!botToken) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tfn-final4-sand.vercel.app'
  const itemLines = order.items.map(i => {
    const socTag = i.isSoC !== undefined ? ` (${i.isSoC ? 'SoC' : 'Non-SoC'})` : ''
    return `• ${i.label}${socTag} — $${i.price}`
  }).join('\n') || '—'

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
    body: JSON.stringify({
      content: `🛒 **New Purchase** — review in the Staff Portal\n${appUrl}`,
      embeds: [{
        title: `New Order — ${order.username}`,
        description: `**${order.username}** (Discord: ${order.discordId}) placed a new order.\n\n**Items:**\n${itemLines}`,
        color: 0xf59e0b,
        fields: [
          { name: 'Product Key', value: `\`${order.productKey}\``, inline: true },
          { name: 'Total',       value: `$${order.totalUsd}`,      inline: true },
        ],
        footer: { text: 'User needs to redeem their key in Discord with /activate' },
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(err => console.error('[order discord notify]', err))
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
