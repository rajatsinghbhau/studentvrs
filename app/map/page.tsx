'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import BottomNav from '@/components/BottomNav'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface Node {
  id: string
  label: string
  status: 'mastered' | 'in-progress' | 'gap' | 'locked'
  mastery_score: number
  prerequisites: string[]
  unlocks: string[]
  estimated_time_minutes: number
  why_it_matters: string
  x?: number
  y?: number
  fx?: number
  fy?: number
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
  const fgRef = useRef<any>(null)
  
  const [data, setData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  
  const [filter, setFilter] = useState<'All' | 'Mastered' | 'In Progress' | 'Gaps' | 'Locked'>('All')
  const [search, setSearch] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState('')

  // Load Data
  useEffect(() => {
    fetch('/api/map')
      .then(res => res.json())
      .then(json => {
        if (json.success) setData(json.data)
        setLoading(false)
      })
  }, [])

  // Highlight graph logic
  const highlightNodes = useMemo(() => new Set<string>(), [])
  const highlightLinks = useMemo(() => new Set<Link>(), [])

  // Calculate dependency chain for focus mode
  useEffect(() => {
    highlightNodes.clear()
    highlightLinks.clear()

    if (selectedNode && focusMode) {
      highlightNodes.add(selectedNode.id)
      
      // Traverse backwards (prereqs)
      const getPrereqs = (nodeId: string) => {
        const node = data.nodes.find(n => n.id === nodeId)
        if (!node) return
        node.prerequisites.forEach(pId => {
          highlightNodes.add(pId)
          const link = data.links.find(l => (typeof l.source === 'object' ? l.source.id === pId : l.source === pId) && (typeof l.target === 'object' ? l.target.id === nodeId : l.target === nodeId))
          if (link) highlightLinks.add(link)
          getPrereqs(pId)
        })
      }
      
      // Traverse forwards (unlocks)
      const getUnlocks = (nodeId: string) => {
        const node = data.nodes.find(n => n.id === nodeId)
        if (!node) return
        node.unlocks.forEach(uId => {
          highlightNodes.add(uId)
          const link = data.links.find(l => (typeof l.source === 'object' ? l.source.id === nodeId : l.source === nodeId) && (typeof l.target === 'object' ? l.target.id === uId : l.target === uId))
          if (link) highlightLinks.add(link)
          getUnlocks(uId)
        })
      }

      getPrereqs(selectedNode.id)
      getUnlocks(selectedNode.id)
    }
  }, [selectedNode, focusMode, data, highlightNodes, highlightLinks])

  // Click Interaction
  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node)
    setAiExplanation('')
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800)
      fgRef.current.zoom(3, 800)
    }
  }, [])

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

  // Filtered nodes for search logic
  useEffect(() => {
    if (search.trim() && fgRef.current) {
      const found = data.nodes.find(n => n.label.toLowerCase().includes(search.toLowerCase()))
      if (found && found.x && found.y) {
        fgRef.current.centerAt(found.x, found.y, 800)
        fgRef.current.zoom(3, 800)
        setSelectedNode(found)
      }
    }
  }, [search, data.nodes])

  // Custom Rendering
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Check filters
    const filterMatch = filter === 'All' 
      || (filter === 'Mastered' && node.status === 'mastered')
      || (filter === 'In Progress' && node.status === 'in-progress')
      || (filter === 'Gaps' && node.status === 'gap')
      || (filter === 'Locked' && node.status === 'locked')

    const isHighlighted = highlightNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id
    
    // Dim logic
    const isDimmed = !filterMatch || (focusMode && selectedNode && !isHighlighted && !isSelected)
    
    const r = 12 // Node radius
    const color = COLORS[node.status as keyof typeof COLORS] || '#fff'

    ctx.globalAlpha = isDimmed ? 0.2 : 1

    // Draw main circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false)
    ctx.fillStyle = node.status === 'locked' ? '#1a1a1a' : '#111'
    ctx.fill()
    
    ctx.lineWidth = 2
    ctx.strokeStyle = color
    ctx.stroke()

    // Draw Mastery Arc (Progress Ring)
    if (node.mastery_score > 0) {
      ctx.beginPath()
      const endAngle = (node.mastery_score / 100) * 2 * Math.PI - Math.PI / 2
      ctx.arc(node.x, node.y, r + 3, -Math.PI / 2, endAngle, false)
      ctx.lineWidth = 2
      ctx.strokeStyle = color
      ctx.stroke()
    }

    // Node Label
    if (globalScale > 1.2 || isSelected || isHighlighted) {
      const fontSize = 12 / globalScale
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.2)' : 'rgba(255, 255, 255, 0.9)'
      ctx.fillText(node.label, node.x, node.y + r + 8)
    }
    
    ctx.globalAlpha = 1
  }, [filter, focusMode, highlightNodes, selectedNode])

  return (
    <div className="page" style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#050505', fontFamily: 'var(--font-body)' }}>
      
      {/* --- TOP UI LAYER --- */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '20px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Title & Goal */}
        <div>
          <h2 style={{ marginBottom: '4px', fontSize: '1.2rem', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Knowledge Gap Map 🧠</h2>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 'var(--radius-full)', display: 'inline-block', backdropFilter: 'blur(10px)', pointerEvents: 'auto' }}>
            🎯 Target: <b>Quantum Mechanics</b>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search concepts..." 
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)', background: 'rgba(20,25,26,0.8)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
          />
          
          <button 
            onClick={() => setFocusMode(!focusMode)}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)', background: focusMode ? 'var(--primary)' : 'rgba(20,25,26,0.8)', color: focusMode ? '#000' : '#fff', border: focusMode ? 'none' : '1px solid var(--glass-border)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
          >
            {focusMode ? '🔍 Focus: ON' : '🔍 Focus: OFF'}
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', pointerEvents: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'Gaps', 'Mastered', 'In Progress', 'Locked'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)} style={{
              flexShrink: 0, padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600,
              border: filter === f ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
              background: filter === f ? 'var(--primary-container)' : 'rgba(20,25,26,0.8)',
              color: filter === f ? 'var(--primary)' : 'var(--on-surface-variant)', cursor: 'pointer'
            }}>
              {f === 'Gaps' ? '🔴' : f === 'Mastered' ? '🟢' : f === 'In Progress' ? '🟡' : f === 'Locked' ? '⚫' : '🌐'} {f}
            </button>
          ))}
        </div>
      </div>

      {/* --- GRAPH CANVAS --- */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.5rem', animation: 'pulse 2s infinite' }}>Mapping Brain...</div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            nodeLabel={() => ''} // Handled by custom tooltip/rendering
            nodeCanvasObject={paintNode}
            linkColor={(link: any) => {
              if (focusMode && selectedNode && !highlightLinks.has(link)) return 'rgba(255,255,255,0.02)'
              return link.type === 'recommended' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.25)'
            }}
            linkLineDash={(link: any) => link.type === 'recommended' ? [5, 5] : []}
            linkWidth={(link: any) => focusMode && highlightLinks.has(link) ? 2 : 1}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={(link: any) => focusMode && highlightLinks.has(link) ? 2 : 0}
            linkDirectionalParticleSpeed={0.01}
            onNodeClick={handleNodeClick}
            d3VelocityDecay={0.3}
            backgroundColor="#050505"
          />
        )}
      </div>

      {/* --- SIDE PANEL (CLICK INTERACTION) --- */}
      {selectedNode && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: '80px', width: '380px', maxWidth: '100%',
          background: 'rgba(10, 12, 14, 0.95)', backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${COLORS[selectedNode.status]}40`,
          padding: '24px', overflowY: 'auto', zIndex: 20,
          boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
          animation: 'slideInRight 0.3s ease',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Close Btn */}
          <button onClick={() => setSelectedNode(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>

          {/* Header */}
          <div style={{ display: 'inline-block', fontSize: '10px', color: COLORS[selectedNode.status], border: `1px solid ${COLORS[selectedNode.status]}40`, padding: '4px 8px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '12px', width: 'fit-content' }}>
            {selectedNode.status.replace('-', ' ')}
          </div>
          
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px 0' }}>{selectedNode.label}</h2>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>MASTERY</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: COLORS[selectedNode.status] }}>{selectedNode.mastery_score}%</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>EST. TIME</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{selectedNode.estimated_time_minutes}m</div>
            </div>
          </div>

          {/* 1. Why it matters */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', marginBottom: '8px' }}>Why it matters</h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#e0e0e0', margin: 0 }}>{selectedNode.why_it_matters}</p>
          </div>

          {/* 2. What's blocking you (Prerequisites) */}
          {selectedNode.prerequisites.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', marginBottom: '8px' }}>Prerequisites</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedNode.prerequisites.map(pId => {
                  const pNode = data.nodes.find(n => n.id === pId)
                  if (!pNode) return null
                  const isBlocking = pNode.mastery_score < 80
                  return (
                    <div key={pId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', border: `1px solid ${isBlocking ? 'rgba(255,100,100,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
                      <span style={{ fontSize: '14px' }}>{isBlocking ? '🔒' : '✅'}</span>
                      <span style={{ fontSize: '0.85rem', color: isBlocking ? '#ff6464' : '#4ade80' }}>{pNode.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI Explanation / Custom Micro-lesson */}
          <div style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(119,1,208,0.1), rgba(0,242,255,0.05))', borderRadius: 'var(--radius-lg)', padding: '16px', border: '1px solid rgba(119,1,208,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>AI Tutor</h4>
            </div>
            
            {aiExplanation ? (
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#e0e0e0' }}>{aiExplanation}</div>
            ) : (
              <button 
                onClick={handleAiExplain} disabled={aiLoading}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--primary-container)', color: 'var(--primary)', border: 'none', cursor: aiLoading ? 'wait' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                {aiLoading ? 'Generating Micro-Lesson...' : 'Explain this gap to me'}
              </button>
            )}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button 
              onClick={() => router.push(`/explain?q=${encodeURIComponent(selectedNode.label)}`)}
              style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-full)', background: COLORS[selectedNode.status], color: '#000', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', transition: 'transform 0.2s' }}
            >
              Start Micro-Session 🚀
            </button>
          </div>

        </div>
      )}

      <BottomNav />
      
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}} />
    </div>
  )
}
