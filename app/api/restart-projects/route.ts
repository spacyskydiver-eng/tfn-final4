import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const isBotReq = req.headers.get('x-bot-secret') === process.env.BOT_API_SECRET
  const showAll = isBotReq && new URL(req.url).searchParams.get('active') === 'false'
  try {
    const projects = await prisma.restartProject.findMany({
      where: showAll ? {} : { active: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ projects })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const isBotReq = req.headers.get('x-bot-secret') === process.env.BOT_API_SECRET
  try {
    let addedById: string | null = null
    if (!isBotReq) {
      const session = await getSession()
      if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const user = await prisma.user.findUnique({ where: { id: session.id } })
      if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      addedById = session.id
    }
    const body = await req.json().catch(() => null)
    if (!body?.name || !body?.guildId || !body?.guildName)
      return NextResponse.json({ error: 'name, guildId, guildName required' }, { status: 400 })
    const project = await prisma.restartProject.create({
      data: {
        name:             body.name,
        guildId:          body.guildId,
        guildName:        body.guildName,
        serverLink:       body.serverLink       ?? null,
        founderDiscordId: body.founderDiscordId ?? null,
        founderUsername:  body.founderUsername  ?? null,
        targetKingdom:    body.targetKingdom    ?? null,
        usesSleeper:      body.usesSleeper      ?? false,
        sleeperKingdom:   body.sleeperKingdom   ?? null,
        addedById:        addedById ?? body.addedById ?? null,
      },
    })
    return NextResponse.json({ project }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
