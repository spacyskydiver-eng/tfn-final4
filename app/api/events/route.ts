import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sha256, hashReport } from '@/lib/hash-utils'
import { parseReport } from '@/lib/report-parser'

// ─── Shared Auth Helper ───────────────────────────────────────────────────────
/**
 * Resolves the user from a Bearer API token (used by companion app).
 * Updates lastUsedAt fire-and-forget so it doesn't block the response.
 */
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

  // Fire-and-forget lastUsedAt update (non-blocking)
  prisma.apiToken
    .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return apiToken.user
}

// ─── POST /api/events ─────────────────────────────────────────────────────────
/**
 * Receives a raw report string from the companion app.
 * • Authenticates via Bearer token.
 * • Hashes the normalised text for duplicate detection.
 * • Parses the report into structured data.
 * • Stores the event in the database.
 *
 * Body: { rawText: string, syncedVia?: "clipboard" | "manual" }
 *
 * Responses:
 *   201 { id, type }              – new event created
 *   200 { duplicate: true, id }   – same hash already exists, silently ignored
 *   400 { error }                 – bad input
 *   401 { error }                 – missing / invalid token
 *   500 { error }                 – server error
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body.rawText !== 'string') {
      return NextResponse.json(
        { error: 'rawText (string) is required' },
        { status: 400 }
      )
    }

    const { rawText, syncedVia = 'clipboard' } = body as {
      rawText: string
      syncedVia?: string
    }

    if (rawText.trim().length === 0) {
      return NextResponse.json({ error: 'rawText is empty' }, { status: 400 })
    }

    if (rawText.length > 60_000) {
      return NextResponse.json(
        { error: 'rawText exceeds 60 000 character limit' },
        { status: 400 }
      )
    }

    // Compute dedup hash BEFORE parsing (faster early exit on duplicates)
    const contentHash = hashReport(rawText)

    const existing = await prisma.killEvent.findUnique({
      where: { userId_contentHash: { userId: user.id, contentHash } },
      select: { id: true },
    })

    if (existing) {
      // Not an error — the companion app can safely retry
      return NextResponse.json(
        { duplicate: true, id: existing.id },
        { status: 200 }
      )
    }

    // Parse the report text into structured fields
    const parsed = parseReport(rawText)

    // Persist the event
    const event = await prisma.killEvent.create({
      data: {
        userId: user.id,
        reportType: parsed.type,
        rawText,
        contentHash,
        parsedData: parsed as object,
        killCount: parsed.killCount,
        fortKills: parsed.fortKills,
        syncedVia: syncedVia || 'clipboard',
      },
      select: { id: true, reportType: true, killCount: true, fortKills: true },
    })

    return NextResponse.json(
      { id: event.id, type: event.reportType, killCount: event.killCount, fortKills: event.fortKills },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/events]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/events ──────────────────────────────────────────────────────────
/**
 * Returns a paginated list of the authenticated user's events.
 * Supports both Bearer token (companion app) and session cookie (website).
 *
 * Query params:
 *   page    (default 1)
 *   limit   (default 20, max 100)
 *   type    (optional) — "BARBARIAN_KILL" | "FORT_KILL" | "UNKNOWN"
 */
export async function GET(req: NextRequest) {
  try {
    // Prefer Bearer token auth; fall back to session cookie
    let userId: string | null = null

    const tokenUser = await authenticateToken(req)
    if (tokenUser) {
      userId = tokenUser.id
    } else {
      // Session cookie path (website dashboard)
      const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const sessionRes = await fetch(`${base}/api/auth/session`, {
        headers: { cookie: req.headers.get('cookie') ?? '' },
      })
      if (sessionRes.ok) {
        const session = await sessionRes.json()
        userId = session?.user?.id ?? null
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page  = Math.max(1,   parseInt(searchParams.get('page')  ?? '1',  10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const type  = searchParams.get('type') ?? undefined

    const where = { userId, ...(type ? { reportType: type } : {}) }

    const [events, total] = await Promise.all([
      prisma.killEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reportType: true,
          killCount: true,
          fortKills: true,
          syncedVia: true,
          createdAt: true,
          parsedData: true,
          // rawText deliberately excluded from list view (privacy + payload size)
        },
      }),
      prisma.killEvent.count({ where }),
    ])

    return NextResponse.json({
      events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[GET /api/events]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
