import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

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

// ─── DELETE /api/tokens/[id] ──────────────────────────────────────────────────
/**
 * Soft-revokes a token by setting revokedAt to now.
 * The user must own the token — cross-user revocation is rejected.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify ownership before revoking
  const token = await prisma.apiToken.findFirst({
    where: { id, userId: user.id },
    select: { id: true, revokedAt: true },
  })

  if (!token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  if (token.revokedAt) {
    return NextResponse.json({ error: 'Token already revoked' }, { status: 409 })
  }

  await prisma.apiToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
