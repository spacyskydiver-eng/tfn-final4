import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sha256 } from '@/lib/hash-utils'

async function authenticateToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const rawToken = authHeader.slice(7).trim()
  if (!rawToken) return null
  const tokenHash = sha256(rawToken)
  const apiToken = await prisma.apiToken.findFirst({
    where: { tokenHash, revokedAt: null },
    include: { user: true },
  })
  if (!apiToken) return null
  prisma.apiToken
    .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})
  return apiToken.user
}

/**
 * POST /api/commanders
 *
 * Receives a commander build snapshot captured by the Mac bot from kingdom chat.
 *
 * Body:
 * {
 *   sharedByPlayer:   string          — in-game name of the player who shared
 *   commanderName:    string          — e.g. "Æthelflæd"
 *   commanderTitle:   string?         — e.g. "Lady of the Mercians"
 *   stars:            number?
 *   level:            number?
 *   skillLevel:       number?         — secondary level (the /N part)
 *   commanderPower:   number?
 *   skillLevels:      number[]?       — [5,5,5,5,4]
 *   formationName:    string?
 *   armamentSet:      string?
 *   armamentStats:    string[]?
 *   equipment:        object?
 *   rawProfileText:   string?
 *   rawEquipText:     string?
 *   rawFormationText: string?
 * }
 *
 * Responses:
 *   201 { id }                   – saved
 *   200 { duplicate: true, id }  – already exists
 *   400 { error }
 *   401 { error }
 *   500 { error }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { sharedByPlayer, commanderName } = body as Record<string, unknown>

    if (!sharedByPlayer || typeof sharedByPlayer !== 'string') {
      return NextResponse.json({ error: 'sharedByPlayer (string) is required' }, { status: 400 })
    }
    if (!commanderName || typeof commanderName !== 'string') {
      return NextResponse.json({ error: 'commanderName (string) is required' }, { status: 400 })
    }

    // Dedup hash: same player sharing same commander at same star/level counts as duplicate
    const hashInput = [
      sharedByPlayer.trim().toLowerCase(),
      commanderName.trim().toLowerCase(),
      String(body.stars ?? ''),
      String(body.level ?? ''),
      String(body.commanderPower ?? ''),
    ].join('|')
    const contentHash = sha256(hashInput)

    const existing = await prisma.commanderSubmission.findUnique({
      where: { userId_contentHash: { userId: user.id, contentHash } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ duplicate: true, id: existing.id }, { status: 200 })
    }

    const record = await prisma.commanderSubmission.create({
      data: {
        userId:           user.id,
        contentHash,
        sharedByPlayer:   sharedByPlayer.trim(),
        commanderName:    commanderName.trim(),
        commanderTitle:   typeof body.commanderTitle === 'string'   ? body.commanderTitle   : null,
        stars:            typeof body.stars           === 'number'   ? body.stars            : null,
        level:            typeof body.level           === 'number'   ? body.level            : null,
        skillLevel:       typeof body.skillLevel      === 'number'   ? body.skillLevel       : null,
        commanderPower:   typeof body.commanderPower  === 'number'   ? body.commanderPower   : null,
        skillLevels:      Array.isArray(body.skillLevels)            ? body.skillLevels      : undefined,
        formationName:    typeof body.formationName   === 'string'   ? body.formationName    : null,
        armamentSet:      typeof body.armamentSet     === 'string'   ? body.armamentSet      : null,
        armamentStats:    Array.isArray(body.armamentStats)          ? body.armamentStats    : undefined,
        equipment:        body.equipment && typeof body.equipment === 'object' ? body.equipment : undefined,
        rawProfileText:   typeof body.rawProfileText   === 'string'  ? body.rawProfileText   : null,
        rawEquipText:     typeof body.rawEquipText     === 'string'  ? body.rawEquipText     : null,
        rawFormationText: typeof body.rawFormationText === 'string'  ? body.rawFormationText : null,
      },
      select: { id: true, commanderName: true, sharedByPlayer: true },
    })

    return NextResponse.json({ id: record.id, commanderName: record.commanderName, sharedByPlayer: record.sharedByPlayer }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/commanders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/commanders
 *
 * Returns paginated commander submissions for the authenticated user.
 * Query: page, limit, commanderName (filter)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const nameFilter = searchParams.get('commanderName') ?? undefined

    const where = {
      userId: user.id,
      ...(nameFilter ? { commanderName: { contains: nameFilter, mode: 'insensitive' as const } } : {}),
    }

    const [submissions, total] = await Promise.all([
      prisma.commanderSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          sharedByPlayer: true,
          commanderName: true,
          commanderTitle: true,
          stars: true,
          level: true,
          commanderPower: true,
          formationName: true,
          armamentSet: true,
          armamentStats: true,
          skillLevels: true,
          equipment: true,
          createdAt: true,
        },
      }),
      prisma.commanderSubmission.count({ where }),
    ])

    return NextResponse.json({
      submissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[GET /api/commanders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
