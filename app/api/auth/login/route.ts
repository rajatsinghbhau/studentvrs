import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return errorResponse('Email and password are required')
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return errorResponse(error.message, 401)
    if (!data.user || !data.session) return errorResponse('Login failed', 401)

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    // Update streak logic
    if (profile) {
      const today = new Date().toISOString().split('T')[0]
      const lastLogin = profile.updated_at?.split('T')[0]
      
      if (lastLogin !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const newStreak = lastLogin === yesterday ? (profile.streak || 0) + 1 : 1
        const longestStreak = Math.max(profile.longest_streak || 0, newStreak)
        
        await supabase
          .from('profiles')
          .update({ 
            streak: newStreak, 
            longest_streak: longestStreak,
            xp: (profile.xp || 0) + 10 
          })
          .eq('id', data.user.id)
      }
    }

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name,
        avatar_url: profile?.avatar_url,
        level: profile?.level,
        xp: profile?.xp,
        streak: profile?.streak,
        onboarding_done: profile?.onboarding_done,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    return errorResponse('Internal server error', 500)
  }
}
