import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seed() {
  console.log('Seeding subjects...')
  const subjects = [
    { name: 'Physics', icon: '⚛️', color: '#00F2FF', exam_type: 'JEE', total_topics: 20 },
    { name: 'Chemistry', icon: '🧪', color: '#9B59B6', exam_type: 'JEE', total_topics: 22 },
    { name: 'Mathematics', icon: '📐', color: '#F39C12', exam_type: 'JEE', total_topics: 25 },
    { name: 'Biology', icon: '🧬', color: '#2ECC71', exam_type: 'NEET', total_topics: 18 },
    { name: 'Physical Chemistry', icon: '🔬', color: '#E74C3C', exam_type: 'JEE', total_topics: 12 }
  ]
  
  for (const s of subjects) {
    const { error } = await supabase.from('subjects').insert(s).select('id')
    // ignore conflict errors
    if (error && !error.message.includes('duplicate')) {
      console.log('Error inserting subject', s.name, error)
    }
  }

  const { data: dbSubjects } = await supabase.from('subjects').select('id, name')
  const physicsId = dbSubjects.find(s => s.name === 'Physics')?.id
  const chemistryId = dbSubjects.find(s => s.name === 'Chemistry')?.id
  const mathId = dbSubjects.find(s => s.name === 'Mathematics')?.id

  if (!physicsId || !chemistryId || !mathId) {
    console.error('Could not find subject IDs!')
    return
  }

  const topics = [
    // Physics
    { subject_id: physicsId, name: 'Kinematics', difficulty: 'EASY', weightage: 8, chapter_num: 1 },
    { subject_id: physicsId, name: 'Laws of Motion', difficulty: 'MEDIUM', weightage: 10, chapter_num: 2 },
    { subject_id: physicsId, name: 'Work, Energy & Power', difficulty: 'MEDIUM', weightage: 8, chapter_num: 3 },
    { subject_id: physicsId, name: 'Rotational Motion', difficulty: 'HARD', weightage: 10, chapter_num: 4 },
    { subject_id: physicsId, name: 'Gravitation', difficulty: 'MEDIUM', weightage: 6, chapter_num: 5 },
    { subject_id: physicsId, name: 'Properties of Matter', difficulty: 'EASY', weightage: 5, chapter_num: 6 },
    { subject_id: physicsId, name: 'Thermodynamics', difficulty: 'HARD', weightage: 10, chapter_num: 7 },
    { subject_id: physicsId, name: 'Electrostatics', difficulty: 'HARD', weightage: 12, chapter_num: 8 },
    { subject_id: physicsId, name: 'Current Electricity', difficulty: 'MEDIUM', weightage: 10, chapter_num: 9 },
    { subject_id: physicsId, name: 'Magnetic Effects of Current', difficulty: 'HARD', weightage: 10, chapter_num: 10 },
    { subject_id: physicsId, name: 'Electromagnetic Induction', difficulty: 'HARD', weightage: 8, chapter_num: 11 },
    { subject_id: physicsId, name: 'Optics', difficulty: 'MEDIUM', weightage: 10, chapter_num: 12 },
    { subject_id: physicsId, name: 'Modern Physics', difficulty: 'HARD', weightage: 12, chapter_num: 13 },
    { subject_id: physicsId, name: 'Waves & Oscillations', difficulty: 'MEDIUM', weightage: 8, chapter_num: 14 },
    // Chemistry
    { subject_id: chemistryId, name: 'Some Basic Concepts', difficulty: 'EASY', weightage: 4, chapter_num: 1 },
    { subject_id: chemistryId, name: 'Atomic Structure', difficulty: 'MEDIUM', weightage: 6, chapter_num: 2 },
    { subject_id: chemistryId, name: 'Chemical Bonding', difficulty: 'MEDIUM', weightage: 8, chapter_num: 3 },
    { subject_id: chemistryId, name: 'Thermodynamics', difficulty: 'HARD', weightage: 8, chapter_num: 4 },
    { subject_id: chemistryId, name: 'Equilibrium', difficulty: 'HARD', weightage: 8, chapter_num: 5 },
    { subject_id: chemistryId, name: 'Electrochemistry', difficulty: 'HARD', weightage: 8, chapter_num: 6 },
    { subject_id: chemistryId, name: 'Organic Chemistry Basics', difficulty: 'MEDIUM', weightage: 6, chapter_num: 7 },
    { subject_id: chemistryId, name: 'Hydrocarbons', difficulty: 'EASY', weightage: 6, chapter_num: 8 },
    { subject_id: chemistryId, name: 'Coordination Compounds', difficulty: 'HARD', weightage: 8, chapter_num: 9 },
    { subject_id: chemistryId, name: 'p-Block Elements', difficulty: 'MEDIUM', weightage: 8, chapter_num: 10 },
    { subject_id: chemistryId, name: 'd & f Block Elements', difficulty: 'MEDIUM', weightage: 6, chapter_num: 11 },
    // Mathematics
    { subject_id: mathId, name: 'Sets, Relations & Functions', difficulty: 'EASY', weightage: 4, chapter_num: 1 },
    { subject_id: mathId, name: 'Complex Numbers', difficulty: 'MEDIUM', weightage: 6, chapter_num: 2 },
    { subject_id: mathId, name: 'Quadratic Equations', difficulty: 'MEDIUM', weightage: 6, chapter_num: 3 },
    { subject_id: mathId, name: 'Sequences & Series', difficulty: 'MEDIUM', weightage: 6, chapter_num: 4 },
    { subject_id: mathId, name: 'Permutations & Combinations', difficulty: 'MEDIUM', weightage: 6, chapter_num: 5 },
    { subject_id: mathId, name: 'Binomial Theorem', difficulty: 'EASY', weightage: 4, chapter_num: 6 },
    { subject_id: mathId, name: 'Coordinate Geometry', difficulty: 'HARD', weightage: 10, chapter_num: 7 },
    { subject_id: mathId, name: 'Limits & Continuity', difficulty: 'HARD', weightage: 8, chapter_num: 8 },
    { subject_id: mathId, name: 'Differentiation', difficulty: 'HARD', weightage: 8, chapter_num: 9 },
    { subject_id: mathId, name: 'Integration', difficulty: 'HARD', weightage: 12, chapter_num: 10 },
    { subject_id: mathId, name: 'Differential Equations', difficulty: 'HARD', weightage: 6, chapter_num: 11 },
    { subject_id: mathId, name: 'Vectors & 3D', difficulty: 'MEDIUM', weightage: 8, chapter_num: 12 },
    { subject_id: mathId, name: 'Probability', difficulty: 'MEDIUM', weightage: 8, chapter_num: 13 },
    { subject_id: mathId, name: 'Matrices & Determinants', difficulty: 'MEDIUM', weightage: 6, chapter_num: 14 },
    { subject_id: mathId, name: 'Trigonometry', difficulty: 'MEDIUM', weightage: 8, chapter_num: 15 }
  ]

  console.log('Seeding topics...')
  for (let i = 0; i < topics.length; i += 10) {
    const batch = topics.slice(i, i + 10)
    const { error } = await supabase.from('topics').insert(batch)
    if (error && !error.message.includes('duplicate')) {
      console.log('Error inserting topics batch', error)
    }
  }

  const { data: dbTopics } = await supabase.from('topics').select('id, name')
  const byName = new Map()
  for (const t of (dbTopics || [])) byName.set(t.name, t.id)

  const rows = []
  const push = (topicName, subs) => {
    const tid = byName.get(topicName)
    if (!tid) return
    for (const [name, diff, order] of subs) {
      rows.push({ topic_id: tid, name, difficulty: diff, order_num: order })
    }
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

  console.log(`Seeding ${rows.length} subtopics...`)
  
  const { data: existing } = await supabase.from('subtopics').select('topic_id, name')
  const existingSet = new Set((existing || []).map(e => `${e.topic_id}::${e.name}`))
  const newRows = rows.filter(r => !existingSet.has(`${r.topic_id}::${r.name}`))

  console.log(`Already in DB: ${existingSet.size}. Need to insert: ${newRows.length}`)

  let inserted = 0
  const BATCH = 20
  for (let i = 0; i < newRows.length; i += BATCH) {
    const batch = newRows.slice(i, i + BATCH)
    const { error } = await supabase.from('subtopics').insert(batch)
    if (error && !error.message.includes('duplicate')) {
      console.error(`Error inserting batch ${i}:`, error)
      return
    }
    inserted += batch.length
  }
  console.log('Seed completed successfully!')
}

seed().catch(console.error)
