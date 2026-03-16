import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/ark/verified-players?guildId=X&q=name&limit=10
// Returns unique verified players from VerificationLog for a guild
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const guildId = searchParams.get('guildId')
  const q = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '15'), 50)

  if (!guildId) return NextResponse.json({ players: [] })

  try {
    // Find the verification server
    const server = await prisma.verificationServer.findUnique({ where: { guildId } })
    if (!server) return NextResponse.json({ players: [] })

    // Get successful verifications for this server, filter by name if query provided
    const logs = await prisma.verificationLog.findMany({
      where: {
        serverId: server.id,
        result: 'success',
        govId: { not: null },
        govName: q ? { contains: q, mode: 'insensitive' } : { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 3, // take more to deduplicate
    })

    // Deduplicate by govId, keeping most recent
    const seen = new Map<string, typeof logs[0]>()
    for (const log of logs) {
      if (log.govId && !seen.has(log.govId)) {
        seen.set(log.govId, log)
      }
    }

    const players = Array.from(seen.values()).slice(0, limit).map(log => ({
      govId: log.govId!,
      govName: log.govName ?? '',
      allianceTag: log.allianceTag,
      discordUserId: log.discordUserId,
      discordUsername: log.discordUsername,
      discordVerified: true,
    }))

    return NextResponse.json({ players })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
