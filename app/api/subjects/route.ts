import { NextRequest } from 'next/server'
import { supabase, supabaseAdmin, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const examType = searchParams.get('exam') || 'JEE'

    // Fetch subjects+topics via admin (bypasses RLS on curriculum tables)
    // and user progress via anon client (RLS enforces per-user scope)
    const [subjectsRes, progressRes] = await Promise.all([
      supabaseAdmin
        .from('subjects')
        .select('id, name, icon, color, total_topics, topics(id, name, difficulty, weightage, chapter_num)')
        .or(`exam_type.eq.${examType},exam_type.eq.ALL`)
        .order('name'),
      supabase
        .from('user_topic_progress')
        .select('topic_id, is_completed, mastery_level, study_time')
        .eq('user_id', user.id)
    ])

    if (subjectsRes.error) return errorResponse(subjectsRes.error.message)

    // Build progress lookup map (O(1) access)
    const progressMap = new Map((progressRes.data || []).map(p => [p.topic_id, p]))

    const subjects = (subjectsRes.data || []).map(subject => {
      const topics = (subject.topics as { id: string; name: string; difficulty: string; weightage: number; chapter_num: number }[]) || []
      const completedCount = topics.filter(t => progressMap.get(t.id)?.is_completed).length
      const totalStudyTime = topics.reduce((s, t) => s + (progressMap.get(t.id)?.study_time || 0), 0)
      const masteries = topics.map(t => progressMap.get(t.id)?.mastery_level || 0)
      const avgMastery = masteries.length ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : 0

      return {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        color: subject.color,
        total_topics: subject.total_topics,
        topics: topics.sort((a, b) => a.chapter_num - b.chapter_num),
        completed_topics: completedCount,
        progress: subject.total_topics > 0 ? Math.round((completedCount / subject.total_topics) * 100) : 0,
        total_study_time: totalStudyTime,
        avg_mastery: avgMastery,
      }
    })

    return successResponse({ subjects })
  } catch (err) {
    console.error('Subjects error:', err)
    return errorResponse('Internal server error', 500)
  }
}
