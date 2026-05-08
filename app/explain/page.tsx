'use client'
import { useState } from 'react'
import BottomNav from '@/components/BottomNav'

interface Formula { formula: string; name: string; variables: string }
interface YTVideo { videoId: string; title: string; author: string; lengthSeconds: number; query: string }

interface ExplainData {
  title: string
  subject: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  one_liner: string
  explanation: string
  key_points: string[]
  formulas: Formula[]
  real_world_example: string
  common_mistakes: string[]
  jee_neet_tip: string
  youtube_query: string
  video: YTVideo | null
  related_topics: string[]
}

const DIFF_COLOR = { EASY: '#4ade80', MEDIUM: '#fbbf24', HARD: '#ff6464' }
const SUBJECT_EMOJI: Record<string, string> = {
  Physics: '⚛️', Chemistry: '🧪', Mathematics: '📐', Biology: '🧬', General: '💡',
}
const YT_LABELS = ['🎓 Concept', '🧮 Problems', '✨ Visual']
const YT_COLORS = ['#00F2FF', '#dcb8ff', '#FFB800']

const SUGGESTIONS = [
  "Newton's Second Law of Motion",
  'How does photoelectric effect work?',
  'Explain integration by parts',
  'What is hybridization in chemistry?',
  'How to solve quadratic equations?',
  'Explain DNA replication',
  "What is Gauss's Law?",
  "Explain Bayes' Theorem",
]

function fmtDuration(s: number) {
  if (!s) return ''
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function VideoCard({ video, index }: { video: YTVideo; index: number }) {
  const [playing, setPlaying] = useState(false)
  const color = YT_COLORS[index] || '#00F2FF'

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${color}30`,
      overflow: 'hidden',
      background: `${color}08`,
    }}>
      {/* Label */}
      <div style={{
        padding: '10px 14px 6px',
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color,
        fontFamily: 'var(--font-heading)',
      }}>
        {YT_LABELS[index] || '🎬 Video'}
      </div>

      {/* Embed or Thumbnail */}
      {playing ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          style={{
            position: 'relative', display: 'block', width: '100%',
            aspectRatio: '16/9', background: '#000', cursor: 'pointer',
            border: 'none', padding: 0, overflow: 'hidden',
          }}
        >
          {/* YouTube thumbnail */}
          <img
            src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
            alt={video.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Play button overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}>
            <div style={{
              width: '54px', height: '54px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${color}80`,
              transition: 'transform 0.2s',
            }}>
              <span style={{ fontSize: '22px', marginLeft: '4px' }}>▶</span>
            </div>
          </div>
          {/* Duration badge */}
          {video.lengthSeconds > 0 && (
            <div style={{
              position: 'absolute', bottom: '8px', right: '8px',
              background: 'rgba(0,0,0,0.8)', color: '#fff',
              fontSize: '11px', fontWeight: 700, padding: '2px 6px',
              borderRadius: '4px', fontFamily: 'monospace',
            }}>
              {fmtDuration(video.lengthSeconds)}
            </div>
          )}
        </button>
      )}

      {/* Video info */}
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{
          fontSize: '0.82rem', fontWeight: 600, color: 'var(--on-surface)',
          lineHeight: 1.4, marginBottom: '3px',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {video.title}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
          {video.author}
        </div>
      </div>
    </div>
  )
}

export default function ExplainPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ExplainData | null>(null)
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') ?? '' : ''

  const handleSubmit = async (q?: string) => {
    const finalQuery = (q || query).trim()
    if (!finalQuery) return
    setQuery(finalQuery)
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: finalQuery }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setData(json.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '28px' }}>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '4px' }}>Explain It 🔍</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
            Ask anything — AI explanation + YouTube videos, right here
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Type any topic or question… e.g. 'How does Newton's 3rd law work?'"
            rows={3}
            style={{
              width: '100%', background: 'rgba(25,33,34,0.9)',
              border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)',
              padding: '14px 16px 44px', fontFamily: 'var(--font-body)',
              fontSize: '0.9rem', color: 'var(--on-surface)', outline: 'none',
              resize: 'none', transition: 'border-color 0.3s', lineHeight: 1.5,
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--outline-variant)')}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            style={{
              position: 'absolute', bottom: '10px', right: '10px',
              background: loading ? 'var(--surface-container-high)' : 'linear-gradient(135deg, #00F2FF, #00dbe7)',
              color: loading ? 'var(--on-surface-variant)' : '#000',
              border: 'none', borderRadius: 'var(--radius-md)',
              padding: '8px 18px', fontFamily: 'var(--font-heading)',
              fontWeight: 700, fontSize: '0.8rem',
              cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳ Thinking…' : '✦ Explain'}
          </button>
        </div>

        {/* Suggestions */}
        {!data && !loading && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Try these
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSubmit(s)} style={{
                  background: 'var(--surface-container)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-full)', padding: '6px 14px',
                  fontSize: '0.75rem', color: 'var(--on-surface-variant)',
                  fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--primary)'; el.style.color = 'var(--primary)' }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--glass-border)'; el.style.color = 'var(--on-surface-variant)' }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'float 1.5s ease-in-out infinite' }}>🧠</div>
              Generating explanation + finding videos…
            </div>
            {[100, 200, 160, 220].map((h, i) => (
              <div key={i} className="skeleton" style={{ height: `${h}px`, borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', color: '#ff6464', fontSize: '0.85rem', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease' }}>

            {/* Title Card */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px' }}>{SUBJECT_EMOJI[data.subject] || '💡'}</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{data.title}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                      color: DIFF_COLOR[data.difficulty],
                      background: `${DIFF_COLOR[data.difficulty]}18`,
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      border: `1px solid ${DIFF_COLOR[data.difficulty]}44`,
                    }}>{data.difficulty}</span>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{data.subject}</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.87rem', color: 'var(--primary)', fontStyle: 'italic', lineHeight: 1.5 }}>"{data.one_liner}"</p>
            </div>

            {/* Embedded Video */}
            {data.video && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '14px' }}>
                  🎬 Best Lecture Video
                </div>
                <VideoCard video={data.video} index={0} />
              </div>
            )}

            {/* If no video found, fallback to YouTube search link */}
            {!data.video && data.youtube_query && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>
                  🎬 Find on YouTube
                </div>
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.youtube_query)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', textDecoration: 'none' }}>
                  <span style={{ color: YT_COLORS[0] }}>▶</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--on-surface)' }}>Search: {data.youtube_query}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--on-surface-variant)', fontSize: '11px' }}>↗</span>
                </a>
              </div>
            )}

            {/* Explanation */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>📖 Explanation</div>
              {data.explanation.split('\n\n').map((para, i) => (
                <p key={i} style={{ fontSize: '0.87rem', lineHeight: 1.75, color: 'var(--on-surface)', marginBottom: '10px' }}>{para}</p>
              ))}
            </div>

            {/* Key Points */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>⚡ Key Points</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.key_points.map((pt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, background: 'var(--primary-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{i + 1}</div>
                    <span style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--on-surface)', paddingTop: '2px' }}>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulas */}
            {data.formulas?.length > 0 && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>🔢 Formulas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.formulas.map((f, i) => (
                    <div key={i} style={{ background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.15)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '4px' }}>{f.formula}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '2px' }}>{f.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{f.variables}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real World Example */}
            <div className="glass-card" style={{ padding: '20px', background: 'rgba(119,1,208,0.08)', border: '1px solid rgba(119,1,208,0.2)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: '10px' }}>🌍 Real World Example</div>
              <p style={{ fontSize: '0.87rem', lineHeight: 1.75, color: 'var(--on-surface)' }}>{data.real_world_example}</p>
            </div>

            {/* JEE/NEET Tip */}
            <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.25)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tertiary)', marginBottom: '8px' }}>🎯 JEE / NEET Tip</div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--on-surface)' }}>{data.jee_neet_tip}</p>
            </div>

            {/* Common Mistakes */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ff6464', marginBottom: '12px' }}>⚠️ Common Mistakes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.common_mistakes.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#ff6464', flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--on-surface)' }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Topics */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '10px' }}>🔗 Related Topics</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.related_topics.map(rt => (
                  <button key={rt} onClick={() => handleSubmit(rt)} style={{ background: 'var(--primary-container)', border: '1px solid rgba(0,242,255,0.2)', borderRadius: 'var(--radius-full)', padding: '6px 14px', fontSize: '0.78rem', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                    {rt} →
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
      <BottomNav />
    </div>
  )
}
