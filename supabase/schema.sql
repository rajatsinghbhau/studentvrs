-- ============================================================
-- STUDENTVERSE AI DASHBOARD — SUPABASE SCHEMA
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  target_exam   TEXT DEFAULT 'JEE' CHECK (target_exam IN ('JEE', 'NEET', 'BOARDS')),
  target_year   INTEGER DEFAULT 2026,
  bio           TEXT,
  streak        INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  xp            INTEGER DEFAULT 0,
  level         INTEGER DEFAULT 1,
  rank_title    TEXT DEFAULT 'Rookie',
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  exam_type     TEXT DEFAULT 'JEE' CHECK (exam_type IN ('JEE', 'NEET', 'BOARDS', 'ALL')),
  total_topics  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: topics
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id    UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  difficulty    TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  weightage     INTEGER DEFAULT 5,
  chapter_num   INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: user_topic_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_topic_progress (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id      UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  is_completed  BOOLEAN DEFAULT FALSE,
  study_time    INTEGER DEFAULT 0,  -- minutes
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
  last_studied  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- ============================================================
-- TABLE: tests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  subject_id      UUID REFERENCES public.subjects(id),
  created_by      UUID REFERENCES public.profiles(id),
  total_questions INTEGER DEFAULT 30,
  duration        INTEGER DEFAULT 60, -- minutes
  max_marks       INTEGER DEFAULT 120,
  difficulty      TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'MIXED')),
  exam_type       TEXT DEFAULT 'JEE',
  is_public       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: questions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id         UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  topic_id        UUID REFERENCES public.topics(id),
  question_text   TEXT NOT NULL,
  options         JSONB NOT NULL,  -- ["A","B","C","D"]
  correct_option  INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
  explanation     TEXT,
  difficulty      TEXT DEFAULT 'MEDIUM',
  marks           INTEGER DEFAULT 4,
  negative_marks  NUMERIC DEFAULT 1,
  question_num    INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: test_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id         UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score           NUMERIC DEFAULT 0,
  max_score       INTEGER DEFAULT 120,
  accuracy        NUMERIC DEFAULT 0, -- percentage
  time_taken      INTEGER DEFAULT 0, -- seconds
  correct_count   INTEGER DEFAULT 0,
  wrong_count     INTEGER DEFAULT 0,
  skipped_count   INTEGER DEFAULT 0,
  percentile      NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ============================================================
-- TABLE: attempt_answers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id      UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option INTEGER CHECK (selected_option BETWEEN 0 AND 3),
  is_correct      BOOLEAN DEFAULT FALSE,
  is_skipped      BOOLEAN DEFAULT FALSE,
  time_taken      INTEGER DEFAULT 0, -- seconds per question
  marks_obtained  NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- ============================================================
-- TABLE: revision_cards (Spaced Repetition)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.revision_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id        UUID REFERENCES public.topics(id),
  front           TEXT NOT NULL,
  back            TEXT NOT NULL,
  difficulty      TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  interval_days   INTEGER DEFAULT 1,
  ease_factor     NUMERIC DEFAULT 2.5,
  repetitions     INTEGER DEFAULT 0,
  next_review_at  TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed   TIMESTAMPTZ,
  source          TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'test_mistake')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: study_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id      UUID REFERENCES public.subjects(id),
  topic_id        UUID REFERENCES public.topics(id),
  duration        INTEGER NOT NULL, -- minutes
  session_date    DATE DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: coach_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  context_topic   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user ON public.user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_revision_cards_user_review ON public.revision_cards(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_coach_messages_user ON public.coach_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON public.questions(test_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Subjects & Topics: everyone can read
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;

-- User-specific tables: own data only
CREATE POLICY "Own progress" ON public.user_topic_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own attempts" ON public.test_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own answers" ON public.attempt_answers FOR ALL USING (
  attempt_id IN (SELECT id FROM public.test_attempts WHERE user_id = auth.uid())
);
CREATE POLICY "Own cards" ON public.revision_cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own messages" ON public.coach_messages FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED: Subjects
-- ============================================================
INSERT INTO public.subjects (name, icon, color, exam_type, total_topics) VALUES
  ('Physics', '⚛️', '#00F2FF', 'JEE', 20),
  ('Chemistry', '🧪', '#9B59B6', 'JEE', 22),
  ('Mathematics', '📐', '#F39C12', 'JEE', 25),
  ('Biology', '🧬', '#2ECC71', 'NEET', 18),
  ('Physical Chemistry', '🔬', '#E74C3C', 'JEE', 12)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Physics Topics
-- ============================================================
DO $$
DECLARE
  physics_id UUID;
  chemistry_id UUID;
  math_id UUID;
BEGIN
  SELECT id INTO physics_id FROM public.subjects WHERE name = 'Physics' LIMIT 1;
  SELECT id INTO chemistry_id FROM public.subjects WHERE name = 'Chemistry' LIMIT 1;
  SELECT id INTO math_id FROM public.subjects WHERE name = 'Mathematics' LIMIT 1;

  INSERT INTO public.topics (subject_id, name, difficulty, weightage, chapter_num) VALUES
    -- Physics
    (physics_id, 'Kinematics', 'EASY', 8, 1),
    (physics_id, 'Laws of Motion', 'MEDIUM', 10, 2),
    (physics_id, 'Work, Energy & Power', 'MEDIUM', 8, 3),
    (physics_id, 'Rotational Motion', 'HARD', 10, 4),
    (physics_id, 'Gravitation', 'MEDIUM', 6, 5),
    (physics_id, 'Properties of Matter', 'EASY', 5, 6),
    (physics_id, 'Thermodynamics', 'HARD', 10, 7),
    (physics_id, 'Electrostatics', 'HARD', 12, 8),
    (physics_id, 'Current Electricity', 'MEDIUM', 10, 9),
    (physics_id, 'Magnetic Effects of Current', 'HARD', 10, 10),
    (physics_id, 'Electromagnetic Induction', 'HARD', 8, 11),
    (physics_id, 'Optics', 'MEDIUM', 10, 12),
    (physics_id, 'Modern Physics', 'HARD', 12, 13),
    (physics_id, 'Waves & Oscillations', 'MEDIUM', 8, 14),
    -- Chemistry
    (chemistry_id, 'Some Basic Concepts', 'EASY', 4, 1),
    (chemistry_id, 'Atomic Structure', 'MEDIUM', 6, 2),
    (chemistry_id, 'Chemical Bonding', 'MEDIUM', 8, 3),
    (chemistry_id, 'Thermodynamics', 'HARD', 8, 4),
    (chemistry_id, 'Equilibrium', 'HARD', 8, 5),
    (chemistry_id, 'Electrochemistry', 'HARD', 8, 6),
    (chemistry_id, 'Organic Chemistry Basics', 'MEDIUM', 6, 7),
    (chemistry_id, 'Hydrocarbons', 'EASY', 6, 8),
    (chemistry_id, 'Coordination Compounds', 'HARD', 8, 9),
    (chemistry_id, 'p-Block Elements', 'MEDIUM', 8, 10),
    (chemistry_id, 'd & f Block Elements', 'MEDIUM', 6, 11),
    -- Mathematics
    (math_id, 'Sets, Relations & Functions', 'EASY', 4, 1),
    (math_id, 'Complex Numbers', 'MEDIUM', 6, 2),
    (math_id, 'Quadratic Equations', 'MEDIUM', 6, 3),
    (math_id, 'Sequences & Series', 'MEDIUM', 6, 4),
    (math_id, 'Permutations & Combinations', 'MEDIUM', 6, 5),
    (math_id, 'Binomial Theorem', 'EASY', 4, 6),
    (math_id, 'Coordinate Geometry', 'HARD', 10, 7),
    (math_id, 'Limits & Continuity', 'HARD', 8, 8),
    (math_id, 'Differentiation', 'HARD', 8, 9),
    (math_id, 'Integration', 'HARD', 12, 10),
    (math_id, 'Differential Equations', 'HARD', 6, 11),
    (math_id, 'Vectors & 3D', 'MEDIUM', 8, 12),
    (math_id, 'Probability', 'MEDIUM', 8, 13),
    (math_id, 'Matrices & Determinants', 'MEDIUM', 6, 14),
    (math_id, 'Trigonometry', 'MEDIUM', 8, 15)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- SEED: Sample Test
-- ============================================================
DO $$
DECLARE
  test_id UUID;
  physics_id UUID;
  p_topic1 UUID;
  p_topic2 UUID;
BEGIN
  SELECT id INTO physics_id FROM public.subjects WHERE name = 'Physics' LIMIT 1;
  SELECT id INTO p_topic1 FROM public.topics WHERE name = 'Kinematics' LIMIT 1;
  SELECT id INTO p_topic2 FROM public.topics WHERE name = 'Laws of Motion' LIMIT 1;

  INSERT INTO public.tests (title, description, subject_id, total_questions, duration, max_marks, difficulty, exam_type)
  VALUES ('JEE Physics Mock #1', 'Full chapter test on Mechanics', physics_id, 5, 30, 20, 'MEDIUM', 'JEE')
  RETURNING id INTO test_id;

  INSERT INTO public.questions (test_id, topic_id, question_text, options, correct_option, explanation, difficulty, marks, negative_marks, question_num)
  VALUES
    (test_id, p_topic1, 'A particle moves with velocity v = 3t² - 2t + 1 m/s. What is the acceleration at t = 2s?',
     '["8 m/s²", "10 m/s²", "12 m/s²", "14 m/s²"]', 1, 'Acceleration = dv/dt = 6t - 2. At t=2, a = 12 - 2 = 10 m/s²', 'MEDIUM', 4, 1, 1),
    (test_id, p_topic1, 'A ball is thrown vertically upward with 20 m/s. Maximum height reached is (g=10 m/s²):',
     '["10 m", "15 m", "20 m", "25 m"]', 2, 'h = v²/2g = 400/20 = 20 m', 'EASY', 4, 1, 2),
    (test_id, p_topic2, 'A 5 kg object accelerates at 3 m/s². The net force is:',
     '["10 N", "12 N", "15 N", "18 N"]', 2, 'F = ma = 5 × 3 = 15 N', 'EASY', 4, 1, 3),
    (test_id, p_topic2, 'Two blocks of mass 3kg and 5kg are connected by a string over a frictionless pulley. Acceleration is:',
     '["1.5 m/s²", "2.45 m/s²", "3.27 m/s²", "4.9 m/s²"]', 1, 'a = (m2-m1)g/(m1+m2) = 2×10/8 = 2.5 m/s²', 'HARD', 4, 1, 4),
    (test_id, p_topic1, 'A projectile is launched at 45° with speed 20 m/s. Range is (g=10):',
     '["20 m", "30 m", "40 m", "50 m"]', 2, 'R = v²sin(2θ)/g = 400×1/10 = 40 m', 'MEDIUM', 4, 1, 5)
  ON CONFLICT DO NOTHING;
END $$;
