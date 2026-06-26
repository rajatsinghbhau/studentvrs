import { NextRequest } from 'next/server'
import { supabase, supabaseAdmin, getAuthUser, createUserClient } from '@/lib/supabase'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic' // Ensure realtime, no caching

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return unauthorizedResponse()
    const token = authHeader.replace('Bearer ', '')

    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const userClient = createUserClient(token)

    const { searchParams } = new URL(request.url)
    const subjectName = searchParams.get('subject') || 'Physics'

    // 1. Target subject
    const { data: subjectData } = await supabaseAdmin.from('subjects').select('id, name').eq('name', subjectName).single()
    const subjectId = subjectData?.id

    console.log(`[MAP API] Subject search for ${subjectName}: ${subjectId ? 'FOUND' : 'NOT FOUND'}`)

    if (!subjectId) {
      // Fallback: try to get the first subject if Physics not found
      const { data: firstSubject } = await supabaseAdmin.from('subjects').select('id, name').limit(1).single()
      if (!firstSubject) return errorResponse('No subjects found in database', 404)
      console.log(`[MAP API] Falling back to first subject: ${firstSubject.name}`)
      return successResponse({ nodes: [], links: [], message: 'Please seed your database with Physics topics.' })
    }

    // 2. Fetch real topics for the subject
    const { data: topics } = await supabaseAdmin
      .from('topics')
      .select('id, name, difficulty, weightage, chapter_num')
      .eq('subject_id', subjectId)
      .order('chapter_num', { ascending: true })

    console.log(`[MAP API] Topics found: ${topics?.length || 0}`)

    // 3. Fetch user topic progress
    const { data: progress } = await userClient
      .from('user_topic_progress')
      .select('topic_id, is_completed, mastery_level')
      .eq('user_id', user.id)

    // 4. Fetch user tests to influence gap knowledge based on tests
    const { data: testAttempts } = await userClient
      .from('test_attempts')
      .select('score, max_score, accuracy, tests(subject_id)')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')

    // Calculate average test accuracy for this subject
    let avgAccuracy = 0
    let attemptCount = 0
    if (testAttempts) {
       for (const a of testAttempts) {
          const tSubjId = Array.isArray(a.tests) ? (a.tests[0] as any)?.subject_id : (a.tests as any)?.subject_id
          // Only include tests for this subject, or generic tests if subject is null
          if (tSubjId === subjectId || !tSubjId) {
             avgAccuracy += (a.accuracy || 0)
             attemptCount++
          }
       }
    }
    avgAccuracy = attemptCount > 0 ? avgAccuracy / attemptCount : 0

    const progressMap = new Map()
    progress?.forEach(p => progressMap.set(p.topic_id, p))

    const nodes = []
    const links = []

    // 5. Build dynamic nodes and sequential links
    const topicList = topics || []
    for (let i = 0; i < topicList.length; i++) {
       const t = topicList[i]
       const p = progressMap.get(t.id)
       
       // Gap knowledge uses data of tests! We blend progress with test accuracy.
       let progress_level = p?.mastery_level || 0
       if (p?.is_completed && progress_level === 0) {
          progress_level = 100
       }
       
       let mastery_score = progress_level
       
       if (attemptCount > 0) {
           if (progress_level > 0) {
              // Blend progress level with test accuracy
              mastery_score = Math.round(progress_level * 0.7 + avgAccuracy * 0.3)
           } else {
              // Not started yet
              mastery_score = 0
           }
       }
       
       // Determine status
       let status = 'locked'
       if (mastery_score >= 80) {
           status = 'mastered'
       } else if (mastery_score >= 40) {
           status = 'in-progress'
       } else if (i === 0 || (i > 0 && progressMap.get(topicList[i-1].id)?.is_completed)) {
           status = 'gap' // Accessible, but not studied/passed -> Knowledge Gap!
       }

       nodes.push({
         id: t.id,
         label: t.name,
         status,
         mastery_score,
         estimated_time_minutes: (t.weightage || 5) * 10,
         why_it_matters: `Chapter ${t.chapter_num}: ${t.name} holds ${t.weightage}% weightage. Your test accuracy heavily points to focusing here.`,
         prerequisites: i > 0 ? [topicList[i-1].id] : [],
         unlocks: i < topicList.length - 1 ? [topicList[i+1].id] : []
       })
       
       // Linear Dependency Path
       if (i > 0) {
         links.push({ source: topicList[i-1].id, target: t.id, type: 'direct' })
       }
    }
    
    return successResponse({ nodes, links })
  } catch (err: any) {
    console.error('Map API Error:', err)
    return errorResponse('Failed to generate map', 500)
  }
}
