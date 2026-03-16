import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

// GET /api/ark/players?q=name&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  try {
    const players = await prisma.arkPlayer.findMany({
      where: q ? {
        OR: [
          { govName: { contains: q, mode: 'insensitive' } },
          { govId: { contains: q } },
        ],
      } : undefined,
      orderBy: { govName: 'asc' },
      take: limit,
      select: {
        govId: true, govName: true, allianceTag: true, power: true,
        discordVerified: true, arkExperience: true, rallyCapacity: true,
      },
    })
    return NextResponse.json({ players })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/ark/players — bot syncs roster (bot secret auth)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bot-secret')
  if (!secret || secret !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.players || !Array.isArray(body.players)) {
    return NextResponse.json({ error: 'players array required' }, { status: 400 })
  }

  try {
    let upserted = 0
    for (const p of body.players as Array<Record<string, unknown>>) {
      if (!p.govId || !p.govName) continue
      await prisma.arkPlayer.upsert({
        where: { govId: String(p.govId) },
        update: {
          govName: String(p.govName),
          allianceTag: p.allianceTag ? String(p.allianceTag) : undefined,
          power: p.power ? BigInt(String(p.power)) : undefined,
          discordId: p.discordId ? String(p.discordId) : undefined,
          discordVerified: Boolean(p.discordVerified),
          arkExperience: Boolean(p.arkExperience),
          troopT4: p.troopT4 ? BigInt(String(p.troopT4)) : undefined,
          troopT5: p.troopT5 ? BigInt(String(p.troopT5)) : undefined,
          rallyCapacity: p.rallyCapacity ? BigInt(String(p.rallyCapacity)) : undefined,
          extraData: (p.extraData as object) ?? undefined,
          botUpdatedAt: new Date(),
        },
        create: {
          govId: String(p.govId),
          govName: String(p.govName),
          allianceTag: p.allianceTag ? String(p.allianceTag) : undefined,
          power: p.power ? BigInt(String(p.power)) : undefined,
          discordId: p.discordId ? String(p.discordId) : undefined,
          discordVerified: Boolean(p.discordVerified),
          arkExperience: Boolean(p.arkExperience),
          botUpdatedAt: new Date(),
        },
      })
      upserted++
    }
    return NextResponse.json({ ok: true, upserted })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
