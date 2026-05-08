'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import BottomNav from '@/components/BottomNav'
import { compile } from 'mathjs'

// --- Mathematical Surfaces ---
type SurfaceDef = {
  id: string
  name: string
  subject: string
  formula: string
  desc: string
  color: string
  calc: (x: number, y: number, t: number) => number
  isCustom?: boolean
}

const DEFAULT_SURFACES: SurfaceDef[] = [
  {
    id: 'ripple',
    name: 'Interference Ripple',
    subject: 'Physics',
    formula: 'sin(10*sqrt(x^2 + y^2) - t*3)*0.15*exp(-sqrt(x^2 + y^2)*1.5)',
    desc: 'Shows how waves propagate outward from a central point. The (- t) term animates it.',
    color: '#00F2FF',
    calc: (x, y, t) => {
      const d = Math.sqrt(x * x + y * y)
      return Math.sin(10 * d - t * 3) * 0.15 * Math.exp(-d * 1.5)
    }
  },
  {
    id: 'standing',
    name: '2D Standing Wave',
    subject: 'Physics',
    formula: 'sin(pi*x*2) * sin(pi*y*2) * cos(t*3) * 0.25',
    desc: 'A wave fixed at boundaries oscillating up and down (e.g., drum heads).',
    color: '#ff8c00',
    calc: (x, y, t) => Math.sin(Math.PI * x * 2) * Math.sin(Math.PI * y * 2) * Math.cos(t * 3) * 0.25
  },
  {
    id: 'saddle',
    name: 'Hyperbolic Paraboloid',
    subject: 'Mathematics',
    formula: 'x^2 - y^2',
    desc: 'A classic "saddle" shape. Origin is a minimax point (minimum along x, max along y).',
    color: '#dcb8ff',
    calc: (x, y, t) => {
      const rx = x * Math.cos(t * 0.5) - y * Math.sin(t * 0.5)
      const ry = x * Math.sin(t * 0.5) + y * Math.cos(t * 0.5)
      return (rx * rx - ry * ry) * 0.8
    }
  },
  {
    id: 'custom',
    name: 'Custom Equation',
    subject: 'Playground',
    formula: 'sin(x*5 + t) * cos(y*5 + t) * 0.2',
    desc: 'Write your own z = f(x, y, t) function. Use x, y, and t (time).',
    color: '#ff6464',
    isCustom: true,
    calc: (x, y, t) => Math.sin(x * 5 + t) * Math.cos(y * 5 + t) * 0.2
  }
]

// --- Surface Mesh Component ---
function AnimatedSurface({ calcFn, color }: { calcFn: (x: number, y: number, t: number) => number, color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryRef = useRef<THREE.PlaneGeometry>(null)
  const res = 100 // 100x100 grid

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!geometryRef.current) return
    const positions = geometryRef.current.attributes.position
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      try {
        const z = calcFn(x, y, t)
        // Clamp z to prevent infinite/NaN from breaking the mesh completely
        positions.setZ(i, Number.isFinite(z) ? Math.max(-5, Math.min(5, z)) : 0)
      } catch {
        positions.setZ(i, 0)
      }
    }
    positions.needsUpdate = true
    geometryRef.current.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry ref={geometryRef} args={[2, 2, res, res]} />
      <meshStandardMaterial 
        color={color} side={THREE.DoubleSide}
        roughness={0.2} metalness={0.8}
        emissive={color} emissiveIntensity={0.2}
      />
    </mesh>
  )
}

function WireframeSurface({ calcFn }: { calcFn: (x: number, y: number, t: number) => number }) {
  const geometryRef = useRef<THREE.PlaneGeometry>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!geometryRef.current) return
    const positions = geometryRef.current.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      try {
        const z = calcFn(x, y, t)
        positions.setZ(i, Number.isFinite(z) ? Math.max(-5, Math.min(5, z)) : 0)
      } catch {
        positions.setZ(i, 0)
      }
    }
    positions.needsUpdate = true
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry ref={geometryRef} args={[2, 2, 30, 30]} />
      <meshBasicMaterial color="#ffffff" wireframe={true} transparent={true} opacity={0.15} />
    </mesh>
  )
}

// --- Main Page ---
export default function VisualizePage() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const current = DEFAULT_SURFACES[selectedIdx]
  
  // Custom Equation State
  const [customInput, setCustomInput] = useState(DEFAULT_SURFACES[3].formula)
  const [errorMsg, setErrorMsg] = useState('')
  
  // Create a compiled function for the custom math
  const customCalc = useMemo(() => {
    if (!current.isCustom) return current.calc
    try {
      const compiled = compile(customInput)
      // Test the evaluation to catch errors early
      compiled.evaluate({ x: 0, y: 0, t: 0 })
      setErrorMsg('')
      return (x: number, y: number, t: number) => compiled.evaluate({ x, y, t })
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid equation')
      return () => 0 // fallback flat plane
    }
  }, [customInput, current.isCustom, current.calc])

  // Current calculation function to pass to the canvas
  const activeCalc = current.isCustom ? customCalc : current.calc

  return (
    <div className="page" style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Info */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '28px 20px 20px', pointerEvents: 'none' }}>
        <h2 style={{ marginBottom: '4px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Visualizer 3D 🌌</h2>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          Interact with physics and math formulas in real-time
        </p>
      </div>

      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle at center, #1a222a 0%, #050505 100%)' }}>
        <Canvas camera={{ position: [2, 1.5, 2], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color={current.color} />
          
          <AnimatedSurface calcFn={activeCalc} color={current.color} />
          <WireframeSurface calcFn={activeCalc} />
          
          <OrbitControls enablePan={false} enableZoom={true} minDistance={1.5} maxDistance={5} autoRotate={!current.isCustom} autoRotateSpeed={0.5} />
          <gridHelper args={[2, 10, '#ffffff', '#ffffff']} material-opacity={0.1} material-transparent />
          <axesHelper args={[1.5]} />
        </Canvas>
      </div>

      {/* Controls / Info Bottom Panel */}
      <div style={{
        position: 'absolute', bottom: '80px', left: '16px', right: '16px',
        background: 'rgba(20, 25, 26, 0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-xl)',
        padding: '20px', zIndex: 10, boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
      }}>
        
        {/* Selector Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {DEFAULT_SURFACES.map((surf, i) => (
            <button
              key={surf.id} onClick={() => setSelectedIdx(i)}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 600,
                border: i === selectedIdx ? `1px solid ${surf.color}` : '1px solid transparent',
                background: i === selectedIdx ? `${surf.color}15` : 'rgba(255,255,255,0.05)',
                color: i === selectedIdx ? surf.color : 'var(--on-surface-variant)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {surf.name}
            </button>
          ))}
        </div>

        {/* Current Info */}
        <div style={{ animation: 'fadeIn 0.3s ease' }} key={current.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', background: `${current.color}20`, color: current.color, padding: '2px 8px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>
              {current.subject}
            </span>
            {errorMsg && <span style={{ color: '#ff6464', fontSize: '10px', fontWeight: 700 }}>⚠️ {errorMsg}</span>}
          </div>
          
          {current.isCustom ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'monospace', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>z =</span>
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="e.g. sin(x*5 + t)"
                style={{
                  flex: 1, background: 'rgba(0,0,0,0.4)', border: `1px solid ${errorMsg ? '#ff6464' : 'var(--glass-border)'}`,
                  color: '#fff', fontFamily: 'monospace', fontSize: '1rem', padding: '8px 12px',
                  borderRadius: 'var(--radius-md)', outline: 'none'
                }}
              />
            </div>
          ) : (
            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#fff', fontWeight: 700, marginBottom: '8px' }}>
              z = {current.formula}
            </div>
          )}
          
          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, margin: 0 }}>
            {current.desc}
          </p>
        </div>

      </div>
      <BottomNav />
    </div>
  )
}
