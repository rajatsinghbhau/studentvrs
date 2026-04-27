import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, targetExam, targetYear } = await request.json()

    if (!email || !password || !name) {
      return errorResponse('Name, email and password are required')
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters')
    }

    // Create auth user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, target_exam: targetExam || 'JEE', target_year: targetYear || 2026 }
      }
    })

    if (authError) return errorResponse(authError.message)
    if (!authData.user) return errorResponse('Registration failed')

    // Update profile with additional details (trigger auto-creates profile)
    await new Promise(resolve => setTimeout(resolve, 500))

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name, target_exam: targetExam || 'JEE', target_year: targetYear || 2026 })
      .eq('id', authData.user.id)

    if (profileError) console.error('Profile update error:', profileError)

    return successResponse({
      user: { id: authData.user.id, email: authData.user.email, name },
      session: authData.session,
      message: 'Registration successful! Check your email to confirm your account.'
    }, 201)
  } catch (err) {
    console.error('Register error:', err)
    return errorResponse('Internal server error', 500)
  }
}
