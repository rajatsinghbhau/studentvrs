import { NextRequest } from 'next/server'
import { supabase, getAuthUser, createUserClient } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateLevel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return unauthorizedResponse()
    const token = authHeader.replace('Bearer ', '')

    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const userClient = createUserClient(token)

    // Run all independent queries in parallel
    const [profileRes, subjectsRes, upcomingTestsRes, recentAttemptsRes, dueCardsRes] = await Promise.all([
      userClient.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('subjects').select('id, name, icon, color, total_topics').limit(10),
      supabase.from('tests').select('id, title, subject_id, total_questions, duration, difficulty, subjects(name, icon, color)').order('created_at', { ascending: false }).limit(3),
      userClient.from('test_attempts').select('id, score, max_score, accuracy, completed_at, tests(title, subjects(name, icon))').eq('user_id', user.id).eq('status', 'COMPLETED').order('completed_at', { ascending: false }).limit(5),
      userClient.from('revision_cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).lte('next_review_at', new Date().toISOString()),
    ])

    const profile = profileRes.data
    const subjects = subjectsRes.data || []

    // Get today's study time
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [todaySessionsRes, weeklySessionsRes, allProgressRes] = await Promise.all([
      userClient.from('study_sessions').select('duration').eq('user_id', user.id).eq('session_date', today),
      userClient.from('study_sessions').select('duration').eq('user_id', user.id).gte('session_date', sevenDaysAgo),
      // Get all completed topics for this user in one query
      userClient.from('user_topic_progress').select('topic_id, is_completed, topics(subject_id)').eq('user_id', user.id).eq('is_completed', true),
    ])

    const todayStudyTime = todaySessionsRes.data?.reduce((s, x) => s + x.duration, 0) || 0
    const weeklyStudyTime = weeklySessionsRes.data?.reduce((s, x) => s + x.duration, 0) || 0

    // Build a map of completed topics per subject from the single progress query
    const completedBySubject = new Map<string, number>()
    for (const p of allProgressRes.data || []) {
      const subjectId = (p.topics as { subject_id?: string } | null)?.subject_id
      if (subjectId) {
        completedBySubject.set(subjectId, (completedBySubject.get(subjectId) || 0) + 1)
      }
    }

    const subjectsWithProgress = subjects.map(subject => {
      const completedCount = completedBySubject.get(subject.id) || 0
      return {
        ...subject,
        completed_topics: completedCount,
        progress: subject.total_topics > 0 ? Math.round((completedCount / subject.total_topics) * 100) : 0
      }
    })

    // XP levels
    const xpThresholds = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000]
    const currentXP = profile?.xp || 0
    const { level: currentLevel, title: rankTitle } = calculateLevel(currentXP)
    const nextLevelXP = xpThresholds[Math.min(currentLevel, xpThresholds.length - 1)] || 25000
    const prevLevelXP = xpThresholds[Math.max(currentLevel - 1, 0)] || 0
    const xpProgress = nextLevelXP > prevLevelXP
      ? Math.round(((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100)
      : 100

    const studyPlan = [
      { time: '09:00 AM', subject: 'Physics', topic: 'Electrostatics', duration: 60, priority: 'HIGH' },
      { time: '10:30 AM', subject: 'Math', topic: 'Integration', duration: 90, priority: 'HIGH' },
      { time: '12:00 PM', subject: 'Chemistry', topic: 'Equilibrium', duration: 60, priority: 'MEDIUM' },
      { time: '04:00 PM', subject: 'Revision', topic: 'Flashcards', duration: 30, priority: 'LOW' },
    ]

    return successResponse({
      profile: {
        id: profile?.id,
        name: profile?.name,
        avatar_url: profile?.avatar_url,
        target_exam: profile?.target_exam,
        target_year: profile?.target_year,
        streak: profile?.streak || 0,
        longest_streak: profile?.longest_streak || 0,
        xp: currentXP,
        level: currentLevel,
        rank_title: rankTitle,
        xp_progress: Math.min(xpProgress, 100),
        xp_to_next_level: Math.max(nextLevelXP - currentXP, 0)
      },
      stats: {
        today_study_time: todayStudyTime,
        weekly_study_time: weeklyStudyTime,
        due_cards: dueCardsRes.count || 0,
        tests_taken: recentAttemptsRes.data?.length || 0
      },
      subjects: subjectsWithProgress,
      upcoming_tests: upcomingTestsRes.data || [],
      recent_attempts: recentAttemptsRes.data || [],
      study_plan: studyPlan
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return errorResponse('Internal server error', 500)
  }
}
