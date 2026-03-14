import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

// ─── Discord webhook notification ─────────────────────────────────────────────

async function notifyStaff(kvk: {
  id: string
  name: string
  kvkType: string
  bundle: string
  isSoC: boolean
  kingdoms: Array<{ kdNumber: string; camp: string; tracked: boolean }>
  createdBy: { username: string; discordId: string }
}) {
  const webhookUrl = process.env.DISCORD_STAFF_WEBHOOK_URL
  if (!webhookUrl) return

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

  const fields = [
    { name: 'KvK Type',     value: kvk.kvkType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), inline: true },
    { name: 'Bundle',       value: `${bundleLabel[kvk.bundle]} ($${price})`,                               inline: true },
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.com'

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `🗡️ New KvK Setup — ${kvk.name}`,
        description: `**${kvk.createdBy.username}** created a new KvK and is waiting for bot setup.\n\nKvK ID: \`${kvk.id}\`\n[View Dashboard](${appUrl}/kvk-scanner)`,
        color: 0x7c3aed,
        fields,
        footer: { text: `Discord ID: ${kvk.createdBy.discordId}` },
        timestamp: new Date().toISOString(),
      }],
      username: 'TFN Bot System',
    }),
  }).catch(err => console.error('[KvK webhook]', err))
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

    // Create KvK + kingdoms in a transaction
    const kvk = await prisma.kvkSetup.create({
      data: {
        createdById: user.id,
        name,
        kvkType,
        bundle,
        isSoC: isSoC ?? true,
        status: 'pending',
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
