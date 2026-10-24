import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

// Current Groq models (Primary = best quality, Fallback = fast/efficient)
const MODEL_CHAIN = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
]

export async function generateAIResponse(
  userMessage: string,
  context: {
    userName?: string
    weakTopics?: string[]
    recentScore?: number
    currentSubject?: string
    chatHistory?: { role: string; content: string }[]
  }
): Promise<string> {
  const systemPrompt = `You are Nova, an elite AI academic coach for Studentverse — a JEE/NEET preparation platform.

You are brilliant, encouraging, and deeply knowledgeable. Help students master concepts, build study strategies, and stay motivated.

Student Profile:
- Name: ${context.userName || 'Student'}
- Weak Areas: ${
    context.weakTopics?.filter(Boolean).join(', ') || 'Not identified yet'
  }
- Recent Test Score: ${
    context.recentScore !== undefined
      ? `${context.recentScore}%`
      : 'No tests taken yet'
  }
- Current Focus: ${
    context.currentSubject || 'General JEE/NEET preparation'
  }

Guidelines:
1. Be concise but thorough — 150-300 words per response.
2. For conceptual questions: explain step-by-step with examples.
3. For motivation: be genuine and specific.
4. Always end with a clear next action the student can take.
5. Use markdown: **bold** for key concepts and numbered lists for steps.
6. If asked about non-academic topics, gently redirect to studies.
7. Never invent facts, formulas, or exam information.
8. Adapt explanations to the student's level.
9. For JEE/NEET questions, clearly distinguish between concepts, formulas, and exam tips.
10. Keep the tone supportive and student-friendly.`

  // Build message history for Groq
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ]

  // Add past conversation history (last 10 messages)
  const history = (context.chatHistory || []).slice(-10)

  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  })

  let lastError: any = null

  for (const model of MODEL_CHAIN) {
    try {
      console.log(`[Groq] Trying model: ${model}`)

      const completion = await groq.chat.completions.create({
        model,
        messages,
        max_tokens: 800,
        temperature: 0.75,
      })

      const text = completion.choices[0]?.message?.content

      if (!text) {
        throw new Error('Empty response from Groq')
      }

      console.log(`[Groq] Response generated successfully using ${model}`)

      return text
    } catch (err: any) {
      lastError = err

      console.error(`[Groq] Error with ${model}:`, {
        status: err?.status,
        message: err?.message,
      })

      const isQuota =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.toLowerCase()?.includes('rate_limit') ||
        err?.message?.toLowerCase()?.includes('quota')

      if (isQuota) {
        console.warn(
          `[Groq] ${model} rate-limited. Trying next model...`
        )
        continue
      }

      const isModelError =
        err?.status === 404 ||
        err?.message?.toLowerCase()?.includes('model_not_found') ||
        err?.message?.toLowerCase()?.includes('does not exist')

      if (isModelError) {
        console.warn(
          `[Groq] ${model} unavailable. Trying next model...`
        )
        continue
      }

      // Try the fallback model for other Groq errors too
      console.warn(
        `[Groq] ${model} failed. Trying next model...`
      )
      continue
    }
  }

  // Fallback to Google Gemini (gemini-2.5-flash) if all Groq models are exhausted
  if (genAI) {
    try {
      console.log('[AI Fallback] Groq models unavailable or rate-limited. Falling back to Google Gemini...');
      const geminiModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
      })

      const contents = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
      contents.push({ role: 'user', parts: [{ text: userMessage }] })

      const result = await geminiModel.generateContent({ contents })
      const text = result.response.text()
      if (text) return text
    } catch (geminiErr: any) {
      console.warn('[Gemini Fallback Error]:', geminiErr.message)
    }
  }

  // All models failed
  const finalError: any = new Error(
    'Nova is temporarily unavailable. Please try again in a moment.'
  )

  finalError.isQuotaError = true
  finalError.originalError = lastError

  throw finalError
}
