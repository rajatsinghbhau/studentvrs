'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setLoading(false)

    if (!data.success) { setError(data.error); return }

    localStorage.setItem('sv_token', data.data.session.access_token)
    localStorage.setItem('sv_refresh', data.data.session.refresh_token)
    localStorage.setItem('sv_user', JSON.stringify(data.data.user))

    if (!data.data.user.onboarding_done) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚡</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Welcome Back</h1>
          <p className="text-muted text-sm">Resume your quantum journey</p>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input-field" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="input-field" type="password" placeholder="Your password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '8px', color: 'var(--error)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }}></span> Signing in...</> : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
          New to Studentverse?{' '}
          <Link href="/register" className="text-primary" style={{ fontWeight: 600 }}>Create Account</Link>
        </p>
      </div>
    </main>
  )
}
