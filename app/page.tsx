import Link from 'next/link'

export default function SplashPage() {
  return (
    <main style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(0,242,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '-10%',
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(119,1,208,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="animate-float" style={{ marginBottom: '32px' }}>
          <div style={{
            width: '100px', height: '100px', margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(119,1,208,0.15))',
            border: '1px solid rgba(0,242,255,0.3)',
            borderRadius: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px',
            boxShadow: '0 0 40px rgba(0,242,255,0.15)'
          }}>⚡</div>
        </div>

        {/* Title */}
        <div className="label-caps" style={{ marginBottom: '12px', color: 'var(--primary)' }}>
          Neo-Quantum EdTech
        </div>
        <h1 style={{ 
          fontSize: '2.5rem', fontWeight: 700,
          background: 'linear-gradient(135deg, var(--on-surface), var(--primary))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '16px', lineHeight: 1.1
        }}>
          Studentverse<br />AI
        </h1>
        <p style={{ 
          color: 'var(--on-surface-variant)', fontSize: '1rem',
          maxWidth: '280px', margin: '0 auto 48px',
          lineHeight: 1.6
        }}>
          Your quantum leap to IIT — AI-powered JEE & NEET preparation
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
          <Link href="/register" className="btn btn-primary btn-lg btn-full">
            Start Your Journey 🚀
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg btn-full">
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'flex', gap: '32px', justifyContent: 'center',
          marginTop: '64px', paddingTop: '32px',
          borderTop: '1px solid var(--glass-border)'
        }}>
          {[
            { value: '50K+', label: 'Students' },
            { value: '95%', label: 'Success Rate' },
            { value: 'AI', label: 'Powered' }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div className="font-heading" style={{ 
                fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)'
              }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
