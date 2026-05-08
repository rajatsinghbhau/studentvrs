'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

interface DashboardData {
  profile: {
    name: string; level: number; rank_title: string; xp: number
    streak: number; xp_progress: number; xp_to_next_level: number; target_exam: string
  }
  stats: { today_study_time: number; weekly_study_time: number; due_cards: number }
  subjects: { id: string; name: string; icon: string; color: string; progress: number; completed_topics: number; total_topics: number }[]
  upcoming_tests: { id: string; title: string; subjects: { name: string; icon: string } }[]
  study_plan: { time: string; subject: string; topic: string; duration: number; priority: string }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    if (!token) { window.location.href = '/login'; return }
    fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40, borderWidth: 3 }}></div>
        <p className="text-muted">Calibrating your dashboard...</p>
      </div>
    </div>
  )

  const p = data?.profile

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div className="label-caps" style={{ color: 'var(--primary)', marginBottom: '4px' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long' })} · {p?.target_exam}
            </div>
            <h2 style={{ fontSize: '1.5rem' }}>Hey, {p?.name?.split(' ')[0]} 👋</h2>
          </div>
          <Link href="/profile">
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-container), rgba(119,1,208,0.2))',
              border: '2px solid var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', cursor: 'pointer'
            }}>👤</div>
          </Link>
        </div>

        {/* Level Card */}
        <div className="glass-card animate-pulse-glow" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div className="label-caps" style={{ marginBottom: '2px' }}>Level {p?.level}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>
                {p?.rank_title}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label-caps">🔥 {p?.streak}-day streak</div>
              <div style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                {p?.xp_to_next_level} XP to next level
              </div>
            </div>
          </div>
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${p?.xp_progress || 0}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{p?.xp} XP</span>
            <span style={{ fontSize: '11px', color: 'var(--primary)' }}>{p?.xp_progress}%</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid-2 stagger" style={{ marginBottom: '24px' }}>
          {[
            { label: "Today's Study", value: `${data?.stats.today_study_time || 0}m`, icon: '⏱️', color: 'var(--primary)' },
            { label: 'Cards Due', value: data?.stats.due_cards || 0, icon: '🔄', color: 'var(--secondary)' },
          ].map(stat => (
            <div key={stat.label} className="stat-card animate-fade-in-up">
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Knowledge Map Banner */}
        <Link href="/map" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(0,242,255,0.05) 0%, rgba(119,1,208,0.1) 100%)', border: '1px solid rgba(0,242,255,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '32px' }}>🧠</div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#fff' }}>Knowledge Gap Map</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>Visualize your brain's dependency graph and fix weak spots.</p>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--primary)' }}>→</div>
            </div>
          </div>
        </Link>

        {/* Subjects Progress */}
        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Subjects</h3>
            <Link href="/learn" className="text-primary text-sm">View All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.subjects.slice(0, 3).map(subject => (
              <div key={subject.id} className="glass-card-sm" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{subject.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{subject.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {subject.completed_topics}/{subject.total_topics} topics
                      </div>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: subject.color, fontSize: '0.9rem' }}>
                    {subject.progress}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${subject.progress}%`, background: subject.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Plan */}
        <div className="section">
          <h3 style={{ marginBottom: '16px' }}>Today&apos;s Study Plan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data?.study_plan.map((item, i) => (
              <div key={i} className="glass-card-sm" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  minWidth: '56px', textAlign: 'center',
                  fontFamily: 'var(--font-heading)', fontSize: '11px',
                  fontWeight: 700, color: 'var(--primary)',
                  letterSpacing: '0.05em'
                }}>{item.time}</div>
                <div style={{ width: '1px', height: '32px', background: 'var(--glass-border)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.subject}</div>
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{item.topic} · {item.duration}m</div>
                </div>
                <span className={`badge badge-${item.priority.toLowerCase() === 'high' ? 'error' : item.priority.toLowerCase() === 'medium' ? 'warning' : 'success'}`}
                  style={{ fontSize: '10px' }}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Link href="/tests" className="btn btn-primary" style={{ flex: 1 }}>Take Test 🎯</Link>
          <Link href="/revision" className="btn btn-secondary" style={{ flex: 1 }}>Revision 🔄</Link>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
