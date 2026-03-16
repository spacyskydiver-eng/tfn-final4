import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

function isBot(req: NextRequest) {
  return req.headers.get('x-bot-secret') === process.env.BOT_API_SECRET
}

export async function GET(req: NextRequest) {
  if (!isBot(req)) {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const apps = await prisma.leadershipApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ applications: apps })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isBot(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => null)
    if (!body?.discordUserId || !body?.discordUsername || !body?.ticketChannelId)
      return NextResponse.json({ error: 'discordUserId, discordUsername, ticketChannelId required' }, { status: 400 })
    const app = await prisma.leadershipApplication.create({
      data: {
        discordUserId: body.discordUserId,
        discordUsername: body.discordUsername,
        ticketChannelId: body.ticketChannelId,
      },
    })
    return NextResponse.json({ application: app }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
