import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ guildId: string; ruleId: string }> }) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { guildId, ruleId } = await params
  const server = await prisma.verificationServer.findUnique({ where: { guildId } })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  if (!user.isAdmin && server.addedById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.verificationRule.delete({ where: { id: ruleId, serverId: server.id } })
  return NextResponse.json({ success: true })
}
