import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))

    let shortCode = generateShortCode()
    let attempts = 0
    while (await prisma.arkForm.findUnique({ where: { shortCode } }) && attempts < 10) {
      shortCode = generateShortCode()
      attempts++
    }

    const form = await prisma.arkForm.create({
      data: {
        eventId: body.eventId ?? null,
        shortCode,
        title: body.title ?? 'Ark Registration',
        description: body.description ?? '',
        isOpen: false,
        guildId: body.guildId ?? null,
        guildName: body.guildName ?? null,
        requireDiscordVerification: body.requireDiscordVerification ?? true,
        createdById: session.id,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ form }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const forms = await prisma.arkForm.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    })
    return NextResponse.json({ forms })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
