import { NextRequest } from 'next/server'
import { supabase, getAuthUser, createUserClient } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return unauthorizedResponse()
    const token = authHeader.replace('Bearer ', '')

    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const userClient = createUserClient(token)

    const { id: testId } = await params
    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('attemptId')

    // Fetch attempt, test, questions in parallel
    const [attemptRes, testRes, questionsRes] = await Promise.all([
      (async () => {
        let q = userClient
          .from('test_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('test_id', testId)
          .eq('status', 'COMPLETED')
          .order('completed_at', { ascending: false })
          .limit(1)
        if (attemptId) q = q.eq('id', attemptId)
        return q.single()
      })(),
      supabase.from('tests').select('*, subjects(name, icon, color)').eq('id', testId).single(),
      supabase.from('questions').select('*, topics(name, subject_id, subjects(name))').eq('test_id', testId).order('question_num')
    ])

    const attempt = attemptRes.data
    if (!attempt) return errorResponse('No completed attempt found for this test', 404)

    // Fetch answers and all attempt history in parallel
    const [answersRes, allAttemptsRes] = await Promise.all([
      userClient.from('attempt_answers').select('*').eq('attempt_id', attempt.id),
      userClient.from('test_attempts').select('id, score, accuracy, completed_at').eq('user_id', user.id).eq('test_id', testId).eq('status', 'COMPLETED').order('completed_at')
    ])

    const answerMap = new Map((answersRes.data || []).map(a => [a.question_id, a]))

    const questionResults = (questionsRes.data || []).map(q => {
      const ua = answerMap.get(q.id)
      return {
        id: q.id,
        question_num: q.question_num,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        explanation: q.explanation,
        difficulty: q.difficulty,
        marks: q.marks,
        negative_marks: q.negative_marks,
        topic: q.topics,
        user_answer: {
          selected_option: ua?.selected_option ?? null,
          is_correct: ua?.is_correct || false,
          is_skipped: ua?.is_skipped ?? true,
          marks_obtained: ua?.marks_obtained || 0
        }
      }
    })

    // Topic-wise analysis
    const topicMap = new Map<string, { name: string; total: number; correct: number; wrong: number; skipped: number; marks: number }>()
    const diffBreakdown = { EASY: { total: 0, correct: 0 }, MEDIUM: { total: 0, correct: 0 }, HARD: { total: 0, correct: 0 } }

    for (const q of questionResults) {
      const topicName = (q.topic as { name?: string } | null)?.name || 'Unknown'
      if (!topicMap.has(topicName)) topicMap.set(topicName, { name: topicName, total: 0, correct: 0, wrong: 0, skipped: 0, marks: 0 })
      const ta = topicMap.get(topicName)!
      ta.total++
      if (q.user_answer.is_skipped) ta.skipped++
      else if (q.user_answer.is_correct) { ta.correct++; ta.marks += q.marks }
      else ta.wrong++

      const d = q.difficulty as 'EASY' | 'MEDIUM' | 'HARD'
      if (diffBreakdown[d]) {
        diffBreakdown[d].total++
        if (q.user_answer.is_correct) diffBreakdown[d].correct++
      }
    }

    return successResponse({
      attempt,
      test: testRes.data,
      questions: questionResults,
      topic_analysis: Array.from(topicMap.values()),
      difficulty_breakdown: diffBreakdown,
      all_attempts: allAttemptsRes.data || [],
      summary: {
        score: attempt.score,
        max_score: attempt.max_score,
        accuracy: attempt.accuracy,
        correct_count: attempt.correct_count,
        wrong_count: attempt.wrong_count,
        skipped_count: attempt.skipped_count,
        percentile: attempt.percentile,
        time_taken: attempt.time_taken,
        completed_at: attempt.completed_at
      }
    })
  } catch (err) {
    console.error('Results error:', err)
    return errorResponse('Internal server error', 500)
  }
}
