-- ============================================================
-- SUBTOPICS MIGRATION — Run in Supabase SQL Editor
-- ============================================================

-- TABLE: subtopics (children of topics/chapters)
CREATE TABLE IF NOT EXISTS public.subtopics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id    UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  difficulty  TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  order_num   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtopics_topic ON public.subtopics(topic_id);
ALTER TABLE public.subtopics DISABLE ROW LEVEL SECURITY;

-- TABLE: user_subtopic_progress
CREATE TABLE IF NOT EXISTS public.user_subtopic_progress (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subtopic_id   UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  is_completed  BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subtopic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subtopic_progress_user ON public.user_subtopic_progress(user_id);
ALTER TABLE public.user_subtopic_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subtopic progress" ON public.user_subtopic_progress FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SEED: Real subtopics for Physics chapters
-- ============================================================
DO $$
DECLARE
  t_id UUID;
BEGIN
  -- Physics Ch1: Kinematics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Kinematics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Distance vs Displacement', 'EASY', 1),
    (t_id, 'Speed vs Velocity', 'EASY', 2),
    (t_id, 'Uniform & Non-uniform Motion', 'EASY', 3),
    (t_id, 'Equations of Motion (v, u, a, s)', 'MEDIUM', 4),
    (t_id, 'Projectile Motion', 'MEDIUM', 5),
    (t_id, 'Relative Motion', 'HARD', 6)
  ON CONFLICT DO NOTHING;

  -- Physics Ch2: Laws of Motion
  SELECT id INTO t_id FROM public.topics WHERE name = 'Laws of Motion' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Newton''s First Law (Inertia)', 'EASY', 1),
    (t_id, 'Newton''s Second Law (F = ma)', 'EASY', 2),
    (t_id, 'Newton''s Third Law', 'EASY', 3),
    (t_id, 'Friction — Static & Kinetic', 'MEDIUM', 4),
    (t_id, 'Circular Motion & Banking', 'HARD', 5),
    (t_id, 'Pseudo Forces & Non-inertial Frames', 'HARD', 6)
  ON CONFLICT DO NOTHING;

  -- Physics Ch3: Work, Energy & Power
  SELECT id INTO t_id FROM public.topics WHERE name = 'Work, Energy & Power' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Work Done by Constant Force', 'EASY', 1),
    (t_id, 'Kinetic & Potential Energy', 'EASY', 2),
    (t_id, 'Work-Energy Theorem', 'MEDIUM', 3),
    (t_id, 'Conservation of Energy', 'MEDIUM', 4),
    (t_id, 'Power & Efficiency', 'MEDIUM', 5),
    (t_id, 'Elastic & Inelastic Collisions', 'HARD', 6)
  ON CONFLICT DO NOTHING;

  -- Physics Ch4: Rotational Motion
  SELECT id INTO t_id FROM public.topics WHERE name = 'Rotational Motion' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Torque & Moment of Inertia', 'MEDIUM', 1),
    (t_id, 'Angular Velocity & Acceleration', 'MEDIUM', 2),
    (t_id, 'Parallel & Perpendicular Axis Theorem', 'HARD', 3),
    (t_id, 'Rolling Motion', 'HARD', 4),
    (t_id, 'Angular Momentum Conservation', 'HARD', 5)
  ON CONFLICT DO NOTHING;

  -- Physics Ch5: Gravitation
  SELECT id INTO t_id FROM public.topics WHERE name = 'Gravitation' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Newton''s Law of Gravitation', 'EASY', 1),
    (t_id, 'Gravitational Field & Potential', 'MEDIUM', 2),
    (t_id, 'Escape Velocity', 'MEDIUM', 3),
    (t_id, 'Orbital Velocity & Satellites', 'MEDIUM', 4),
    (t_id, 'Kepler''s Laws', 'HARD', 5)
  ON CONFLICT DO NOTHING;

  -- Physics Ch7: Thermodynamics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Thermodynamics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Zeroth & First Law of Thermodynamics', 'EASY', 1),
    (t_id, 'Isothermal & Adiabatic Processes', 'MEDIUM', 2),
    (t_id, 'Second Law & Entropy', 'HARD', 3),
    (t_id, 'Carnot Engine & Efficiency', 'HARD', 4),
    (t_id, 'Specific Heats (Cp, Cv) & γ', 'MEDIUM', 5)
  ON CONFLICT DO NOTHING;

  -- Physics Ch8: Electrostatics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Electrostatics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Coulomb''s Law', 'EASY', 1),
    (t_id, 'Electric Field & Field Lines', 'MEDIUM', 2),
    (t_id, 'Gauss''s Law', 'HARD', 3),
    (t_id, 'Electric Potential & Potential Energy', 'HARD', 4),
    (t_id, 'Capacitors & Dielectrics', 'HARD', 5),
    (t_id, 'Van de Graaff Generator', 'EASY', 6)
  ON CONFLICT DO NOTHING;

  -- Physics Ch12: Optics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Optics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Reflection & Mirrors', 'EASY', 1),
    (t_id, 'Refraction & Snell''s Law', 'EASY', 2),
    (t_id, 'Total Internal Reflection', 'MEDIUM', 3),
    (t_id, 'Lenses & Lens Formula', 'MEDIUM', 4),
    (t_id, 'Wave Optics — Interference', 'HARD', 5),
    (t_id, 'Diffraction & Polarisation', 'HARD', 6)
  ON CONFLICT DO NOTHING;

  -- Physics Ch13: Modern Physics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Modern Physics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Photoelectric Effect', 'MEDIUM', 1),
    (t_id, 'de Broglie Wavelength', 'MEDIUM', 2),
    (t_id, 'Bohr''s Atomic Model', 'HARD', 3),
    (t_id, 'Nuclear Fission & Fusion', 'HARD', 4),
    (t_id, 'Radioactivity & Half-life', 'MEDIUM', 5),
    (t_id, 'X-rays & Semiconductors', 'HARD', 6)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- SEED: Real subtopics for Chemistry chapters
-- ============================================================
DO $$
DECLARE
  t_id UUID;
BEGIN
  -- Chemistry Ch1: Some Basic Concepts
  SELECT id INTO t_id FROM public.topics WHERE name = 'Some Basic Concepts' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Mole Concept & Avogadro''s Number', 'EASY', 1),
    (t_id, 'Atomic Mass & Molecular Mass', 'EASY', 2),
    (t_id, 'Empirical & Molecular Formula', 'MEDIUM', 3),
    (t_id, 'Stoichiometry & Limiting Reagent', 'MEDIUM', 4),
    (t_id, 'Concentration Terms (Molarity, Molality, etc.)', 'MEDIUM', 5),
    (t_id, 'Laws of Chemical Combination', 'EASY', 6)
  ON CONFLICT DO NOTHING;

  -- Chemistry Ch2: Atomic Structure
  SELECT id INTO t_id FROM public.topics WHERE name = 'Atomic Structure' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Rutherford & Bohr Model', 'EASY', 1),
    (t_id, 'Quantum Numbers (n, l, m, s)', 'MEDIUM', 2),
    (t_id, 'Aufbau Principle, Pauli Exclusion, Hund''s Rule', 'MEDIUM', 3),
    (t_id, 'Electronic Configuration', 'MEDIUM', 4),
    (t_id, 'Wave-Particle Duality & Heisenberg''s Principle', 'HARD', 5),
    (t_id, 'Orbitals & Shapes (s, p, d)', 'HARD', 6)
  ON CONFLICT DO NOTHING;

  -- Chemistry Ch3: Chemical Bonding
  SELECT id INTO t_id FROM public.topics WHERE name = 'Chemical Bonding' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Ionic Bond Formation', 'EASY', 1),
    (t_id, 'Covalent Bond & Lewis Structures', 'MEDIUM', 2),
    (t_id, 'VSEPR Theory & Molecular Geometry', 'MEDIUM', 3),
    (t_id, 'Hybridization (sp, sp2, sp3)', 'HARD', 4),
    (t_id, 'Molecular Orbital Theory', 'HARD', 5),
    (t_id, 'Hydrogen Bonding & van der Waals Forces', 'EASY', 6)
  ON CONFLICT DO NOTHING;

  -- Chemistry Ch4: Thermodynamics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Thermodynamics' AND subject_id = (SELECT id FROM public.subjects WHERE name = 'Chemistry' LIMIT 1) LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'System, Surroundings & State Functions', 'EASY', 1),
    (t_id, 'Enthalpy & Hess''s Law', 'MEDIUM', 2),
    (t_id, 'Entropy & Spontaneity', 'HARD', 3),
    (t_id, 'Gibbs Free Energy (ΔG = ΔH - TΔS)', 'HARD', 4),
    (t_id, 'Bond Enthalpies & Lattice Energy', 'MEDIUM', 5)
  ON CONFLICT DO NOTHING;

  -- Chemistry Ch5: Equilibrium
  SELECT id INTO t_id FROM public.topics WHERE name = 'Equilibrium' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Law of Mass Action & Kc, Kp', 'MEDIUM', 1),
    (t_id, 'Le Chatelier''s Principle', 'MEDIUM', 2),
    (t_id, 'Acids, Bases & pH', 'EASY', 3),
    (t_id, 'Buffer Solutions', 'HARD', 4),
    (t_id, 'Solubility Product (Ksp)', 'HARD', 5),
    (t_id, 'Common Ion Effect', 'MEDIUM', 6)
  ON CONFLICT DO NOTHING;

  -- Chemistry Ch7: Organic Chemistry Basics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Organic Chemistry Basics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Hybridization in Carbon', 'EASY', 1),
    (t_id, 'IUPAC Nomenclature', 'MEDIUM', 2),
    (t_id, 'Inductive & Resonance Effects', 'HARD', 3),
    (t_id, 'Types of Reactions (SN1, SN2, E1, E2)', 'HARD', 4),
    (t_id, 'Isomerism (Structural & Stereoisomerism)', 'HARD', 5),
    (t_id, 'Functional Groups Overview', 'EASY', 6)
  ON CONFLICT DO NOTHING;

  -- Chemistry Ch8: Hydrocarbons
  SELECT id INTO t_id FROM public.topics WHERE name = 'Hydrocarbons' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Alkanes — Nomenclature & Reactions', 'EASY', 1),
    (t_id, 'Alkenes — Addition Reactions', 'MEDIUM', 2),
    (t_id, 'Alkynes — Properties', 'MEDIUM', 3),
    (t_id, 'Benzene & Aromaticity', 'HARD', 4),
    (t_id, 'EAS Reactions (Nitration, Halogenation)', 'HARD', 5)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- SEED: Real subtopics for Mathematics chapters
-- ============================================================
DO $$
DECLARE
  t_id UUID;
BEGIN
  -- Math Ch1: Sets, Relations & Functions
  SELECT id INTO t_id FROM public.topics WHERE name = 'Sets, Relations & Functions' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Set Theory & Operations (Union, Intersection)', 'EASY', 1),
    (t_id, 'Types of Relations (Reflexive, Symmetric, Transitive)', 'MEDIUM', 2),
    (t_id, 'Functions — Domain & Range', 'MEDIUM', 3),
    (t_id, 'Inverse & Composite Functions', 'HARD', 4),
    (t_id, 'Even & Odd Functions', 'EASY', 5)
  ON CONFLICT DO NOTHING;

  -- Math Ch2: Complex Numbers
  SELECT id INTO t_id FROM public.topics WHERE name = 'Complex Numbers' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Algebra of Complex Numbers', 'EASY', 1),
    (t_id, 'Modulus & Argument', 'MEDIUM', 2),
    (t_id, 'Polar Form & Euler''s Formula', 'HARD', 3),
    (t_id, 'De Moivre''s Theorem', 'HARD', 4),
    (t_id, 'Cube Roots of Unity', 'MEDIUM', 5)
  ON CONFLICT DO NOTHING;

  -- Math Ch3: Quadratic Equations
  SELECT id INTO t_id FROM public.topics WHERE name = 'Quadratic Equations' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Discriminant & Nature of Roots', 'EASY', 1),
    (t_id, 'Vieta''s Formulas (Sum & Product of Roots)', 'MEDIUM', 2),
    (t_id, 'Formation of Quadratic Equations', 'MEDIUM', 3),
    (t_id, 'Quadratic Inequalities', 'HARD', 4),
    (t_id, 'Graphs of Quadratic Functions', 'MEDIUM', 5)
  ON CONFLICT DO NOTHING;

  -- Math Ch8: Limits & Continuity
  SELECT id INTO t_id FROM public.topics WHERE name = 'Limits & Continuity' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Concept of a Limit', 'EASY', 1),
    (t_id, 'L''Hôpital''s Rule & Indeterminate Forms', 'HARD', 2),
    (t_id, 'Standard Limits', 'MEDIUM', 3),
    (t_id, 'Continuity & Differentiability', 'HARD', 4),
    (t_id, 'Types of Discontinuities', 'MEDIUM', 5)
  ON CONFLICT DO NOTHING;

  -- Math Ch9: Differentiation
  SELECT id INTO t_id FROM public.topics WHERE name = 'Differentiation' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'First Principles & Basic Derivatives', 'EASY', 1),
    (t_id, 'Chain Rule, Product Rule, Quotient Rule', 'MEDIUM', 2),
    (t_id, 'Implicit & Parametric Differentiation', 'HARD', 3),
    (t_id, 'Higher Order Derivatives', 'HARD', 4),
    (t_id, 'Applications — Maxima, Minima, Tangents', 'HARD', 5)
  ON CONFLICT DO NOTHING;

  -- Math Ch10: Integration
  SELECT id INTO t_id FROM public.topics WHERE name = 'Integration' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Standard Integrals & Basic Rules', 'EASY', 1),
    (t_id, 'Integration by Substitution', 'MEDIUM', 2),
    (t_id, 'Integration by Parts', 'HARD', 3),
    (t_id, 'Partial Fractions', 'HARD', 4),
    (t_id, 'Definite Integrals & Properties', 'HARD', 5),
    (t_id, 'Area Under Curves', 'HARD', 6)
  ON CONFLICT DO NOTHING;

  -- Math Ch13: Probability
  SELECT id INTO t_id FROM public.topics WHERE name = 'Probability' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Basic Probability & Sample Spaces', 'EASY', 1),
    (t_id, 'Conditional Probability', 'MEDIUM', 2),
    (t_id, 'Bayes'' Theorem', 'HARD', 3),
    (t_id, 'Binomial Distribution', 'HARD', 4),
    (t_id, 'Probability Trees & Venn Diagrams', 'MEDIUM', 5)
  ON CONFLICT DO NOTHING;
END $$;
