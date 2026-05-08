import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client for browser-side usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client — bypasses RLS entirely (service role key)
// Falls back to anon key in dev if service role key not set
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Helper: verify user token and return user + a user-scoped DB client
// The user-scoped client sets the JWT so auth.uid() works in RLS policies.
export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// Create a Supabase client with the user's JWT attached.
// Use this on the server side for user-scoped reads/writes so that
// auth.uid() is populated and RLS policies work correctly.
export function createUserClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
