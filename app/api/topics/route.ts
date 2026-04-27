import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

// GET /api/topics?subjectId=xxx
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')

    let query = supabase
      .from('topics')
      .select('id, name, description, difficulty, weightage, chapter_num, subject_id, subjects(name, icon, color)')
      .order('chapter_num')

    if (subjectId) query = query.eq('subject_id', subjectId)

    const { data: topics, error } = await query
    if (error) return errorResponse(error.message)

    // Get user progress for these topics
    const topicIds = topics?.map(t => t.id) || []
    const { data: progress } = await supabase
      .from('user_topic_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('topic_id', topicIds)

    const progressMap = new Map(progress?.map(p => [p.topic_id, p]) || [])

    const topicsWithProgress = topics?.map(topic => ({
      ...topic,
      progress: progressMap.get(topic.id) || {
        is_completed: false,
        study_time: 0,
        mastery_level: 0,
        last_studied: null
      }
    }))

    return successResponse({ topics: topicsWithProgress })
  } catch (err) {
    console.error('Topics error:', err)
    return errorResponse('Internal server error', 500)
  }
}
