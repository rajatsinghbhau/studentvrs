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
    const aiCount = safeCount + 4 // Ask AI for a surplus of questions so we can discard any duplicates

    // Look up subject record
    const { data: subjectRecord } = await supabase
      .from('subjects')
      .select('id, name')
      .ilike('name', `%${subject}%`)
      .limit(1)
      .single()

    // Fetch ALL tests created by the user and ALL attempts taken by the user to avoid any duplicate questions
    const [{ data: userTests }, { data: userAttempts }] = await Promise.all([
      supabase.from('tests').select('id').eq('created_by', user.id),
      supabase.from('test_attempts').select('test_id').eq('user_id', user.id)
    ])

    const userTestIds = Array.from(new Set([
      ...(userTests?.map(t => t.id) || []),
      ...(userAttempts?.map(a => a.test_id) || [])
    ].filter(Boolean)))

    let seenQuestionTexts: string[] = []
    if (userTestIds.length > 0) {
      const { data: seenQs } = await supabase
        .from('questions')
        .select('question_text')
        .in('test_id', userTestIds)
        .limit(300)
      seenQuestionTexts = seenQs?.map(q => q.question_text.trim()).filter(Boolean) || []
    }

    const avoidContext = seenQuestionTexts.length > 0
      ? `\n\nCRITICAL: Do NOT generate questions similar to these previously asked questions. Create entirely new questions with different numbers, setups, and target variables:\n${seenQuestionTexts.slice(-40).map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''

    const topicContext = topic ? ` specifically on the topic: "${topic}"` : ''
    const examLabel = subject.toLowerCase().includes('bio') ? 'NEET' : 'JEE'

    const prompt = `You are an expert ${examLabel} question setter. Generate exactly ${aiCount} unique, high-quality multiple-choice questions for ${subject}${topicContext} at ${difficulty} difficulty level.

Return ONLY a valid JSON array. No markdown fences, no explanation text before or after. Just the raw JSON array.

IMPORTANT: The FIRST option (options[0]) MUST ALWAYS be the correct answer. The remaining 3 options are distractors.

Each question object must have exactly this structure:
{
  "question_text": "Complete question text here",
  "options": ["CORRECT ANSWER HERE", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
  "explanation": "Brief explanation of why the first option is the correct answer",
  "difficulty": "${difficulty}",
  "marks": 4,
  "negative_marks": 1
}

Rules:
- options[0] MUST be the scientifically/mathematically correct answer — verify your calculations
- For numerical questions, double-check your math before writing the answer
- The other 3 options must be plausible but clearly wrong
- Questions must be conceptually distinct from each other
- Questions should test deep understanding, not just memorisation
- Use proper scientific notation where needed${avoidContext}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
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

    // ── Fisher-Yates shuffle for options ──────────────────────────────
    // The AI was told to put the correct answer at index 0.
    // We now shuffle the options and track where index 0 ends up.
    // This makes correct_option 100% accurate regardless of AI behavior.
    function shuffleOptions(options: string[]): { shuffled: string[]; correctIndex: number } {
      // Create index array [0,1,2,3] and shuffle it
      const indices = [0, 1, 2, 3]
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]]
      }
      const shuffled = indices.map(i => options[i])
      // The correct answer was at original index 0 — find its new position
      const correctIndex = indices.indexOf(0)
      return { shuffled, correctIndex }
    }

    // Similarity checker to prevent repeats
    function isDuplicate(text: string, seenList: string[]): boolean {
      const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const tClean = cleanStr(text)
      
      for (const seen of seenList) {
        const sClean = cleanStr(seen)
        if (tClean === sClean) {
          console.log(`[DUPLICATE FILTER] Rejected exact duplicate question: "${seen.substring(0, 60)}..."`)
          return true
        }
      }
      return false
    }

    // Keep track of unique questions generated in this request
    const uniqueThisRun: string[] = []

    // Validate, filter duplicates, and shuffle each question
    const validQuestions = questions
      .filter((q, i) => {
        if (typeof q.question_text !== 'string' || !q.question_text.trim()) return false
        if (!Array.isArray(q.options) || q.options.length !== 4) return false
        // Check all options are non-empty strings
        if (q.options.some((o: any) => typeof o !== 'string' || !o.trim())) return false
        
        // 1. Check against historical seen questions
        if (isDuplicate(q.question_text, seenQuestionTexts)) {
          console.log(`[GENERATE] Question Q${i+1} rejected as duplicate of historical seen question.`)
          return false
        }
        // 2. Check against duplicate within this single response
        if (isDuplicate(q.question_text, uniqueThisRun)) {
          console.log(`[GENERATE] Question Q${i+1} rejected as duplicate of another question generated in this run.`)
          return false
        }
        
        uniqueThisRun.push(q.question_text.trim())
        return true
      })
      .map((q, i) => {
        // Shuffle options — correct answer moves from index 0 to a random position
        const { shuffled, correctIndex } = shuffleOptions(q.options)
        console.log(`[GENERATE] Q${i+1}: correct answer="${q.options[0]}" → shuffled to index ${correctIndex}`)
        return {
          ...q,
          options: shuffled,
          correct_option: correctIndex,
        }
      })
      .slice(0, safeCount)

    console.log(`[GENERATE] ${validQuestions.length}/${questions.length} questions passed validation and duplication checks`)

    if (validQuestions.length < safeCount) {
      console.warn(`[GENERATE] Could only obtain ${validQuestions.length} unique questions out of requested ${safeCount}. Proceeding anyway.`)
    }

    if (validQuestions.length === 0) {
      console.error('Validation failed. Sample question:', JSON.stringify(questions[0]))
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

    // Insert questions — correct_option is already a 0-indexed integer from the shuffle
    const questionRecords = validQuestions.map((q, i) => ({
      test_id: test.id,
      question_text: q.question_text,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation || '',
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
