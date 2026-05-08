-- ============================================================
-- FIX RLS — user_subtopic_progress
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.user_subtopic_progress (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subtopic_id   UUID NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  is_completed  BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subtopic_id)
);

-- 2. Enable RLS
ALTER TABLE public.user_subtopic_progress ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies on both tables (brute-force clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'user_subtopic_progress'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_subtopic_progress', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'user_topic_progress'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_topic_progress', pol.policyname);
  END LOOP;
END $$;

-- 4. Re-create policies for user_subtopic_progress
CREATE POLICY "subtopic_progress_select"
  ON public.user_subtopic_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subtopic_progress_insert"
  ON public.user_subtopic_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subtopic_progress_update"
  ON public.user_subtopic_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "subtopic_progress_delete"
  ON public.user_subtopic_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Re-create policies for user_topic_progress
CREATE POLICY "topic_progress_select"
  ON public.user_topic_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "topic_progress_insert"
  ON public.user_topic_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topic_progress_update"
  ON public.user_topic_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "topic_progress_delete"
  ON public.user_topic_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_user_subtopic_progress_user
  ON public.user_subtopic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subtopic_progress_subtopic
  ON public.user_subtopic_progress(subtopic_id);

-- 7. Verify — should show all 8 policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_subtopic_progress', 'user_topic_progress')
ORDER BY tablename, cmd;
