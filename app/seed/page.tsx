'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SeedPage() {
  const [log, setLog] = useState<string[]>(['Ready to seed subtopics...'])
  const [done, setDone] = useState(false)
  const [running, setRunning] = useState(false)

  const addLog = (msg: string) => setLog(p => [...p, msg])

  const seed = async () => {
    setRunning(true)
    setLog(['🚀 Starting seed...'])

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('sv_token') ?? ''
      if (!token) { addLog('❌ Not logged in. Please login first then come back.'); setRunning(false); return }

      // Step 1: fetch topics
      addLog('📡 Fetching topics...')
      const { data: topics, error: tErr } = await supabase.from('topics').select('id, name')
      if (tErr) { addLog(`❌ Topics error: ${tErr.message}`); setRunning(false); return }
      addLog(`✅ Found ${topics?.length ?? 0} topics`)

      const byName = new Map<string, string>()
      for (const t of topics ?? []) byName.set(t.name, t.id)

      const rows: { topic_id: string; name: string; difficulty: string; order_num: number }[] = []
      const push = (topicName: string, subs: [string, string, number][]) => {
        const tid = byName.get(topicName); if (!tid) return
        for (const [name, diff, order] of subs) rows.push({ topic_id: tid, name, difficulty: diff, order_num: order })
      }

      // Physics
      push('Kinematics', [['Distance vs Displacement','EASY',1],['Speed vs Velocity','EASY',2],['Uniform & Non-uniform Motion','EASY',3],['Equations of Motion (v, u, a, s)','MEDIUM',4],['Projectile Motion','MEDIUM',5],['Relative Motion','HARD',6]])
      push('Laws of Motion', [["Newton's First Law (Inertia)",'EASY',1],["Newton's Second Law (F = ma)",'EASY',2],["Newton's Third Law",'EASY',3],['Friction — Static & Kinetic','MEDIUM',4],['Circular Motion & Banking','HARD',5],['Pseudo Forces & Non-inertial Frames','HARD',6]])
      push('Work, Energy & Power', [['Work Done by Constant Force','EASY',1],['Kinetic & Potential Energy','EASY',2],['Work-Energy Theorem','MEDIUM',3],['Conservation of Energy','MEDIUM',4],['Power & Efficiency','MEDIUM',5],['Elastic & Inelastic Collisions','HARD',6]])
      push('Rotational Motion', [['Torque & Moment of Inertia','MEDIUM',1],['Angular Velocity & Acceleration','MEDIUM',2],['Parallel & Perpendicular Axis Theorem','HARD',3],['Rolling Motion','HARD',4],['Angular Momentum Conservation','HARD',5]])
      push('Gravitation', [["Newton's Law of Gravitation",'EASY',1],['Gravitational Field & Potential','MEDIUM',2],['Escape Velocity','MEDIUM',3],['Orbital Velocity & Satellites','MEDIUM',4],["Kepler's Laws",'HARD',5]])
      push('Properties of Matter', [['Elasticity — Stress & Strain','EASY',1],["Young's Modulus & Bulk Modulus",'MEDIUM',2],['Surface Tension & Capillarity','MEDIUM',3],['Viscosity & Stokes Law','HARD',4],["Bernoulli's Theorem",'HARD',5]])
      push('Thermodynamics', [['Zeroth & First Law','EASY',1],['Isothermal & Adiabatic Processes','MEDIUM',2],['Second Law & Entropy','HARD',3],['Carnot Engine & Efficiency','HARD',4],['Specific Heats (Cp, Cv)','MEDIUM',5]])
      push('Electrostatics', [["Coulomb's Law",'EASY',1],['Electric Field & Field Lines','MEDIUM',2],["Gauss's Law",'HARD',3],['Electric Potential & Potential Energy','HARD',4],['Capacitors & Dielectrics','HARD',5]])
      push('Current Electricity', [["Ohm's Law & Resistance",'EASY',1],['Kirchhoff Laws (KVL & KCL)','MEDIUM',2],['Wheatstone Bridge & Potentiometer','HARD',3],['Cells & Internal Resistance','MEDIUM',4],['Electric Power & Energy','EASY',5]])
      push('Magnetic Effects of Current', [['Biot-Savart Law','HARD',1],["Ampere's Law",'HARD',2],['Force on Current-Carrying Conductor','MEDIUM',3],['Moving Coil Galvanometer','MEDIUM',4],['Cyclotron','HARD',5]])
      push('Electromagnetic Induction', [["Faraday's Laws of EMI",'MEDIUM',1],['Lenz Law','EASY',2],['Self & Mutual Inductance','HARD',3],['AC Generator & Transformer','HARD',4]])
      push('Optics', [['Reflection & Mirrors','EASY',1],["Refraction & Snell's Law",'EASY',2],['Total Internal Reflection','MEDIUM',3],['Lenses & Lens Formula','MEDIUM',4],['Wave Optics — YDSE Interference','HARD',5],['Diffraction & Polarisation','HARD',6]])
      push('Modern Physics', [['Photoelectric Effect','MEDIUM',1],['de Broglie Wavelength','MEDIUM',2],["Bohr's Atomic Model",'HARD',3],['Nuclear Fission & Fusion','HARD',4],['Radioactivity & Half-life','MEDIUM',5]])
      push('Waves & Oscillations', [['Simple Harmonic Motion (SHM)','MEDIUM',1],['Spring-Mass System & Pendulum','MEDIUM',2],['Resonance & Damping','HARD',3],['Stationary Waves & Beats','HARD',4],["Doppler's Effect",'HARD',5]])

      // Chemistry
      push('Some Basic Concepts', [["Mole Concept & Avogadro's Number",'EASY',1],['Atomic Mass & Molecular Mass','EASY',2],['Empirical & Molecular Formula','MEDIUM',3],['Stoichiometry & Limiting Reagent','MEDIUM',4],['Concentration Terms (Molarity, Molality)','MEDIUM',5],['Laws of Chemical Combination','EASY',6]])
      push('Atomic Structure', [['Rutherford & Bohr Model','EASY',1],['Quantum Numbers (n, l, m, s)','MEDIUM',2],["Aufbau, Pauli & Hund's Rule",'MEDIUM',3],['Electronic Configuration','MEDIUM',4],["Heisenberg's Uncertainty Principle",'HARD',5],['Shapes of Orbitals (s, p, d)','HARD',6]])
      push('Chemical Bonding', [['Ionic Bond Formation','EASY',1],['Covalent Bond & Lewis Structures','MEDIUM',2],['VSEPR Theory & Geometry','MEDIUM',3],['Hybridization (sp, sp2, sp3)','HARD',4],['Molecular Orbital Theory','HARD',5],['Hydrogen Bonding','EASY',6]])
      push('Equilibrium', [['Law of Mass Action & Kc, Kp','MEDIUM',1],["Le Chatelier's Principle",'MEDIUM',2],['Acids, Bases & pH Scale','EASY',3],['Buffer Solutions','HARD',4],['Solubility Product (Ksp)','HARD',5],['Common Ion Effect','MEDIUM',6]])
      push('Electrochemistry', [['Redox Reactions & Oxidation States','EASY',1],['Galvanic Cells & EMF','MEDIUM',2],['Nernst Equation','HARD',3],['Electrolysis & Faraday Laws','HARD',4],['Batteries & Corrosion','MEDIUM',5]])
      push('Organic Chemistry Basics', [['Hybridization in Carbon','EASY',1],['IUPAC Nomenclature','MEDIUM',2],['Inductive & Resonance Effects','HARD',3],['Types of Reactions (SN1, SN2)','HARD',4],['Isomerism Overview','HARD',5],['Functional Groups','EASY',6]])
      push('Hydrocarbons', [['Alkanes — Properties & Reactions','EASY',1],['Alkenes — Addition Reactions','MEDIUM',2],['Alkynes — Properties','MEDIUM',3],['Benzene & Aromaticity','HARD',4],['EAS Reactions','HARD',5]])
      push('Coordination Compounds', [['Ligands & Coordination Number','EASY',1],['IUPAC Naming of Complexes','MEDIUM',2],['Crystal Field Theory (CFT)','HARD',3],['Isomerism in Complexes','HARD',4]])
      push('p-Block Elements', [['Group 13 — Boron Family','MEDIUM',1],['Group 14 — Carbon Family','MEDIUM',2],['Group 15 — Nitrogen Family','HARD',3],['Group 16 — Oxygen & Sulphur','HARD',4],['Group 17 — Halogens','MEDIUM',5],['Group 18 — Noble Gases','EASY',6]])
      push('d & f Block Elements', [['General Characteristics of Transition Metals','EASY',1],['Oxidation States & Colour','MEDIUM',2],['Magnetic Properties & Catalysis','HARD',3],['Lanthanides & Actinides','HARD',4],['KMnO4 & K2Cr2O7 Compounds','MEDIUM',5]])

      // Mathematics
      push('Sets, Relations & Functions', [['Set Theory & Operations','EASY',1],['Types of Relations','MEDIUM',2],['Functions — Domain & Range','MEDIUM',3],['Inverse & Composite Functions','HARD',4],['Even & Odd Functions','EASY',5]])
      push('Complex Numbers', [['Algebra of Complex Numbers','EASY',1],['Modulus & Argument','MEDIUM',2],["Polar Form & Euler's Formula",'HARD',3],["De Moivre's Theorem",'HARD',4],['Cube Roots of Unity','MEDIUM',5]])
      push('Quadratic Equations', [['Discriminant & Nature of Roots','EASY',1],["Vieta's Formulas",'MEDIUM',2],['Formation of Quadratic Equations','MEDIUM',3],['Quadratic Inequalities','HARD',4]])
      push('Sequences & Series', [['Arithmetic Progression (AP)','EASY',1],['Geometric Progression (GP)','EASY',2],['Harmonic Progression (HP)','MEDIUM',3],['Sum of Infinite GP','MEDIUM',4],['Special Series','HARD',5]])
      push('Permutations & Combinations', [['Fundamental Principle of Counting','EASY',1],['Permutations nPr','MEDIUM',2],['Combinations nCr','MEDIUM',3],['Circular Permutations','HARD',4]])
      push('Binomial Theorem', [['Binomial Expansion','EASY',1],['General Term & Middle Term','MEDIUM',2],['Coefficient Problems','HARD',3]])
      push('Coordinate Geometry', [['Straight Lines — Slope & Forms','EASY',1],['Circle — Equation & Properties','MEDIUM',2],['Parabola & Its Properties','HARD',3],['Ellipse & Hyperbola','HARD',4],['Tangent & Normal to Conics','HARD',5]])
      push('Limits & Continuity', [['Concept of a Limit','EASY',1],["L'Hôpital's Rule",'HARD',2],['Standard Limits','MEDIUM',3],['Continuity & Differentiability','HARD',4]])
      push('Differentiation', [['First Principles & Basic Derivatives','EASY',1],['Chain, Product & Quotient Rule','MEDIUM',2],['Implicit Differentiation','HARD',3],['Applications — Maxima & Minima','HARD',4]])
      push('Integration', [['Standard Integrals','EASY',1],['Integration by Substitution','MEDIUM',2],['Integration by Parts','HARD',3],['Partial Fractions','HARD',4],['Definite Integrals','HARD',5],['Area Under Curves','HARD',6]])
      push('Differential Equations', [['Order & Degree','EASY',1],['Variable Separable Method','MEDIUM',2],['Homogeneous Equations','HARD',3],['Linear Differential Equations','HARD',4]])
      push('Vectors & 3D', [['Vector Addition & Scalar Multiplication','EASY',1],['Dot Product & Cross Product','MEDIUM',2],['Lines & Planes in 3D','HARD',3],['Shortest Distance Between Lines','HARD',4]])
      push('Probability', [['Basic Probability & Sample Spaces','EASY',1],['Conditional Probability','MEDIUM',2],["Bayes' Theorem",'HARD',3],['Binomial Distribution','HARD',4]])
      push('Matrices & Determinants', [['Matrix Operations','EASY',1],['Determinant & Properties','MEDIUM',2],['Inverse of a Matrix','HARD',3],["Cramer's Rule",'HARD',4]])
      push('Trigonometry', [['Trigonometric Ratios & Identities','EASY',1],['Compound Angles','MEDIUM',2],['Multiple & Sub-multiple Angles','MEDIUM',3],['Inverse Trigonometric Functions','HARD',4],['Trigonometric Equations','HARD',5]])

      addLog(`📊 Total subtopics to seed: ${rows.length}`)

      // Step 2: check existing
      addLog('🔍 Checking existing subtopics...')
      const { data: existing } = await supabase.from('subtopics').select('topic_id, name')
      const existingSet = new Set((existing ?? []).map((e: {topic_id:string;name:string}) => `${e.topic_id}::${e.name}`))
      const newRows = rows.filter(r => !existingSet.has(`${r.topic_id}::${r.name}`))
      addLog(`✅ Already in DB: ${existingSet.size}, New to insert: ${newRows.length}`)

      if (newRows.length === 0) {
        addLog('🎉 All subtopics already seeded!')
        setDone(true); setRunning(false); return
      }

      // Step 3: insert in batches of 20
      const BATCH = 20
      for (let i = 0; i < newRows.length; i += BATCH) {
        const batch = newRows.slice(i, i + BATCH)
        const { error } = await supabase.from('subtopics').insert(batch)
        if (error) {
          addLog(`❌ Insert error at batch ${Math.floor(i/BATCH)+1}: ${error.message}`)
          setRunning(false); return
        }
        addLog(`✅ Inserted batch ${Math.floor(i/BATCH)+1}/${Math.ceil(newRows.length/BATCH)} (${Math.min(i+BATCH, newRows.length)}/${newRows.length})`)
      }

      addLog(`🎉 Done! Seeded ${newRows.length} subtopics.`)
      addLog('👉 Go back to /learn and tap any chapter to see subtopics!')
      setDone(true)
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        maxWidth: '480px', width: '100%',
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-xl)', padding: '32px',
        backdropFilter: 'var(--glass-blur)',
      }}>
        <h2 style={{ marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
          🌱 Seed Subtopics
        </h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', marginBottom: '24px' }}>
          This will insert all chapter subtopics into your Supabase database. Only needs to be run once.
        </p>

        {!done && (
          <button
            onClick={seed}
            disabled={running}
            className="btn btn-primary btn-full"
            style={{ marginBottom: '20px' }}
          >
            {running ? '⏳ Seeding...' : '🚀 Run Seed Now'}
          </button>
        )}

        {done && (
          <a href="/learn" className="btn btn-primary btn-full" style={{ marginBottom: '20px', display: 'block', textAlign: 'center' }}>
            ✅ Go to Learn Page →
          </a>
        )}

        {/* Log */}
        <div style={{
          background: '#080f10', borderRadius: 'var(--radius-md)', padding: '16px',
          fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.8',
          maxHeight: '280px', overflowY: 'auto',
        }}>
          {log.map((line, i) => (
            <div key={i} style={{
              color: line.startsWith('❌') ? 'var(--error)' : line.startsWith('🎉') ? 'var(--success)' : 'var(--on-surface-variant)'
            }}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
