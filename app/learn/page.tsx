'use client'
import { useEffect, useState, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'

/* ── Types ─────────────────────────────────────────────────── */
interface Subtopic {
  id: string
  name: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  order_num: number
  is_completed: boolean
}

interface Chapter {          // = a "topic" row in DB
  id: string
  name: string
  chapter_num: number
  difficulty: string
  weightage: number
  subtopics: Subtopic[] | null   // null = not yet loaded
  loadingSubtopics: boolean
  initialProgress: number
}

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  progress: number
  completed_topics: number
  total_topics: number
  topics: {
    id: string; name: string; difficulty: string
    weightage: number; chapter_num: number
    progress: { is_completed: boolean; mastery_level: number; study_time: number }
  }[]
}

const DIFF_COLOR: Record<string, string> = {
  EASY: '#4ade80', MEDIUM: '#fbbf24', HARD: '#ff6464',
}

/* ── Helper: chapter progress from subtopics ────────────────── */
function subtopicProgress(subtopics: Subtopic[]) {
  if (!subtopics.length) return { done: 0, total: 0, pct: 0 }
  const done = subtopics.filter(s => s.is_completed).length
  return { done, total: subtopics.length, pct: Math.round((done / subtopics.length) * 100) }
}

/* ── SubtopicRow ─────────────────────────────────────────────── */
function SubtopicRow({
  sub,
  chapterId,
  subjectId,
  token,
  onToggle,
}: {
  sub: Subtopic
  chapterId: string
  subjectId: string
  token: string
  onToggle: (subtopicId: string, newState: boolean) => void
}) {
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    const next = !sub.is_completed
    onToggle(sub.id, next)          // optimistic
    try {
      const res = await fetch(`/api/subtopics/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_completed: next, topic_id: chapterId, subject_id: subjectId }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update progress')
      }
    } catch (err: any) {
      alert('Error updating progress: ' + err.message)
      onToggle(sub.id, !next)       // revert on error
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        background: sub.is_completed ? 'rgba(74,222,128,0.04)' : 'transparent',
        transition: 'background 0.3s',
      }}
    >
      {/* circle tick */}
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={sub.is_completed ? 'Mark incomplete' : 'Mark complete'}
        style={{
          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${sub.is_completed ? '#4ade80' : 'var(--outline)'}`,
          background: sub.is_completed ? '#4ade80' : 'transparent',
          cursor: busy ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.25s', opacity: busy ? 0.6 : 1,
        }}
      >
        {sub.is_completed && <span style={{ color: '#000', fontSize: '10px', fontWeight: 800 }}>✓</span>}
      </button>

      {/* name */}
      <span
        style={{
          flex: 1, fontSize: '0.82rem', fontWeight: sub.is_completed ? 400 : 500,
          color: sub.is_completed ? 'var(--on-surface-variant)' : 'var(--on-surface)',
          textDecoration: sub.is_completed ? 'line-through' : 'none',
          transition: 'all 0.3s',
        }}
      >
        {sub.name}
      </span>

      {/* difficulty dot */}
      <span
        style={{
          width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
          background: DIFF_COLOR[sub.difficulty] || '#fff',
          boxShadow: `0 0 6px ${DIFF_COLOR[sub.difficulty] || '#fff'}`,
        }}
        title={sub.difficulty}
      />

      {/* Complete button */}
      <button
        onClick={toggle}
        disabled={busy}
        style={{
          padding: '5px 12px', borderRadius: 'var(--radius-full)', flexShrink: 0,
          border: sub.is_completed ? '1px solid rgba(74,222,128,0.4)' : '1px solid var(--primary)',
          background: sub.is_completed ? 'rgba(74,222,128,0.12)' : 'var(--primary-container)',
          color: sub.is_completed ? '#4ade80' : 'var(--primary)',
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '11px',
          cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.25s', opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? '…' : sub.is_completed ? '✓ Done' : 'Complete'}
      </button>
    </div>
  )
}

/* ── ChapterCard ──────────────────────────────────────────── */
function ChapterCard({
  chapter,
  subjectId,
  subjectColor,
  token,
  onSubtopicToggle,
  onChapterProgressChange,
}: {
  chapter: Chapter
  subjectId: string
  subjectColor: string
  token: string
  onSubtopicToggle: (chapterId: string, subtopicId: string, newState: boolean) => void
  onChapterProgressChange: (chapterId: string, completedCount: number, total: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  // Load subtopics on first expand
  const handleExpand = async () => {
    const opening = !expanded
    setExpanded(opening)
    if (opening && chapter.subtopics === null && !chapter.loadingSubtopics) {
      // trigger load via event — parent handles fetch
      onSubtopicToggle(chapter.id, '__LOAD__', false)
    }
  }

  const subs = chapter.subtopics ?? []
  const prog = subs.length > 0 ? subtopicProgress(subs) : null
  const pct = prog !== null ? prog.pct : chapter.initialProgress
  const allDone = pct === 100

  return (
    <div
      className="glass-card"
      style={{
        marginBottom: '12px',
        border: allDone
          ? '1px solid rgba(74,222,128,0.4)'
          : expanded
          ? `1px solid ${subjectColor}44`
          : '1px solid var(--glass-border)',
        transition: 'border-color 0.3s',
      }}
    >
      {/* ── Header ── */}
      <button
        onClick={handleExpand}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          padding: '16px 18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
        }}
      >
        {/* Chapter number badge */}
        <div
          style={{
            minWidth: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
            background: allDone ? 'rgba(74,222,128,0.2)' : 'var(--primary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.78rem',
            color: allDone ? '#4ade80' : 'var(--primary)',
            transition: 'all 0.3s',
          }}
        >
          {allDone ? '✓' : `${chapter.chapter_num}`}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '5px',
          }}>
            <span style={{
              fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem',
              color: allDone ? '#4ade80' : 'var(--on-surface)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '170px', transition: 'color 0.3s',
            }}>
              {chapter.name}
            </span>
            <span style={{
              fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.82rem',
              color: allDone ? '#4ade80' : subjectColor,
              flexShrink: 0, marginLeft: '8px', transition: 'color 0.3s',
            }}>
              {pct !== null ? `${pct}%` : '—'}
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="progress-bar" style={{ height: '4px' }}>
            <div
              className="progress-fill"
              style={{
                width: pct !== null ? `${pct}%` : '0%',
                background: allDone ? '#4ade80' : subjectColor,
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.3s',
              }}
            />
          </div>

          {/* Meta */}
          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            {chapter.loadingSubtopics
              ? 'Loading subtopics…'
              : prog
              ? `${prog.done}/${prog.total} subtopics · ${chapter.weightage}% wt`
              : `${chapter.weightage}% weightage · tap to expand`}
          </div>
        </div>

        {/* Arrow */}
        <span style={{
          fontSize: '13px', color: 'var(--on-surface-variant)', flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s',
        }}>▾</span>
      </button>

      {/* ── Subtopics ── */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--glass-border)',
          animation: 'fadeInUp 0.2s ease',
        }}>
          {chapter.loadingSubtopics ? (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: '36px', borderRadius: '8px' }} />
              ))}
            </div>
          ) : subs.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--on-surface-variant)', fontSize: '0.85rem', textAlign: 'center' }}>
              No subtopics seeded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {subs.map((sub, idx) => (
                <div key={sub.id} style={{
                  borderBottom: idx < subs.length - 1 ? '1px solid var(--glass-border)' : 'none',
                }}>
                  <SubtopicRow
                    sub={sub}
                    chapterId={chapter.id}
                    subjectId={subjectId}
                    token={token}
                    onToggle={(subtopicId, newState) =>
                      onSubtopicToggle(chapter.id, subtopicId, newState)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function LearnPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [xpToast, setXpToast] = useState<number | null>(null)

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('sv_token') ?? '' : ''

  /* ── Load subjects ── */
  const fetchSubjects = useCallback(async () => {
    if (!token) return
    const res = await fetch('/api/subjects', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = await res.json()
    if (d.success) {
      setSubjects(d.data.subjects)
      const firstId = d.data.subjects[0]?.id ?? null
      setSelected(prev => prev ?? firstId)
    }
    setLoading(false)
  }, [token])

  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  /* ── Build chapters when subject changes ── */
  useEffect(() => {
    const subj = subjects.find(s => s.id === selected)
    if (!subj) return
    setChapters(prev => {
      // Keep a map of already-loaded subtopics so toggling a subtopic
      // (which updates `subjects` for the progress %) doesn't wipe the
      // expanded panel by resetting subtopics back to null.
      const prevMap = new Map(prev.map(c => [c.id, c]))
      return (subj.topics ?? [])
        .sort((a, b) => a.chapter_num - b.chapter_num)
        .map(t => {
          const existing = prevMap.get(t.id)
          return {
            id: t.id,
            name: t.name,
            chapter_num: t.chapter_num,
            difficulty: t.difficulty,
            weightage: t.weightage,
            subtopics: existing?.subtopics ?? null,          // preserve loaded subtopics
            loadingSubtopics: existing?.loadingSubtopics ?? false,
            initialProgress: t.progress?.mastery_level ?? 0,
          }
        })
    })
  }, [selected, subjects])

  /* ── Load subtopics for a chapter ── */
  const loadSubtopics = useCallback(async (chapterId: string) => {
    setChapters(prev =>
      prev.map(c => c.id === chapterId ? { ...c, loadingSubtopics: true } : c)
    )
    const res = await fetch(`/api/subtopics?topicId=${chapterId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = await res.json()
    setChapters(prev =>
      prev.map(c =>
        c.id === chapterId
          ? { ...c, subtopics: d.success ? d.data.subtopics : [], loadingSubtopics: false }
          : c
      )
    )
  }, [token])

  /* ── Handle subtopic toggle / load trigger ── */
  const handleSubtopicToggle = useCallback(
    (chapterId: string, subtopicId: string, newState: boolean) => {
      // Special signal: first expand, load subtopics
      if (subtopicId === '__LOAD__') {
        loadSubtopics(chapterId)
        return
      }

      // Optimistic toggle
      setChapters(prev =>
        prev.map(c => {
          if (c.id !== chapterId || !c.subtopics) return c
          const updated = c.subtopics.map(s =>
            s.id === subtopicId ? { ...s, is_completed: newState } : s
          )
          return { ...c, subtopics: updated }
        })
      )

      // Also update subject-level progress optimistically
      setSubjects(prev =>
        prev.map(subj => {
          if (subj.id !== selected) return subj
          const chapter = chapters.find(c => c.id === chapterId)
          if (!chapter?.subtopics) return subj

          const updatedSubs = chapter.subtopics.map(s =>
            s.id === subtopicId ? { ...s, is_completed: newState } : s
          )
          const chapterDone = updatedSubs.every(s => s.is_completed)
          const wasChapterDone = chapter.subtopics.every(s => s.is_completed)

          const delta = chapterDone && !wasChapterDone ? 1 : !chapterDone && wasChapterDone ? -1 : 0
          const newCompleted = Math.max(0, Math.min(subj.total_topics, subj.completed_topics + delta))
          const newProgress = subj.total_topics > 0
            ? Math.round((newCompleted / subj.total_topics) * 100)
            : 0

          return { ...subj, completed_topics: newCompleted, progress: newProgress }
        })
      )
    },
    [selected, chapters, loadSubtopics]
  )

  const activeSubject = subjects.find(s => s.id === selected)

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px' }}>

        {/* XP Toast */}
        {xpToast !== null && (
          <div style={{
            position: 'fixed', top: '24px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #FFB800, #ff8c00)',
            color: '#000', fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: '0.9rem', padding: '10px 22px',
            borderRadius: 'var(--radius-full)', zIndex: 9999,
            boxShadow: '0 4px 24px rgba(255,184,0,0.5)',
            animation: 'fadeInUp 0.3s ease', whiteSpace: 'nowrap',
          }}>
            +{xpToast} XP ⚡
          </div>
        )}

        <h2 style={{ marginBottom: '20px' }}>Learn 📚</h2>

        {/* Subject Tabs */}
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto',
          paddingBottom: '8px', marginBottom: '20px',
          scrollbarWidth: 'none', /* hide scrollbar on Firefox */
        }}>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              style={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                overflow: 'visible',
                borderRadius: 'var(--radius-full)',
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                cursor: 'pointer',
                border: selected === s.id ? 'none' : '1px solid var(--primary)',
                background: selected === s.id
                  ? 'linear-gradient(135deg, #FFB800, #ff8c00)'
                  : 'transparent',
                color: selected === s.id ? '#000' : 'var(--primary)',
                boxShadow: selected === s.id ? '0 0 20px rgba(255,184,0,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>

        {/* Subject Progress Card */}
        {activeSubject && (
          <div className="glass-card animate-pulse-glow" style={{ padding: '18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>{activeSubject.icon}</span>
                <div>
                  <h3 style={{ fontSize: '1rem' }}>{activeSubject.name}</h3>
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                    {activeSubject.completed_topics}/{activeSubject.total_topics} chapters completed
                  </div>
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontWeight: 700,
                color: activeSubject.color, fontSize: '1.7rem',
                lineHeight: 1, transition: 'color 0.3s',
              }}>
                {activeSubject.progress}%
              </div>
            </div>
            <div className="progress-bar" style={{ height: '8px' }}>
              <div className="progress-fill" style={{
                width: `${activeSubject.progress}%`,
                background: activeSubject.color,
                transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '16px',
          fontSize: '11px', color: 'var(--on-surface-variant)',
        }}>
          {[['EASY', '#4ade80'], ['MEDIUM', '#fbbf24'], ['HARD', '#ff6464']].map(([lbl, col]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: col, display: 'inline-block', boxShadow: `0 0 5px ${col}` }} />
              {lbl}
            </div>
          ))}
        </div>

        {/* Chapters */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: '84px', borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--on-surface-variant)' }}>
            No chapters found for this subject.
          </div>
        ) : (
          <div>
            {chapters.map(ch => (
              <ChapterCard
                key={ch.id}
                chapter={ch}
                subjectId={selected!}
                subjectColor={activeSubject?.color ?? 'var(--primary)'}
                token={token}
                onSubtopicToggle={handleSubtopicToggle}
                onChapterProgressChange={() => {}}
              />
            ))}
          </div>
        )}

        {/* SQL notice if subtopics missing */}
        <div style={{
          marginTop: '8px', padding: '12px 16px',
          background: 'rgba(255,184,0,0.08)',
          border: '1px solid rgba(255,184,0,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px', color: 'var(--on-surface-variant)',
          lineHeight: 1.6,
        }}>
          💡 <strong style={{ color: 'var(--tertiary)' }}>First time?</strong> Run <code style={{ color: 'var(--primary)', fontSize: '10px' }}>supabase/subtopics_migration.sql</code> in your Supabase SQL Editor to seed subtopics.
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
