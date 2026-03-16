import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

// GET /api/ark/me-player?guildId=X
// Returns current user's governor data if they're verified in the given Discord server
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const guildId = searchParams.get('guildId')

  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ player: null })

    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { discordId: true } })
    if (!user?.discordId) return NextResponse.json({ player: null })

    // If guildId provided, find verification in that specific server
    if (guildId) {
      const server = await prisma.verificationServer.findUnique({ where: { guildId } })
      if (!server) return NextResponse.json({ player: null })

      const log = await prisma.verificationLog.findFirst({
        where: {
          serverId: server.id,
          discordUserId: user.discordId,
          result: 'success',
          govId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!log?.govId) return NextResponse.json({ player: null })
      return NextResponse.json({
        player: {
          govId: log.govId,
          govName: log.govName ?? '',
          allianceTag: log.allianceTag,
          discordUserId: log.discordUserId,
          discordUsername: log.discordUsername,
          discordVerified: true,
        },
      })
    }

    // No guildId — find any verification
    const log = await prisma.verificationLog.findFirst({
      where: { discordUserId: user.discordId, result: 'success', govId: { not: null } },
      orderBy: { createdAt: 'desc' },
    })

    if (!log?.govId) return NextResponse.json({ player: null })
    return NextResponse.json({
      player: {
        govId: log.govId,
        govName: log.govName ?? '',
        allianceTag: log.allianceTag,
        discordUserId: log.discordUserId,
        discordUsername: log.discordUsername,
        discordVerified: true,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
