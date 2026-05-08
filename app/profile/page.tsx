'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

interface Profile {
  name: string; email: string; avatar_url: string; target_exam: string; target_year: number
  level: number; rank_title: string; xp: number; xp_progress_percent: number; xp_to_next: number
  streak: number; bio: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<{ total_tests: number; avg_accuracy: number; total_study_time: number; best_streak: number } | null>(null)
  const [achievements, setAchievements] = useState<{ title: string; icon: string; unlocked: boolean }[]>([])
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', bio: '' })
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProfile(d.data.profile)
          setStats(d.data.stats)
          setAchievements(d.data.achievements)
          setEditForm({ name: d.data.profile.name, bio: d.data.profile.bio || '' })
        }
        setLoading(false)
      })
  }, [token])

  const saveProfile = async () => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm)
    })
    const d = await res.json()
    if (d.success) { setProfile(d.data.profile); setEditing(false) }
  }

  const logout = () => {
    localStorage.clear()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
    </div>
  )

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px' }}>
        {/* Profile Header */}
        <div className="glass-card" style={{ padding: '28px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-container), rgba(119,1,208,0.2))',
            border: '3px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 16px', boxShadow: 'var(--glow-primary)'
          }}>👤</div>
          
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              <input className="input-field" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" />
              <textarea className="input-field" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Bio" rows={2} style={{ resize: 'none' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={saveProfile} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Save</button>
                <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: '4px' }}>{profile?.name}</h2>
              <div className="text-muted text-sm" style={{ marginBottom: '8px' }}>{profile?.email}</div>
              {profile?.bio && <p className="text-muted text-sm" style={{ marginBottom: '12px' }}>{profile.bio}</p>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                <span className="badge badge-primary">{profile?.target_exam} {profile?.target_year}</span>
                <span className="badge badge-secondary">🔥 {profile?.streak} streak</span>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="label-caps">Level {profile?.level} · {profile?.rank_title}</span>
                  <span style={{ fontSize: '12px', color: 'var(--primary)' }}>{profile?.xp_progress_percent}%</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-fill" style={{ width: `${profile?.xp_progress_percent}%` }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                  {profile?.xp_to_next} XP to next level
                </div>
              </div>
              <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm btn-full">Edit Profile</button>
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'Tests Taken', value: stats?.total_tests || 0, icon: '🎯' },
            { label: 'Avg Accuracy', value: `${stats?.avg_accuracy || 0}%`, icon: '✅' },
            { label: 'Study Time', value: `${Math.round((stats?.total_study_time || 0) / 60)}h`, icon: '⏱️' },
            { label: 'Best Streak', value: `${stats?.best_streak || 0}d`, icon: '🔥' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: '20px' }}>{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Achievements 🏆</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {achievements.map(a => (
                <div key={a.title} style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: a.unlocked ? 'var(--primary-container)' : 'var(--surface-container)',
                  border: `1px solid ${a.unlocked ? 'rgba(0,242,255,0.3)' : 'var(--glass-border)'}`,
                  display: 'flex', alignItems: 'center', gap: '8px',
                  opacity: a.unlocked ? 1 : 0.5
                }}>
                  <span style={{ fontSize: '18px' }}>{a.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: a.unlocked ? 'var(--primary)' : 'var(--outline)' }}>{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
          {[
            { href: '/analytics', icon: '📊', label: 'View Analytics' },
            { href: '/revision', icon: '🔄', label: 'Revision Cards' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 0', borderBottom: '1px solid var(--glass-border)',
              color: 'var(--on-surface)', textDecoration: 'none'
            }}>
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{item.label}</span>
              <span style={{ color: 'var(--outline)' }}>→</span>
            </Link>
          ))}
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
            padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px'
          }}>
            <span style={{ fontSize: '18px' }}>🚪</span>
            <span style={{ flex: 1, textAlign: 'left', color: 'var(--error)', fontWeight: 500 }}>Sign Out</span>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
