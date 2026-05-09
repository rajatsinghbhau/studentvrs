import { NextRequest } from 'next/server'
import { supabase, supabaseAdmin, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET /api/subtopics?topicId=xxx  — list subtopics with user progress
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')
    if (!topicId) return errorResponse('topicId is required', 400)

    // Use supabaseAdmin to read subtopics (bypasses RLS — subtopics are public data)
    // Use anon supabase for user-scoped progress (RLS enforced per user)
    const [subtopicsRes, progressRes] = await Promise.all([
      supabaseAdmin
        .from('subtopics')
        .select('id, name, difficulty, order_num, topic_id')
        .eq('topic_id', topicId)
        .order('order_num'),
      supabase
        .from('user_subtopic_progress')
        .select('subtopic_id, is_completed, completed_at')
        .eq('user_id', user.id)
    ])

    if (subtopicsRes.error) return errorResponse(subtopicsRes.error.message)

    const progressMap = new Map(
      (progressRes.data || []).map(p => [p.subtopic_id, p])
    )

    const subtopics = (subtopicsRes.data || []).map(s => ({
      ...s,
      is_completed: progressMap.get(s.id)?.is_completed ?? false,
      completed_at: progressMap.get(s.id)?.completed_at ?? null,
    }))

    return successResponse({ subtopics })
  } catch (err) {
    console.error('Subtopics GET error:', err)
    return errorResponse('Internal server error', 500)
  }
}
