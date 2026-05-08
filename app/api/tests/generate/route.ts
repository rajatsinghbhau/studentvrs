import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import Groq from 'groq-sdk'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { subject, difficulty = 'MEDIUM', count = 10, topic } = await request.json()
    if (!subject) return errorResponse('Subject is required')

    const safeCount = Math.min(Math.max(Number(count) || 10, 5), 30)

    // Look up subject record
    const { data: subjectRecord } = await supabase
      .from('subjects')
      .select('id, name')
      .ilike('name', `%${subject}%`)
      .limit(1)
      .single()

    // Fetch recently used question texts for this user → avoid repetition
    const { data: recentAttempts } = await supabase
      .from('test_attempts')
      .select('test_id')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(15)

    let recentQuestions: string[] = []
    const recentTestIds = recentAttempts?.map(a => a.test_id).filter(Boolean) || []
    if (recentTestIds.length > 0) {
      const { data: recentQs } = await supabase
        .from('questions')
        .select('question_text')
        .in('test_id', recentTestIds)
        .limit(60)
      recentQuestions = recentQs?.map(q => q.question_text.substring(0, 100)) || []
    }

    const avoidContext = recentQuestions.length > 0
      ? `\n\nIMPORTANT - Do NOT generate questions similar to these previously asked questions:\n${recentQuestions.slice(0, 25).map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''

    const topicContext = topic ? ` specifically on the topic: "${topic}"` : ''
    const examLabel = subject.toLowerCase().includes('bio') ? 'NEET' : 'JEE'

    const prompt = `You are an expert ${examLabel} question setter. Generate exactly ${safeCount} unique, high-quality multiple-choice questions for ${subject}${topicContext} at ${difficulty} difficulty level.

Return ONLY a valid JSON array. No markdown fences, no explanation text before or after. Just the raw JSON array.

Each question object must have exactly this structure:
{
  "question_text": "Complete question text here",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correct_option": 0,
  "difficulty": "${difficulty}",
  "marks": 4,
  "negative_marks": 1,
  "explanation": "Brief explanation of why the correct option is right"
}

Rules:
- correct_option is 0-indexed (0=A, 1=B, 2=C, 3=D)
- Questions must be conceptually distinct from each other
- All 4 options must be plausible
- Questions should test deep understanding, not just memorisation
- Use proper scientific notation where needed${avoidContext}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 6000,
    })

    const rawText = completion.choices[0]?.message?.content?.trim() || ''

    // Robustly extract JSON array
    let questions: any[]
    try {
      // Strip markdown code fences if present
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON array found in response')
      questions = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('AI parse error. Raw:', rawText.substring(0, 600))
      return errorResponse('AI returned an unparseable response. Please try again.', 500)
    }

    if (!Array.isArray(questions) || questions.length < 1) {
      return errorResponse('AI returned no valid questions. Please try again.')
    }

    // Validate and sanitize each question
    const validQuestions = questions
      .filter(q =>
        typeof q.question_text === 'string' &&
        Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correct_option === 'number' && q.correct_option >= 0 && q.correct_option <= 3
      )
      .slice(0, safeCount)

    if (validQuestions.length === 0) {
      return errorResponse('AI questions did not pass validation. Please try again.')
    }

    // Create test record
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const testTitle = `${subject} · ${difficulty} · ${dateStr}`

    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert({
        title: testTitle,
        description: `AI-generated ${subject} test${topic ? ` on "${topic}"` : ''} · ${validQuestions.length} questions`,
        subject_id: subjectRecord?.id || null,
        created_by: user.id,
        total_questions: validQuestions.length,
        duration: Math.ceil(validQuestions.length * 2), // 2 min/question
        max_marks: validQuestions.length * 4,
        difficulty: difficulty.toUpperCase(),
        exam_type: examLabel,
        is_public: false,
      })
      .select('id')
      .single()

    if (testError || !test) {
      console.error('Test insert error:', testError)
      return errorResponse('Failed to create test record: ' + testError?.message)
    }

    // Insert questions
    const questionRecords = validQuestions.map((q, i) => ({
      test_id: test.id,
      question_text: q.question_text,
      options: q.options,
      correct_option: Number(q.correct_option),
      difficulty: (q.difficulty || difficulty).toUpperCase(),
      marks: Number(q.marks) || 4,
      negative_marks: Number(q.negative_marks) || 1,
      question_num: i + 1,
      topic_id: null,
    }))

    const { error: qError } = await supabase.from('questions').insert(questionRecords)
    if (qError) {
      // Rollback test
      await supabase.from('tests').delete().eq('id', test.id)
      console.error('Questions insert error:', qError)
      return errorResponse('Failed to save questions: ' + qError.message)
    }

    return successResponse({
      test_id: test.id,
      title: testTitle,
      question_count: validQuestions.length,
      duration: Math.ceil(validQuestions.length * 2),
    })
  } catch (err: any) {
    console.error('Generate test error:', err)
    if (err.status === 429 || err.message?.includes('429')) {
      return errorResponse('AI is rate-limited. Please wait a moment and try again.', 429)
    }
    return errorResponse(err.message || 'Failed to generate test', 500)
  }
}
