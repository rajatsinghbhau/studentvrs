import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateXP } from '@/lib/utils'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { id: testId } = await params
    const body = await request.json()
    const { action, answers, time_taken, attempt_id } = body

    if (action === 'start') {
      // Cancel any stale IN_PROGRESS attempts first, then create a fresh one
      await supabase
        .from('test_attempts')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .eq('status', 'IN_PROGRESS')

      const { data: attempt, error } = await supabase
        .from('test_attempts')
        .insert({ test_id: testId, user_id: user.id, status: 'IN_PROGRESS' })
        .select()
        .single()

      if (error) return errorResponse(error.message)
      return successResponse({ attempt }, 201)
    }

    if (action === 'submit') {
      // Fetch test + questions + profile XP in parallel
      const [testRes, questionsRes, profileRes] = await Promise.all([
        supabase.from('tests').select('max_marks, total_questions, subject_id').eq('id', testId).single(),
        supabase.from('questions').select('id, correct_option, marks, negative_marks, topic_id').eq('test_id', testId),
        supabase.from('profiles').select('xp').eq('id', user.id).single()
      ])

      const test = testRes.data
      const questions = questionsRes.data
      if (!questions?.length || !test) {
        console.error('Test or questions not found', { questionsLength: questions?.length, test })
        return errorResponse('Test not found', 404)
      }

      // Resolve attempt ID — use provided one, or find IN_PROGRESS, or auto-start one
      let resolvedAttemptId = attempt_id
      if (!resolvedAttemptId) {
        const { data: existing, error: existingErr } = await supabase
          .from('test_attempts')
          .select('id')
          .eq('user_id', user.id)
          .eq('test_id', testId)
          .eq('status', 'IN_PROGRESS')
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        if (existing?.id) {
          resolvedAttemptId = existing.id
        } else {
          // Auto-create attempt if none exists (handles edge cases)
          const { data: newAttempt, error: createErr } = await supabase
            .from('test_attempts')
            .insert({ test_id: testId, user_id: user.id, status: 'IN_PROGRESS' })
            .select('id')
            .single()
            
          if (createErr) console.error('Failed to auto-create attempt:', createErr)
          resolvedAttemptId = newAttempt?.id
        }
      }

      if (!resolvedAttemptId) {
        console.error('Could not resolve attempt ID', { attempt_id, testId })
        return errorResponse('Could not resolve attempt. Please try again.')
      }

      // Score calculation
      let score = 0, correctCount = 0, wrongCount = 0, skippedCount = 0
      const answerRecords = []
      const weakTopicIds = new Set<string>()

      for (const question of questions) {
        const userAnswer = answers?.[question.id]
        const isSkipped = userAnswer === undefined || userAnswer === null || userAnswer === -1
        const isCorrect = !isSkipped && Number(userAnswer) === question.correct_option
        let marksObtained = 0

        if (isSkipped) {
          skippedCount++
        } else if (isCorrect) {
          marksObtained = question.marks || 4
          score += marksObtained
          correctCount++
        } else {
          marksObtained = -(question.negative_marks || 1)
          score += marksObtained
          wrongCount++
          if (question.topic_id) weakTopicIds.add(question.topic_id)
        }

        answerRecords.push({
          attempt_id: resolvedAttemptId,
          question_id: question.id,
          selected_option: isSkipped ? null : Number(userAnswer),
          is_correct: isCorrect,
          is_skipped: isSkipped,
          time_taken: 0,
          marks_obtained: marksObtained
        })
      }

      const accuracy = correctCount + wrongCount > 0
        ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
        : 0
      const percentile = Math.max(1, Math.min(99, Math.round(50 + (score / test.max_marks) * 45)))
      const xpGained = calculateXP('test_complete', accuracy)

      // Fire all DB writes in parallel
      const writeOps: any[] = [
        supabase.from('attempt_answers').insert(answerRecords),
        supabase.from('test_attempts').update({
          score,
          accuracy,
          time_taken: time_taken || 0,
          correct_count: correctCount,
          wrong_count: wrongCount,
          skipped_count: skippedCount,
          percentile,
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        }).eq('id', resolvedAttemptId),
        supabase.from('profiles').update({ xp: (profileRes.data?.xp || 0) + xpGained }).eq('id', user.id)
      ]

      // Auto-generate revision cards for wrong-answer topics
      if (weakTopicIds.size > 0) {
        const weakCards = Array.from(weakTopicIds).map(topicId => ({
          user_id: user.id,
          topic_id: topicId,
          front: 'Review this topic — you made mistakes here',
          back: 'Practice more questions from this topic',
          difficulty: 'HARD',
          source: 'test_mistake',
          next_review_at: new Date().toISOString()
        }))
        writeOps.push(supabase.from('revision_cards').insert(weakCards))
      }

      await Promise.all(writeOps)

      return successResponse({
        attempt_id: resolvedAttemptId,
        score,
        max_score: test.max_marks,
        accuracy,
        correct_count: correctCount,
        wrong_count: wrongCount,
        skipped_count: skippedCount,
        percentile,
        xp_gained: xpGained,
        time_taken: time_taken || 0
      })
    }

    return errorResponse('Invalid action. Use "start" or "submit".')
  } catch (err) {
    console.error('Attempt error:', err)
    return errorResponse('Internal server error', 500)
  }
}
