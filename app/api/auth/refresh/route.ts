import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) return errorResponse('Refresh token required')

    const { data, error } = await supabase.auth.refreshSession({ refresh_token })

    if (error || !data.session) return errorResponse('Session expired. Please login again.', 401)

    return successResponse({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    })
  } catch (err) {
    console.error('Refresh error:', err)
    return errorResponse('Internal server error', 500)
  }
}
