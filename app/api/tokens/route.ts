import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sha256 } from '@/lib/hash-utils'
import { randomBytes } from 'crypto'

// ─── Session Auth Helper ──────────────────────────────────────────────────────
// Read session directly from cookie — avoids fragile self-HTTP-fetch on Vercel.
async function getSessionUser(_req: NextRequest) {
  const cookieStore = await cookies()
  const session = cookieStore.get('rok_session')
  if (!session) return null
  try {
    return JSON.parse(session.value)
  } catch {
    return null
  }
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
