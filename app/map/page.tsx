'use client'
import { useState, useEffect, useMemo } from 'react'
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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  
  const [aiLoading, setAiLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState('')

  // Load Data
  useEffect(() => {
    fetch('/api/map', {
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
  }, [])

  // Calculate topological layers for top-down Skill Tree rendering
  const layers = useMemo(() => {
    if (!data.nodes.length) return []
    
    const layerMap = new Map<string, number>()
    
    const getLayer = (id: string, visited = new Set<string>()): number => {
      if (layerMap.has(id)) return layerMap.get(id)!
      if (visited.has(id)) return 0 // Circular dependency fallback
      visited.add(id)
      
      const node = data.nodes.find(n => n.id === id)
      if (!node || !node.prerequisites || node.prerequisites.length === 0) {
        layerMap.set(id, 0)
        return 0
      }
      
      const maxP = Math.max(...node.prerequisites.map(p => getLayer(p, visited)))
      const layer = maxP + 1
      layerMap.set(id, layer)
      return layer
    }
    
    data.nodes.forEach(n => getLayer(n.id))
    
    const maxLayer = Math.max(0, ...Array.from(layerMap.values()))
    const newLayers: Node[][] = Array.from({ length: maxLayer + 1 }, () => [])
    
    data.nodes.forEach(n => {
      const l = layerMap.get(n.id) ?? 0
      newLayers[l].push(n)
    })
    
    return newLayers
  }, [data.nodes])

  const handleAiExplain = async () => {
    if (!selectedNode) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sv_token')}` },
        body: JSON.stringify({ query: `Explain why ${selectedNode.label} is hard to learn and suggest a custom micro-lesson.` })
      })
      const json = await res.json()
      if (json.success) setAiExplanation(json.data.explanation)
    } catch {
      setAiExplanation("AI failed to generate. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="page" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#050505', fontFamily: 'var(--font-body)' }}>
      
      {/* Header */}
      <div style={{ padding: '24px 20px 10px', zIndex: 10, background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)' }}>
        <h2 style={{ marginBottom: '4px', fontSize: '1.4rem', color: '#fff' }}>Knowledge Roadmap 🗺️</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', margin: 0 }}>
          Follow the path to master <b>Quantum Mechanics</b>.
        </p>
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
          {Object.entries(COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ccc', textTransform: 'uppercase', fontWeight: 600 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }}></span>
              {status.replace('-', ' ')}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Skill Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px 140px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {loading ? (
          <div style={{ color: 'var(--primary)', marginTop: '40px', fontSize: '1.2rem', animation: 'pulse 2s infinite' }}>Mapping Curriculum...</div>
        ) : layers.length === 0 ? (
          <div style={{ color: 'var(--on-surface-variant)', marginTop: '40px' }}>No concepts found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', width: '100%', maxWidth: '800px' }}>
            {layers.map((layer, layerIdx) => (
              <div key={layerIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                
                {/* Connector from previous layer */}
                {layerIdx > 0 && (
                  <div style={{ height: '40px', width: '2px', background: 'var(--glass-border)', marginBottom: '20px' }}></div>
                )}
                
                {/* Layer Nodes */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', width: '100%' }}>
                  {layer.map(node => {
                    const isSelected = selectedNode?.id === node.id
                    return (
                      <div 
                        key={node.id}
                        onClick={() => {
                          setSelectedNode(node)
                          setAiExplanation('')
                        }}
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(20,25,26,0.6)',
                          border: `2px solid ${isSelected ? COLORS[node.status] : 'var(--glass-border)'}`,
                          borderRadius: 'var(--radius-lg)',
                          padding: '16px',
                          width: '100%',
                          maxWidth: '260px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: isSelected ? `0 0 20px ${COLORS[node.status]}30` : 'none',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Status Indicator Bar */}
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: COLORS[node.status] }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', paddingLeft: '8px' }}>{node.label}</h3>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS[node.status], background: `${COLORS[node.status]}20`, padding: '2px 8px', borderRadius: '12px' }}>
                            {node.mastery_score}%
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 12px 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {node.why_it_matters}
                        </p>
                        
                        {/* Prerequisites tags */}
                        {node.prerequisites.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '8px' }}>
                            {node.prerequisites.map(pId => {
                              const pNode = data.nodes.find(n => n.id === pId)
                              return pNode ? (
                                <span key={pId} style={{ fontSize: '10px', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  Requires: {pNode.label}
                                </span>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Node Details Modal/Overlay */}
      {selectedNode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--surface)', border: `1px solid ${COLORS[selectedNode.status]}`,
            borderRadius: 'var(--radius-xl)', padding: '24px', width: '100%', maxWidth: '500px',
            boxShadow: `0 20px 50px rgba(0,0,0,0.5)`, position: 'relative',
            maxHeight: '85vh', overflowY: 'auto'
          }}>
            <button onClick={() => setSelectedNode(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            
            <div style={{ display: 'inline-block', fontSize: '10px', color: COLORS[selectedNode.status], border: `1px solid ${COLORS[selectedNode.status]}40`, padding: '4px 8px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '12px' }}>
              {selectedNode.status.replace('-', ' ')}
            </div>
            
            <h2 style={{ fontSize: '1.8rem', margin: '0 0 16px 0', color: '#fff' }}>{selectedNode.label}</h2>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>MASTERY SCORE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: COLORS[selectedNode.status] }}>{selectedNode.mastery_score}%</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>EST. TIME</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{selectedNode.estimated_time_minutes}m</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', marginBottom: '8px' }}>Why it matters</h4>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#e0e0e0', margin: '0 0 24px 0' }}>{selectedNode.why_it_matters}</p>

            {/* Blocking Prerequisites */}
            {selectedNode.prerequisites.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', marginBottom: '8px' }}>Prerequisites</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedNode.prerequisites.map(pId => {
                    const pNode = data.nodes.find(n => n.id === pId)
                    if (!pNode) return null
                    const isBlocking = pNode.mastery_score < 80
                    return (
                      <div key={pId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', border: `1px solid ${isBlocking ? 'rgba(255,100,100,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
                        <span style={{ fontSize: '16px' }}>{isBlocking ? '🔒' : '✅'}</span>
                        <span style={{ fontSize: '0.9rem', color: isBlocking ? '#ff6464' : '#4ade80' }}>{pNode.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* AI Assistant */}
            <div style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(119,1,208,0.1), rgba(0,242,255,0.05))', borderRadius: 'var(--radius-lg)', padding: '16px', border: '1px solid rgba(119,1,208,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '20px' }}>✨</span>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>AI Tutor</h4>
              </div>
              
              {aiExplanation ? (
                <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#e0e0e0' }}>{aiExplanation}</div>
              ) : (
                <button 
                  onClick={handleAiExplain} disabled={aiLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--primary-container)', color: 'var(--primary)', border: 'none', cursor: aiLoading ? 'wait' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  {aiLoading ? 'Generating Micro-Lesson...' : 'Explain this gap to me'}
                </button>
              )}
            </div>

            <button 
              onClick={() => router.push(`/explain?q=${encodeURIComponent(selectedNode.label)}`)}
              style={{ width: '100%', padding: '16px', borderRadius: 'var(--radius-full)', background: COLORS[selectedNode.status], color: '#000', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', transition: 'transform 0.2s' }}
            >
              Start Micro-Session 🚀
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
