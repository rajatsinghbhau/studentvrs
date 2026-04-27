import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateLevel } from '@/lib/utils'

// GET /api/profile
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profile) return errorResponse('Profile not found', 404)

    // Total tests and avg score
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select('score, max_score, accuracy')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')

    const avgAccuracy = attempts?.length
      ? Math.round(attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / attempts.length)
      : 0

    // Total study time
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration')
      .eq('user_id', user.id)

    const totalStudyTime = sessions?.reduce((s, sess) => s + sess.duration, 0) || 0

    // Achievements
    const achievements = []
    if (profile.streak >= 7) achievements.push({ id: 'week_streak', title: '7-Day Warrior', icon: '🔥', unlocked: true })
    if (profile.streak >= 30) achievements.push({ id: 'month_streak', title: 'Iron Will', icon: '⚡', unlocked: true })
    if ((attempts?.length || 0) >= 5) achievements.push({ id: 'test_5', title: 'Test Veteran', icon: '🎯', unlocked: true })
    if (avgAccuracy >= 80) achievements.push({ id: 'high_accuracy', title: 'Precision Master', icon: '💎', unlocked: true })
    if (totalStudyTime >= 600) achievements.push({ id: 'study_10h', title: '10 Hour Scholar', icon: '📚', unlocked: true })

    // Level info
    const { level, title: rankTitle } = calculateLevel(profile.xp || 0)
    const xpThresholds = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000]
    const nextLevelXP = xpThresholds[Math.min(level, xpThresholds.length - 1)] || 25000
    const prevLevelXP = xpThresholds[Math.max(level - 1, 0)] || 0

    return successResponse({
      profile: {
        ...profile,
        email: user.email,
        level,
        rank_title: rankTitle,
        xp_progress_percent: Math.round(((profile.xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100),
        xp_to_next: nextLevelXP - profile.xp
      },
      stats: {
        total_tests: attempts?.length || 0,
        avg_accuracy: avgAccuracy,
        total_study_time: totalStudyTime,
        best_streak: profile.longest_streak || 0
      },
      achievements
    })
  } catch (err) {
    console.error('Profile GET error:', err)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH /api/profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const allowedFields = ['name', 'avatar_url', 'bio', 'target_exam', 'target_year', 'onboarding_done']
    const updateData: Record<string, unknown> = {}

    allowedFields.forEach(field => {
      if (body[field] !== undefined) updateData[field] = body[field]
    })

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update')
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) return errorResponse(error.message)

    return successResponse({ profile })
  } catch (err) {
    console.error('Profile PATCH error:', err)
    return errorResponse('Internal server error', 500)
  }
}
