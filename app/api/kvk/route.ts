import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

// ─── Discord webhook notification ─────────────────────────────────────────────

const STAFF_CHANNEL_ID = '1482492075822809128'

async function notifyStaff(kvk: {
  id: string
  name: string
  kvkType: string
  bundle: string
  isSoC: boolean
  kingdoms: Array<{ kdNumber: string; camp: string; tracked: boolean }>
  createdBy: { username: string; discordId: string }
}) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const webhookUrl = process.env.DISCORD_STAFF_WEBHOOK_URL

  const bundleLabel: Record<string, string> = {
    'full-kvk': 'Full KvK',
    'two-camp': 'Two Camp Bundle',
    'one-camp': 'One Camp Bundle',
  }

  const prices: Record<string, Record<string, number>> = {
    'full-kvk':  { soc: 200, nonsoc: 100 },
    'two-camp':  { soc: 100, nonsoc: 50  },
    'one-camp':  { soc: 50,  nonsoc: 25  },
  }

  const price = prices[kvk.bundle]?.[kvk.isSoC ? 'soc' : 'nonsoc'] ?? '?'
  const tracked = kvk.kingdoms.filter(k => k.tracked)
  const mapOnly = kvk.kingdoms.filter(k => !k.tracked)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tfn-final4-sand.vercel.app'

  const fields = [
    { name: 'KvK Type',     value: kvk.kvkType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), inline: true },
    { name: 'Bundle',       value: `${bundleLabel[kvk.bundle] ?? kvk.bundle} ($${price})`,                 inline: true },
    { name: 'Kingdom Type', value: kvk.isSoC ? 'Season of Conquest' : 'Non-SoC',                          inline: true },
    {
      name: `Tracked Kingdoms (${tracked.length})`,
      value: tracked.length ? tracked.map(k => `\`${k.kdNumber}\` ${k.camp}`).join('\n') : '_none_',
      inline: false,
    },
  ]

  if (mapOnly.length) {
    fields.push({
      name: `Map Only (${mapOnly.length})`,
      value: mapOnly.map(k => `\`${k.kdNumber}\` ${k.camp}`).join('\n'),
      inline: false,
    })
  }

  const payload = {
    content: `📋 **New KvK Setup Request** — action required in the Staff Portal\n${appUrl}?request=${kvk.id}`,
    embeds: [{
      title: `🗡️ ${kvk.name}`,
      description: `**${kvk.createdBy.username}** submitted a KvK setup request and is waiting for activation.`,
      color: 0x7c3aed,
      fields,
      footer: { text: `Discord ID: ${kvk.createdBy.discordId} • KvK ID: ${kvk.id}` },
      timestamp: new Date().toISOString(),
    }],
  }

  // Prefer bot API (posts to specific channel), fall back to webhook
  if (botToken) {
    await fetch(`https://discord.com/api/v10/channels/${STAFF_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${botToken}`,
      },
      body: JSON.stringify(payload),
    }).catch(err => console.error('[KvK discord bot notify]', err))
  } else if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, username: 'TFN Bot System' }),
    }).catch(err => console.error('[KvK webhook]', err))
  }
}

// ─── POST /api/kvk ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { name, kvkType, bundle, isSoC, kingdoms } = body as {
      name: string
      kvkType: string
      bundle: string
      isSoC: boolean
      kingdoms: Array<{ kdNum: string; camp: string; tracked: boolean }>
    }

    if (!name || !kvkType || !bundle) {
      return NextResponse.json({ error: 'name, kvkType, and bundle are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Find the user's most recent confirmed/active kvk-scanner order to link
    const userOrders = await prisma.order.findMany({
      where: { userId: user.id, status: { in: ['confirmed', 'active'] } },
      select: { id: true, items: true },
      orderBy: { createdAt: 'desc' },
    })
    const linkedOrder = userOrders.find(o => {
      const items = o.items as Array<{ toolId: string }> | null
      return items?.some(i => i.toolId === 'kvk-scanner')
    })

    // Create KvK + kingdoms in a transaction
    const kvk = await prisma.kvkSetup.create({
      data: {
        createdById: user.id,
        name,
        kvkType,
        bundle,
        isSoC: isSoC ?? true,
        status: 'pending',
        orderId: linkedOrder?.id ?? null,
        kingdoms: {
          create: (kingdoms ?? [])
            .filter(k => k.kdNum?.trim())
            .map(k => ({
              kdNumber: k.kdNum.trim(),
              camp: k.camp,
              tracked: k.tracked ?? true,
            })),
        },
      },
      include: { kingdoms: true },
    })

    // Notify staff on Discord (non-blocking)
    notifyStaff({
      id: kvk.id,
      name: kvk.name,
      kvkType: kvk.kvkType,
      bundle: kvk.bundle,
      isSoC: kvk.isSoC,
      kingdoms: kvk.kingdoms,
      createdBy: { username: user.username, discordId: user.discordId },
    })

    return NextResponse.json({ id: kvk.id, status: kvk.status }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/kvk]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/kvk ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Admins see all KvKs; regular users see only their own
    const where = user.isAdmin ? {} : { createdById: user.id }

    const kvks = await prisma.kvkSetup.findMany({
      where,
      include: { kingdoms: true, scanSchedules: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ kvks })
  } catch (err) {
    console.error('[GET /api/kvk]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
