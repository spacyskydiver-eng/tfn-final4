import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sha256 } from '@/lib/hash-utils'
import { randomBytes } from 'crypto'

// ─── Session Auth Helper ──────────────────────────────────────────────────────
// Token management always requires a valid browser session — no bootstrapping
// via a token itself (that would create a circular dependency).
async function getSessionUser(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${base}/api/auth/session`, {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.user ?? null
}

// ─── GET /api/tokens ──────────────────────────────────────────────────────────
/**
 * Lists all active (non-revoked) API tokens for the signed-in user.
 * Token hashes are never returned — only metadata.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id, revokedAt: null },
    select: { id: true, name: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ tokens })
}

// ─── POST /api/tokens ─────────────────────────────────────────────────────────
/**
 * Creates a new API token for the signed-in user.
 *
 * Body: { name?: string }
 *
 * ⚠️  SECURITY: The raw token is returned ONCE in this response and then
 *               forever unrecoverable — only its SHA-256 hash is stored.
 *               The client must copy it immediately.
 *
 * Token format:  rok_<64 hex chars>  (256 bits of entropy)
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 64)
      : 'My Device'

  // Hard cap: 10 active tokens per user
  const activeCount = await prisma.apiToken.count({
    where: { userId: user.id, revokedAt: null },
  })
  if (activeCount >= 10) {
    return NextResponse.json(
      { error: 'Maximum of 10 active tokens per account. Revoke an existing token first.' },
      { status: 429 }
    )
  }

  // Generate secure random token
  const rawToken  = `rok_${randomBytes(32).toString('hex')}` // "rok_" + 64 hex = 68 chars total
  const tokenHash = sha256(rawToken)

  await prisma.apiToken.create({
    data: { userId: user.id, name, tokenHash },
  })

  // Return raw token in body — shown once, never again
  return NextResponse.json({ token: rawToken, name }, { status: 201 })
}
