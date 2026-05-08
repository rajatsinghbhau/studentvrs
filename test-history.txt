import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
async function run() {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      systemInstruction: 'You are an AI coach'
    })
    
    const history = [
      { role: 'user', parts: [{ text: 'Question 1' }] },
      { role: 'model', parts: [{ text: 'Answer 1' }] }
    ]
    
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7,
      }
    })

    const result = await chat.sendMessage('Question 2')
    console.log('Success:', result.response.text())
  } catch (err: any) {
    console.error('Error:', err.message)
  }
}
run()
