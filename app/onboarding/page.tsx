'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const steps = [
  {
    id: 1, title: "What's your target?", icon: '🎯',
    desc: 'Choose your primary examination'
  },
  {
    id: 2, title: 'Your target year?', icon: '📅',
    desc: 'When are you appearing?'
  },
  {
    id: 3, title: "You're ready!", icon: '⚡',
    desc: 'Your quantum dashboard is being calibrated'
  }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ target_exam: 'JEE', target_year: 2026 })
  const [loading, setLoading] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  const handleComplete = async () => {
    setLoading(true)
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...data, onboarding_done: true })
    })
    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{
              flex: 1, height: '4px', borderRadius: '999px',
              background: i <= step ? 'var(--primary)' : 'var(--surface-container-high)',
              transition: 'background 0.4s'
            }} />
          ))}
        </div>

        <div className="glass-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>{steps[step].icon}</div>
          <h2 style={{ marginBottom: '8px' }}>{steps[step].title}</h2>
          <p className="text-muted text-sm" style={{ marginBottom: '32px' }}>{steps[step].desc}</p>

          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['JEE', 'NEET', 'BOARDS'].map(exam => (
                <button key={exam} onClick={() => { setData({ ...data, target_exam: exam }); setStep(1) }}
                  className={`btn btn-lg btn-full ${data.target_exam === exam ? 'btn-primary' : 'btn-secondary'}`}>
                  {exam === 'JEE' ? '⚛️ JEE Main & Advanced' : exam === 'NEET' ? '🧬 NEET UG' : '📖 Class 12 Boards'}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[2025, 2026, 2027].map(yr => (
                <button key={yr} onClick={() => { setData({ ...data, target_year: yr }); setStep(2) }}
                  className={`btn btn-lg btn-full ${data.target_year === yr ? 'btn-primary' : 'btn-secondary'}`}>
                  {yr} Attempt
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '80px', height: '80px',
                background: 'var(--primary-container)',
                borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '40px', marginBottom: '8px',
                boxShadow: 'var(--glow-primary)'
              }}>🚀</div>
              <p style={{ color: 'var(--on-surface-variant)' }}>
                Targeting <strong style={{ color: 'var(--primary)' }}>{data.target_exam}</strong> in{' '}
                <strong style={{ color: 'var(--primary)' }}>{data.target_year}</strong>
              </p>
              <button className="btn btn-primary btn-lg btn-full" onClick={handleComplete} disabled={loading}>
                {loading ? 'Calibrating...' : 'Launch Dashboard ⚡'}
              </button>
            </div>
          )}
        </div>

        {step > 0 && step < 2 && (
          <button onClick={() => setStep(step - 1)} className="btn btn-ghost btn-full" style={{ marginTop: '16px' }}>
            ← Back
          </button>
        )}
      </div>
    </main>
  )
}
