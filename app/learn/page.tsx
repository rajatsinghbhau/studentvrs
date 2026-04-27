'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

interface Subject { id: string; name: string; icon: string; color: string; progress: number; completed_topics: number; total_topics: number; topics: Topic[] }
interface Topic { id: string; name: string; difficulty: string; weightage: number; chapter_num: number; progress: { is_completed: boolean; mastery_level: number; study_time: number } }

export default function LearnPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) { setSubjects(d.data.subjects); setSelected(d.data.subjects[0]?.id) } })
      .finally(() => setLoading(false))
  }, [token])

  const markComplete = async (topicId: string, subjectId: string, isCompleted: boolean) => {
    await fetch(`/api/topics/${topicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_completed: !isCompleted, subject_id: subjectId, study_time: 30 })
    })
    setSubjects(prev => prev.map(s => ({
      ...s,
      topics: (s.topics || []).map(t => t.id === topicId 
        ? { ...t, progress: { ...t.progress, is_completed: !isCompleted } } : t)
    })))
  }

  const activeSubject = subjects.find(s => s.id === selected)

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px' }}>
        <h2 style={{ marginBottom: '20px' }}>Learn 📚</h2>

        {/* Subject Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px' }}>
          {subjects.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)}
              className={`btn btn-sm ${selected === s.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap', borderRadius: 'var(--radius-full)', minWidth: 'fit-content' }}>
              {s.icon} {s.name}
            </button>
          ))}
        </div>

        {/* Subject Overview */}
        {activeSubject && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{activeSubject.icon}</span>
                <div>
                  <h3>{activeSubject.name}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                    {activeSubject.completed_topics}/{activeSubject.total_topics} completed
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: activeSubject.color, fontSize: '1.5rem' }}>
                {activeSubject.progress}%
              </div>
            </div>
            <div className="progress-bar" style={{ height: '8px' }}>
              <div className="progress-fill" style={{ width: `${activeSubject.progress}%`, background: activeSubject.color }} />
            </div>
          </div>
        )}

        {/* Topics List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '72px' }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(activeSubject?.topics || []).sort((a, b) => a.chapter_num - b.chapter_num).map(topic => (
              <div key={topic.id} className="glass-card-sm" style={{ 
                padding: '14px',
                opacity: topic.progress?.is_completed ? 0.7 : 1,
                border: topic.progress?.is_completed ? '1px solid rgba(74,222,128,0.3)' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => markComplete(topic.id, activeSubject!.id, topic.progress?.is_completed)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      border: `2px solid ${topic.progress?.is_completed ? '#4ade80' : 'var(--outline)'}`,
                      background: topic.progress?.is_completed ? '#4ade80' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.2s'
                    }}>
                    {topic.progress?.is_completed && <span style={{ color: '#000', fontSize: '12px' }}>✓</span>}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{topic.name}</span>
                      <span className={`badge badge-${topic.difficulty.toLowerCase()}`}>{topic.difficulty}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                      Ch.{topic.chapter_num} · {topic.weightage}% weightage
                      {topic.progress?.study_time > 0 && ` · ${topic.progress.study_time}m studied`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
