'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SplashPage() {
  const router = useRouter()
  const [transitioning, setTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Parallax angles & coordinate variables
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    // Normalised position: -1 to 1
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    // Angle of rotation (max 20 degrees for massive 3D impact)
    setTilt({
      rx: -y * 22,
      ry: x * 22
    })

    setMousePos({
      x: x * 60, // Shift background elements up to 60px
      y: y * 60
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 })
    setMousePos({ x: 0, y: 0 })
  }

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setTransitioning(true)
    setTimeout(() => {
      router.push('/login')
    }, 750)
  }

  return (
    <main 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`perspective-container ${transitioning ? 'exit-portal-zoom' : ''}`}
      style={{ 
        minHeight: '100dvh', 
        width: '100vw',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative', 
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, #081010 0%, #020404 100%)',
        fontFamily: 'var(--font-body)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* 1. Cinematic 3D Floating Particles (Parallax Starfield) */}
      <div 
        className="preserve-3d" 
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: `translate3d(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px, -100px) scale(1.1)`,
          transition: 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }}
      >
        {/* Particle Stars at varying 3D depths */}
        {[
          { top: '10%', left: '20%', z: '50px', size: '4px', opacity: 0.3 },
          { top: '30%', left: '80%', z: '-80px', size: '6px', opacity: 0.25 },
          { top: '75%', left: '15%', z: '120px', size: '5px', opacity: 0.4 },
          { top: '80%', left: '85%', z: '-150px', size: '8px', opacity: 0.15 },
          { top: '20%', left: '70%', z: '90px', size: '3px', opacity: 0.5 },
          { top: '60%', left: '90%', z: '40px', size: '6px', opacity: 0.3 },
          { top: '85%', left: '40%', z: '-60px', size: '4px', opacity: 0.2 },
          { top: '15%', left: '45%', z: '150px', size: '5px', opacity: 0.4 }
        ].map((p, i) => (
          <div 
            key={i}
            className="orbit-node"
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              transform: `translateZ(${p.z})`
            }}
          />
        ))}
      </div>

      {/* 2. Technical Blueprint Background Grid */}
      <div className="fine-blueprint-grid" />

      {/* Glowing Ambient Dust */}
      <div className="glow-nebula" style={{ top: '20%', left: '25%', width: '500px', height: '500px', background: 'var(--primary)', opacity: 0.05 }} />
      <div className="glow-nebula" style={{ bottom: '20%', right: '25%', width: '500px', height: '500px', background: 'var(--secondary)', opacity: 0.05 }} />

      {/* 3. Immersive 3D Interactive Console (The Centerpiece) */}
      <div
        className="preserve-3d"
        style={{
          width: '100%',
          maxWidth: '820px',
          padding: '24px',
          zIndex: 10,
          transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: 'transform 0.15s ease-out'
        }}
      >
        <div
          className="preserve-3d"
          style={{
            background: 'rgba(10, 18, 18, 0.45)',
            border: '1px solid rgba(0, 242, 255, 0.15)',
            borderRadius: '32px',
            padding: '48px',
            boxShadow: '0 40px 80px rgba(0,0,0,0.7), inset 0 0 40px rgba(0, 242, 255, 0.03)',
            backdropFilter: 'blur(30px)',
            position: 'relative'
          }}
        >
          {/* Subtle Corner Tech Brackets (Professional CAD look) */}
          <div style={{ position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderLeft: '2px solid rgba(0,242,255,0.4)', borderTop: '2px solid rgba(0,242,255,0.4)' }} />
          <div style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderRight: '2px solid rgba(0,242,255,0.4)', borderTop: '2px solid rgba(0,242,255,0.4)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderLeft: '2px solid rgba(0,242,255,0.4)', borderBottom: '2px solid rgba(0,242,255,0.4)' }} />
          <div style={{ position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderRight: '2px solid rgba(0,242,255,0.4)', borderBottom: '2px solid rgba(0,242,255,0.4)' }} />

          {/* Background Concentric Dial */}
          <div 
            className="tech-dial-ring" 
            style={{
              width: '460px',
              height: '460px',
              border: '1px dashed rgba(0, 242, 255, 0.08)',
              animation: 'spin 45s linear infinite'
            }}
          />

          {/* Content Layout in 3D Depth Layers */}
          <div className="preserve-3d" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '32px' }}>
            
            {/* Top Tag: Floating at Z = 25px */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                transform: 'translateZ(25px)',
                background: 'rgba(0, 242, 255, 0.05)',
                border: '1px solid rgba(0, 242, 255, 0.15)',
                padding: '6px 16px',
                borderRadius: '99px'
              }}
            >
              <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
              <span className="label-caps" style={{ color: 'var(--primary)', letterSpacing: '0.22em', fontSize: '0.68rem', fontWeight: 800 }}>
                SECURE COGNITIVE CORE // ONLINE
              </span>
            </div>

            {/* Title: Floating at Z = 50px */}
            <div style={{ transform: 'translateZ(50px)' }}>
              <h1 style={{ 
                fontSize: '4rem', 
                fontWeight: 800, 
                letterSpacing: '-0.04em',
                lineHeight: 1,
                background: 'linear-gradient(180deg, #ffffff 40%, rgba(255,255,255,0.6) 100%)',
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--font-heading)'
              }}>
                STUDENT VERSE
              </h1>
              <div 
                style={{ 
                  fontFamily: 'var(--font-heading)', 
                  fontSize: '1rem', 
                  fontWeight: 400, 
                  color: 'var(--primary)', 
                  letterSpacing: '0.45em',
                  marginTop: '8px',
                  textTransform: 'uppercase'
                }}
              >
                Cognitive Mastery Engine
              </div>
            </div>

            {/* Description: Floating at Z = 35px */}
            <p style={{ 
              color: 'var(--on-surface-variant)', 
              fontSize: '0.95rem', 
              lineHeight: 1.6, 
              maxWidth: '480px',
              margin: 0,
              transform: 'translateZ(35px)'
            }}>
              An elite, high-performance portal mapping deep conceptual nodes. Calibrated to eliminate study gaps and accelerate retention metrics for JEE & NEET.
            </p>

            {/* Interactive Holographic CTA Button: Floating at Z = 70px */}
            <div style={{ transform: 'translateZ(70px)', marginTop: '8px' }}>
              <button 
                onClick={handleStart} 
                className="btn btn-primary"
                style={{ 
                  padding: '20px 48px', 
                  borderRadius: '12px', 
                  fontSize: '0.92rem', 
                  fontWeight: 900, 
                  background: 'var(--primary)', 
                  color: '#000', 
                  border: 'none', 
                  cursor: 'pointer', 
                  boxShadow: '0 0 35px rgba(0, 242, 255, 0.4), inset 0 -2px 0px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget
                  target.style.boxShadow = '0 0 50px rgba(0, 242, 255, 0.6), 0 0 15px rgba(220, 184, 255, 0.4)'
                  target.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget
                  target.style.boxShadow = '0 0 35px rgba(0, 242, 255, 0.4)'
                  target.style.transform = 'scale(1)'
                }}
              >
                INITIALIZE PORTAL SYNC
              </button>
            </div>

            {/* Dynamic Telemetry Footnotes (Stats Columns): Floating at Z = 40px */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 150px)', 
                gap: '32px', 
                borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                paddingTop: '28px',
                marginTop: '16px',
                transform: 'translateZ(40px)'
              }}
            >
              {[
                { label: 'COGNITIVE RESOLUTION', value: '4K PIXELS' },
                { label: 'CALIBRATION METRIC', value: 'OPTIMAL' },
                { label: 'CORE ENGAGEMENT', value: '99.2%' }
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--outline)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: '4px' }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Floating Data Modules (Additional Parallax Cards) */}
          
          {/* Card A: Diagnostics (Top Right, Z = 90px) */}
          <div
            className="preserve-3d"
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-60px',
              width: '180px',
              background: 'rgba(10, 15, 15, 0.85)',
              border: '1px solid rgba(0, 242, 255, 0.2)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              transform: 'translateZ(90px)',
              pointerEvents: 'none',
              display: 'none' // Hidden on smaller displays, shown in absolute media
            }}
            id="diag-card"
          >
            <div className="label-caps" style={{ color: 'var(--primary)', fontSize: '0.58rem', marginBottom: '6px' }}>SYSTEM HEALTH</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ width: '88%', height: '100%', background: 'var(--primary)' }} />
            </div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--on-surface-variant)', display: 'flex', justifyContent: 'space-between' }}>
              <span>CPU_LOAD</span>
              <span>12.4%</span>
            </div>
          </div>

          {/* Card B: Subjects (Bottom Left, Z = 110px) */}
          <div
            className="preserve-3d"
            style={{
              position: 'absolute',
              bottom: '-40px',
              left: '-60px',
              width: '200px',
              background: 'rgba(10, 15, 15, 0.85)',
              border: '1px solid rgba(220, 184, 255, 0.2)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              transform: 'translateZ(110px)',
              pointerEvents: 'none',
              display: 'none'
            }}
            id="sub-card"
          >
            <div className="label-caps" style={{ color: 'var(--secondary)', fontSize: '0.58rem', marginBottom: '8px' }}>CURRICULUM NODES</div>
            {['PHYSICS CORE', 'CHEMISTRY SYNC', 'MATHEMATICS MATRIX'].map((sub, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', fontFamily: 'monospace', color: '#fff', marginBottom: '4px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--secondary)' }} />
                <span>{sub}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* 4. Telemetry Terminal Feed */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '24px', 
          left: '24px', 
          right: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '0.72rem', 
          color: 'rgba(255, 255, 255, 0.25)', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
          paddingTop: '12px', 
          fontFamily: 'monospace',
          zIndex: 10 
        }}
      >
        <div>CORE STATE: ACTIVE_SYNAPSE</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>LATENCY: 0.12ms</span>
          <span>RESOLUTION: 1080p</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @media (min-width: 1024px) {
          #diag-card, #sub-card {
            display: block !important;
          }
        }
      `}</style>
    </main>
  )
}
