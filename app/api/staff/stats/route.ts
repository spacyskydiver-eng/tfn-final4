import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const completed = await prisma.kvkSetup.findMany({
      where: { status: 'active', completedAt: { not: null } },
      select: {
        id: true,
        name: true,
        completedAt: true,
        completedById: true,
        completedByName: true,
        createdBy: { select: { username: true, avatar: true } },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Aggregate by date (YYYY-MM-DD)
    const byDate: Record<string, number> = {}
    const byStaff: Record<string, { name: string; count: number }> = {}
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 6)

    let thisMonth = 0
    let thisWeek = 0

    for (const c of completed) {
      const date = c.completedAt!.toISOString().split('T')[0]
      byDate[date] = (byDate[date] ?? 0) + 1

      const staffId = c.completedById ?? 'unknown'
      const staffName = c.completedByName ?? 'Unknown'
      if (!byStaff[staffId]) byStaff[staffId] = { name: staffName, count: 0 }
      byStaff[staffId].count++

      if (c.completedAt! >= monthStart) thisMonth++
      if (c.completedAt! >= weekStart) thisWeek++
    }

    // Build last 30 days for day chart
    const days: Array<{ label: string; date: string; count: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, date: key, count: byDate[key] ?? 0 })
    }

    // Build last 12 weeks
    const weeks: Array<{ label: string; date: string; count: number }> = []
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now)
      start.setDate(start.getDate() - i * 7 - 6)
      const end = new Date(now)
      end.setDate(end.getDate() - i * 7)
      let count = 0
      for (const [dateStr, cnt] of Object.entries(byDate)) {
        const d = new Date(dateStr)
        if (d >= start && d <= end) count += cnt
      }
      const label = `W${12 - i}`
      weeks.push({ label, date: start.toISOString().split('T')[0], count })
    }

    // Build last 12 months
    const months: Array<{ label: string; date: string; count: number }> = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const count = Object.entries(byDate)
        .filter(([dateStr]) => dateStr.startsWith(key))
        .reduce((s, [, n]) => s + n, 0)
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      months.push({ label: monthNames[d.getMonth()], date: key, count })
    }

    const leaderboard = Object.entries(byStaff)
      .map(([staffId, v]) => ({ staffId, staffName: v.name, completions: v.count }))
      .sort((a, b) => b.completions - a.completions)

    // Recent 20 completed
    const recent = completed.slice(0, 20).map(c => ({
      id: c.id,
      name: c.name,
      completedAt: c.completedAt,
      completedByName: c.completedByName,
      requestedBy: c.createdBy.username,
    }))

    return NextResponse.json({
      total: completed.length,
      thisMonth,
      thisWeek,
      days,
      weeks,
      months,
      leaderboard,
      recent,
    })
  } catch (err) {
    console.error('[GET /api/staff/stats]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
