import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    // Call Google Vision OCR
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      }
    )
    const visionData = await visionRes.json()
    const fullText: string = visionData.responses?.[0]?.textAnnotations?.[0]?.description ?? ''

    console.log('[verify/check] OCR text:', fullText.slice(0, 300))

    if (!fullText) throw new Error('No text detected in image')

    // Extract governor ID — looks for (ID: 123456789) or (123456789)
    const idMatch = fullText.match(/\((?:ID:\s*)?(\d{6,12})\)/)
    govId = idMatch?.[1] ?? null

    // Extract alliance tag — [XXXX] pattern
    const tagMatch = fullText.match(/\[([A-Z0-9]{2,6})\]/)
    allianceTag = tagMatch ? `[${tagMatch[1]}]` : null

    // Extract governor name — on the line immediately after the ID line
    // e.g. "(ID: 207018781)\n13×Taws" or "Governor (ID: 209376582)\n13×HouKen"
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)
    const idLineIdx = lines.findIndex(l => /\((?:ID:\s*)?\d{6,12}\)/.test(l))
    if (idLineIdx !== -1) {
      // Try name on same line first (after removing the ID part)
      const idLine = lines[idLineIdx]
      const nameFromLine = idLine
        .replace(/\((?:ID:\s*)?\d{6,12}\)/, '')
        .replace(/^(Governor|Vali|Gouverneur|总督|총독)\s*/i, '')
        .trim()
      if (nameFromLine && !/^\d/.test(nameFromLine)) {
        govName = nameFromLine
      } else {
        // Name is on the next line — skip lines that look like labels or numbers
        for (let i = idLineIdx + 1; i < Math.min(idLineIdx + 4, lines.length); i++) {
          const candidate = lines[i]
          // Skip if it looks like a label (Civilization, Alliance, etc.) or pure numbers/slashes
          if (/^[\d\/\.,]+$/.test(candidate)) continue
          if (/^(Civilization|Medeniyet|Alliance|Birlik|Power|Güç|Kill|Leş|Governor|Vali)/i.test(candidate)) continue
          govName = candidate
          break
        }
      }
    }

  } catch (err) {
    console.error('[verify/check] OCR error:', err)
    await logAndReturn(server.id, guildId, discordUserId, discordUsername, 'parse_failed')
    return NextResponse.json({ result: 'parse_failed', reason: String(err) })
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
