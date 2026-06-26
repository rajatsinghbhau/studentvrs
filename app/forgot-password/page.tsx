'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) {
        setError(error.message)
      } else {
        setMessage('Reset link sent! Please check your email for instructions.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>Reset Password</h1>
          <p className="text-muted text-sm">Recover access to your account</p>
        </div>

        <div className="glass-card" style={{ padding: '32px', background: 'rgba(13, 21, 21, 0.75)', border: '1px solid var(--glass-border)', borderRadius: '16px', backdropFilter: 'blur(16px)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label className="input-label" style={{ marginBottom: '8px', display: 'block', fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>Email Address</label>
              <input 
                className="input-field" 
                type="email" 
                placeholder="you@example.com"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={{
                  width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', outline: 'none'
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '8px', color: 'var(--error)', fontSize: '0.82rem' }}>
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div style={{ padding: '12px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', color: '#4ade80', fontSize: '0.82rem' }}>
                ✉️ {message}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{
              width: '100%', padding: '12px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer'
            }}>
              {loading ? 'Sending link...' : 'Send Reset Link →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
          Remembered password?{' '}
          <Link href="/login" className="text-primary" style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </main>
  )
}
