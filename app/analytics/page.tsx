'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

interface AnalyticsData {
  overview: { total_study_time: number; total_tests: number; avg_accuracy: number; streak: number; level: number; rank_title: string; completed_topics: number }
  subject_time: { name: string; color: string; icon: string; minutes: number }[]
  daily_study: { date: string; studied: boolean; minutes: number }[]
  test_trend: { date: string; accuracy: number; test_title: string }[]
  weak_topics: { mastery_level: number; topics: { name: string } }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    fetch('/api/analytics?period=30', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
    </div>
  )

  const o = data?.overview
  const totalSubjectTime = data?.subject_time.reduce((s, t) => s + t.minutes, 0) || 1

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px' }}>
        <h2 style={{ marginBottom: '8px' }}>Analytics 📊</h2>
        <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>Last 30 days</p>

        {/* Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'Study Time', value: `${Math.round((o?.total_study_time || 0) / 60)}h`, icon: '⏱️', color: 'var(--primary)' },
            { label: 'Tests Taken', value: o?.total_tests || 0, icon: '🎯', color: 'var(--secondary)' },
            { label: 'Avg Accuracy', value: `${o?.avg_accuracy || 0}%`, icon: '✅', color: '#4ade80' },
            { label: 'Topics Done', value: o?.completed_topics || 0, icon: '📚', color: 'var(--tertiary)' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div style={{ fontSize: '20px' }}>{stat.icon}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Streak Calendar */}
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Study Streak 🔥 {o?.streak} days</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {data?.daily_study.map(day => (
              <div key={day.date}
                style={{
                  width: '24px', height: '24px', borderRadius: '4px',
                  background: day.studied ? day.minutes > 60 ? 'var(--primary)' : 'rgba(0,242,255,0.3)' : 'var(--surface-container)',
                }} />
            ))}
          </div>
        </div>

        {/* Subject Time */}
        {(data?.subject_time.length || 0) > 0 && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Time by Subject</h3>
            {data!.subject_time.sort((a, b) => b.minutes - a.minutes).map(s => (
              <div key={s.name} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{s.icon} {s.name}</span>
                  <span style={{ color: s.color, fontWeight: 700, fontSize: '0.9rem' }}>{s.minutes}m</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(s.minutes / totalSubjectTime) * 100}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weak Topics */}
        {(data?.weak_topics.length || 0) > 0 && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>⚠️ Weak Areas</h3>
            {data!.weak_topics.map((wt, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{wt.topics?.name}</span>
                  <span style={{ color: 'var(--error)', fontWeight: 700, fontSize: '0.85rem' }}>{wt.mastery_level}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${wt.mastery_level}%`, background: 'var(--error)' }} />
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
