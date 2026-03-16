import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  const { qid } = await params
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const question = await prisma.arkFormQuestion.update({
      where: { id: qid },
      data: {
        label: body?.label ?? undefined,
        placeholder: body?.placeholder ?? undefined,
        required: body?.required !== undefined ? body.required : undefined,
        options: body?.options ?? undefined,
        order: body?.order !== undefined ? body.order : undefined,
        translations: body?.translations ?? undefined,
        maxSelect: 'maxSelect' in (body ?? {}) ? (body.maxSelect ?? null) : undefined,
      },
    })
    return NextResponse.json({ question })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  const { qid } = await params
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await prisma.arkFormQuestion.delete({ where: { id: qid } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
