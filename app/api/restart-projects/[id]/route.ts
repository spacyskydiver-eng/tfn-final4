import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  return user?.isAdmin ? user : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json().catch(() => null)
    const project = await prisma.restartProject.update({
      where: { id },
      data: {
        name: body?.name ?? undefined,
        guildId: body?.guildId ?? undefined,
        guildName: body?.guildName ?? undefined,
        active: body?.active !== undefined ? body.active : undefined,
      },
    })
    return NextResponse.json({ project })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    await prisma.restartProject.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
