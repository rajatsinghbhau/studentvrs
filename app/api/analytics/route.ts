import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'

    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)
    const startDate = daysAgo.toISOString().split('T')[0]

    // Fetch everything in parallel
    const [sessionsRes, attemptsRes, weakTopicsRes, profileRes, cardsRes, completedTopicsRes] = await Promise.all([
      supabase.from('study_sessions').select('duration, session_date, subject_id, subjects(name, color, icon)').eq('user_id', user.id).gte('session_date', startDate).order('session_date'),
      supabase.from('test_attempts').select('score, max_score, accuracy, completed_at, tests(title, subjects(name, color))').eq('user_id', user.id).eq('status', 'COMPLETED').gte('completed_at', daysAgo.toISOString()).order('completed_at'),
      supabase.from('user_topic_progress').select('mastery_level, topics(name, subject_id, subjects(name, color))').eq('user_id', user.id).lt('mastery_level', 50).order('mastery_level', { ascending: true }).limit(10),
      supabase.from('profiles').select('streak, longest_streak, xp, level, rank_title').eq('id', user.id).single(),
      supabase.from('revision_cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gt('repetitions', 0),
      supabase.from('user_topic_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', true)
    ])

    const sessions = sessionsRes.data || []
    const attempts = attemptsRes.data || []

    // Subject-wise study time
    const subjectTimeMap = new Map<string, { name: string; color: string; icon: string; minutes: number }>()
    const dailyStudy: Record<string, number> = {}

    for (const s of sessions) {
      const sub = s.subjects as { name?: string; color?: string; icon?: string } | null
      const name = sub?.name || 'Unknown'
      if (!subjectTimeMap.has(name)) subjectTimeMap.set(name, { name, color: sub?.color || '#00F2FF', icon: sub?.icon || '📚', minutes: 0 })
      subjectTimeMap.get(name)!.minutes += s.duration
      dailyStudy[s.session_date] = (dailyStudy[s.session_date] || 0) + s.duration
    }

    // Streak calendar (last 30 days)
    const streakCalendar = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0]
      return { date: d, studied: d in dailyStudy, minutes: dailyStudy[d] || 0 }
    })

    const testTrend = attempts.map(a => ({
      date: a.completed_at?.split('T')[0],
      score: a.score,
      max_score: a.max_score,
      accuracy: a.accuracy,
      percentage: Math.round((a.score / a.max_score) * 100),
      test_title: (a.tests as { title?: string } | null)?.title,
      subject: (a.tests as { subjects?: { name?: string; color?: string } } | null)?.subjects
    }))

    const profile = profileRes.data

    return successResponse({
      overview: {
        total_study_time: sessions.reduce((s, x) => s + x.duration, 0),
        total_tests: attempts.length,
        avg_accuracy: attempts.length ? Math.round(attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / attempts.length) : 0,
        completed_topics: completedTopicsRes.count || 0,
        cards_reviewed: cardsRes.count || 0,
        streak: profile?.streak || 0,
        xp: profile?.xp || 0,
        level: profile?.level || 1,
        rank_title: profile?.rank_title || 'Rookie'
      },
      subject_time: Array.from(subjectTimeMap.values()),
      daily_study: streakCalendar,
      test_trend: testTrend,
      weak_topics: weakTopicsRes.data || []
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return errorResponse('Internal server error', 500)
  }
}
