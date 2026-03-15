import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  // Bot secret auth — used by the Discord bot to fetch server config
  const botSecret = req.headers.get('x-bot-secret')
  if (botSecret && botSecret === process.env.BOT_API_SECRET) {
    const { guildId } = await params
    const server = await prisma.verificationServer.findUnique({
      where: { guildId },
      include: { rules: true },
    })
    if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ server })
  }

  // Session-based auth
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { guildId } = await params
  const server = await prisma.verificationServer.findUnique({
    where: { guildId },
    include: { rules: true },
  })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  if (!user.isAdmin && server.addedById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const recentLogs = await prisma.verificationLog.findMany({
    where: { serverId: server.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ server, logs: recentLogs })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { guildId } = await params
    const server = await prisma.verificationServer.findUnique({ where: { guildId } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!user.isAdmin && server.addedById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // Explicitly delete related records first to avoid FK constraint issues
    await prisma.verificationLog.deleteMany({ where: { serverId: server.id } })
    await prisma.verificationRule.deleteMany({ where: { serverId: server.id } })
    await prisma.verificationServer.delete({ where: { id: server.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/verify/servers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { guildId } = await params
  const server = await prisma.verificationServer.findUnique({ where: { guildId } })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  if (!user.isAdmin && server.addedById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const { guildName, channelId, staffRoleId, active, freeLimit } = body
  const updated = await prisma.verificationServer.update({
    where: { guildId },
    data: {
      ...(guildName !== undefined && { guildName }),
      ...(channelId !== undefined && { channelId: channelId || null }),
      ...(staffRoleId !== undefined && { staffRoleId: staffRoleId || null }),
      ...(active !== undefined && { active }),
      ...(freeLimit !== undefined && user.isAdmin && { freeLimit }),
    },
    include: { rules: true },
  })
  return NextResponse.json({ server: updated })
}
