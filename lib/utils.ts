import { NextResponse } from 'next/server'

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function unauthorizedResponse() {
  return errorResponse('Unauthorized. Please login.', 401)
}

// XP calculation
export function calculateXP(action: 'test_complete' | 'topic_complete' | 'revision' | 'login', score?: number): number {
  switch (action) {
    case 'test_complete': return Math.round((score || 0) * 2) + 50
    case 'topic_complete': return 100
    case 'revision': return 20
    case 'login': return 10
    default: return 0
  }
}

// Level from XP
export function calculateLevel(xp: number): { level: number; title: string } {
  const levels = [
    { min: 0, title: 'Rookie' },
    { min: 500, title: 'Initiate' },
    { min: 1500, title: 'Scholar' },
    { min: 3000, title: 'Challenger' },
    { min: 5000, title: 'Elite' },
    { min: 8000, title: 'Prodigy' },
    { min: 12000, title: 'Mastermind' },
    { min: 18000, title: 'Quantum Mind' },
    { min: 25000, title: 'Legend' },
  ]
  let level = 1
  let title = 'Rookie'
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].min) { level = i + 1; title = levels[i].title }
  }
  return { level, title }
}

// SRS (Spaced Repetition) next review calculation
export function calculateNextReview(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  currentInterval: number,
  currentEaseFactor: number,
  repetitions: number
): { interval: number; easeFactor: number; nextReviewAt: Date } {
  let interval = currentInterval
  let easeFactor = currentEaseFactor

  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(currentInterval * easeFactor)
    repetitions++
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + interval)

  return { interval, easeFactor, nextReviewAt }
}
