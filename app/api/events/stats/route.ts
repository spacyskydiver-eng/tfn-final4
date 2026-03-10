import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sha256 } from '@/lib/hash-utils'

// ─── Auth Helper (reused pattern) ─────────────────────────────────────────────
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // 1. Bearer token (companion app)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim()
    const tokenHash = sha256(rawToken)
    const token = await prisma.apiToken.findFirst({
      where: { tokenHash, revokedAt: null },
      select: { userId: true },
    })
    if (token) return token.userId
  }

  // 2. Session cookie (website)
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const sessionRes = await fetch(`${base}/api/auth/session`, {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  if (sessionRes.ok) {
    const session = await sessionRes.json()
    return session?.user?.id ?? null
  }

  return null
}

// ─── GET /api/events/stats ────────────────────────────────────────────────────
/**
 * Returns aggregate kill statistics for the authenticated user.
 *
 * Response shape:
 * {
 *   barbarian: { totalKills: number, reportCount: number },
 *   fort:      { totalFortKills: number, totalUnitKills: number, reportCount: number },
 *   last7Days: Array<{ reportType, _sum: { killCount, fortKills }, _count: { id } }>
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [barbarianAgg, fortAgg, last7Days] = await Promise.all([
      // Total barbarian kills across all time
      prisma.killEvent.aggregate({
        where: { userId, reportType: 'BARBARIAN_KILL' },
        _sum: { killCount: true },
        _count: { id: true },
      }),

      // Total fort kills across all time
      prisma.killEvent.aggregate({
        where: { userId, reportType: 'FORT_KILL' },
        _sum: { fortKills: true, killCount: true },
        _count: { id: true },
      }),

      // Per-type breakdown for the last 7 days (for sparklines / trend cards)
      prisma.killEvent.groupBy({
        by: ['reportType'],
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        _sum: { killCount: true, fortKills: true },
        _count: { id: true },
      }),
    ])

    return NextResponse.json({
      barbarian: {
        totalKills:   barbarianAgg._sum.killCount ?? 0,
        reportCount:  barbarianAgg._count.id,
      },
      fort: {
        totalFortKills: fortAgg._sum.fortKills  ?? 0,
        totalUnitKills: fortAgg._sum.killCount  ?? 0,
        reportCount:    fortAgg._count.id,
      },
      last7Days,
    })
  } catch (err) {
    console.error('[GET /api/events/stats]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
