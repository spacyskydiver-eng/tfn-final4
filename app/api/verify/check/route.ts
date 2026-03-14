import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  // Auth via bot secret
  const secret = req.headers.get('x-bot-secret')
  if (!secret || secret !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { guildId, discordUserId, discordUsername, imageUrl } = body as {
    guildId: string; discordUserId: string; discordUsername: string; imageUrl: string
  }
  if (!guildId || !discordUserId || !imageUrl) {
    return NextResponse.json({ error: 'guildId, discordUserId, and imageUrl required' }, { status: 400 })
  }

  const server = await prisma.verificationServer.findUnique({
    where: { guildId, active: true },
    include: { rules: true },
  })
  if (!server) return NextResponse.json({ result: 'server_not_configured' }, { status: 404 })

  // Check free limit
  if (server.freeLimit !== -1 && server.usedCount >= server.freeLimit) {
    return NextResponse.json({ result: 'over_limit', reason: 'Monthly verification limit reached. Contact TFN to upgrade.' })
  }

  // Download image
  let imageBase64: string
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error('Failed to fetch image')
    const buf = await imgRes.arrayBuffer()
    imageBase64 = Buffer.from(buf).toString('base64')
    const ct = imgRes.headers.get('content-type') ?? 'image/png'
    mediaType = (ct.includes('jpeg') || ct.includes('jpg') ? 'image/jpeg'
      : ct.includes('webp') ? 'image/webp'
      : ct.includes('gif') ? 'image/gif'
      : 'image/png') as typeof mediaType
  } catch {
    await logAndReturn(server.id, guildId, discordUserId, discordUsername, 'parse_failed')
    return NextResponse.json({ result: 'parse_failed', reason: 'Could not download the image.' })
  }

  // Call Claude Haiku vision
  let govId: string | null = null
  let govName: string | null = null
  let allianceTag: string | null = null

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'This is a Rise of Kingdoms governor profile screenshot. Extract these fields and reply with ONLY a JSON object (no markdown, no explanation): { "govId": "numeric governor ID shown in parentheses e.g. 123456789", "govName": "governor name", "allianceTag": "alliance tag in square brackets e.g. [T13O] or null if no alliance" }',
          },
        ],
      }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const parsed = JSON.parse(text)
    govId = parsed.govId?.toString()?.trim() || null
    govName = parsed.govName?.trim() || null
    allianceTag = parsed.allianceTag?.trim() || null
  } catch {
    await logAndReturn(server.id, guildId, discordUserId, discordUsername, 'parse_failed')
    return NextResponse.json({ result: 'parse_failed', reason: 'Could not read the governor profile. Make sure the screenshot shows the full profile screen.' })
  }

  if (!govId) {
    await logAndReturn(server.id, guildId, discordUserId, discordUsername, 'parse_failed', null, govName, allianceTag)
    return NextResponse.json({ result: 'parse_failed', reason: 'Could not extract governor ID from the screenshot.', govName, allianceTag })
  }

  // Check if govId already used in this server
  const existing = await prisma.verificationLog.findFirst({
    where: { serverId: server.id, govId, result: 'success' },
  })
  if (existing) {
    await logAndReturn(server.id, guildId, discordUserId, discordUsername, 'already_used', null, govName, allianceTag, govId)
    return NextResponse.json({ result: 'already_used', govId, govName, allianceTag, reason: `Governor ID ${govId} has already been used for verification in this server.` })
  }

  // Match alliance tag against rules
  const normalise = (s: string) => s.replace(/[\[\]]/g, '').toLowerCase().trim()
  const normTag = allianceTag ? normalise(allianceTag) : ''
  const matchedRule = server.rules.find(r => {
    const ruleNorm = normalise(r.allianceTag)
    return normTag === ruleNorm || normTag.includes(ruleNorm) || ruleNorm.includes(normTag)
  })

  if (!matchedRule) {
    await logAndReturn(server.id, guildId, discordUserId, discordUsername, 'failed_alliance', null, govName, allianceTag, govId)
    return NextResponse.json({ result: 'failed_alliance', govId, govName, allianceTag, staffRoleId: server.staffRoleId, reason: `Alliance tag "${allianceTag ?? 'none'}" did not match any verification rules.` })
  }

  // Success — increment usage and log
  await prisma.$transaction([
    prisma.verificationServer.update({ where: { id: server.id }, data: { usedCount: { increment: 1 } } }),
    prisma.verificationLog.create({
      data: { serverId: server.id, guildId, discordUserId, discordUsername, govId, govName, allianceTag, result: 'success', roleAssigned: matchedRule.roleId, roleName: matchedRule.label },
    }),
  ])

  return NextResponse.json({ result: 'success', govId, govName, allianceTag, roleId: matchedRule.roleId, roleName: matchedRule.label })
}

async function logAndReturn(serverId: string, guildId: string, discordUserId: string, discordUsername: string, result: string, roleAssigned?: string | null, govName?: string | null, allianceTag?: string | null, govId?: string | null) {
  await prisma.verificationLog.create({
    data: { serverId, guildId, discordUserId, discordUsername, govId: govId ?? null, govName: govName ?? null, allianceTag: allianceTag ?? null, result, roleAssigned: roleAssigned ?? null },
  }).catch(() => {})
}
