import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/utils'

// POST /api/onboarding — complete onboarding
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return errorResponse('Unauthorized', 401)

    const { name, target_exam, target_year, daily_goal, subjects_of_interest } = await request.json()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        name: name || undefined,
        target_exam: target_exam || 'JEE',
        target_year: target_year || 2026,
        onboarding_done: true
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) return errorResponse(error.message)

    return successResponse({
      profile,
      message: 'Onboarding complete! Your quantum journey begins.',
      subjects_of_interest
    })
  } catch (err) {
    console.error('Onboarding error:', err)
    return errorResponse('Internal server error', 500)
  }
}
