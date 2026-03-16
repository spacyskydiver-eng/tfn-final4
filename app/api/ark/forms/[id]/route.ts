import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const form = await prisma.arkForm.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    })
    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ form })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const form = await prisma.arkForm.update({
      where: { id },
      data: {
        title: body?.title ?? undefined,
        description: body?.description ?? undefined,
        isOpen: body?.isOpen !== undefined ? body.isOpen : undefined,
        guildId: body?.guildId !== undefined ? body.guildId : undefined,
        guildName: body?.guildName !== undefined ? body.guildName : undefined,
        requireDiscordVerification: body?.requireDiscordVerification !== undefined ? body.requireDiscordVerification : undefined,
      },
    })
    return NextResponse.json({ form })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
