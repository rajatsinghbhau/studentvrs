import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/supabase'
import { errorResponse, unauthorizedResponse } from '@/lib/utils'
import Groq from 'groq-sdk'

export const dynamic = 'force-dynamic'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
]

// Public Invidious instances — no API key needed
// Falls through to next if one is down
const INVIDIOUS_INSTANCES = [
  'https://inv.riverside.rocks',
  'https://invidious.kavin.rocks',
  'https://invidious.snopyta.org',
]

interface InvidiousVideo {
  videoId: string
  title: string
  author: string
  lengthSeconds: number
  viewCount: number
}

async function searchYouTube(query: string, maxResults = 3): Promise<InvidiousVideo[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,viewCount`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data)) continue
      return data.slice(0, maxResults).map((v: InvidiousVideo) => ({
        videoId: v.videoId,
        title: v.title,
        author: v.author,
        lengthSeconds: v.lengthSeconds,
        viewCount: v.viewCount,
      }))
    } catch {
      continue // try next instance
    }
  }
  return [] // all instances failed — page will show fallback
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const { query } = await request.json()
    if (!query?.trim()) return errorResponse('Query is required', 400)

    const prompt = `You are an expert JEE/NEET teacher. A student asked: "${query.trim()}"

Generate a comprehensive explanation in this EXACT JSON format (no markdown, raw JSON only):
{
  "title": "Clear topic title",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "EASY|MEDIUM|HARD",
  "one_liner": "One sentence summary of the concept",
  "explanation": "3-5 paragraph detailed explanation. Use simple language. Include intuition behind the concept, not just formulas.",
  "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "formulas": [
    {"formula": "F = ma", "name": "Newton's Second Law", "variables": "F=force(N), m=mass(kg), a=acceleration(m/s²)"}
  ],
  "real_world_example": "A vivid, relatable real-world example that explains the concept intuitively.",
  "common_mistakes": ["mistake 1", "mistake 2", "mistake 3"],
  "jee_neet_tip": "Specific tip for how this topic appears in JEE/NEET exams and what to watch out for.",
  "youtube_query": "concise YouTube search query for the absolute best comprehensive lecture or explanation video on this topic",
  "related_topics": ["topic 1", "topic 2", "topic 3"]
}

Return ONLY the JSON object, no extra text.`

    // Run Groq + YouTube searches in parallel for speed
    let lastError: Error | null = null
    let explainData: Record<string, unknown> | null = null

    for (const model of MODEL_CHAIN) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.4,
        })
        const raw = completion.choices[0]?.message?.content || ''
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON in response')
        explainData = JSON.parse(jsonMatch[0])
        break
      } catch (err: any) {
        lastError = err
        const isQuota = err.status === 429 || err.message?.includes('rate_limit')
        if (isQuota) { console.warn(`[Groq] ${model} rate-limited`); continue }
        throw err
      }
    }

    if (!explainData) throw lastError || new Error('All models failed')

    // Search YouTube for the single query
    const queryToSearch = (explainData.youtube_query as string) || ''
    let bestVideo = null
    if (queryToSearch) {
      const results = await searchYouTube(queryToSearch, 1)
      if (results && results.length > 0) {
        bestVideo = { ...results[0], query: queryToSearch }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...explainData,
        video: bestVideo,
      },
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('Explain API error:', err)
    return errorResponse(err.message || 'Failed to generate explanation', 500)
  }
}
