import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export function getGeminiModel(): GenerativeModel {
  return genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
}

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
  const systemPrompt = `You are an elite AI academic coach for the Studentverse platform, specializing in JEE/NEET preparation. 
Your persona is "Nova" — a brilliant, encouraging, and highly knowledgeable tutor who combines deep technical expertise with motivational coaching.

Student Profile:
- Name: ${context.userName || 'Student'}
- Weak Areas: ${context.weakTopics?.join(', ') || 'Not identified yet'}
- Recent Test Score: ${context.recentScore !== undefined ? `${context.recentScore}%` : 'No tests taken yet'}
- Current Focus: ${context.currentSubject || 'General JEE preparation'}

Guidelines:
1. Be concise but thorough — aim for 150-300 words per response
2. Use the Neo-Quantum theme: occasionally use terms like "calculating your trajectory", "quantum leap", "system calibrated"
3. For conceptual questions: explain step-by-step with examples
4. For motivation: be genuine and specific, not generic
5. Always end with a practical next action the student can take
6. Use markdown formatting: **bold** for key concepts, numbered lists for steps
7. If asked about non-academic topics, gently redirect to studies`

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest',
    systemInstruction: systemPrompt 
  })

  const historyFormatted = (context.chatHistory || []).slice(-10).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }))

  const chat = model.startChat({
    history: historyFormatted,
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.7,
    }
  })

  const result = await chat.sendMessage(userMessage)
  return result.response.text()
}
