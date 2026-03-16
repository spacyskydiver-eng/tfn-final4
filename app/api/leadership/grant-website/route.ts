import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-bot-secret') !== process.env.BOT_API_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => null)
    if (!body?.discordUserId)
      return NextResponse.json({ error: 'discordUserId required' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { discordId: body.discordUserId } })
    if (!user)
      return NextResponse.json({ error: 'User not found — they must log in to the website first' }, { status: 404 })
    await prisma.user.update({ where: { discordId: body.discordUserId }, data: { isLeadership: true } })
    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
