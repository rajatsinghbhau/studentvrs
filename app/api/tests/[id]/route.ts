import { NextRequest } from 'next/server'
import { supabase, getAuthUser, createUserClient } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/tests/[id] — get test with questions (for taking the test)
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return unauthorizedResponse()
    const token = authHeader.replace('Bearer ', '')

    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const userClient = createUserClient(token)

    const { id } = await params

    const { data: test, error } = await supabase
      .from('tests')
      .select(`
        id, title, description, total_questions, duration, max_marks, difficulty, exam_type,
        subjects(id, name, icon, color),
        questions(id, question_text, options, difficulty, marks, negative_marks, question_num, topic_id, topics(name))
      `)
      .eq('id', id)
      .single()

    if (error || !test) return errorResponse('Test not found', 404)

    // Check if user has an in-progress attempt
    const { data: inProgressAttempt } = await userClient
      .from('test_attempts')
      .select('id, started_at')
      .eq('user_id', user.id)
      .eq('test_id', id)
      .eq('status', 'IN_PROGRESS')
      .single()

    // Sort questions by question_num
    const sortedTest = {
      ...test,
      questions: (test.questions as { question_num: number }[]).sort((a, b) => a.question_num - b.question_num)
    }

    return successResponse({
      test: sortedTest,
      in_progress_attempt: inProgressAttempt || null
    })
  } catch (err) {
    console.error('Test detail error:', err)
    return errorResponse('Internal server error', 500)
  }
}
