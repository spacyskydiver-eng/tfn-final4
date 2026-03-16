import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function isBot(req: NextRequest) {
  return req.headers.get('x-bot-secret') === process.env.BOT_API_SECRET
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const app = await prisma.leadershipApplication.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ application: app })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isBot(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const b = await req.json().catch(() => ({}))
    const app = await prisma.leadershipApplication.update({
      where: { id },
      data: {
        projectId:           'projectId'           in b ? b.projectId           : undefined,
        isFounder:           'isFounder'           in b ? b.isFounder           : undefined,
        screenshotUrls:      'screenshotUrls'      in b ? b.screenshotUrls      : undefined,
        leaderPermDiscord:   'leaderPermDiscord'   in b ? b.leaderPermDiscord   : undefined,
        leaderPermWebsite:   'leaderPermWebsite'   in b ? b.leaderPermWebsite   : undefined,
        status:              'status'              in b ? b.status              : undefined,
        staffVerifiedQ2:     'staffVerifiedQ2'     in b ? b.staffVerifiedQ2     : undefined,
        staffVerifiedQ3:     'staffVerifiedQ3'     in b ? b.staffVerifiedQ3     : undefined,
        staffVerifiedQ4:     'staffVerifiedQ4'     in b ? b.staffVerifiedQ4     : undefined,
        discordRoleGranted:  'discordRoleGranted'  in b ? b.discordRoleGranted  : undefined,
        websiteRoleGranted:  'websiteRoleGranted'  in b ? b.websiteRoleGranted  : undefined,
      },
    })
    return NextResponse.json({ application: app })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
