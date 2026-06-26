import { NextRequest } from 'next/server'
import { supabase, getAuthUser, createUserClient } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse, calculateXP, calculateLevel } from '@/lib/utils'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return unauthorizedResponse()
    const token = authHeader.replace('Bearer ', '')

    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const userClient = createUserClient(token)

    const { id: testId } = await params
    const body = await request.json()
    const { action, answers, time_taken, attempt_id } = body

    if (action === 'start') {
      // Cancel any stale IN_PROGRESS attempts first, then create a fresh one
      await userClient
        .from('test_attempts')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .eq('status', 'IN_PROGRESS')

      const { data: attempt, error } = await userClient
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
        userClient.from('profiles').select('xp').eq('id', user.id).single()
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
        const { data: existing, error: existingErr } = await userClient
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
          const { data: newAttempt, error: createErr } = await userClient
            .from('test_attempts')
            .insert({ test_id: testId, user_id: user.id, status: 'IN_PROGRESS' })
            .select('id')
            .single()
            
          if (createErr) console.error('Failed to auto-create attempt:', createErr)
          resolvedAttemptId = newAttempt?.id
          
          if (!resolvedAttemptId) {
            return errorResponse(`Could not resolve attempt. DB Error: ${createErr?.message || JSON.stringify(createErr)}`)
          }
        }
      }

      if (!resolvedAttemptId) {
        console.error('Could not resolve attempt ID', { attempt_id, testId })
        return errorResponse('Could not resolve attempt. Please try again.')
      }

      // Score calculation — use parseInt on both sides to avoid any type mismatch
      let score = 0, correctCount = 0, wrongCount = 0, skippedCount = 0
      const answerRecords = []
      const weakTopicIds = new Set<string>()

      console.log('[SCORING] answers received:', JSON.stringify(answers))
      console.log('[SCORING] questions from DB:', questions.map(q => ({ id: q.id, correct_option: q.correct_option, type: typeof q.correct_option })))

      for (const question of questions) {
        const userAnswer = answers?.[question.id]
        const isSkipped = userAnswer === undefined || userAnswer === null || userAnswer === -1

        // Force both sides to integer to prevent any type-coercion bugs
        const userIdx = isSkipped ? -1 : parseInt(String(userAnswer), 10)
        const correctIdx = parseInt(String(question.correct_option), 10)
        const isCorrect = !isSkipped && !isNaN(userIdx) && !isNaN(correctIdx) && userIdx === correctIdx

        let marksObtained = 0

        console.log('[SCORING] Q:', question.id.slice(0,8), '| user:', userAnswer, `(${typeof userAnswer}→${userIdx})`, '| correct:', question.correct_option, `(${typeof question.correct_option}→${correctIdx})`, '| match:', isCorrect, '| skip:', isSkipped)

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
          selected_option: isSkipped ? null : userIdx,
          is_correct: isCorrect,
          is_skipped: isSkipped,
          time_taken: 0,
          marks_obtained: marksObtained
        })
      }

      const accuracy = correctCount + wrongCount > 0
        ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
        : 0
      const safeMaxMarks = test.max_marks || 1
      const percentile = Math.max(1, Math.min(99, Math.round(50 + (score / safeMaxMarks) * 45)))
      const xpGained = calculateXP('test_complete', accuracy)

      // Calculate new level and rank title
      const newXP = (profileRes.data?.xp || 0) + xpGained
      const { level: newLevel, title: newTitle } = calculateLevel(newXP)

      // Fire all DB writes in parallel
      const writeOps: any[] = [
        userClient.from('attempt_answers').insert(answerRecords),
        userClient.from('test_attempts').update({
          score,
          max_score: test.max_marks,
          accuracy,
          time_taken: time_taken || 0,
          correct_count: correctCount,
          wrong_count: wrongCount,
          skipped_count: skippedCount,
          percentile,
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        }).eq('id', resolvedAttemptId),
        userClient.from('profiles').update({ 
          xp: newXP,
          level: newLevel,
          rank_title: newTitle
        }).eq('id', user.id),
        userClient.from('study_sessions').insert({
          user_id: user.id,
          subject_id: test.subject_id,
          duration: Math.max(1, Math.round((time_taken || 0) / 60)),
          session_date: new Date().toISOString().split('T')[0]
        })
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
        writeOps.push(userClient.from('revision_cards').insert(weakCards))
      }

      const results = await Promise.all(writeOps)
      // Log non-critical write errors but don't block the response
      results.forEach((r, i) => { if (r.error) console.error(`DB write op ${i} error:`, r.error) })
      // Only the attempt_answers (0) and test_attempts update (1) are critical
      if (results[0]?.error || results[1]?.error) {
        console.error('Critical DB write failed:', results[0]?.error || results[1]?.error)
        return errorResponse('Failed to save test results. Please try again.', 500)
      }

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
  } catch (err: any) {
    console.error('Attempt error:', err)
    return errorResponse(`Internal server error: ${err?.message || err}`, 500)
  }
}
