import { NextRequest } from 'next/server'
import { supabase, supabaseAdmin, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateXP, calculateLevel } from '@/lib/utils'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/subtopics/[id] — toggle subtopic completion
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const { is_completed, topic_id, subject_id } = await request.json()

    // Use supabaseAdmin for all user-data reads/writes on server side.
    // The anon client doesn't attach the user JWT to DB calls, so auth.uid()
    // returns null and RLS blocks every insert/update. We already validated
    // the user above via getAuthUser, so admin bypass is safe here.

    const [existingRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('user_subtopic_progress')
        .select('is_completed')
        .eq('user_id', user.id)
        .eq('subtopic_id', id)
        .maybeSingle(),
      supabaseAdmin.from('profiles').select('xp').eq('id', user.id).single(),
    ])

    const existing = existingRes.data
    const currentXP = profileRes.data?.xp || 0
    const isFirstComplete = is_completed && !existing?.is_completed

    // Upsert subtopic progress
    const { error: upsertErr } = await supabaseAdmin
      .from('user_subtopic_progress')
      .upsert(
        {
          user_id: user.id,
          subtopic_id: id,
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,subtopic_id' }
      )

    if (upsertErr) {
      console.error('Subtopic upsert error:', upsertErr)
      return errorResponse(upsertErr.message, 500)
    }

    // Award XP and log study session for first completion
    let xpGained = 0
    if (isFirstComplete) {
      xpGained = calculateXP('topic_complete')
      const newXP = currentXP + xpGained
      const { level: newLevel, title: newTitle } = calculateLevel(newXP)
      
      const dbOps = [
        supabaseAdmin
          .from('profiles')
          .update({ 
            xp: newXP,
            level: newLevel,
            rank_title: newTitle
          })
          .eq('id', user.id),
        supabaseAdmin.from('study_sessions').insert({
          user_id: user.id,
          subject_id: subject_id || null,
          topic_id: topic_id || null,
          duration: 15,
          session_date: new Date().toISOString().split('T')[0]
        })
      ]
      await Promise.all(dbOps)
    }

    // Update parent topic progress when topic_id provided
    if (topic_id) {
      const [progressRes, subtopicsRes] = await Promise.all([
        supabaseAdmin
          .from('user_subtopic_progress')
          .select('subtopic_id, is_completed')
          .eq('user_id', user.id),
        supabaseAdmin
          .from('subtopics')
          .select('id')
          .eq('topic_id', topic_id),
      ])

      const topicSubtopics = subtopicsRes.data || []
      if (topicSubtopics.length > 0) {
        const progressMap = new Map(
          (progressRes.data || []).map(p => [p.subtopic_id, p.is_completed])
        )
        // Apply the current toggle
        progressMap.set(id, is_completed)

        const completedCount = topicSubtopics.filter(s => progressMap.get(s.id)).length
        const isTopicComplete = completedCount === topicSubtopics.length

        await supabaseAdmin.from('user_topic_progress').upsert(
          {
            user_id: user.id,
            topic_id,
            is_completed: isTopicComplete,
            study_time: 0,
            mastery_level: Math.round((completedCount / topicSubtopics.length) * 100),
            last_studied: new Date().toISOString(),
          },
          { onConflict: 'user_id,topic_id' }
        )
      }
    }

    return successResponse({
      message: 'Subtopic progress updated',
      xp_gained: xpGained,
    })
  } catch (err: any) {
    console.error('Subtopic PATCH error:', err)
    return errorResponse(err.message || 'Internal server error', 500)
  }
}
