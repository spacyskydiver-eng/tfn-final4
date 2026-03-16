import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

const CONFIG_KEY = 'bundles-state-v3'

export async function GET() {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } })
    if (!config) return NextResponse.json(null)
    return NextResponse.json(config.value)
  } catch (err) {
    console.error('[GET /api/bundles]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    await prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: body },
      create: { key: CONFIG_KEY, value: body },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/bundles]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
