import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { generateAIResponse } from '@/lib/gemini'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// POST /api/coach/chat — send message to AI coach
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { message, context } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse('Message cannot be empty')
    }

    const trimmedMessage = message.trim()

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, target_exam, target_year')
      .eq('id', user.id)
      .single()

    // Get recent chat history BEFORE saving the new user message
    // This ensures the history passed to AI doesn't include the current message
    const { data: history } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12)

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

    // Generate AI response FIRST (before saving to avoid including current msg in history)
    const aiResponse = await generateAIResponse(trimmedMessage, {
      userName: profile?.name,
      weakTopics: weakTopics?.map(wt => (wt.topics as { name?: string } | null)?.name || '').filter(Boolean) || [],
      recentScore: lastAttempt?.accuracy,
      currentSubject: context?.subject,
      chatHistory
    })

    // Now save both messages (user first, then assistant)
    await supabase.from('coach_messages').insert([
      {
        user_id: user.id,
        role: 'user',
        content: trimmedMessage,
        context_topic: context?.topic
      },
      {
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
        context_topic: context?.topic
      }
    ])

    return successResponse({
      message: aiResponse,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('Coach chat error:', err)

    if (err.isQuotaError || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return errorResponse('Gemini free quota reached for today. Please wait a few minutes and try again.', 429)
    }
    if (err.message?.includes('API_KEY') || err.message?.includes('invalid')) {
      return errorResponse('AI service configuration error. Please contact support.', 500)
    }
    return errorResponse(`AI coach error: ${err.message || 'Please try again.'}`, 500)
  }
}
