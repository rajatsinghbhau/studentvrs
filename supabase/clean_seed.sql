-- ============================================================
-- CLEAN SEED — Run this in Supabase SQL Editor
-- Wipes duplicate subjects/topics and re-seeds cleanly
-- ============================================================

-- 1. Disable RLS on curriculum tables
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;

-- 2. Wipe existing curriculum data (cascade handles topics/subtopics)
TRUNCATE public.subtopics  RESTART IDENTITY CASCADE;
TRUNCATE public.questions  RESTART IDENTITY CASCADE;
TRUNCATE public.topics     RESTART IDENTITY CASCADE;
TRUNCATE public.subjects   RESTART IDENTITY CASCADE;

-- 3. Add unique constraint so ON CONFLICT works properly
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_name_key;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_name_key UNIQUE (name);

ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_subject_chapter_key;
ALTER TABLE public.topics ADD CONSTRAINT topics_subject_chapter_key UNIQUE (subject_id, chapter_num);

ALTER TABLE public.subtopics DROP CONSTRAINT IF EXISTS subtopics_topic_order_key;
ALTER TABLE public.subtopics ADD CONSTRAINT subtopics_topic_order_key UNIQUE (topic_id, order_num);

-- 4. Seed Subjects
INSERT INTO public.subjects (name, icon, color, exam_type, total_topics) VALUES
  ('Physics',            '⚛️',  '#00F2FF', 'JEE',  14),
  ('Chemistry',          '🧪',  '#9B59B6', 'JEE',  11),
  ('Mathematics',        '📐',  '#F39C12', 'JEE',  15),
  ('Biology',            '🧬',  '#2ECC71', 'NEET', 10),
  ('Physical Chemistry', '🔬',  '#E74C3C', 'JEE',   6)
ON CONFLICT (name) DO UPDATE SET
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  exam_type = EXCLUDED.exam_type,
  total_topics = EXCLUDED.total_topics;

-- 5. Seed Topics
DO $$
DECLARE
  physics_id    UUID;
  chemistry_id  UUID;
  math_id       UUID;
  bio_id        UUID;
BEGIN
  SELECT id INTO physics_id   FROM public.subjects WHERE name = 'Physics'     LIMIT 1;
  SELECT id INTO chemistry_id FROM public.subjects WHERE name = 'Chemistry'   LIMIT 1;
  SELECT id INTO math_id      FROM public.subjects WHERE name = 'Mathematics' LIMIT 1;
  SELECT id INTO bio_id       FROM public.subjects WHERE name = 'Biology'     LIMIT 1;

  -- Physics
  INSERT INTO public.topics (subject_id, name, difficulty, weightage, chapter_num) VALUES
    (physics_id, 'Kinematics',                    'EASY',   8,  1),
    (physics_id, 'Laws of Motion',                'MEDIUM', 10, 2),
    (physics_id, 'Work, Energy & Power',          'MEDIUM',  8, 3),
    (physics_id, 'Rotational Motion',             'HARD',   10, 4),
    (physics_id, 'Gravitation',                   'MEDIUM',  6, 5),
    (physics_id, 'Properties of Matter',          'EASY',    5, 6),
    (physics_id, 'Thermodynamics',                'HARD',   10, 7),
    (physics_id, 'Electrostatics',                'HARD',   12, 8),
    (physics_id, 'Current Electricity',           'MEDIUM', 10, 9),
    (physics_id, 'Magnetic Effects of Current',   'HARD',   10, 10),
    (physics_id, 'Electromagnetic Induction',     'HARD',    8, 11),
    (physics_id, 'Optics',                        'MEDIUM', 10, 12),
    (physics_id, 'Modern Physics',                'HARD',   12, 13),
    (physics_id, 'Waves & Oscillations',          'MEDIUM',  8, 14)
  ON CONFLICT (subject_id, chapter_num) DO NOTHING;

  -- Chemistry
  INSERT INTO public.topics (subject_id, name, difficulty, weightage, chapter_num) VALUES
    (chemistry_id, 'Some Basic Concepts',       'EASY',    4,  1),
    (chemistry_id, 'Atomic Structure',           'MEDIUM',  6,  2),
    (chemistry_id, 'Chemical Bonding',           'MEDIUM',  8,  3),
    (chemistry_id, 'Thermodynamics',             'HARD',    8,  4),
    (chemistry_id, 'Equilibrium',                'HARD',    8,  5),
    (chemistry_id, 'Electrochemistry',           'HARD',    8,  6),
    (chemistry_id, 'Organic Chemistry Basics',   'MEDIUM',  6,  7),
    (chemistry_id, 'Hydrocarbons',               'EASY',    6,  8),
    (chemistry_id, 'Coordination Compounds',     'HARD',    8,  9),
    (chemistry_id, 'p-Block Elements',           'MEDIUM',  8, 10),
    (chemistry_id, 'd & f Block Elements',       'MEDIUM',  6, 11)
  ON CONFLICT (subject_id, chapter_num) DO NOTHING;

  -- Mathematics
  INSERT INTO public.topics (subject_id, name, difficulty, weightage, chapter_num) VALUES
    (math_id, 'Sets, Relations & Functions',    'EASY',    4,  1),
    (math_id, 'Complex Numbers',                'MEDIUM',  6,  2),
    (math_id, 'Quadratic Equations',            'MEDIUM',  6,  3),
    (math_id, 'Sequences & Series',             'MEDIUM',  6,  4),
    (math_id, 'Permutations & Combinations',    'MEDIUM',  6,  5),
    (math_id, 'Binomial Theorem',               'EASY',    4,  6),
    (math_id, 'Coordinate Geometry',            'HARD',   10,  7),
    (math_id, 'Limits & Continuity',            'HARD',    8,  8),
    (math_id, 'Differentiation',                'HARD',    8,  9),
    (math_id, 'Integration',                    'HARD',   12, 10),
    (math_id, 'Differential Equations',         'HARD',    6, 11),
    (math_id, 'Vectors & 3D',                   'MEDIUM',  8, 12),
    (math_id, 'Probability',                    'MEDIUM',  8, 13),
    (math_id, 'Matrices & Determinants',        'MEDIUM',  6, 14),
    (math_id, 'Trigonometry',                   'MEDIUM',  8, 15)
  ON CONFLICT (subject_id, chapter_num) DO NOTHING;

  -- Biology
  INSERT INTO public.topics (subject_id, name, difficulty, weightage, chapter_num) VALUES
    (bio_id, 'Cell Biology',             'EASY',    8,  1),
    (bio_id, 'Genetics',                 'MEDIUM', 10,  2),
    (bio_id, 'Human Physiology',         'MEDIUM', 12,  3),
    (bio_id, 'Plant Physiology',         'MEDIUM',  8,  4),
    (bio_id, 'Ecology',                  'EASY',    6,  5),
    (bio_id, 'Evolution',                'MEDIUM',  6,  6),
    (bio_id, 'Biotechnology',            'HARD',    8,  7),
    (bio_id, 'Reproduction',             'MEDIUM',  8,  8),
    (bio_id, 'Molecular Biology',        'HARD',   10,  9),
    (bio_id, 'Biological Classification','EASY',    6, 10)
  ON CONFLICT (subject_id, chapter_num) DO NOTHING;

END $$;

-- 6. Seed Subtopics
DO $$
DECLARE t_id UUID;
BEGIN
  -- Physics: Kinematics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Kinematics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Distance vs Displacement',          'EASY',   1),
    (t_id, 'Speed vs Velocity',                 'EASY',   2),
    (t_id, 'Uniform & Non-uniform Motion',      'EASY',   3),
    (t_id, 'Equations of Motion (v,u,a,s)',     'MEDIUM', 4),
    (t_id, 'Projectile Motion',                 'MEDIUM', 5),
    (t_id, 'Relative Motion',                   'HARD',   6)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Physics: Laws of Motion
  SELECT id INTO t_id FROM public.topics WHERE name = 'Laws of Motion' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Newton''s First Law (Inertia)',           'EASY',   1),
    (t_id, 'Newton''s Second Law (F = ma)',           'EASY',   2),
    (t_id, 'Newton''s Third Law',                    'EASY',   3),
    (t_id, 'Friction — Static & Kinetic',            'MEDIUM', 4),
    (t_id, 'Circular Motion & Banking',              'HARD',   5),
    (t_id, 'Pseudo Forces & Non-inertial Frames',    'HARD',   6)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Physics: Work Energy Power
  SELECT id INTO t_id FROM public.topics WHERE name = 'Work, Energy & Power' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Work Done by Constant Force',        'EASY',   1),
    (t_id, 'Kinetic & Potential Energy',         'EASY',   2),
    (t_id, 'Work-Energy Theorem',                'MEDIUM', 3),
    (t_id, 'Conservation of Energy',             'MEDIUM', 4),
    (t_id, 'Power & Efficiency',                 'MEDIUM', 5),
    (t_id, 'Elastic & Inelastic Collisions',     'HARD',   6)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Physics: Rotational Motion
  SELECT id INTO t_id FROM public.topics WHERE name = 'Rotational Motion' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Torque & Moment of Inertia',               'MEDIUM', 1),
    (t_id, 'Angular Velocity & Acceleration',           'MEDIUM', 2),
    (t_id, 'Parallel & Perpendicular Axis Theorem',    'HARD',   3),
    (t_id, 'Rolling Motion',                           'HARD',   4),
    (t_id, 'Angular Momentum Conservation',            'HARD',   5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Physics: Electrostatics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Electrostatics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Coulomb''s Law',                        'EASY',   1),
    (t_id, 'Electric Field & Field Lines',          'MEDIUM', 2),
    (t_id, 'Gauss''s Law',                          'HARD',   3),
    (t_id, 'Electric Potential & Potential Energy', 'HARD',   4),
    (t_id, 'Capacitors & Dielectrics',              'HARD',   5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Physics: Modern Physics
  SELECT id INTO t_id FROM public.topics WHERE name = 'Modern Physics' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Photoelectric Effect',          'MEDIUM', 1),
    (t_id, 'Bohr''s Atomic Model',          'MEDIUM', 2),
    (t_id, 'Nuclear Fission & Fusion',      'HARD',   3),
    (t_id, 'Radioactive Decay',             'HARD',   4),
    (t_id, 'X-Rays & Photoelectric Effect', 'HARD',   5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Chemistry: Some Basic Concepts
  SELECT id INTO t_id FROM public.topics WHERE name = 'Some Basic Concepts' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Mole Concept & Avogadro''s Number',              'EASY',   1),
    (t_id, 'Atomic Mass & Molecular Mass',                   'EASY',   2),
    (t_id, 'Empirical & Molecular Formula',                  'MEDIUM', 3),
    (t_id, 'Stoichiometry & Limiting Reagent',               'MEDIUM', 4),
    (t_id, 'Concentration Terms (Molarity, Molality, etc.)', 'MEDIUM', 5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Chemistry: Atomic Structure
  SELECT id INTO t_id FROM public.topics WHERE name = 'Atomic Structure' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Rutherford & Bohr Model',                         'EASY',   1),
    (t_id, 'Quantum Numbers (n, l, m, s)',                    'MEDIUM', 2),
    (t_id, 'Aufbau, Pauli Exclusion, Hund''s Rule',          'MEDIUM', 3),
    (t_id, 'Electronic Configuration',                        'MEDIUM', 4),
    (t_id, 'Wave-Particle Duality & Heisenberg''s Principle', 'HARD',   5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Chemistry: Chemical Bonding
  SELECT id INTO t_id FROM public.topics WHERE name = 'Chemical Bonding' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Ionic Bond Formation',                   'EASY',   1),
    (t_id, 'Covalent Bond & Lewis Structures',       'MEDIUM', 2),
    (t_id, 'VSEPR Theory & Molecular Geometry',      'MEDIUM', 3),
    (t_id, 'Hybridization (sp, sp2, sp3)',            'HARD',   4),
    (t_id, 'Molecular Orbital Theory',               'HARD',   5),
    (t_id, 'Hydrogen Bonding & van der Waals Forces','EASY',   6)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Maths: Integration
  SELECT id INTO t_id FROM public.topics WHERE name = 'Integration' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Indefinite Integration — Standard Forms', 'MEDIUM', 1),
    (t_id, 'Integration by Substitution',             'MEDIUM', 2),
    (t_id, 'Integration by Parts',                   'HARD',   3),
    (t_id, 'Definite Integrals & Properties',         'HARD',   4),
    (t_id, 'Area Under Curves',                       'HARD',   5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Maths: Coordinate Geometry
  SELECT id INTO t_id FROM public.topics WHERE name = 'Coordinate Geometry' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Straight Lines',     'EASY',   1),
    (t_id, 'Circle',             'MEDIUM', 2),
    (t_id, 'Parabola',           'HARD',   3),
    (t_id, 'Ellipse',            'HARD',   4),
    (t_id, 'Hyperbola',          'HARD',   5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

  -- Maths: Probability
  SELECT id INTO t_id FROM public.topics WHERE name = 'Probability' LIMIT 1;
  INSERT INTO public.subtopics (topic_id, name, difficulty, order_num) VALUES
    (t_id, 'Basic Probability',           'EASY',   1),
    (t_id, 'Conditional Probability',     'MEDIUM', 2),
    (t_id, 'Bayes'' Theorem',             'HARD',   3),
    (t_id, 'Binomial Distribution',       'HARD',   4),
    (t_id, 'Random Variables & E(X)',     'HARD',   5)
  ON CONFLICT (topic_id, order_num) DO NOTHING;

END $$;

-- 7. Verify
SELECT 
  s.name AS subject,
  COUNT(t.id) AS topic_count
FROM public.subjects s
LEFT JOIN public.topics t ON t.subject_id = s.id
GROUP BY s.name
ORDER BY s.name;
