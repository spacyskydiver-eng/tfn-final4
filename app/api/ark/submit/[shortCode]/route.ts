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

    // Fetch event for Discord webhook (if form is linked to an event)
    const event = form.eventId
      ? await prisma.arkEvent.findUnique({ where: { id: form.eventId }, select: { name: true, discordWebhook: true } })
      : null

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const required = (form.questions as any[]).filter((q: any) => q.required && !q.botManaged)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const q of required as any[]) {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: (form.questions as any[])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((q: any) => !q.botManaged && answers?.[q.key] !== undefined)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((q: any) => ({
              questionId: q.id,
              value: answers[q.key] as object,
            })),
        },
      },
    })

    // Fire Discord webhook if configured on the event
    const webhook = event?.discordWebhook
    if (webhook) {
      const powerM = player?.power ? (Number(player.power) / 1_000_000).toFixed(1) + 'M' : null
      const rallyRaw = answers?.rally_cap
      const rally = rallyRaw ? String(rallyRaw) + 'M rally' : null
      const availability = Array.isArray(answers?.availability)
        ? (answers.availability as string[]).map(v => {
            const [day, time] = v.split('_')
            return `${day === 'sat' ? 'Sat' : 'Sun'} ${time.substring(0, 2)}:${time.substring(2) || '00'} UTC`
          }).join(', ')
        : null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields: any[] = [
        { name: 'Governor ID', value: `\`${govId}\``, inline: true },
      ]
      if (powerM) fields.push({ name: 'Power', value: powerM, inline: true })
      if (rally) fields.push({ name: 'Rally', value: rally, inline: true })
      if (player) fields.push({ name: 'Discord', value: player.discordVerified ? '✅ Verified' : '❌ Not verified', inline: true })
      if (availability) fields.push({ name: 'Availability', value: availability, inline: false })

      const payload = {
        embeds: [{
          title: `📋 New Ark Registration`,
          description: `**${govName}** has registered for **${event?.name ?? form.title}**`,
          color: 0x7c3aed,
          fields,
          footer: { text: `Form: ${form.shortCode} · ${new Date().toUTCString()}` },
        }],
      }

      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(e => console.error('[ark/webhook]', e))
    }

    return NextResponse.json({ ok: true, responseId: response.id })
  } catch (err) {
    console.error('[ark/submit]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
