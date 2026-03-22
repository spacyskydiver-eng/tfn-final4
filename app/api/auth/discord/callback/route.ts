import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  if (host) return `${proto}://${host}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=no_code', request.url))
  }

  const clientId = process.env.DISCORD_CLIENT_ID!
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!
  const baseUrl = getBaseUrl(request)
  const redirectUri = `${baseUrl}/api/auth/discord/callback`

  // Exchange code for token
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text()
    console.error('[discord/callback] token exchange failed:', tokenRes.status, errBody)
    return NextResponse.redirect(new URL(`/?auth_error=token_failed&detail=${encodeURIComponent(errBody)}`, request.url))
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  // Get user profile
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!userRes.ok) {
    return NextResponse.redirect(new URL('/?auth_error=user_failed', request.url))
  }

  const discordUser = await userRes.json()

  // Check if admin
  const adminIds = (process.env.DISCORD_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  const isAdmin = adminIds.includes(discordUser.id)

  // Upsert user in DB — creates on first login, updates username/avatar on subsequent logins
  const dbUser = await prisma.user.upsert({
    where: { discordId: discordUser.id },
    create: {
      discordId: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
      isAdmin,
    },
    update: {
      username: discordUser.username,
      avatar: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
      isAdmin,
    },
  })

  // Create session data using the DB user's cuid (not the Discord snowflake)
  const sessionData = {
    id: dbUser.id,
    username: dbUser.username,
    avatar: dbUser.avatar,
    isAdmin: dbUser.isAdmin,
    isLeadership: dbUser.isLeadership,
  }

  // Store session in a secure HTTP-only cookie
  const cookieStore = await cookies()
  cookieStore.set('rok_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return NextResponse.redirect(new URL('/', request.url))
  
}


