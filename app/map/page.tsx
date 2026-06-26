'use client'
import { useState, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'
import { useRouter } from 'next/navigation'

interface Node {
  id: string
  label: string
  status: 'mastered' | 'in-progress' | 'gap' | 'locked'
  mastery_score: number
  prerequisites: string[]
  unlocks: string[]
  estimated_time_minutes: number
  why_it_matters: string
}

interface Link {
  source: string | Node
  target: string | Node
  type: 'direct' | 'recommended'
}

interface Subtopic {
  id: string
  name: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  order_num: number
  topic_id: string
  is_completed: boolean
  completed_at: string | null
}

const COLORS = {
  mastered: '#4ade80',    // Green
  'in-progress': '#fbbf24', // Amber
  gap: '#ff6464',         // Red
  locked: '#52525b',      // Gray
}

export default function KnowledgeMapPage() {
  const router = useRouter()
  
  const [data, setData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  
  // Available subjects and active selection
  const [subjects, setSubjects] = useState<any[]>([])
  const [activeSubject, setActiveSubject] = useState<string>('Physics')
  
  // Inline expansion states for subtopics and AI Explainer
  const [expandedNodes, setExpandedNodes] = useState<{ [id: string]: boolean }>({})
  const [subtopicsData, setSubtopicsData] = useState<{ [topicId: string]: Subtopic[] }>({})
  const [subtopicsLoading, setSubtopicsLoading] = useState<{ [topicId: string]: boolean }>({})
  
  const [aiExplanations, setAiExplanations] = useState<{ [nodeId: string]: string }>({})
  const [aiLoadingState, setAiLoadingState] = useState<{ [nodeId: string]: boolean }>({})

  // Fetch available subjects on mount
  useEffect(() => {
    fetch('/api/subjects', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('sv_token')}` }
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.subjects) {
          setSubjects(json.data.subjects)
          const names = json.data.subjects.map((s: any) => s.name)
          if (!names.includes('Physics') && names.length > 0) {
            setActiveSubject(names[0])
          }
        }
      })
      .catch(err => console.error("Failed to load subjects", err))
  }, [])

  // Load Main Map Data depending on activeSubject selection
  useEffect(() => {
    setLoading(true)
    setExpandedNodes({})
    setSubtopicsData({})
    setAiExplanations({})
    
    fetch(`/api/map?subject=${encodeURIComponent(activeSubject)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sv_token')}`
      }
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) setData(json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false)) // prevent hanging if error
  }, [activeSubject])

  // Toggle node expansion and load subtopics dynamically
  const toggleExpand = async (topicId: string) => {
    const isExpanded = !!expandedNodes[topicId]
    setExpandedNodes(prev => ({ ...prev, [topicId]: !isExpanded }))

    if (!isExpanded && !subtopicsData[topicId]) {
      setSubtopicsLoading(prev => ({ ...prev, [topicId]: true }))
      try {
        const res = await fetch(`/api/subtopics?topicId=${topicId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('sv_token')}` }
        })
        const json = await res.json()
        if (json.success) {
          setSubtopicsData(prev => ({ ...prev, [topicId]: json.data.subtopics || [] }))
        }
      } catch (err) {
        console.error("Failed to load subtopics:", err)
      } finally {
        setSubtopicsLoading(prev => ({ ...prev, [topicId]: false }))
      }
    }
  }

  // Trigger AI Tutor insights for a specific node
  const handleAiExplainForNode = async (node: Node) => {
    setAiLoadingState(prev => ({ ...prev, [node.id]: true }))
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('sv_token')}` 
        },
        body: JSON.stringify({ query: `Explain why ${node.label} is hard to learn and suggest a custom micro-lesson.` })
      })
      const json = await res.json()
      if (json.success) {
        setAiExplanations(prev => ({ ...prev, [node.id]: json.data.explanation }))
      }
    } catch {
      setAiExplanations(prev => ({ ...prev, [node.id]: "AI failed to generate insights. Please try again." }))
    } finally {
      setAiLoadingState(prev => ({ ...prev, [node.id]: false }))
    }
  }

  return (
    <div className="page map-page" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'var(--font-body)', position: 'relative' }}>
      
      {/* Floating Space Particles */}
      <div className="particle" style={{ width: '120px', height: '120px', top: '12%', left: '4%' }} />
      <div className="particle" style={{ width: '160px', height: '160px', top: '55%', right: '5%', background: 'var(--secondary)' }} />
      
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', zIndex: 10, background: 'rgba(13,21,21,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label-caps" style={{ color: 'var(--primary)', marginBottom: '4px', fontSize: '0.72rem', letterSpacing: '0.12em', fontWeight: 700 }}>NEURAL CURRICULUM TREE</div>
            <h2 style={{ marginBottom: '6px', fontSize: '1.4rem', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{activeSubject} Roadmap 🌌</h2>
          </div>
          
          {/* Quick stats panel */}
          {!loading && data.nodes.length > 0 && (
            <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mastered</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success)' }}>
                  {data.nodes.filter(n => n.status === 'mastered').length}/{data.nodes.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gaps</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--error)' }}>
                  {data.nodes.filter(n => n.status === 'gap').length}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Holographic Subject Tabs */}
        {subjects.length > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginTop: '16px', 
            background: 'rgba(0,0,0,0.3)', 
            padding: '4px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255,255,255,0.05)',
            width: 'max-content',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            maxWidth: '100%'
          }}>
            {subjects.map(subj => {
              const isSelected = activeSubject === subj.name
              const activeColor = subj.color || 'var(--primary)'
              const icon = subj.icon || '⚛️'
              
              return (
                <button
                  key={subj.id}
                  onClick={() => setActiveSubject(subj.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: isSelected ? `1px solid ${activeColor}40` : '1px solid transparent',
                    borderRadius: '10px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: isSelected ? '#fff' : 'var(--on-surface-variant)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? `0 0 10px ${activeColor}15` : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                  <span>{subj.name}</span>
                </button>
              )
            })}
          </div>
        )}
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
          {Object.entries(COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#ccc', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }}></span>
              {status.replace('-', ' ')}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Timeline */}
      <div style={{ flex: 1, position: 'relative', padding: '40px 20px 140px', overflowY: 'visible' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', width: 44, height: 44 }} />
            <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.08em' }}>MAPPING CURRICULUM GRAPH...</p>
          </div>
        ) : data.nodes.length === 0 ? (
          <div style={{ color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '60px' }}>No concepts found in physics curriculum.</div>
        ) : (
          <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            
            {/* Glowing Vertical Conduit timeline track */}
            <div className="conduit-line" />
            <div className="conduit-pulse" />
            
            <div className="timeline-container">
              {data.nodes.map((node, i) => {
                const isExpanded = !!expandedNodes[node.id]
                const statusColor = COLORS[node.status]
                const side = i % 2 === 0 ? 'left' : 'right'

                return (
                  <div key={node.id} className={`timeline-row ${side}`}>
                    
                    {/* Node Anchor Point directly on the central conduit */}
                    <div 
                      className="timeline-anchor" 
                      style={{ 
                        borderColor: statusColor, 
                        boxShadow: `0 0 12px ${statusColor}`,
                        background: isExpanded ? statusColor : 'var(--surface)'
                      }} 
                    />
                    
                    {/* Branch Horizontal Neon connector line */}
                    <div 
                      className="timeline-connector" 
                      style={{ 
                        background: `linear-gradient(${side === 'left' ? '270deg' : '90deg'}, ${statusColor}44 0%, transparent 100%)` 
                      }} 
                    />

                    {/* Glassmorphic Cyber Topic Card */}
                    <div 
                      onClick={() => toggleExpand(node.id)}
                      className="topic-card"
                      style={{
                        borderColor: isExpanded ? statusColor : 'var(--glass-border)',
                        boxShadow: isExpanded 
                          ? `0 0 25px ${statusColor}25, 0 12px 36px rgba(0,0,0,0.6)` 
                          : `0 8px 24px rgba(0, 0, 0, 0.4)`,
                        opacity: node.status === 'locked' ? 0.6 : 1
                      }}
                    >
                      {/* Mastery Progress Ring */}
                      <div style={{ position: 'absolute', top: '18px', right: '18px' }}>
                        <svg width="34" height="34" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="14" 
                            fill="none" 
                            stroke={statusColor} 
                            strokeWidth="3" 
                            strokeDasharray={`${node.mastery_score * 0.88}, 100`} 
                            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          />
                        </svg>
                      </div>

                      {/* Header label & Chapter */}
                      <div style={{ paddingRight: '40px' }}>
                        <div style={{ 
                          display: 'inline-block', 
                          fontSize: '8px', 
                          fontWeight: 800, 
                          color: statusColor, 
                          letterSpacing: '0.12em', 
                          textTransform: 'uppercase', 
                          marginBottom: '6px', 
                          background: `${statusColor}10`, 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          border: `1px solid ${statusColor}25` 
                        }}>
                          {`Chapter ${(i+1).toString().padStart(2, '0')}`}
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: '1.1rem', margin: '4px 0 8px 0', fontFamily: 'var(--font-heading)', color: '#fff', fontWeight: 650 }}>
                          {node.label}
                        </h3>

                        {/* Node Brief */}
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                          <span>⏱️ {node.estimated_time_minutes} mins</span>
                          <span>🎯 {node.mastery_score}% Mastery</span>
                        </div>
                      </div>

                      {/* Accordion Expand Action Indicator */}
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', fontSize: '0.75rem', color: statusColor, fontWeight: 700 }}>
                        <span style={{ marginRight: '6px' }}>{isExpanded ? 'Collapse Neural Branch' : 'Expand Neural Branch'}</span>
                        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                      </div>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div 
                          onClick={e => e.stopPropagation()} // Prevent card collapse when clicking child buttons
                          style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', cursor: 'default' }}
                        >
                          {/* Why it matters description */}
                          <h4 style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.08em', marginBottom: '8px' }}>💡 Chapter Importance</h4>
                          <p style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#b9cacb', margin: '0 0 16px 0' }}>{node.why_it_matters}</p>

                          {/* Subtopics Listing */}
                          <h4 style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.08em', marginBottom: '10px' }}>📁 Subtopic Roadmap</h4>
                          
                          {subtopicsLoading[node.id] ? (
                            <div style={{ padding: '12px 0', textAlign: 'center' }}>
                              <div className="spinner" style={{ width: 22, height: 22, margin: '0 auto 8px', borderWidth: 2 }} />
                              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>FETCHING SUBTOPICS...</span>
                            </div>
                          ) : subtopicsData[node.id]?.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 16px 0' }}>No subtopic roadmaps discovered.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', position: 'relative', paddingLeft: '16px' }}>
                              {/* Subtopic visual timeline rail */}
                              <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '1px', borderLeft: '2px dotted rgba(255,255,255,0.15)' }} />

                              {subtopicsData[node.id]?.map((sub) => (
                                <div 
                                  key={sub.id} 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '8px 12px', 
                                    background: 'rgba(0,0,0,0.2)', 
                                    borderRadius: '10px', 
                                    border: '1px solid rgba(255,255,255,0.03)' 
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '75%' }}>
                                    <span style={{ fontSize: '0.82rem', zIndex: 1 }}>{sub.is_completed ? '✅' : node.status === 'locked' ? '🔒' : '⚡'}</span>
                                    <span style={{ fontSize: '0.82rem', color: sub.is_completed ? '#7dfc9f' : node.status === 'locked' ? 'var(--outline)' : '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {sub.name}
                                    </span>
                                  </div>

                                  {node.status !== 'locked' && (
                                    <button
                                      onClick={() => router.push(`/explain?q=${encodeURIComponent(sub.name)}`)}
                                      style={{
                                        background: 'rgba(0,242,255,0.08)',
                                        border: '1px solid rgba(0,242,255,0.25)',
                                        color: 'var(--primary)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        flexShrink: 0
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,242,255,0.16)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,242,255,0.08)'}
                                    >
                                      Study 🔍
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Nova AI Tutor insights panel */}
                          {node.status !== 'locked' && (
                            <div style={{
                              background: 'linear-gradient(135deg, rgba(119,1,208,0.12) 0%, rgba(0,242,255,0.05) 100%)',
                              borderRadius: '14px',
                              padding: '16px',
                              border: '1px solid rgba(0,242,255,0.2)',
                              boxShadow: '0 0 20px rgba(0,242,255,0.03)',
                              marginBottom: '16px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '18px' }}>✨</span>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Nova AI Tutor Insights</h4>
                              </div>

                              {aiExplanations[node.id] ? (
                                <div 
                                  style={{ fontSize: '0.78rem', lineHeight: 1.5, color: '#e2f0f0', maxHeight: '120px', overflowY: 'auto', paddingRight: '6px' }}
                                  dangerouslySetInnerHTML={{ __html: aiExplanations[node.id].replace(/\n/g, '<br/>') }}
                                />
                              ) : (
                                <button
                                  onClick={() => handleAiExplainForNode(node)}
                                  disabled={aiLoadingState[node.id]}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 242, 255, 0.08)',
                                    color: 'var(--primary)',
                                    border: '1px solid rgba(0, 242, 255, 0.25)',
                                    cursor: aiLoadingState[node.id] ? 'wait' : 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.08)'}
                                >
                                  {aiLoadingState[node.id] ? 'Calibrating Quantum Insights...' : 'Analyze Knowledge Gap with AI'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Full Core explain button */}
                          {node.status !== 'locked' && (
                            <button 
                              onClick={() => router.push(`/explain?q=${encodeURIComponent(node.label)}`)}
                              style={{ 
                                width: '100%', 
                                padding: '12px', 
                                borderRadius: '9999px', 
                                background: statusColor, 
                                color: '#000', 
                                border: 'none', 
                                cursor: 'pointer', 
                                fontFamily: 'var(--font-heading)', 
                                fontWeight: 800, 
                                fontSize: '0.85rem', 
                                transition: 'all 0.2s',
                                boxShadow: `0 4px 15px ${statusColor}30`
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              Explore Chapter Core 🚀
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Embedded CSS Styles */}
      <style>{`
        .map-page {
          background: radial-gradient(circle at 50% 0%, #101c1c 0%, #050a0a 100%);
          background-attachment: fixed;
          position: relative;
          overflow: hidden;
        }
        .map-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
          z-index: 0;
        }
        
        .particle {
          position: absolute;
          border-radius: 50%;
          background: var(--primary);
          filter: blur(40px);
          opacity: 0.07;
          pointer-events: none;
          z-index: 0;
          animation: floatParticle 25s infinite linear;
        }
        
        .conduit-line {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          top: 0;
          bottom: 0;
          background: linear-gradient(180deg, 
            rgba(0,242,255,0.15) 0%, 
            rgba(119,1,208,0.3) 50%, 
            rgba(0,242,255,0.15) 100%
          );
          box-shadow: 0 0 10px rgba(0,242,255,0.1);
          z-index: 1;
        }
        
        .conduit-pulse {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 120px;
          background: linear-gradient(180deg, transparent, var(--primary), transparent);
          animation: conduitFlow 6s infinite linear;
          z-index: 2;
        }
        
        .timeline-container {
          position: relative;
          width: 100%;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 50px;
        }
        
        .timeline-row {
          display: flex;
          width: 100%;
          position: relative;
        }
        
        .timeline-row.left {
          justify-content: flex-start;
        }
        
        .timeline-row.right {
          justify-content: flex-end;
        }
        
        .timeline-anchor {
          position: absolute;
          left: 50%;
          top: 36px;
          transform: translate(-50%, -50%);
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 4px solid var(--primary);
          z-index: 4;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .timeline-connector {
          position: absolute;
          top: 36px;
          height: 2px;
          z-index: 1;
        }
        
        .left .timeline-connector {
          right: 50%;
          left: calc(50% - 100px);
          width: 100px;
        }
        
        .right .timeline-connector {
          left: 50%;
          right: calc(50% - 100px);
          width: 100px;
        }
        
        .topic-card {
          width: 44%;
          background: rgba(13, 21, 21, 0.75);
          backdrop-filter: blur(16px);
          border: 1px solid var(--glass-border);
          border-radius: 18px;
          padding: 20px;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          cursor: pointer;
          position: relative;
        }
        
        .topic-card:hover {
          transform: translateY(-4px);
          background: rgba(18, 28, 28, 0.85);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0, 242, 255, 0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes conduitFlow {
          0% { top: -120px; }
          100% { top: 100%; }
        }
        
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(-40px) translateX(20px) scale(1.1); }
        }

        @media (max-width: 768px) {
          .conduit-line {
            left: 20px;
            transform: none;
          }
          .conduit-pulse {
            left: 20px;
            transform: none;
          }
          .timeline-anchor {
            left: 20px;
            transform: translateY(-50%) translateX(-50%);
          }
          .timeline-row.left, .timeline-row.right {
            justify-content: flex-start;
            padding-left: 45px;
          }
          .topic-card {
            width: 100%;
          }
          .timeline-connector {
            left: 20px !important;
            width: 25px !important;
            right: auto !important;
          }
        }
      `}</style>

      <BottomNav />
    </div>
  )
}
