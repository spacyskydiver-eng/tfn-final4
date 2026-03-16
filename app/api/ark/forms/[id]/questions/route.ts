import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const questions = await prisma.arkFormQuestion.findMany({
      where: { formId: id },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ questions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    if (!body?.type || !body?.key || !body?.label) {
      return NextResponse.json({ error: 'type, key, label required' }, { status: 400 })
    }

    const maxOrder = await prisma.arkFormQuestion.aggregate({
      where: { formId: id },
      _max: { order: true },
    })
    const order = (maxOrder._max.order ?? -1) + 1

    const question = await prisma.arkFormQuestion.create({
      data: {
        formId: id,
        order,
        type: body.type,
        key: body.key,
        label: body.label,
        placeholder: body.placeholder ?? null,
        required: body.required ?? false,
        botManaged: body.botManaged ?? false,
        options: body.options ?? null,
        translations: body.translations ?? null,
        maxSelect: body.maxSelect ?? null,
      },
    })
    return NextResponse.json({ question }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
