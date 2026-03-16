import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/server-auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const responses = await prisma.arkResponse.findMany({
      where: { formId: id },
      orderBy: { submittedAt: 'desc' },
      include: {
        answers: {
          include: { question: { select: { key: true, label: true, type: true } } },
        },
        assignment: {
          include: { teamRef: { select: { id: true, name: true, color: true } } },
        },
        player: true,
      },
    })
    return NextResponse.json({ responses })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
