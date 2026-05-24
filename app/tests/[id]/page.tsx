'use client'
import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Question {
  id: string; question_text: string; options: string[]; difficulty: string
  marks: number; negative_marks: number; question_num: number
}

interface TestData {
  title: string; duration: number; total_questions: number; questions: Question[]
}

// ── Isolated Timer — never causes question section to re-render ──
const Timer = memo(function Timer({
  initialSeconds,
  onExpire,
}: {
  initialSeconds: number
  onExpire: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (initialSeconds <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          clearInterval(timer)
          setTimeout(onExpire, 0) // defer so state update finishes
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [initialSeconds, onExpire])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isUrgent = timeLeft < 300

  return (
    <div style={{
      fontFamily: 'var(--font-heading)', fontWeight: 700,
      fontSize: '1.25rem',
      color: isUrgent ? 'var(--error)' : 'var(--primary)',
      background: isUrgent ? 'rgba(255,100,100,0.1)' : 'var(--primary-container)',
      padding: '6px 14px', borderRadius: 'var(--radius-md)',
      animation: isUrgent ? 'pulse-glow 1s infinite' : 'none'
    }}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  )
})

// ── Main Component ──────────────────────────────────────────────
export default function TestTakingPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [test, setTest] = useState<TestData | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [current, setCurrent] = useState(0)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [timerKey, setTimerKey] = useState(0)

  const tokenRef = useRef<string>('')
  useEffect(() => {
    tokenRef.current = localStorage.getItem('sv_token') || ''
  }, [])

  // ── Submit ──
  const submitTest = useCallback(async (isAutoSubmit = false) => {
    const token = tokenRef.current
    const currentAnswers = answers
    const currentAttemptId = attemptId

    if (!isAutoSubmit) {
      const testData = test
      if (testData) {
        const unanswered = testData.questions.length - Object.keys(currentAnswers).length
        if (unanswered > 0) {
          const ok = window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)
          if (!ok) return
        }
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/tests/${id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'submit',
          answers: currentAnswers,
          attempt_id: currentAttemptId,
          time_taken: durationSeconds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const finalAttemptId = data.data?.attempt_id || currentAttemptId
        router.push(`/tests/${id}/results?attemptId=${finalAttemptId}`)
      } else {
        alert(data.error || 'Failed to submit test')
        setSubmitting(false)
      }
    } catch {
      alert('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }, [id, answers, attemptId, durationSeconds, test, router])

  // ── Stable auto-submit ref (so Timer's onExpire never goes stale) ──
  const submitRef = useRef(submitTest)
  useEffect(() => { submitRef.current = submitTest }, [submitTest])
  const stableOnExpire = useCallback(() => submitRef.current(true), [])

  // ── Fetch test + start attempt ──
  useEffect(() => {
    const token = tokenRef.current
    fetch(`/api/tests/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async d => {
        if (!d.success) { router.push('/tests'); return }
        const testData: TestData = d.data.test
        setTest(testData)
        setDurationSeconds(testData.duration * 60)
        setTimerKey(k => k + 1) // reset timer

        const res = await fetch(`/api/tests/${id}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'start' }),
        })
        const a = await res.json()
        if (a.success) setAttemptId(a.data.attempt.id)
      })
      .catch(() => router.push('/tests'))
  }, [id, router])

  // ── Loading ──
  if (!test) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
    </div>
  )

  const q = test.questions[current]
  const answeredCount = Object.keys(answers).length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,21,21,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)', padding: '12px 24px',
      }}>
        <div style={{ maxWidth: '430px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{test.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{answeredCount}/{test.total_questions} answered</div>
          </div>
          {/* Timer is isolated — ticking it NEVER re-renders the question section */}
          {durationSeconds > 0 && (
            <Timer key={timerKey} initialSeconds={durationSeconds} onExpire={stableOnExpire} />
          )}
        </div>
      </div>

      {/* ── Question Section — keyed by question index so React fully remounts on navigate ── */}
      <div key={`question-${current}`} style={{ flex: 1, padding: '24px', maxWidth: '430px', margin: '0 auto', width: '100%' }}>

        {/* Progress */}
        <div className="progress-bar" style={{ marginBottom: '20px' }}>
          <div className="progress-fill" style={{ width: `${((current + 1) / test.questions.length) * 100}%` }} />
        </div>

        {/* Question Card */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="label-caps">Question {current + 1} of {test.questions.length}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
              <span className="badge badge-primary">+{q.marks} / -{q.negative_marks}</span>
            </div>
          </div>
          <p style={{ fontSize: '1rem', color: 'var(--on-surface)', lineHeight: 1.7, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
            {q.question_text}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {Array.isArray(q.options) && q.options.map((opt, i) => {
            const isSelected = answers[q.id] === i
            return (
              <button
                key={`${q.id}-opt-${i}`}
                onClick={() => {
                  if (isSelected) {
                    const copy = { ...answers }
                    delete copy[q.id]
                    setAnswers(copy)
                  } else {
                    setAnswers(prev => ({ ...prev, [q.id]: i }))
                  }
                }}
                style={{
                  width: '100%', padding: '16px', textAlign: 'left',
                  background: isSelected ? 'var(--primary-container)' : 'var(--glass-bg)',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--glass-border)'}`,
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  color: isSelected ? 'var(--primary)' : 'var(--on-surface)',
                  fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? 'var(--glow-primary)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}
              >
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? 'var(--primary)' : 'var(--surface-container-high)',
                  color: isSelected ? '#000' : 'var(--on-surface-variant)',
                  fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px',
                }}>
                  {['A', 'B', 'C', 'D'][i]}
                </span>
                {String(opt)}
              </button>
            )
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            className="btn btn-ghost" style={{ flex: 1 }}
            disabled={current === 0}
          >← Prev</button>

          {current < test.questions.length - 1 ? (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="btn btn-secondary" style={{ flex: 1 }}
            >Next →</button>
          ) : (
            <button
              onClick={() => submitTest(false)}
              className="btn btn-primary" style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Test 🎯'}
            </button>
          )}
        </div>

        {/* Question Grid Navigator */}
        <div style={{ marginTop: '24px' }}>
          <div className="label-caps" style={{ marginBottom: '10px' }}>Jump to Question</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {test.questions.map((q2, i) => (
              <button
                key={`nav-${q2.id}`}
                onClick={() => setCurrent(i)}
                style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  background: i === current
                    ? 'var(--primary)'
                    : answers[q2.id] !== undefined
                    ? 'rgba(74,222,128,0.2)'
                    : 'var(--surface-container)',
                  color: i === current ? '#000' : 'var(--on-surface)',
                  cursor: 'pointer', fontFamily: 'var(--font-heading)',
                  fontWeight: 600, fontSize: '12px',
                  border: `1px solid ${
                    i === current
                      ? 'var(--primary)'
                      : answers[q2.id] !== undefined
                      ? '#4ade80'
                      : 'var(--glass-border)'
                  }`,
                  transition: 'all 0.15s',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
