import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const where = user.isAdmin ? {} : { addedById: user.id }
  const servers = await prisma.verificationServer.findMany({
    where,
    include: { rules: true, _count: { select: { logs: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ servers })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const { guildId, guildName, channelId, staffRoleId } = body as {
    guildId: string; guildName: string; channelId?: string; staffRoleId?: string
  }
  if (!guildId?.trim() || !guildName?.trim()) {
    return NextResponse.json({ error: 'guildId and guildName required' }, { status: 400 })
  }

  const existing = await prisma.verificationServer.findUnique({ where: { guildId } })
  if (existing) return NextResponse.json({ error: 'Server already registered' }, { status: 409 })

  const server = await prisma.verificationServer.create({
    data: {
      guildId: guildId.trim(),
      guildName: guildName.trim(),
      channelId: channelId?.trim() || null,
      staffRoleId: staffRoleId?.trim() || null,
      addedById: user.id,
    },
  })
  return NextResponse.json({ server }, { status: 201 })
}
