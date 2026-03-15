import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { guildId } = await req.json().catch(() => ({})) as { guildId?: string }
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 })

    const server = await prisma.verificationServer.findUnique({ where: { guildId } })
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    if (!user.isAdmin && server.addedById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.verificationLog.deleteMany({ where: { serverId: server.id } })
    await prisma.verificationRule.deleteMany({ where: { serverId: server.id } })
    await prisma.verificationServer.delete({ where: { id: server.id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/verify/servers/delete]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
