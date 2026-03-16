import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

// POST /api/ark/players/import
// Accepts JSON: { players: Array<{ govId, govName, power?, allianceTag?, discordVerified?, arkExperience? }> }
// Accepts plain text CSV: "govName,govId[,powerM][,allianceTag]" one per line
// Auth: admin session OR x-bot-secret header
export async function POST(req: NextRequest) {
  const botSecret = req.headers.get('x-bot-secret')
  const isBot = botSecret && botSecret === process.env.BOT_API_SECRET

  if (!isBot) {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  type PlayerInput = {
    govId: string
    govName: string
    power?: number | bigint | null
    allianceTag?: string | null
    discordVerified?: boolean
    arkExperience?: boolean
  }

  let players: PlayerInput[] = []
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}))
    players = body.players ?? []
  } else {
    // Plain text CSV: "govName,govId[,powerM][,allianceTag]"
    const text = await req.text()
    players = text.split('\n').flatMap(line => {
      const parts = line.trim().split(',').map(p => p.trim())
      if (parts.length < 2) return []
      const [govName, govId, powerRaw, allianceTag] = parts
      if (!govName || !govId) return []
      const powerNum = powerRaw ? parseFloat(powerRaw) : null
      return [{
        govName,
        govId,
        power: powerNum && !isNaN(powerNum) ? BigInt(Math.round(powerNum * 1_000_000)) : null,
        allianceTag: allianceTag || null,
      }]
    })
  }

  if (!players.length) {
    return NextResponse.json({ error: 'No players provided' }, { status: 400 })
  }

  let upserted = 0
  const errors: string[] = []

  for (const p of players) {
    if (!p.govId || !p.govName) { errors.push(`Skipped: missing govId or govName`); continue }
    try {
      const powerBig = p.power != null ? BigInt(String(p.power).replace(/[^0-9]/g, '') || '0') : null
      await prisma.arkPlayer.upsert({
        where: { govId: String(p.govId) },
        update: {
          govName: p.govName,
          power: powerBig,
          allianceTag: p.allianceTag ?? undefined,
          discordVerified: p.discordVerified ?? undefined,
          arkExperience: p.arkExperience ?? undefined,
          botUpdatedAt: new Date(),
        },
        create: {
          govId: String(p.govId),
          govName: p.govName,
          power: powerBig,
          allianceTag: p.allianceTag ?? null,
          discordVerified: p.discordVerified ?? false,
          arkExperience: p.arkExperience ?? false,
          botUpdatedAt: new Date(),
        },
      })
      upserted++
    } catch (e) {
      errors.push(`Failed ${p.govName}: ${String(e)}`)
    }
  }

  const total = await prisma.arkPlayer.count()
  return NextResponse.json({ upserted, errors, total })
}

// GET /api/ark/players/import — return roster stats
export async function GET() {
  const total = await prisma.arkPlayer.count()
  const last = await prisma.arkPlayer.findFirst({
    orderBy: { botUpdatedAt: 'desc' },
    select: { botUpdatedAt: true },
  })
  return NextResponse.json({ total, lastSync: last?.botUpdatedAt ?? null })
}
