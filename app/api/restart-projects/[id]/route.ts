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
  const isBotReq = req.headers.get('x-bot-secret') === process.env.BOT_API_SECRET
  if (!isBotReq && !await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const b = await req.json().catch(() => ({}))
    const project = await prisma.restartProject.update({
      where: { id },
      data: {
        name:             'name'             in b ? b.name             : undefined,
        guildId:          'guildId'          in b ? b.guildId          : undefined,
        guildName:        'guildName'        in b ? b.guildName        : undefined,
        serverLink:       'serverLink'       in b ? b.serverLink       : undefined,
        founderDiscordId: 'founderDiscordId' in b ? b.founderDiscordId : undefined,
        founderUsername:  'founderUsername'  in b ? b.founderUsername  : undefined,
        targetKingdom:    'targetKingdom'    in b ? b.targetKingdom    : undefined,
        usesSleeper:      'usesSleeper'      in b ? b.usesSleeper      : undefined,
        sleeperKingdom:   'sleeperKingdom'   in b ? b.sleeperKingdom   : undefined,
        active:           'active'           in b ? b.active           : undefined,
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
