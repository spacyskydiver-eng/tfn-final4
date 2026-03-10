import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function getSessionUser(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${base}/api/auth/session`, {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.user ?? null
}

// ─── DELETE /api/tokens/[id] ──────────────────────────────────────────────────
/**
 * Soft-revokes a token by setting revokedAt to now.
 * The user must own the token — cross-user revocation is rejected.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership before revoking
  const token = await prisma.apiToken.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, revokedAt: true },
  })

  if (!token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  if (token.revokedAt) {
    return NextResponse.json({ error: 'Token already revoked' }, { status: 409 })
  }

  await prisma.apiToken.update({
    where: { id: params.id },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
