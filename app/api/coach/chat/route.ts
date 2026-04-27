import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { generateAIResponse } from '@/lib/gemini'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

// POST /api/coach/chat — send message to AI coach
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { message, context } = await request.json()

    if (!message || message.trim().length === 0) {
      return errorResponse('Message cannot be empty')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, target_exam, target_year')
      .eq('id', user.id)
      .single()

    // Get recent chat history (last 10 messages)
    const { data: history } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const chatHistory = (history || []).reverse()

    // Get weak topics for context
    const { data: weakTopics } = await supabase
      .from('user_topic_progress')
      .select('topics(name)')
      .eq('user_id', user.id)
      .lt('mastery_level', 40)
      .limit(5)

    // Get recent test score
    const { data: lastAttempt } = await supabase
      .from('test_attempts')
      .select('accuracy')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // Save user message
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
      context_topic: context?.topic
    })

    // Generate AI response
    const aiResponse = await generateAIResponse(message, {
      userName: profile?.name,
      weakTopics: weakTopics?.map(wt => (wt.topics as { name?: string } | null)?.name || '') || [],
      recentScore: lastAttempt?.accuracy,
      currentSubject: context?.subject,
      chatHistory
    })

    // Save AI response
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: aiResponse,
      context_topic: context?.topic
    })

    return successResponse({
      message: aiResponse,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Coach chat error:', err)
    return errorResponse('AI coach is temporarily unavailable. Please try again.', 500)
  }
}
