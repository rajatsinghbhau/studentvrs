import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateNextReview } from '@/lib/utils'

// GET /api/revision — get due revision cards
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const mode = searchParams.get('mode') || 'due' // 'due' | 'all' | 'topic'
    const topicId = searchParams.get('topicId')

    let query = supabase
      .from('revision_cards')
      .select('*, topics(name, subjects(name, icon, color))')
      .eq('user_id', user.id)
      .order('next_review_at', { ascending: true })
      .limit(limit)

    if (mode === 'due') {
      query = query.lte('next_review_at', new Date().toISOString())
    }
    if (topicId) {
      query = query.eq('topic_id', topicId)
    }

    const { data: cards, error } = await query
    if (error) return errorResponse(error.message)

    // Stats
    const { count: totalCards } = await supabase
      .from('revision_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: dueCount } = await supabase
      .from('revision_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review_at', new Date().toISOString())

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const { count: tomorrowCount } = await supabase
      .from('revision_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('next_review_at', tomorrow.toISOString())
      .gt('next_review_at', new Date().toISOString())

    return successResponse({
      cards: cards || [],
      stats: {
        total_cards: totalCards || 0,
        due_today: dueCount || 0,
        due_tomorrow: tomorrowCount || 0,
        reviewed_today: 0 // TODO: track
      }
    })
  } catch (err) {
    console.error('Revision error:', err)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/revision — create a new revision card
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { front, back, topic_id, difficulty } = await request.json()

    if (!front || !back) return errorResponse('Front and back content required')

    const { data: card, error } = await supabase
      .from('revision_cards')
      .insert({
        user_id: user.id,
        topic_id,
        front,
        back,
        difficulty: difficulty || 'MEDIUM',
        source: 'manual',
        next_review_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) return errorResponse(error.message)

    return successResponse({ card }, 201)
  } catch (err) {
    console.error('Create card error:', err)
    return errorResponse('Internal server error', 500)
  }
}
