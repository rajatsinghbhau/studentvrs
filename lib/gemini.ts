import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

// Groq free tier: 14,400 req/day, 30 RPM — no credit card needed
// Models in priority order (separate rate limits)
const MODEL_CHAIN = [
  'llama-3.3-70b-versatile',   // best quality, 6000 TPM
  'llama-3.1-8b-instant',      // fast fallback, separate quota
  'mixtral-8x7b-32768',        // extra fallback
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
- Weak Areas: ${context.weakTopics?.filter(Boolean).join(', ') || 'Not identified yet'}
- Recent Test Score: ${context.recentScore !== undefined ? `${context.recentScore}%` : 'No tests taken yet'}
- Current Focus: ${context.currentSubject || 'General JEE/NEET preparation'}

Guidelines:
1. Be concise but thorough — 150-300 words per response
2. For conceptual questions: explain step-by-step with examples
3. For motivation: be genuine and specific
4. Always end with a clear next action the student can take
5. Use markdown: **bold** for key concepts, numbered lists for steps
6. If asked about non-academic topics, gently redirect to studies`

  // Build message history for Groq (OpenAI-compatible format)
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
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
  messages.push({ role: 'user', content: userMessage })

  let lastError: Error | null = null

  for (const model of MODEL_CHAIN) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        max_tokens: 800,
        temperature: 0.75,
      })

      const text = completion.choices[0]?.message?.content
      if (!text) throw new Error('Empty response from Groq')
      return text
    } catch (err: any) {
      lastError = err
      const isQuota =
        err.status === 429 ||
        err.message?.includes('429') ||
        err.message?.includes('rate_limit') ||
        err.message?.includes('quota')

      if (isQuota) {
        console.warn(`[Groq] Model ${model} rate-limited, trying next...`)
        continue
      }
      throw err
    }
  }

  const quotaErr: any = new Error(
    'All AI models are currently rate-limited. Please wait a minute and try again.'
  )
  quotaErr.isQuotaError = true
  throw quotaErr
}
