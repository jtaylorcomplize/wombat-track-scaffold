import React, { useEffect, useRef, useMemo } from 'react';

interface GovernanceLogEntry {
  id: string;
  ts: string;
  timestamp: string;
  actor: string;
  entryType: string;
  classification: string;
  project_id?: string;
  phase_id?: string;
  step_id?: string;
  summary: string;
  status?: string;
  gptDraftEntry?: string;
  details?: Record<string, unknown>;
  links?: string[];
  memory_anchor_id?: string;
  source?: string;
  driveSessionId?: string;
}

interface RelationshipGraphProps {
  logs: GovernanceLogEntry[];
  onNodeClick?: (log: GovernanceLogEntry) => void;
}

interface GraphNode {
  id: string;
  type: 'log' | 'phase' | 'step' | 'anchor' | 'actor';
  label: string;
  data?: GovernanceLogEntry;
  x?: number;
  y?: number;
  connections: string[];
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  logs,
  onNodeClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Build graph structure
  const graphData = useMemo(() => {
    const nodes = new Map<string, GraphNode>();
    const connections = new Set<string>();
    
    // Create log nodes
    logs.forEach(log => {
      const logNode: GraphNode = {
        id: `log-${log.id}`,
        type: 'log',
        label: log.summary.substring(0, 30) + (log.summary.length > 30 ? '...' : ''),
        data: log,
        connections: []
      };
      nodes.set(logNode.id, logNode);
      
      // Create phase node if exists
      if (log.phase_id) {
        const phaseId = `phase-${log.phase_id}`;
        if (!nodes.has(phaseId)) {
          nodes.set(phaseId, {
            id: phaseId,
            type: 'phase',
            label: log.phase_id,
            connections: []
          });
        }
        logNode.connections.push(phaseId);
        nodes.get(phaseId)!.connections.push(logNode.id);
        connections.add(`${logNode.id}-${phaseId}`);
      }
      
      // Create step node if exists
      if (log.step_id) {
        const stepId = `step-${log.step_id}`;
        if (!nodes.has(stepId)) {
          nodes.set(stepId, {
            id: stepId,
            type: 'step',
            label: log.step_id,
            connections: []
          });
        }
        logNode.connections.push(stepId);
        nodes.get(stepId)!.connections.push(logNode.id);
        connections.add(`${logNode.id}-${stepId}`);
      }
      
      // Create anchor node if exists
      if (log.memory_anchor_id) {
        const anchorId = `anchor-${log.memory_anchor_id}`;
        if (!nodes.has(anchorId)) {
          nodes.set(anchorId, {
            id: anchorId,
            type: 'anchor',
            label: log.memory_anchor_id,
            connections: []
          });
        }
        logNode.connections.push(anchorId);
        nodes.get(anchorId)!.connections.push(logNode.id);
        connections.add(`${logNode.id}-${anchorId}`);
      }
      
      // Create actor node
      const actorId = `actor-${log.actor}`;
      if (!nodes.has(actorId)) {
        nodes.set(actorId, {
          id: actorId,
          type: 'actor',
          label: log.actor,
          connections: []
        });
      }
      logNode.connections.push(actorId);
      nodes.get(actorId)!.connections.push(logNode.id);
      connections.add(`${logNode.id}-${actorId}`);
    });
    
    return { nodes: Array.from(nodes.values()), connections: Array.from(connections) };
  }, [logs]);
  
  // Force-directed layout algorithm
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Initialize node positions
    const nodes = graphData.nodes.map((node, i) => ({
      ...node,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0,
      vy: 0
    }));
    
    // Force simulation
    const simulate = () => {
      const alpha = 0.1;
      const repulsion = 5000;
      const attraction = 0.001;
      const damping = 0.9;
      
      // Apply forces
      nodes.forEach((node1) => {
        // Reset forces
        node1.vx = 0;
        node1.vy = 0;
        
        // Repulsion between all nodes
        nodes.forEach((node2, j) => {
          if (i === j) return;
          
          const dx = node1.x! - node2.x!;
          const dy = node1.y! - node2.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          
          node1.vx += (dx / dist) * force * alpha;
          node1.vy += (dy / dist) * force * alpha;
        });
        
        // Attraction for connected nodes
        node1.connections.forEach(connId => {
          const node2 = nodes.find(n => n.id === connId);
          if (!node2) return;
          
          const dx = node2.x! - node1.x!;
          const dy = node2.y! - node1.y!;
          
          node1.vx += dx * attraction * alpha;
          node1.vy += dy * attraction * alpha;
        });
        
        // Apply damping and update position
        node1.vx *= damping;
        node1.vy *= damping;
        node1.x! += node1.vx;
        node1.y! += node1.vy;
        
        // Keep nodes within bounds
        node1.x = Math.max(50, Math.min(canvas.width - 50, node1.x!));
        node1.y = Math.max(50, Math.min(canvas.height - 50, node1.y!));
      });
    };
    
    // Animation loop
    let animationId: number;
    const animate = () => {
      simulate();
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      nodes.forEach(node1 => {
        node1.connections.forEach(connId => {
          const node2 = nodes.find(n => n.id === connId);
          if (!node2) return;
          
          ctx.beginPath();
          ctx.moveTo(node1.x!, node1.y!);
          ctx.lineTo(node2.x!, node2.y!);
          ctx.stroke();
        });
      });
      
      // Draw nodes
      nodes.forEach(node => {
        const size = node.type === 'log' ? 8 : 10;
        
        // Node color based on type
        switch (node.type) {
          case 'log':
            ctx.fillStyle = '#3b82f6';
            break;
          case 'phase':
            ctx.fillStyle = '#8b5cf6';
            break;
          case 'step':
            ctx.fillStyle = '#10b981';
            break;
          case 'anchor':
            ctx.fillStyle = '#f59e0b';
            break;
          case 'actor':
            ctx.fillStyle = '#6b7280';
            break;
        }
        
        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw node label
        ctx.fillStyle = '#374151';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x!, node.y! + size + 15);
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle clicks
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Find clicked node
      const clickedNode = nodes.find(node => {
        const dx = x - node.x!;
        const dy = y - node.y!;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < 15;
      });
      
      if (clickedNode && clickedNode.type === 'log' && clickedNode.data && onNodeClick) {
        onNodeClick(clickedNode.data);
      }
    };
    
    canvas.addEventListener('click', handleClick);
    
    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('click', handleClick);
    };
  }, [graphData, onNodeClick]);
  
  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ minHeight: '500px' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Legend</h4>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Log Entry</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Phase</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Step</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Memory Anchor</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Actor</span>
        </div>
      </div>
      
      {/* Info */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <p className="text-xs text-gray-600">
          Click on log nodes to view details
        </p>
      </div>
    </div>
  );
};