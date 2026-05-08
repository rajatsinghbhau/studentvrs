import { NextRequest } from 'next/server'
import { successResponse, unauthorizedResponse } from '@/lib/utils'

// Mocking the complex data model requested
const MOCK_GRAPH = {
  nodes: [
    { id: 'n1', label: 'Basic Algebra', status: 'mastered', mastery_score: 95, estimated_time_minutes: 30, why_it_matters: 'The foundation of all equations.' },
    { id: 'n2', label: 'Trigonometry', status: 'mastered', mastery_score: 85, estimated_time_minutes: 45, why_it_matters: 'Required for calculating angles and wave functions.' },
    { id: 'n3', label: 'Vectors', status: 'in-progress', mastery_score: 60, estimated_time_minutes: 60, why_it_matters: 'Essential for understanding forces, velocity, and multi-dimensional movement.' },
    { id: 'n4', label: 'Kinematics', status: 'gap', mastery_score: 20, estimated_time_minutes: 90, why_it_matters: 'The study of motion without considering its causes. Essential for basic physics.' },
    { id: 'n5', label: 'Newton\'s Laws', status: 'locked', mastery_score: 0, estimated_time_minutes: 120, why_it_matters: 'The fundamental laws of classical mechanics that govern how things move.' },
    { id: 'n6', label: 'Work & Energy', status: 'locked', mastery_score: 0, estimated_time_minutes: 90, why_it_matters: 'Allows solving complex motion problems using conservation principles.' },
    { id: 'n7', label: 'Calculus (Derivatives)', status: 'gap', mastery_score: 10, estimated_time_minutes: 150, why_it_matters: 'The mathematics of continuous change, needed for advanced physics.' },
    { id: 'n8', label: 'Calculus (Integrals)', status: 'locked', mastery_score: 0, estimated_time_minutes: 150, why_it_matters: 'Calculates area under curves and total accumulated quantities.' },
    { id: 'n9', label: 'Electromagnetism', status: 'locked', mastery_score: 0, estimated_time_minutes: 200, why_it_matters: 'Unifies electricity and magnetism, governing modern technology.' },
    { id: 'n10', label: 'Quantum Mechanics', status: 'locked', mastery_score: 0, estimated_time_minutes: 300, why_it_matters: 'The physics of the atomic and subatomic realm.' },
  ],
  links: [
    { source: 'n1', target: 'n2', type: 'direct' },
    { source: 'n2', target: 'n3', type: 'direct' },
    { source: 'n1', target: 'n7', type: 'direct' },
    { source: 'n3', target: 'n4', type: 'direct' },
    { source: 'n7', target: 'n4', type: 'recommended' }, // helpful but not strictly blocking
    { source: 'n4', target: 'n5', type: 'direct' },
    { source: 'n5', target: 'n6', type: 'direct' },
    { source: 'n7', target: 'n8', type: 'direct' },
    { source: 'n8', target: 'n9', type: 'direct' },
    { source: 'n5', target: 'n9', type: 'direct' },
    { source: 'n9', target: 'n10', type: 'direct' },
    { source: 'n8', target: 'n10', type: 'direct' },
  ]
}

export async function GET(request: NextRequest) {
  try {
    // In a real app, we would fetch from DB and build this dynamically
    // For this prototype, we return the highly curated structure to meet the advanced UX spec
    
    // Process unlocks & prerequisites
    const nodesMap = new Map(MOCK_GRAPH.nodes.map(n => [n.id, { ...n, unlocks: [] as string[], prerequisites: [] as string[] }]))
    
    MOCK_GRAPH.links.forEach(l => {
      const src = nodesMap.get(l.source)
      const tgt = nodesMap.get(l.target)
      if (src && tgt && l.type === 'direct') {
        src.unlocks.push(l.target)
        tgt.prerequisites.push(l.source)
      }
    })

    const finalNodes = Array.from(nodesMap.values())
    
    // Dynamic status calculation based on prereqs
    finalNodes.forEach(n => {
      if (n.mastery_score >= 80) n.status = 'mastered'
      else if (n.mastery_score >= 30) n.status = 'in-progress'
      else {
        // It's < 30. Is it a gap or locked?
        const unmasteredPrereqs = n.prerequisites.filter(pId => {
          const pNode = nodesMap.get(pId)
          return pNode && pNode.mastery_score < 80
        })
        n.status = unmasteredPrereqs.length > 0 ? 'locked' : 'gap'
      }
    })

    return successResponse({ nodes: finalNodes, links: MOCK_GRAPH.links })
  } catch (err: any) {
    return successResponse(MOCK_GRAPH) // Fallback
  }
}
