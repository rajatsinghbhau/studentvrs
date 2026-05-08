'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

// ── Types ──────────────────────────────────────────────────────────────────
interface Attempt {
  id: string
  score: number
  accuracy: number
  correct_count: number
  wrong_count: number
  skipped_count: number
  time_taken: number
  percentile: number
  completed_at: string
  tests: {
    id: string
    title: string
    total_questions: number
    max_marks: number
    difficulty: string
    subjects: { name: string; icon: string; color: string } | null
  }
}

// ── Constants ──────────────────────────────────────────────────────────────
const SUBJECTS = [
  { label: 'Physics', icon: '⚛️', color: '#00f2ff' },
  { label: 'Chemistry', icon: '🧪', color: '#a78bfa' },
  { label: 'Mathematics', icon: '📐', color: '#f59e0b' },
  { label: 'Biology', icon: '🧬', color: '#4ade80' },
]
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']
const Q_COUNTS = [5, 10, 15, 20, 30]

const diffColor = (d: string) =>
  d === 'EASY' ? '#4ade80' : d === 'HARD' ? '#f87171' : '#f59e0b'

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function TestsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'generate' | 'history'>('generate')

  // Generate form state
  const [subject, setSubject] = useState('Physics')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [count, setCount] = useState(10)
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genStep, setGenStep] = useState<'idle' | 'thinking' | 'saving'>('idle')

  // History state
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [histLoaded, setHistLoaded] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  const loadHistory = () => {
    if (histLoaded) return
    setHistLoading(true)
    fetch('/api/tests/history', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAttempts(d.data.attempts || []) })
      .catch(() => {})
      .finally(() => { setHistLoading(false); setHistLoaded(true) })
  }

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab]) // eslint-disable-line

  const generateTest = async () => {
    setGenError(null)
    setGenerating(true)
    setGenStep('thinking')

    try {
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, difficulty, count, topic: topic.trim() || undefined }),
      })

      setGenStep('saving')
      const data = await res.json()

      if (!data.success) {
        setGenError(data.error || 'Failed to generate test. Please try again.')
        return
      }

      // Navigate to the test
      router.push(`/tests/${data.data.test_id}`)
    } catch {
      setGenError('Network error. Please check your connection and try again.')
    } finally {
      setGenerating(false)
      setGenStep('idle')
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px', paddingBottom: '80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '4px' }}>Tests 🎯</h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
            AI-generated fresh questions every time
          </p>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '24px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', padding: '4px',
        }}>
          {(['generate', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: '9px', border: 'none',
                background: tab === t ? 'rgba(0,242,255,0.15)' : 'transparent',
                color: tab === t ? 'rgba(0,242,255,0.9)' : 'rgba(255,255,255,0.45)',
                fontFamily: 'inherit', fontWeight: tab === t ? 600 : 400,
                fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all 0.2s',
                borderBottom: tab === t ? '2px solid rgba(0,242,255,0.5)' : '2px solid transparent',
              }}
            >
              {t === 'generate' ? '✨ Generate' : '📋 History'}
            </button>
          ))}
        </div>

        {/* ── GENERATE TAB ── */}
        {tab === 'generate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Subject Selector */}
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Subject
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {SUBJECTS.map(s => (
                  <button
                    key={s.label}
                    onClick={() => setSubject(s.label)}
                    style={{
                      padding: '14px 12px', borderRadius: '12px',
                      background: subject === s.label
                        ? `linear-gradient(135deg, ${s.color}22, ${s.color}11)`
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${subject === s.label ? s.color + '55' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      transition: 'all 0.2s',
                      boxShadow: subject === s.label ? `0 0 16px ${s.color}22` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{s.icon}</span>
                    <span style={{
                      fontFamily: 'inherit', fontWeight: subject === s.label ? 600 : 400,
                      fontSize: '0.88rem',
                      color: subject === s.label ? s.color : 'rgba(255,255,255,0.7)',
                    }}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Difficulty
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: '10px',
                      background: difficulty === d ? `${diffColor(d)}22` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${difficulty === d ? diffColor(d) + '66' : 'rgba(255,255,255,0.08)'}`,
                      color: difficulty === d ? diffColor(d) : 'rgba(255,255,255,0.5)',
                      fontFamily: 'inherit', fontWeight: difficulty === d ? 700 : 400,
                      fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Number of Questions
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Q_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    style={{
                      padding: '8px 16px', borderRadius: '20px',
                      background: count === n ? 'rgba(0,242,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${count === n ? 'rgba(0,242,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: count === n ? 'rgba(0,242,255,0.9)' : 'rgba(255,255,255,0.5)',
                      fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic (optional) */}
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Topic <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
              </div>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={`e.g. Laws of Motion, Organic Chemistry, Integration…`}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.9)', fontFamily: 'inherit', fontSize: '0.875rem',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,242,255,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Summary card */}
            <div style={{
              padding: '14px 16px', borderRadius: '12px',
              background: 'rgba(0,242,255,0.04)',
              border: '1px solid rgba(0,242,255,0.12)',
              display: 'flex', gap: '20px', flexWrap: 'wrap',
            }}>
              {[
                { label: 'Questions', value: count },
                { label: 'Duration', value: `~${count * 2}m` },
                { label: 'Max Marks', value: count * 4 },
                { label: 'Marking', value: '+4 / -1' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'rgba(0,242,255,0.9)' }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {genError && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)',
                color: 'rgba(255,180,180,0.9)', fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>⚠️ {genError}</span>
                <button onClick={() => setGenError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.6 }}>✕</button>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateTest}
              disabled={generating}
              style={{
                width: '100%', padding: '16px',
                borderRadius: '14px', cursor: generating ? 'not-allowed' : 'pointer',
                background: generating
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, rgba(0,242,255,0.25), rgba(119,1,208,0.3))',
                border: `1px solid ${generating ? 'rgba(255,255,255,0.1)' : 'rgba(0,242,255,0.35)'}`,
                color: generating ? 'rgba(255,255,255,0.4)' : '#fff',
                fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem',
                transition: 'all 0.3s',
                boxShadow: generating ? 'none' : '0 0 24px rgba(0,242,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              {generating ? (
                <>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: 'rgba(0,242,255,0.7)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  {genStep === 'thinking' ? `Generating ${count} questions…` : 'Saving test…'}
                </>
              ) : (
                <>✨ Generate AI Test</>
              )}
            </button>

            {generating && (
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '-8px' }}>
                This takes 10–20 seconds. Sit tight!
              </p>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div>
            {histLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    height: '110px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.04)',
                    animation: 'pulse-glow 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : attempts.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
              }}>
                <div style={{ fontSize: '44px', marginBottom: '12px' }}>📭</div>
                <h4 style={{ marginBottom: '6px', color: 'rgba(255,255,255,0.7)' }}>No tests taken yet</h4>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
                  Generate your first AI test to see your history here.
                </p>
                <button
                  onClick={() => setTab('generate')}
                  style={{
                    marginTop: '16px', padding: '10px 20px', borderRadius: '10px',
                    background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.25)',
                    color: 'rgba(0,242,255,0.9)', fontFamily: 'inherit', fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  ✨ Generate a Test
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {attempts.map(a => {
                  const test = a.tests
                  const scorePercent = test?.max_marks ? Math.round((a.score / test.max_marks) * 100) : 0
                  const diffStr = (test?.difficulty || 'MEDIUM').toUpperCase()
                  return (
                    <div
                      key={a.id}
                      style={{
                        padding: '16px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        transition: 'border-color 0.2s',
                        cursor: 'pointer',
                      }}
                      onClick={() => router.push(`/tests/${test?.id}/results?attemptId=${a.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,242,255,0.2)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    >
                      {/* Top row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                          <div style={{
                            fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px',
                            color: 'rgba(255,255,255,0.85)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {test?.title || 'Test'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', color: diffColor(diffStr), border: `1px solid ${diffColor(diffStr)}55`, borderRadius: '4px', padding: '1px 6px' }}>
                              {diffStr}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                              {fmtDate(a.completed_at)}
                            </span>
                          </div>
                        </div>

                        {/* Score circle */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem',
                            color: a.accuracy >= 70 ? '#4ade80' : a.accuracy >= 40 ? '#f59e0b' : '#f87171',
                          }}>
                            {a.accuracy}%
                          </div>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>ACCURACY</div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                        {[
                          { label: '✅', value: a.correct_count, color: '#4ade80' },
                          { label: '❌', value: a.wrong_count, color: '#f87171' },
                          { label: '⏭️', value: a.skipped_count, color: 'rgba(255,255,255,0.4)' },
                          { label: '📊', value: `${a.score}/${test?.max_marks || '?'}`, color: 'rgba(0,242,255,0.8)' },
                          { label: '⏱️', value: fmtTime(a.time_taken || 0), color: 'rgba(255,255,255,0.4)' },
                        ].map(s => (
                          <div key={s.label} style={{ fontSize: '0.78rem', color: s.color }}>
                            {s.label} {s.value}
                          </div>
                        ))}
                      </div>

                      {/* Score bar */}
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '2px',
                          width: `${Math.max(0, scorePercent)}%`,
                          background: a.accuracy >= 70 ? '#4ade80' : a.accuracy >= 40 ? '#f59e0b' : '#f87171',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
