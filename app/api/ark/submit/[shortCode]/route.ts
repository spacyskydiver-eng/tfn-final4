import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params
  try {
    const form = await prisma.arkForm.findUnique({
      where: { shortCode: shortCode.toUpperCase() },
      include: { questions: { orderBy: { order: 'asc' } } },
    })
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    return NextResponse.json({ form })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params
  try {
    const form = await prisma.arkForm.findUnique({
      where: { shortCode: shortCode.toUpperCase() },
      include: { questions: { orderBy: { order: 'asc' } } },
    })
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    if (!form.isOpen) return NextResponse.json({ error: 'This form is currently closed.' }, { status: 400 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { govId, govName, answers } = body as {
      govId: string
      govName: string
      answers: Record<string, unknown>
    }
    if (!govId || !govName) return NextResponse.json({ error: 'govId and govName required' }, { status: 400 })

    // Check for duplicate
    const existing = await prisma.arkResponse.findUnique({
      where: { formId_govId: { formId: form.id, govId } },
    })
    if (existing) return NextResponse.json({ error: 'You have already submitted this form.' }, { status: 409 })

    // Get player data if exists
    const player = await prisma.arkPlayer.findUnique({ where: { govId } })

    // Validate required questions
    const required = form.questions.filter(q => q.required && !q.botManaged)
    for (const q of required) {
      const val = answers?.[q.key]
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        return NextResponse.json({ error: `"${q.label}" is required.` }, { status: 400 })
      }
    }

    // Create response with answers
    const response = await prisma.arkResponse.create({
      data: {
        formId: form.id,
        govId,
        govName,
        power: player?.power ?? null,
        discordVerified: player?.discordVerified ?? false,
        answers: {
          create: form.questions
            .filter(q => !q.botManaged && answers?.[q.key] !== undefined)
            .map(q => ({
              questionId: q.id,
              value: answers[q.key] as object,
            })),
        },
      },
    })

    return NextResponse.json({ ok: true, responseId: response.id })
  } catch (err) {
    console.error('[ark/submit]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
