import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function runSQL(sql: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  })
  return res
}

// POST /api/seed-subtopics
export async function POST(_request: NextRequest) {
  try {
    // ── Step 1: Create tables via Supabase Management API ──────
    const mgmtRes = await fetch(
      `https://api.supabase.com/v1/projects/nsplxcljsvhifrzlluhw/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          query: `
            CREATE TABLE IF NOT EXISTS public.subtopics (
              id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              topic_id    UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
              name        TEXT NOT NULL,
              difficulty  TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
              order_num   INTEGER DEFAULT 1,
              created_at  TIMESTAMPTZ DEFAULT NOW(),
              UNIQUE(topic_id, name)
            );
            CREATE INDEX IF NOT EXISTS idx_subtopics_topic ON public.subtopics(topic_id);
            CREATE TABLE IF NOT EXISTS public.user_subtopic_progress (
              id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
              subtopic_id   UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
              is_completed  BOOLEAN DEFAULT FALSE,
              completed_at  TIMESTAMPTZ,
              created_at    TIMESTAMPTZ DEFAULT NOW(),
              UNIQUE(user_id, subtopic_id)
            );
            CREATE INDEX IF NOT EXISTS idx_user_subtopic_progress_user ON public.user_subtopic_progress(user_id);
            ALTER TABLE public.user_subtopic_progress ENABLE ROW LEVEL SECURITY;
          `
        }),
      }
    )

    if (!mgmtRes.ok) {
      const mgmtBody = await mgmtRes.text()
      console.log('Management API response:', mgmtBody)
      // Fall through — tables might already exist
    }

    // ── Step 2: Fetch all topics ───────────────────────────────
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: topics, error: topicsErr } = await admin
      .from('topics')
      .select('id, name')

    if (topicsErr) return errorResponse(`Failed to fetch topics: ${topicsErr.message}`)

    const byName = new Map<string, string>()
    for (const t of topics ?? []) byName.set(t.name, t.id)

    const rows: { topic_id: string; name: string; difficulty: string; order_num: number }[] = []

    const push = (topicName: string, subs: [string, string, number][]) => {
      const tid = byName.get(topicName)
      if (!tid) return
      for (const [name, diff, order] of subs) {
        rows.push({ topic_id: tid, name, difficulty: diff, order_num: order })
      }
    }

    // Physics
    push('Kinematics', [
      ['Distance vs Displacement', 'EASY', 1], ['Speed vs Velocity', 'EASY', 2],
      ['Uniform & Non-uniform Motion', 'EASY', 3], ['Equations of Motion (v, u, a, s)', 'MEDIUM', 4],
      ['Projectile Motion', 'MEDIUM', 5], ['Relative Motion', 'HARD', 6],
    ])
    push('Laws of Motion', [
      ["Newton's First Law (Inertia)", 'EASY', 1], ["Newton's Second Law (F = ma)", 'EASY', 2],
      ["Newton's Third Law", 'EASY', 3], ['Friction — Static & Kinetic', 'MEDIUM', 4],
      ['Circular Motion & Banking', 'HARD', 5], ['Pseudo Forces & Non-inertial Frames', 'HARD', 6],
    ])
    push('Work, Energy & Power', [
      ['Work Done by Constant Force', 'EASY', 1], ['Kinetic & Potential Energy', 'EASY', 2],
      ['Work-Energy Theorem', 'MEDIUM', 3], ['Conservation of Energy', 'MEDIUM', 4],
      ['Power & Efficiency', 'MEDIUM', 5], ['Elastic & Inelastic Collisions', 'HARD', 6],
    ])
    push('Rotational Motion', [
      ['Torque & Moment of Inertia', 'MEDIUM', 1], ['Angular Velocity & Acceleration', 'MEDIUM', 2],
      ['Parallel & Perpendicular Axis Theorem', 'HARD', 3], ['Rolling Motion', 'HARD', 4],
      ['Angular Momentum Conservation', 'HARD', 5],
    ])
    push('Gravitation', [
      ["Newton's Law of Gravitation", 'EASY', 1], ['Gravitational Field & Potential', 'MEDIUM', 2],
      ['Escape Velocity', 'MEDIUM', 3], ['Orbital Velocity & Satellites', 'MEDIUM', 4],
      ["Kepler's Laws", 'HARD', 5],
    ])
    push('Properties of Matter', [
      ['Elasticity — Stress & Strain', 'EASY', 1], ["Young's Modulus & Bulk Modulus", 'MEDIUM', 2],
      ['Surface Tension & Capillarity', 'MEDIUM', 3], ['Viscosity & Stokes Law', 'HARD', 4],
      ["Bernoulli's Theorem", 'HARD', 5],
    ])
    push('Thermodynamics', [
      ['Zeroth & First Law', 'EASY', 1], ['Isothermal & Adiabatic Processes', 'MEDIUM', 2],
      ['Second Law & Entropy', 'HARD', 3], ['Carnot Engine & Efficiency', 'HARD', 4],
      ['Specific Heats (Cp, Cv)', 'MEDIUM', 5],
    ])
    push('Electrostatics', [
      ["Coulomb's Law", 'EASY', 1], ['Electric Field & Field Lines', 'MEDIUM', 2],
      ["Gauss's Law", 'HARD', 3], ['Electric Potential & Potential Energy', 'HARD', 4],
      ['Capacitors & Dielectrics', 'HARD', 5],
    ])
    push('Current Electricity', [
      ["Ohm's Law & Resistance", 'EASY', 1], ['Kirchhoff Laws (KVL & KCL)', 'MEDIUM', 2],
      ['Wheatstone Bridge & Potentiometer', 'HARD', 3], ['Cells & Internal Resistance', 'MEDIUM', 4],
      ['Electric Power & Energy', 'EASY', 5],
    ])
    push('Magnetic Effects of Current', [
      ['Biot-Savart Law', 'HARD', 1], ["Ampere's Law", 'HARD', 2],
      ['Force on Current-Carrying Conductor', 'MEDIUM', 3], ['Moving Coil Galvanometer', 'MEDIUM', 4],
      ['Cyclotron', 'HARD', 5],
    ])
    push('Electromagnetic Induction', [
      ["Faraday's Laws of EMI", 'MEDIUM', 1], ['Lenz Law', 'EASY', 2],
      ['Self & Mutual Inductance', 'HARD', 3], ['AC Generator & Transformer', 'HARD', 4],
    ])
    push('Optics', [
      ['Reflection & Mirrors', 'EASY', 1], ["Refraction & Snell's Law", 'EASY', 2],
      ['Total Internal Reflection', 'MEDIUM', 3], ['Lenses & Lens Formula', 'MEDIUM', 4],
      ['Wave Optics — YDSE Interference', 'HARD', 5], ['Diffraction & Polarisation', 'HARD', 6],
    ])
    push('Modern Physics', [
      ['Photoelectric Effect', 'MEDIUM', 1], ['de Broglie Wavelength', 'MEDIUM', 2],
      ["Bohr's Atomic Model", 'HARD', 3], ['Nuclear Fission & Fusion', 'HARD', 4],
      ['Radioactivity & Half-life', 'MEDIUM', 5],
    ])
    push('Waves & Oscillations', [
      ['Simple Harmonic Motion (SHM)', 'MEDIUM', 1], ['Spring-Mass System & Pendulum', 'MEDIUM', 2],
      ['Resonance & Damping', 'HARD', 3], ['Stationary Waves & Beats', 'HARD', 4],
      ["Doppler's Effect", 'HARD', 5],
    ])

    // Chemistry
    push('Some Basic Concepts', [
      ["Mole Concept & Avogadro's Number", 'EASY', 1], ['Atomic Mass & Molecular Mass', 'EASY', 2],
      ['Empirical & Molecular Formula', 'MEDIUM', 3], ['Stoichiometry & Limiting Reagent', 'MEDIUM', 4],
      ['Concentration Terms (Molarity, Molality)', 'MEDIUM', 5], ['Laws of Chemical Combination', 'EASY', 6],
    ])
    push('Atomic Structure', [
      ['Rutherford & Bohr Model', 'EASY', 1], ['Quantum Numbers (n, l, m, s)', 'MEDIUM', 2],
      ["Aufbau, Pauli & Hund's Rule", 'MEDIUM', 3], ['Electronic Configuration', 'MEDIUM', 4],
      ["Heisenberg's Uncertainty Principle", 'HARD', 5], ['Shapes of Orbitals (s, p, d)', 'HARD', 6],
    ])
    push('Chemical Bonding', [
      ['Ionic Bond Formation', 'EASY', 1], ['Covalent Bond & Lewis Structures', 'MEDIUM', 2],
      ['VSEPR Theory & Geometry', 'MEDIUM', 3], ['Hybridization (sp, sp2, sp3)', 'HARD', 4],
      ['Molecular Orbital Theory', 'HARD', 5], ['Hydrogen Bonding', 'EASY', 6],
    ])
    push('Equilibrium', [
      ['Law of Mass Action & Kc, Kp', 'MEDIUM', 1], ["Le Chatelier's Principle", 'MEDIUM', 2],
      ['Acids, Bases & pH Scale', 'EASY', 3], ['Buffer Solutions', 'HARD', 4],
      ['Solubility Product (Ksp)', 'HARD', 5], ['Common Ion Effect', 'MEDIUM', 6],
    ])
    push('Electrochemistry', [
      ['Redox Reactions & Oxidation States', 'EASY', 1], ['Galvanic Cells & EMF', 'MEDIUM', 2],
      ['Nernst Equation', 'HARD', 3], ['Electrolysis & Faraday Laws', 'HARD', 4],
      ['Batteries & Corrosion', 'MEDIUM', 5],
    ])
    push('Organic Chemistry Basics', [
      ['Hybridization in Carbon', 'EASY', 1], ['IUPAC Nomenclature', 'MEDIUM', 2],
      ['Inductive & Resonance Effects', 'HARD', 3], ['Types of Reactions (SN1, SN2)', 'HARD', 4],
      ['Isomerism Overview', 'HARD', 5], ['Functional Groups', 'EASY', 6],
    ])
    push('Hydrocarbons', [
      ['Alkanes — Properties & Reactions', 'EASY', 1], ['Alkenes — Addition Reactions', 'MEDIUM', 2],
      ['Alkynes — Properties', 'MEDIUM', 3], ['Benzene & Aromaticity', 'HARD', 4],
      ['EAS Reactions', 'HARD', 5],
    ])
    push('Coordination Compounds', [
      ['Ligands & Coordination Number', 'EASY', 1], ['IUPAC Naming of Complexes', 'MEDIUM', 2],
      ['Crystal Field Theory (CFT)', 'HARD', 3], ['Isomerism in Complexes', 'HARD', 4],
    ])
    push('p-Block Elements', [
      ['Group 13 — Boron Family', 'MEDIUM', 1], ['Group 14 — Carbon Family', 'MEDIUM', 2],
      ['Group 15 — Nitrogen Family', 'HARD', 3], ['Group 16 — Oxygen & Sulphur', 'HARD', 4],
      ['Group 17 — Halogens', 'MEDIUM', 5], ['Group 18 — Noble Gases', 'EASY', 6],
    ])
    push('d & f Block Elements', [
      ['General Characteristics of Transition Metals', 'EASY', 1],
      ['Oxidation States & Colour', 'MEDIUM', 2], ['Magnetic Properties & Catalysis', 'HARD', 3],
      ['Lanthanides & Actinides', 'HARD', 4], ['KMnO4 & K2Cr2O7 Compounds', 'MEDIUM', 5],
    ])

    // Mathematics
    push('Sets, Relations & Functions', [
      ['Set Theory & Operations', 'EASY', 1], ['Types of Relations', 'MEDIUM', 2],
      ['Functions — Domain & Range', 'MEDIUM', 3], ['Inverse & Composite Functions', 'HARD', 4],
      ['Even & Odd Functions', 'EASY', 5],
    ])
    push('Complex Numbers', [
      ['Algebra of Complex Numbers', 'EASY', 1], ['Modulus & Argument', 'MEDIUM', 2],
      ["Polar Form & Euler's Formula", 'HARD', 3], ["De Moivre's Theorem", 'HARD', 4],
      ['Cube Roots of Unity', 'MEDIUM', 5],
    ])
    push('Quadratic Equations', [
      ['Discriminant & Nature of Roots', 'EASY', 1], ["Vieta's Formulas", 'MEDIUM', 2],
      ['Formation of Quadratic Equations', 'MEDIUM', 3], ['Quadratic Inequalities', 'HARD', 4],
    ])
    push('Sequences & Series', [
      ['Arithmetic Progression (AP)', 'EASY', 1], ['Geometric Progression (GP)', 'EASY', 2],
      ['Harmonic Progression (HP)', 'MEDIUM', 3], ['Sum of Infinite GP', 'MEDIUM', 4],
      ['Special Series', 'HARD', 5],
    ])
    push('Permutations & Combinations', [
      ['Fundamental Principle of Counting', 'EASY', 1], ['Permutations nPr', 'MEDIUM', 2],
      ['Combinations nCr', 'MEDIUM', 3], ['Circular Permutations', 'HARD', 4],
    ])
    push('Binomial Theorem', [
      ['Binomial Expansion', 'EASY', 1], ['General Term & Middle Term', 'MEDIUM', 2],
      ['Coefficient Problems', 'HARD', 3],
    ])
    push('Coordinate Geometry', [
      ['Straight Lines — Slope & Forms', 'EASY', 1], ['Circle — Equation & Properties', 'MEDIUM', 2],
      ['Parabola & Its Properties', 'HARD', 3], ['Ellipse & Hyperbola', 'HARD', 4],
      ['Tangent & Normal to Conics', 'HARD', 5],
    ])
    push('Limits & Continuity', [
      ['Concept of a Limit', 'EASY', 1], ["L'Hôpital's Rule", 'HARD', 2],
      ['Standard Limits', 'MEDIUM', 3], ['Continuity & Differentiability', 'HARD', 4],
    ])
    push('Differentiation', [
      ['First Principles & Basic Derivatives', 'EASY', 1],
      ['Chain, Product & Quotient Rule', 'MEDIUM', 2], ['Implicit Differentiation', 'HARD', 3],
      ['Applications — Maxima & Minima', 'HARD', 4],
    ])
    push('Integration', [
      ['Standard Integrals', 'EASY', 1], ['Integration by Substitution', 'MEDIUM', 2],
      ['Integration by Parts', 'HARD', 3], ['Partial Fractions', 'HARD', 4],
      ['Definite Integrals', 'HARD', 5], ['Area Under Curves', 'HARD', 6],
    ])
    push('Differential Equations', [
      ['Order & Degree', 'EASY', 1], ['Variable Separable Method', 'MEDIUM', 2],
      ['Homogeneous Equations', 'HARD', 3], ['Linear Differential Equations', 'HARD', 4],
    ])
    push('Vectors & 3D', [
      ['Vector Addition & Scalar Multiplication', 'EASY', 1],
      ['Dot Product & Cross Product', 'MEDIUM', 2], ['Lines & Planes in 3D', 'HARD', 3],
      ['Shortest Distance Between Lines', 'HARD', 4],
    ])
    push('Probability', [
      ['Basic Probability & Sample Spaces', 'EASY', 1], ['Conditional Probability', 'MEDIUM', 2],
      ["Bayes' Theorem", 'HARD', 3], ['Binomial Distribution', 'HARD', 4],
    ])
    push('Matrices & Determinants', [
      ['Matrix Operations', 'EASY', 1], ['Determinant & Properties', 'MEDIUM', 2],
      ['Inverse of a Matrix', 'HARD', 3], ["Cramer's Rule", 'HARD', 4],
    ])
    push('Trigonometry', [
      ['Trigonometric Ratios & Identities', 'EASY', 1], ['Compound Angles', 'MEDIUM', 2],
      ['Multiple & Sub-multiple Angles', 'MEDIUM', 3], ['Inverse Trigonometric Functions', 'HARD', 4],
      ['Trigonometric Equations', 'HARD', 5],
    ])

    if (rows.length === 0) {
      return errorResponse('No matching topics found in DB', 404)
    }

    // ── Step 3: Check what's already seeded ────────────────────
    const { data: existing, error: existErr } = await admin
      .from('subtopics' as never)
      .select('topic_id, name')

    if (existErr) {
      if ((existErr as { code?: string }).code === '42P01') {
        return errorResponse('subtopics table missing — run supabase/subtopics_migration.sql first', 503)
      }
      return errorResponse(`Check existing error: ${existErr.message}`)
    }

    const existingSet = new Set(
      ((existing as { topic_id: string; name: string }[]) || []).map(
        e => `${e.topic_id}::${e.name}`
      )
    )

    const newRows = rows.filter(r => !existingSet.has(`${r.topic_id}::${r.name}`))

    if (newRows.length === 0) {
      return successResponse({ message: `Already seeded ${rows.length} subtopics — nothing new to add!`, inserted: 0 })
    }

    // ── Step 4: Insert only new rows in batches ─────────────────
    const BATCH = 50
    let inserted = 0
    for (let i = 0; i < newRows.length; i += BATCH) {
      const batch = newRows.slice(i, i + BATCH)
      const { error } = await admin
        .from('subtopics' as never)
        .insert(batch as never)

      if (error) {
        return errorResponse(`Insert error: ${error.message} (code: ${(error as { code?: string }).code})`)
      }
      inserted += batch.length
    }

    return successResponse({ message: `Seeded ${inserted} subtopics!`, inserted })
  } catch (err) {
    console.error('Seed error:', err)
    return errorResponse(`Seed failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
