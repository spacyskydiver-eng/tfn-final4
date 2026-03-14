import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  username: string
  avatar: string | null
  isAdmin: boolean
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('rok_session')
  if (!cookie) return null
  try {
    return JSON.parse(cookie.value) as SessionUser
  } catch {
    return null
  }
}
