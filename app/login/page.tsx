'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    
    // Smooth 15-degree tilt
    const factorX = 15 / (rect.height / 2)
    const factorY = -15 / (rect.width / 2)

    setTilt({
      rx: y * factorX,
      ry: x * factorY
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      setLoading(false)

      if (!data.success) { 
        setError(data.error || 'Invalid credentials')
        return 
      }

      localStorage.setItem('sv_token', data.data.session.access_token)
      localStorage.setItem('sv_refresh', data.data.session.refresh_token)
      localStorage.setItem('sv_user', JSON.stringify(data.data.user))

      if (!data.data.user.onboarding_done) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Connection failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main 
      className={`login-page perspective-container ${mounted ? 'enter-portal-zoom-active' : ''}`} 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, #0d1515 0%, #0a1010 100%)'
      }}
    >
      {/* Background blueprint elements for consistency */}
      <div className="fine-blueprint-grid" />
      <div className="glow-nebula" style={{ top: '10%', left: '10%', width: '300px', height: '300px', background: 'var(--primary)', opacity: 0.04 }} />
      <div className="glow-nebula" style={{ bottom: '10%', right: '10%', width: '300px', height: '300px', background: 'var(--secondary)', opacity: 0.04 }} />

      {/* 3D Interactive Card Wrapper */}
      <div 
        ref={cardRef}
        className="preserve-3d"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ 
          width: '100%', 
          maxWidth: '400px', 
          zIndex: 10,
          transition: 'transform 0.15s ease-out',
          transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
        }}
      >
        
        {/* Original Welcome Header (Z-layered) */}
        <div 
          className="preserve-3d" 
          style={{ 
            textAlign: 'center', 
            marginBottom: '40px',
            transform: 'translateZ(30px)' 
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚡</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px', color: '#fff', fontFamily: 'var(--font-heading)' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
            Resume your quantum journey
          </p>
        </div>

        {/* Original glass card form (Z-layered) */}
        <div 
          className="glass-card preserve-3d" 
          style={{ 
            padding: '32px',
            transform: 'translateZ(10px)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.5), inset 0 0 15px rgba(0,242,255,0.02)'
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="input-group">
              <label className="input-label">Email</label>
              <input 
                className="input-field" 
                type="email" 
                placeholder="you@example.com"
                value={form.email} 
                onChange={e => setForm({ ...form, email: e.target.value })} 
                required 
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Password</label>
                <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <input 
                className="input-field" 
                type="password" 
                placeholder="Your password"
                value={form.password} 
                onChange={e => setForm({ ...form, password: e.target.value })} 
                required 
              />
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '8px', color: 'var(--error)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18 }}></span> 
                  Signing in...
                </>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--on-surface-variant)', transform: 'translateZ(15px)' }}>
          New to Student Verse?{' '}
          <Link href="/register" className="text-primary" style={{ fontWeight: 600, color: 'var(--primary)' }}>
            Create Account
          </Link>
        </p>
      </div>
    </main>
  )
}
