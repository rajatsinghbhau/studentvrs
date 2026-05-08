import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function generateAIResponse(
  userMessage: string,
  context: {
    userName?: string
    weakTopics?: string[]
    recentScore?: number
    currentSubject?: string
    chatHistory?: { role: string; content: string }[]
  }
) {
  const systemPrompt = `You are an elite AI academic coach...`

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt 
  })

  let historyFormatted = (context.chatHistory || []).slice(-10).reduce((acc: any[], msg) => {
    const role = msg.role === 'user' ? 'user' : 'model'
    if (acc.length > 0 && acc[acc.length - 1].role === role) {
      acc[acc.length - 1].parts[0].text += '\n\n' + msg.content
    } else {
      acc.push({ role, parts: [{ text: msg.content }] })
    }
    return acc
  }, [])

  if (historyFormatted.length > 0 && historyFormatted[0].role === 'model') {
    historyFormatted.shift()
  }

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

async function run() {
  try {
    const chatHistory = [
      { role: 'user', content: 'What is physics?' },
      { role: 'assistant', content: 'Physics is the study of matter and energy.' }
    ]
    const res = await generateAIResponse('What is chemistry?', { chatHistory })
    console.log('Success:', res)
  } catch (err: any) {
    console.error('Error:', err.message)
  }
}
run()
