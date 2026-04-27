'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

interface Card {
  id: string; front: string; back: string; difficulty: string
  next_review_at: string; interval_days: number
  topics: { name: string; subjects: { name: string; icon: string; color: string } } | null
}

export default function RevisionPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [stats, setStats] = useState({ total_cards: 0, due_today: 0 })
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionDone, setSessionDone] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    fetch('/api/revision?mode=due&limit=20', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) { setCards(d.data.cards); setStats(d.data.stats) } })
      .finally(() => setLoading(false))
  }, [token])

  const reviewCard = async (quality: number) => {
    const card = cards[index]
    if (!card) return
    // Fire-and-forget the API call so UI feels instant
    fetch(`/api/revision/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quality })
    }).catch(console.error)
    const nextIndex = index + 1
    setFlipped(false)
    setReviewed(r => r + 1)
    if (nextIndex >= cards.length) {
      setSessionDone(true)
    } else {
      setIndex(nextIndex)
    }
  }

  const [showCreate, setShowCreate] = useState(false)
  const [newCard, setNewCard] = useState({ front: '', back: '' })

  const createCard = async () => {
    await fetch('/api/revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newCard)
    })
    setShowCreate(false)
    setNewCard({ front: '', back: '' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
    </div>
  )

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Revision 🔄</h2>
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-secondary btn-sm">+ Card</button>
        </div>

        {/* Stats */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div style={{ fontSize: '20px' }}>📚</div>
            <div className="stat-value text-primary">{stats.due_today}</div>
            <div className="stat-label">Due Today</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: '20px' }}>✅</div>
            <div className="stat-value" style={{ color: '#4ade80' }}>{reviewed}</div>
            <div className="stat-label">Reviewed</div>
          </div>
        </div>

        {/* Create Card Form */}
        {showCreate && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '16px' }}>New Flashcard</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea placeholder="Front (Question/Concept)" value={newCard.front}
                onChange={e => setNewCard({ ...newCard, front: e.target.value })}
                className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} />
              <textarea placeholder="Back (Answer/Explanation)" value={newCard.back}
                onChange={e => setNewCard({ ...newCard, back: e.target.value })}
                className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} />
              <button onClick={createCard} className="btn btn-primary btn-full">Create Card</button>
            </div>
          </div>
        )}

        {/* Flashcard Session */}
        {sessionDone || cards.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {cards.length === 0 ? '🎉' : '⚡'}
            </div>
            <h3 style={{ marginBottom: '8px' }}>
              {cards.length === 0 ? 'No cards due!' : `Session Complete!`}
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
              {cards.length === 0 
                ? 'Come back later or create new cards' 
                : `You reviewed ${reviewed} cards. +${reviewed * 20} XP earned!`}
            </p>
            {reviewed > 0 && (
              <div style={{ padding: '12px', background: 'var(--primary-container)', borderRadius: '12px', marginBottom: '16px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>+{reviewed * 20} XP</span>
                <span className="text-muted text-sm"> earned this session</span>
              </div>
            )}
            <button onClick={() => { setIndex(0); setReviewed(0); setSessionDone(false); setFlipped(false) }}
              className="btn btn-primary btn-full">Review Again</button>
          </div>
        ) : !cards[index] ? null : (
          <div>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="text-muted text-sm">{index + 1} / {cards.length}</span>
              <span className={`badge badge-${cards[index].difficulty.toLowerCase()}`}>{cards[index].difficulty}</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: '20px' }}>
              <div className="progress-fill" style={{ width: `${((index) / cards.length) * 100}%` }} />
            </div>

            {/* Card */}
            <div onClick={() => setFlipped(!flipped)}
              style={{
                minHeight: '220px', cursor: 'pointer',
                background: 'var(--glass-bg)',
                border: `1px solid ${flipped ? 'var(--primary)' : 'var(--glass-border)'}`,
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', transition: 'all 0.3s',
                boxShadow: flipped ? 'var(--glow-primary)' : 'none',
                marginBottom: '20px'
              }}>
              <div className="label-caps" style={{ marginBottom: '12px', color: flipped ? 'var(--primary)' : 'var(--outline)' }}>
                {flipped ? 'ANSWER' : 'QUESTION — tap to flip'}
              </div>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--on-surface)', fontWeight: 500 }}>
                {flipped ? cards[index].back : cards[index].front}
              </p>
            </div>

            {/* Rating Buttons */}
            {flipped && (
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { label: 'Again', quality: 0, color: 'var(--error)', bg: 'rgba(255,100,100,0.1)' },
                  { label: 'Hard', quality: 1, color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)' },
                  { label: 'Good', quality: 3, color: 'var(--primary)', bg: 'var(--primary-container)' },
                  { label: 'Easy', quality: 5, color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
                ].map(btn => (
                  <button key={btn.label} onClick={() => reviewCard(btn.quality)}
                    style={{
                      flex: 1, padding: '12px 4px', borderRadius: 'var(--radius-md)',
                      background: btn.bg, border: `1px solid ${btn.color}`,
                      color: btn.color, cursor: 'pointer', fontFamily: 'var(--font-heading)',
                      fontWeight: 700, fontSize: '12px', transition: 'all 0.2s'
                    }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            {!flipped && (
              <button onClick={() => setFlipped(true)} className="btn btn-secondary btn-full">
                Flip Card ↩
              </button>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
