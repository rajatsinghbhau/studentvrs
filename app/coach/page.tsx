'use client'
import { useEffect, useRef, useState } from 'react'
import BottomNav from '@/components/BottomNav'

import Link from 'next/link'

interface Message { role: 'user' | 'assistant'; content: string; timestamp: string }

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const token = typeof window !== 'undefined' ? localStorage.getItem('sv_token') : ''

  useEffect(() => {
    fetch('/api/coach/history?limit=20', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setMessages(d.data.messages.map((m: { role: string; content: string; created_at: string }) => ({
          role: m.role, content: m.content, timestamp: m.created_at
        })))
        setHistoryLoaded(true)
      })
  }, [token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/coach/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: input })
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setMessages(prev => [...prev, { role: 'assistant', content: data.data.message, timestamp: data.data.timestamp }])
    }
  }

  const suggestions = [
    'Explain Newton\'s laws simply',
    'Help me with Integration',
    'How to improve weak areas?',
    'Create a study schedule for me',
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '430px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', background: 'rgba(13,21,21,0.95)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <Link href="/dashboard" style={{
          width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', background: 'var(--surface-container)', color: 'var(--on-surface)',
          textDecoration: 'none', border: '1px solid var(--glass-border)', fontSize: '18px', marginRight: '8px'
        }}>
          ←
        </Link>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary-container), rgba(119,1,208,0.2))',
          border: '1px solid var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
        }}>🤖</div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Nova AI Coach</div>
          <div style={{ fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
            Online · Powered by Gemini
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!historyLoaded && <div style={{ textAlign: 'center', padding: '20px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}

        {historyLoaded && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
            <h3 style={{ marginBottom: '8px' }}>Hey! I&apos;m Nova</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
              Your AI academic coach. Ask me anything about JEE/NEET concepts, study strategies, or get personalized advice.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left', border: '1px solid var(--glass-border)' }}>
                  💬 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px' }}>🤖</span>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>Nova</span>
              </div>
            )}
            <div style={{
              maxWidth: '85%', padding: '12px 16px',
              background: msg.role === 'user' ? 'var(--primary-container)' : 'var(--surface-container)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(0,242,255,0.3)' : 'var(--glass-border)'}`,
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              color: 'var(--on-surface)', fontSize: '0.9rem', lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🤖</span>
            <div style={{ padding: '12px 16px', background: 'var(--surface-container)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)',
                  animation: `pulse-glow 1s ${i * 0.2}s infinite`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px 28px',
        background: 'rgba(13,21,21,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex', gap: '10px', alignItems: 'flex-end'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Ask Nova anything..."
          className="input-field"
          style={{ flex: 1, minHeight: '44px', maxHeight: '120px', resize: 'none', padding: '10px 14px' }}
          rows={1}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', minWidth: '44px' }}>
          {loading ? '...' : '→'}
        </button>
      </div>
    </div>
  )
}
