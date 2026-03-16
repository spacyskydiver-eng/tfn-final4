import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const DEFAULT_QUESTIONS = [
  { order: 0, type: 'botfield', key: 'gov_name',    label: 'Governor Name',    botManaged: true,  required: true },
  { order: 1, type: 'botfield', key: 'gov_id',      label: 'Governor ID',      botManaged: true,  required: true },
  { order: 2, type: 'botfield', key: 'power',        label: 'Power',            botManaged: true,  required: false },
  { order: 3, type: 'botfield', key: 'discord',      label: 'Discord Status',   botManaged: true,  required: false },
  { order: 4, type: 'select',   key: 'ark_exp',      label: 'Have you done Ark of Osiris before?', required: true,
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  { order: 5, type: 'number',   key: 'rally_cap',    label: 'Rally Capacity (millions)', placeholder: 'e.g. 1.8', required: true },
  { order: 6, type: 'commanders', key: 'commanders', label: 'Best Commanders with Skill Levels',
    placeholder: 'Example:\nCao Cao - 5 1 2 1\nPelagius - 5 5 5 5', required: true },
  { order: 7, type: 'timeslots', key: 'availability', label: 'Availability',    required: true,
    options: [
      { value: 'sat_11', label: 'Saturday 11:00 UTC' },
      { value: 'sat_13', label: 'Saturday 13:00 UTC' },
      { value: 'sat_14', label: 'Saturday 14:00 UTC' },
      { value: 'sat_15', label: 'Saturday 15:00 UTC' },
      { value: 'sat_20', label: 'Saturday 20:00 UTC' },
      { value: 'sun_04', label: 'Sunday 04:00 UTC' },
      { value: 'sun_12', label: 'Sunday 12:00 UTC' },
      { value: 'sun_14', label: 'Sunday 14:00 UTC' },
      { value: 'sun_20', label: 'Sunday 20:00 UTC' },
    ],
  },
  { order: 8, type: 'textarea', key: 'troops',        label: 'Troop Counts (T4/T5)',
    placeholder: 'Example:\n200k T4 Infantry\n150k T5 Cavalry', required: false },
  { order: 9, type: 'text',     key: 'discord_name',  label: 'Discord Username', placeholder: 'e.g. AlexX#1234', required: false },
]

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))

    // Generate unique short code
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
        description: body.description ?? 'Register for the upcoming Ark of Osiris event.',
        isOpen: true,
        createdById: session.id,
        questions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: DEFAULT_QUESTIONS.map(q => ({
            order: q.order,
            type: q.type,
            key: q.key,
            label: q.label,
            placeholder: (q as { placeholder?: string }).placeholder ?? null,
            required: q.required,
            botManaged: (q as { botManaged?: boolean }).botManaged ?? false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: ((q as any).options ?? null) as any,
          })),
        },
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
