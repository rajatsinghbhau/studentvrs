'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

interface Test {
  id: string; title: string; description: string
  subjects: { name: string; icon: string; color: string }
  total_questions: number; duration: number; max_marks: number; difficulty: string
  is_attempted: boolean; best_score?: number; best_accuracy?: number; attempt_count: number
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([])
  const [filter, setFilter] = useState<'all' | 'available' | 'attempted'>('all')
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    const url = filter === 'all' ? '/api/tests' : `/api/tests?status=${filter}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setTests(d.data.tests) })
      .finally(() => setLoading(false))
  }, [filter, token])

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px' }}>
        <h2 style={{ marginBottom: '20px' }}>Tests 🎯</h2>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {(['all', 'available', 'attempted'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-full)', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '120px' }} />)}
          </div>
        ) : tests.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <p className="text-muted">No tests found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tests.map(test => (
              <div key={test.id} className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span>{test.subjects?.icon}</span>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{test.subjects?.name}</span>
                      <span className={`badge badge-${test.difficulty.toLowerCase()}`}>{test.difficulty}</span>
                    </div>
                    <h4 style={{ marginBottom: '4px' }}>{test.title}</h4>
                  </div>
                  {test.is_attempted && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary)', fontWeight: 700 }}>
                        {Math.round(test.best_accuracy || 0)}%
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>best accuracy</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  {[
                    { label: 'Questions', value: test.total_questions },
                    { label: 'Duration', value: `${test.duration}m` },
                    { label: 'Marks', value: test.max_marks },
                    test.is_attempted ? { label: 'Attempts', value: test.attempt_count } : null
                  ].filter(Boolean).map(item => item && (
                    <div key={item.label}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem' }}>{item.value}</div>
                      <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link href={`/tests/${test.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    {test.is_attempted ? 'Retake Test' : 'Start Test →'}
                  </Link>
                  {test.is_attempted && (
                    <Link href={`/tests/${test.id}/results`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      View Results
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
