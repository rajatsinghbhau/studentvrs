import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const { data: attempts, error } = await supabase
      .from('test_attempts')
      .select(`
        id, score, accuracy, correct_count, wrong_count, skipped_count,
        time_taken, percentile, status, completed_at, started_at,
        tests(id, title, total_questions, max_marks, difficulty, subjects(name, icon, color))
      `)
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) return errorResponse(error.message)

    return successResponse({ attempts: attempts || [] })
  } catch (err) {
    console.error('Test history error:', err)
    return errorResponse('Internal server error', 500)
  }
}
