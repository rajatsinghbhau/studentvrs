import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

// GET /api/coach/history — get chat history
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // cursor-based pagination

    let query = supabase
      .from('coach_messages')
      .select('id, role, content, context_topic, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('created_at', before)

    const { data: messages, error } = await query

    if (error) return errorResponse(error.message)

    return successResponse({
      messages: (messages || []).reverse(),
      has_more: (messages?.length || 0) === limit
    })
  } catch (err) {
    console.error('Coach history error:', err)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/coach/history — clear chat history
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    await supabase
      .from('coach_messages')
      .delete()
      .eq('user_id', user.id)

    return successResponse({ message: 'Chat history cleared' })
  } catch (err) {
    console.error('Clear history error:', err)
    return errorResponse('Internal server error', 500)
  }
}
