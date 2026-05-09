import { NextRequest } from 'next/server'
import { supabase, getAuthUser, createUserClient } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET /api/tests — list all available tests
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return unauthorizedResponse()
    const token = authHeader.replace('Bearer ', '')

    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const userClient = createUserClient(token)

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const difficulty = searchParams.get('difficulty')
    const status = searchParams.get('status') // 'available' | 'attempted'

    // Fetch all tests
    let query = supabase
      .from('tests')
      .select(`
        id, title, description, total_questions, duration, max_marks, difficulty, exam_type, created_at,
        subjects(id, name, icon, color)
      `)
      .order('created_at', { ascending: false })

    if (subjectId) query = query.eq('subject_id', subjectId)
    if (difficulty) query = query.eq('difficulty', difficulty)

    const { data: tests, error } = await query
    if (error) return errorResponse(error.message)

    // Get user's attempt history
    const testIds = tests?.map(t => t.id) || []
    const { data: attempts } = await userClient
      .from('test_attempts')
      .select('test_id, score, max_score, accuracy, completed_at, status')
      .eq('user_id', user.id)
      .in('test_id', testIds)

    const attemptMap = new Map<string, typeof attempts>()
    attempts?.forEach(a => {
      if (!attemptMap.has(a.test_id)) attemptMap.set(a.test_id, [])
      attemptMap.get(a.test_id)!.push(a)
    })

    const testsWithAttempts = tests?.map(test => {
      const testAttempts = attemptMap.get(test.id) || []
      const bestAttempt = testAttempts.reduce((best, curr) => 
        (curr.score || 0) > (best?.score || 0) ? curr : best
      , testAttempts[0] || null)

      return {
        ...test,
        attempt_count: testAttempts.length,
        best_score: bestAttempt?.score || null,
        best_accuracy: bestAttempt?.accuracy || null,
        last_attempted: bestAttempt?.completed_at || null,
        is_attempted: testAttempts.some(a => a.status === 'COMPLETED')
      }
    })

    // Filter by status if provided
    const filtered = status === 'attempted'
      ? testsWithAttempts?.filter(t => t.is_attempted)
      : status === 'available'
        ? testsWithAttempts?.filter(t => !t.is_attempted)
        : testsWithAttempts

    return successResponse({ tests: filtered || [] })
  } catch (err) {
    console.error('Tests error:', err)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/tests — create a new test
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { title, description, subject_id, total_questions, duration, max_marks, difficulty, exam_type } = body

    if (!title) return errorResponse('Test title is required')

    const { data: test, error } = await supabase
      .from('tests')
      .insert({
        title,
        description,
        subject_id,
        created_by: user.id,
        total_questions: total_questions || 30,
        duration: duration || 60,
        max_marks: max_marks || 120,
        difficulty: difficulty || 'MEDIUM',
        exam_type: exam_type || 'JEE',
        is_public: false
      })
      .select()
      .single()

    if (error) return errorResponse(error.message)

    return successResponse({ test }, 201)
  } catch (err) {
    console.error('Create test error:', err)
    return errorResponse('Internal server error', 500)
  }
}
