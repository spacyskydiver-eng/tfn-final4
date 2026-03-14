import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

async function getAuthorizedServer(guildId: string, userId: string, isAdmin: boolean) {
  const server = await prisma.verificationServer.findUnique({ where: { guildId } })
  if (!server) return null
  if (!isAdmin && server.addedById !== userId) return null
  return server
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { guildId } = await params
  const server = await getAuthorizedServer(guildId, user.id, user.isAdmin)
  if (!server) return NextResponse.json({ error: 'Server not found or forbidden' }, { status: 404 })
  const rules = await prisma.verificationRule.findMany({ where: { serverId: server.id } })
  return NextResponse.json({ rules })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { guildId } = await params
  const server = await getAuthorizedServer(guildId, user.id, user.isAdmin)
  if (!server) return NextResponse.json({ error: 'Server not found or forbidden' }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const { allianceTag, roleId, label } = body as { allianceTag: string; roleId: string; label?: string }
  if (!allianceTag?.trim() || !roleId?.trim()) {
    return NextResponse.json({ error: 'allianceTag and roleId required' }, { status: 400 })
  }
  const rule = await prisma.verificationRule.create({
    data: { serverId: server.id, allianceTag: allianceTag.trim(), roleId: roleId.trim(), label: label?.trim() || null },
  })
  return NextResponse.json({ rule }, { status: 201 })
}
