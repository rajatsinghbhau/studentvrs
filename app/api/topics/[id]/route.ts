import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateXP } from '@/lib/utils'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/topics/[id] — get single topic details
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params

    const { data: topic, error } = await supabase
      .from('topics')
      .select('*, subjects(name, icon, color)')
      .eq('id', id)
      .single()

    if (error || !topic) return errorResponse('Topic not found', 404)

    const { data: progress } = await supabase
      .from('user_topic_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', id)
      .single()

    // Revision cards for this topic
    const { data: cards } = await supabase
      .from('revision_cards')
      .select('id, front, back, difficulty, next_review_at')
      .eq('user_id', user.id)
      .eq('topic_id', id)

    return successResponse({ topic, progress, revision_cards: cards || [] })
  } catch (err) {
    console.error('Topic detail error:', err)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH /api/topics/[id] — update progress (mark complete, add study time)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const { is_completed, study_time, mastery_level, subject_id } = await request.json()

    // Fetch existing progress and profile XP in parallel
    const [existingRes, profileRes] = await Promise.all([
      supabase.from('user_topic_progress').select('is_completed, study_time, mastery_level').eq('user_id', user.id).eq('topic_id', id).single(),
      supabase.from('profiles').select('xp').eq('id', user.id).single()
    ])

    const existing = existingRes.data
    const currentXP = profileRes.data?.xp || 0
    const isFirstComplete = is_completed && !existing?.is_completed

    const updateData = {
      user_id: user.id,
      topic_id: id,
      is_completed: is_completed ?? existing?.is_completed ?? false,
      study_time: (existing?.study_time || 0) + (study_time || 0),
      mastery_level: mastery_level ?? existing?.mastery_level ?? 0,
      last_studied: new Date().toISOString()
    }

    // Run upsert + optional side effects concurrently
    const ops: any[] = [
      supabase.from('user_topic_progress').upsert(updateData, { onConflict: 'user_id,topic_id' })
    ]

    if (study_time && study_time > 0) {
      ops.push(supabase.from('study_sessions').insert({
        user_id: user.id, subject_id, topic_id: id,
        duration: study_time,
        session_date: new Date().toISOString().split('T')[0]
      }))
    }

    if (isFirstComplete) {
      const xpGained = calculateXP('topic_complete')
      ops.push(supabase.from('profiles').update({ xp: currentXP + xpGained }).eq('id', user.id))
    }

    const results = await Promise.all(ops)
    const upsertError = (results[0] as { error?: { message: string } }).error
    if (upsertError) return errorResponse(upsertError.message)

    return successResponse({
      message: 'Progress updated',
      xp_gained: isFirstComplete ? calculateXP('topic_complete') : 0
    })
  } catch (err) {
    console.error('Topic update error:', err)
    return errorResponse('Internal server error', 500)
  }
}
