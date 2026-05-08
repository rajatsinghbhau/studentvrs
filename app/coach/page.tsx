'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  id: string
}

// Simple markdown renderer: bold, italic, numbered lists, bullet lists, code
function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```[\s\S]*?```/g, m => `<pre style="background:rgba(0,0,0,0.4);border:1px solid rgba(0,242,255,0.15);border-radius:8px;padding:12px;overflow-x:auto;font-size:0.8rem;margin:8px 0;"><code>${m.slice(3, -3).replace(/^[a-z]*\n/, '')}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);border:1px solid rgba(0,242,255,0.2);border-radius:4px;padding:2px 6px;font-size:0.85em;">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--primary);">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:var(--primary);min-width:20px;font-weight:600;">•</span><span>$1</span></div>')
    // Bullet lists
    .replace(/^[-•]\s+(.+)/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:var(--primary);min-width:20px;">›</span><span>$1</span></div>')
    // Double newline → paragraph break
    .replace(/\n\n/g, '<br/><br/>')
    // Single newline → line break
    .replace(/\n/g, '<br/>')
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  // Load history on mount
  useEffect(() => {
    const token = getToken()
    fetch('/api/coach/history?limit=20', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data?.messages)) {
          setMessages(
            d.data.messages.map((m: { role: string; content: string; created_at: string; id: string }) => ({
              id: m.id || crypto.randomUUID(),
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.created_at,
            }))
          )
        }
      })
      .catch(() => {/* history load failure is non-fatal */})
      .finally(() => setHistoryLoaded(true))
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim()
    if (!text || loading) return

    setError(null)
    setInput('')

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    abortRef.current = new AbortController()

    try {
      const token = getToken()
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
        signal: abortRef.current.signal,
      })

      const data = await res.json()

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.data.message,
            timestamp: data.data.timestamp || new Date().toISOString(),
          },
        ])
      } else {
        setError(data.error || 'Failed to get a response. Please try again.')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Connection error. Please check your internet and try again.')
      }
    } finally {
      setLoading(false)
      abortRef.current = null
      textareaRef.current?.focus()
    }
  }, [input, loading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const cancelRequest = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  const clearChat = async () => {
    const token = getToken()
    await fetch('/api/coach/history', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setMessages([])
    setError(null)
  }

  const suggestions = [
    "Explain Newton's laws with examples",
    'Help me understand Integration',
    'How do I improve my weak areas?',
    'Create a 30-day study schedule',
  ]

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '430px',
      margin: '0 auto',
      background: 'var(--surface, #0d1515)',
      position: 'relative',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 20px',
        background: 'rgba(13,21,21,0.97)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border, rgba(0,242,255,0.12))',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <Link href="/dashboard" style={{
          width: '34px', height: '34px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: 'var(--surface-container, rgba(255,255,255,0.05))',
          color: 'var(--on-surface, #e0e0e0)',
          textDecoration: 'none',
          border: '1px solid var(--glass-border, rgba(0,242,255,0.12))',
          fontSize: '16px', flexShrink: 0,
        }}>←</Link>

        <div style={{
          width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,242,255,0.2), rgba(119,1,208,0.25))',
          border: '1px solid rgba(0,242,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>🤖</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Nova AI Coach</div>
          <div style={{ fontSize: '10px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Online · Powered by Llama 3.3
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            title="Clear chat"
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', borderRadius: '8px',
              padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Messages Area ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,242,255,0.15) transparent',
      }}>

        {/* Loading skeleton */}
        {!historyLoaded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 0' }}>
            {[70, 50, 85].map((w, i) => (
              <div key={i} style={{
                height: '40px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                width: `${w}%`,
                alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                animation: 'pulse-glow 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Empty state with suggestions */}
        {historyLoaded && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>🤖</div>
            <h3 style={{ marginBottom: '6px', fontSize: '1.1rem' }}>Hey, I&apos;m Nova!</h3>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '24px', lineHeight: 1.6 }}>
              Your AI academic coach for JEE &amp; NEET prep.<br />
              Ask me anything — concepts, strategies, or motivation.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: 'rgba(0,242,255,0.04)',
                    border: '1px solid rgba(0,242,255,0.15)',
                    borderRadius: '12px', padding: '10px 14px',
                    color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(0,242,255,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(0,242,255,0.3)'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(0,242,255,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(0,242,255,0.15)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                  }}
                >
                  <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>💬</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                <span style={{ fontSize: '13px' }}>🤖</span>
                <span style={{ fontSize: '10px', color: 'rgba(0,242,255,0.7)', fontWeight: 600, letterSpacing: '0.5px' }}>NOVA</span>
              </div>
            )}

            <div style={{
              maxWidth: '88%',
              padding: '11px 15px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(119,1,208,0.12))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(0,242,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.875rem',
              lineHeight: 1.65,
            }}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>

            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInUp 0.2s ease' }}>
            <span style={{ fontSize: '13px' }}>🤖</span>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px 16px 16px 16px',
              display: 'flex', gap: '5px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'rgba(0,242,255,0.7)',
                  animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
            <button
              onClick={cancelRequest}
              style={{
                fontSize: '10px', padding: '4px 8px',
                background: 'none', border: '1px solid rgba(255,100,100,0.3)',
                color: 'rgba(255,100,100,0.6)', borderRadius: '6px',
                cursor: 'pointer',
              }}
            >Stop</button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,60,60,0.08)',
            border: '1px solid rgba(255,60,60,0.2)',
            borderRadius: '10px', fontSize: '0.8rem',
            color: 'rgba(255,180,180,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          }}>
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,180,180,0.6)', cursor: 'pointer', fontSize: '14px' }}
            >✕</button>
          </div>
        )}

        <div ref={bottomRef} style={{ height: '1px' }} />
      </div>

      {/* ── Input Area ── */}
      <div style={{
        padding: '10px 14px 28px',
        background: 'rgba(13,21,21,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border, rgba(0,242,255,0.12))',
        display: 'flex', gap: '8px', alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Nova anything... (Enter to send)"
          disabled={loading}
          rows={1}
          style={{
            flex: 1,
            minHeight: '44px',
            maxHeight: '120px',
            resize: 'none',
            padding: '11px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${input ? 'rgba(0,242,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
            overflowY: 'auto',
            opacity: loading ? 0.6 : 1,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,242,255,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = input ? 'rgba(0,242,255,0.3)' : 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            width: '44px', height: '44px', flexShrink: 0,
            borderRadius: '12px',
            background: loading || !input.trim()
              ? 'rgba(255,255,255,0.06)'
              : 'linear-gradient(135deg, rgba(0,242,255,0.3), rgba(119,1,208,0.35))',
            border: `1px solid ${loading || !input.trim() ? 'rgba(255,255,255,0.1)' : 'rgba(0,242,255,0.4)'}`,
            color: loading || !input.trim() ? 'rgba(255,255,255,0.25)' : '#fff',
            fontSize: '18px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          aria-label="Send message"
        >
          {loading ? '⏳' : '→'}
        </button>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
