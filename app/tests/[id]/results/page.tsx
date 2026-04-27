'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ResultData {
  summary: { score: number; max_score: number; accuracy: number; correct_count: number; wrong_count: number; skipped_count: number; percentile: number; time_taken: number }
  test: { title: string; subjects: { name: string; icon: string } }
  questions: { id: string; question_text: string; options: string[]; correct_option: number; explanation: string; difficulty: string; user_answer: { selected_option: number; is_correct: boolean; is_skipped: boolean; marks_obtained: number } }[]
  topic_analysis: { name: string; total: number; correct: number; wrong: number }[]
}

export default function ResultsPage() {
  const { id } = useParams() as { id: string }
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attemptId')
  const [data, setData] = useState<ResultData | null>(null)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    const url = `/api/tests/${id}/results${attemptId ? `?attemptId=${attemptId}` : ''}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id, attemptId, token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
    </div>
  )

  const s = data?.summary
  const pct = s ? Math.round((s.score / s.max_score) * 100) : 0
  const grade = pct >= 80 ? { label: 'Excellent', color: '#4ade80', emoji: '🏆' }
    : pct >= 60 ? { label: 'Good', color: 'var(--primary)', emoji: '⭐' }
    : pct >= 40 ? { label: 'Average', color: 'var(--warning)', emoji: '📈' }
    : { label: 'Needs Work', color: 'var(--error)', emoji: '💪' }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface-container)', padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '430px', margin: '0 auto' }}>
          <Link href="/tests" style={{ color: 'var(--on-surface-variant)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            ← Back to Tests
          </Link>
          <h2>Test Results</h2>
          <p className="text-muted text-sm">{data?.test?.title}</p>
        </div>
      </div>

      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '24px' }}>
        {/* Score Card */}
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>{grade.emoji}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', fontWeight: 700, color: grade.color, lineHeight: 1 }}>
            {pct}%
          </div>
          <div style={{ color: grade.color, fontWeight: 600, marginBottom: '4px' }}>{grade.label}</div>
          <div className="text-muted text-sm">{s?.score} / {s?.max_score} marks</div>
          
          <div style={{ margin: '24px 0' }}>
            <div className="progress-bar" style={{ height: '10px' }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: grade.color }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[
              { label: 'Correct', value: s?.correct_count, color: '#4ade80' },
              { label: 'Wrong', value: s?.wrong_count, color: 'var(--error)' },
              { label: 'Skipped', value: s?.skipped_count, color: 'var(--outline)' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div className="text-muted" style={{ fontSize: '11px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Analysis */}
        {(data?.topic_analysis?.length || 0) > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '14px' }}>Topic Analysis</h3>
            {data!.topic_analysis.map(topic => (
              <div key={topic.name} className="glass-card-sm" style={{ padding: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{topic.name}</span>
                  <span className="text-primary" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {topic.correct}/{topic.total}
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '4px' }}>
                  <div className="progress-fill" style={{ width: `${(topic.correct / topic.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question Review */}
        <h3 style={{ marginBottom: '14px' }}>Question Review</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data?.questions.map((q, i) => (
            <div key={q.id} className="glass-card" style={{ 
              padding: '16px',
              borderColor: q.user_answer.is_skipped ? 'var(--glass-border)'
                : q.user_answer.is_correct ? 'rgba(74,222,128,0.3)' : 'rgba(255,100,100,0.3)'
            }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                  background: q.user_answer.is_skipped ? 'var(--surface-container)' 
                    : q.user_answer.is_correct ? 'rgba(74,222,128,0.2)' : 'rgba(255,100,100,0.2)',
                  color: q.user_answer.is_skipped ? 'var(--outline)' 
                    : q.user_answer.is_correct ? '#4ade80' : 'var(--error)'
                }}>
                  {q.user_answer.is_skipped ? '—' : q.user_answer.is_correct ? '✓' : '✗'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.5 }}>Q{i+1}. {q.question_text}</div>
                </div>
              </div>

              {!q.user_answer.is_skipped && !q.user_answer.is_correct && (
                <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--error)' }}>Your: {q.options[q.user_answer.selected_option]} </span>
                  <span style={{ color: '#4ade80' }}>· Correct: {q.options[q.correct_option]}</span>
                </div>
              )}

              {q.explanation && (
                <button onClick={() => setShowExplanation(showExplanation === q.id ? null : q.id)}
                  className="btn btn-ghost btn-sm" style={{ fontSize: '11px', padding: '4px 10px' }}>
                  {showExplanation === q.id ? '▲ Hide' : '▼ Explanation'}
                </button>
              )}

              {showExplanation === q.id && q.explanation && (
                <div style={{ 
                  marginTop: '10px', padding: '12px',
                  background: 'rgba(0,242,255,0.05)', borderRadius: '8px',
                  border: '1px solid rgba(0,242,255,0.15)',
                  fontSize: '12px', lineHeight: 1.6, color: 'var(--on-surface-variant)'
                }}>
                  💡 {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <Link href="/tests" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>← Tests</Link>
          <Link href="/coach" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>AI Coach 🤖</Link>
        </div>
      </div>
    </div>
  )
}
