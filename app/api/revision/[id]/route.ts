import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateNextReview, calculateLevel } from '@/lib/utils'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const { quality } = await request.json()

    if (quality === undefined || quality < 0 || quality > 5) {
      return errorResponse('Quality must be 0-5')
    }

    // Fetch card and profile XP in parallel
    const [cardRes, profileRes] = await Promise.all([
      supabase.from('revision_cards').select('interval_days, ease_factor, repetitions').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('profiles').select('xp').eq('id', user.id).single()
    ])

    if (cardRes.error || !cardRes.data) return errorResponse('Card not found', 404)
    const card = cardRes.data

    const { interval, easeFactor, nextReviewAt } = calculateNextReview(
      quality as 0 | 1 | 2 | 3 | 4 | 5,
      card.interval_days || 1,
      card.ease_factor || 2.5,
      card.repetitions || 0
    )

    // Update card and award XP in parallel
    const newXP = (profileRes.data?.xp || 0) + 20
    const { level: newLevel, title: newTitle } = calculateLevel(newXP)
    const [updatedRes] = await Promise.all([
      supabase.from('revision_cards').update({
        interval_days: interval,
        ease_factor: easeFactor,
        repetitions: (card.repetitions || 0) + 1,
        next_review_at: nextReviewAt.toISOString(),
        last_reviewed: new Date().toISOString()
      }).eq('id', id).select().single(),
      supabase.from('profiles').update({ 
        xp: newXP,
        level: newLevel,
        rank_title: newTitle
      }).eq('id', user.id)
    ])

    return successResponse({
      card: updatedRes.data,
      next_review_in_days: interval,
      next_review_at: nextReviewAt.toISOString(),
      xp_gained: 20
    })
  } catch (err) {
    console.error('Review card error:', err)
    return errorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const { error } = await supabase.from('revision_cards').delete().eq('id', id).eq('user_id', user.id)
    if (error) return errorResponse(error.message)
    return successResponse({ message: 'Card deleted' })
  } catch (err) {
    console.error('Delete card error:', err)
    return errorResponse('Internal server error', 500)
  }
}
