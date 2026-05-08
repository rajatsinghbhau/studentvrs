import { supabaseAdmin } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [subtopicsRes, topicsRes] = await Promise.all([
      supabaseAdmin.from('subtopics').select('count', { count: 'exact', head: true }),
      supabaseAdmin.from('topics').select('id, name').order('name'),
    ])

    return successResponse({
      subtopics_count: subtopicsRes.count,
      subtopics_error: subtopicsRes.error?.message ?? null,
      topics_count: topicsRes.data?.length ?? 0,
      topics: topicsRes.data?.slice(0, 5),
      topics_error: topicsRes.error?.message ?? null,
    })
  } catch (err) {
    return errorResponse(`Debug error: ${err instanceof Error ? err.message : String(err)}`)
  }
}
