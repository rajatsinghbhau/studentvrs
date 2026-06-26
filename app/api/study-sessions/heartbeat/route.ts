import { NextRequest } from 'next/server'
import { getAuthUser, createUserClient } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// POST /api/study-sessions/heartbeat — increment study session duration by 1 minute
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return unauthorizedResponse()
    const token = authHeader.replace('Bearer ', '')

    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const userClient = createUserClient(token)
    const { subjectId, topicId } = await request.json()

    const today = new Date().toISOString().split('T')[0]

    // Find if there is an existing study session for this user, today, and optionally the same subject/topic
    const { data: existingSession, error: fetchErr } = await userClient
      .from('study_sessions')
      .select('id, duration')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .is('subject_id', subjectId ? subjectId : null)
      .is('topic_id', topicId ? topicId : null)
      .maybeSingle()

    if (existingSession) {
      // Increment the duration by 1 minute
      const { error: updateErr } = await userClient
        .from('study_sessions')
        .update({ duration: existingSession.duration + 1 })
        .eq('id', existingSession.id)

      if (updateErr) return errorResponse(updateErr.message)
    } else {
      // Create a new session for 1 minute
      const { error: insertErr } = await userClient
        .from('study_sessions')
        .insert({
          user_id: user.id,
          subject_id: subjectId || null,
          topic_id: topicId || null,
          duration: 1,
          session_date: today
        })

      if (insertErr) return errorResponse(insertErr.message)
    }

    return successResponse({ message: 'Time tracked' })
  } catch (err: any) {
    console.error('Heartbeat error:', err)
    return errorResponse(err.message || 'Internal server error', 500)
  }
}
