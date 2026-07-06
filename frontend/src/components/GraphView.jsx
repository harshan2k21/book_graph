import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { LoadingSpinner } from './ui';

// ── Edge type visual config ──
const EDGE_STYLES = {
  author:   { color: '#10b981', label: 'Same Author',       icon: 'person',       dash: '' },
  theme:    { color: '#8b5cf6', label: 'Thematic Link',     icon: 'auto_awesome', dash: '' },
  emotional:{ color: '#f43f5e', label: 'Emotional Resonance', icon: 'favorite',   dash: '2,3' },
  style:    { color: '#06b6d4', label: 'Narrative Style',   icon: 'menu_book',    dash: '4,2' },
};


// Authentic library book covers (same as BookCard for consistency)
const LIBRARY_COVERS = [
  { bg: '#6b1a1a', text: '#f5e6d0' },  // Burgundy
  { bg: '#1a3a2a', text: '#d4ead8' },  // Forest Green
  { bg: '#0f2a4a', text: '#c8ddf5' },  // Navy Ink
  { bg: '#6b3a1a', text: '#f5e4c8' },  // Cognac
  { bg: '#2a2010', text: '#e8d8a0' },  // Dark Walnut
  { bg: '#4a1a35', text: '#f5d0e4' },  // Plum
  { bg: '#1a2a3a', text: '#c8d8e8' },  // Slate Blue
  { bg: '#3a2a0a', text: '#f0e0a0' },  // Antique Gold
  { bg: '#1a3a3a', text: '#c0e0dc' },  // Teal Cloth
  { bg: '#3a1010', text: '#f0cec8' },  // Deep Red
  { bg: '#2a3a1a', text: '#d8e8c0' },  // Sage Green
  { bg: '#1a1a3a', text: '#c8c8f0' },  // Midnight Blue
];

const getCover = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LIBRARY_COVERS[Math.abs(hash) % LIBRARY_COVERS.length];
};

export function GraphView({ refreshTrigger }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const zoomRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [threshold, setThreshold] = useState(0.60);

  // Interactive UI States
  const [selectedBook, setSelectedBook] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [edgeTooltip, setEdgeTooltip] = useState(null);

  // ── Fetch Graph Data ──
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGraph(threshold);
      setGraphData(data);
      // Keep selected book reference fresh if it exists
      if (selectedBook) {
        const updated = data.nodes.find(n => n.id === selectedBook.id);
        if (updated) setSelectedBook(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph, refreshTrigger]);

  // ── D3 force graph simulation ──
  useEffect(() => {
    if (loading || !svgRef.current || !wrapRef.current) return;

    const { nodes: rawNodes, edges } = graphData;
    if (rawNodes.length === 0) return;

    const width = wrapRef.current.clientWidth || 900;
    const height = wrapRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Zoom container
    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    // Define filters and markers
    const defs = svg.append('defs');

    // Glow filter for thematic edges
    const glowTheme = defs.append('filter').attr('id', 'glow-theme');
    glowTheme.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const mergeTheme = glowTheme.append('feMerge');
    mergeTheme.append('feMergeNode').attr('in', 'coloredBlur');
    mergeTheme.append('feMergeNode').attr('in', 'SourceGraphic');

    // Glow filter for author edges (green)
    const glowAuthor = defs.append('filter').attr('id', 'glow-author');
    glowAuthor.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
    const mergeAuthor = glowAuthor.append('feMerge');
    mergeAuthor.append('feMergeNode').attr('in', 'coloredBlur');
    mergeAuthor.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers for each edge type
    [
      { id: 'arrow-author', color: '#10b981' },
      { id: 'arrow-contextual', color: '#f59e0b' },
      { id: 'arrow-theme', color: '#8b5cf6' },
    ].forEach(({ id, color }) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 38).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
        .attr('opacity', 0.6);
    });


    // Clone data for safety
    const nodes = rawNodes.map((n) => ({ ...n }));
    const nodeIndex = {};
    nodes.forEach((n, i) => { nodeIndex[n.id] = i; });

    const links = edges.map((e) => ({
      source: nodeIndex[parseInt(e.source)],
      target: nodeIndex[parseInt(e.target)],
      sourceId: parseInt(e.source),
      targetId: parseInt(e.target),
      similarity: parseFloat(e.similarity),
      edgeType: e.edgeType,
      sameAuthor: e.sameAuthor,
      breakdown: e.breakdown,
      scores: e.scores,
    })).filter((l) => l.source !== undefined && l.target !== undefined);

    // Force Setup
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((_, i) => i).distance(180).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(70));
    // Build connection count map
    const connCount = {};
    links.forEach(l => {
      const si = typeof l.source === 'object' ? l.source.id : nodes[l.source]?.id;
      const ti = typeof l.target === 'object' ? l.target.id : nodes[l.target]?.id;
      if (si !== undefined) connCount[si] = (connCount[si] || 0) + 1;
      if (ti !== undefined) connCount[ti] = (connCount[ti] || 0) + 1;
    });

    // Draw link edges
    const linkG = g.append('g').attr('class', 'links');
    const link = linkG.selectAll('path')
      .data(links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => EDGE_STYLES[d.edgeType]?.color || '#8b5cf6')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d) => 2 + d.similarity * 4)
      .attr('marker-end', (d) => `url(#arrow-${d.edgeType})`)
      .attr('filter', (d) => {
        if (d.edgeType === 'theme') return 'url(#glow-theme)';
        if (d.edgeType === 'author') return 'url(#glow-author)';
        return '';
      })
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setEdgeTooltip({ x: event.clientX, y: event.clientY - 20, data: d });
      })
      .on('mousemove', (event) => {
        setEdgeTooltip((prev) => prev ? { ...prev, x: event.clientX, y: event.clientY - 20 } : prev);
      })
      .on('mouseleave', () => setEdgeTooltip(null));



    // Draw book node groups
    const nodeG = g.append('g').attr('class', 'nodes');
    const node = nodeG.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .style('opacity', 1.0)
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Render HTML Book Covers inside SVG using foreignObject
    node.each(function (d) {
      const el = d3.select(this);
      const cover = getCover(d.title || 'Unknown');
      const initial = d.title ? d.title.charAt(0).toUpperCase() : '?';

      // Add a foreignObject to hold the HTML cover
      const fo = el.append('foreignObject')
        .attr('width', 64)
        .attr('height', 96)
        .attr('x', -32)
        .attr('y', -48);

      const div = fo.append(() => document.createElementNS('http://www.w3.org/1999/xhtml', 'div'))
        .attr('class', 'w-full h-full rounded-md border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 halo-glow')
        .style('border-color', cover.bg + '99');

      div.html(`
        <div style="position:absolute;inset:0;background:${cover.bg};opacity:0.97"></div>
        <div style="position:absolute;inset:4px;border:1px solid ${cover.text}33;border-radius:3px"></div>
        <span style="font-family:'Playfair Display',serif;font-size:28px;font-weight:800;color:${cover.text};position:relative;z-index:1;text-shadow:0 2px 8px rgba(0,0,0,0.4);">${initial}</span>
      `);
    });

    // Add labels below covers
    // Read theme-aware graph colors at render time
    const rootStyle = getComputedStyle(document.documentElement);
    const nodeLabelColor = rootStyle.getPropertyValue('--graph-node-label').trim() || '#2a2060';
    const nodeLabelStroke = rootStyle.getPropertyValue('--graph-bg').trim() || '#fcf9f4';
    const badgeStroke = rootStyle.getPropertyValue('--graph-badge-stroke').trim() || '#f0ede9';

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '64px')
      .attr('fill', nodeLabelColor)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('paint-order', 'stroke')
      .attr('stroke', nodeLabelStroke)
      .attr('stroke-width', '3')
      .attr('pointer-events', 'none')
      .text((d) => d.title.length > 15 ? d.title.slice(0, 13) + '…' : d.title);


    // Connection count badge (top-right corner)
    node.each(function (d) {
      const count = connCount[d.id] || 0;
      const el = d3.select(this);
      if (count === 0) {
        // Pulsing ring for isolated nodes — signals they need connections
        el.append('circle')
          .attr('r', 36)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4 4')
          .attr('opacity', 0.4)
          .attr('class', 'isolated-pulse');
      } else {
        // Badge circle
        el.append('circle')
          .attr('cx', 28).attr('cy', -40)
          .attr('r', 10)
          .attr('fill', count >= 3 ? '#10b981' : count >= 1 ? '#8b5cf6' : '#f59e0b')
          .attr('stroke', badgeStroke)
          .attr('stroke-width', 2);
        // Badge number
        el.append('text')
          .attr('x', 28).attr('y', -36)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('pointer-events', 'none')
          .text(count);
      }
    });



    // Mouse events for Node
    node
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (event, d) => {
        setSelectedBook(d);
        // Center zoom on selected node
        d3.select(svgRef.current).transition().duration(400).call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(width / 2 - d.x * 0.8, height / 2 - d.y * 0.8).scale(0.8)
        );
      });

    // Update coordinates on simulation tick
    simulation.on('tick', () => {
      const pathFn = (d) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      };
      link.attr('d', pathFn);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // After sim cools, draw animated particle overlay paths
    simulation.on('end', () => {
      const particleG = g.append('g').attr('class', 'particles').lower().raise();
      links.forEach((d, i) => {
        if (!d.source || !d.target) return;
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        const pathD = `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        const edgeColor = EDGE_STYLES[d.edgeType]?.color || '#8b5cf6';
        particleG.append('path')
          .attr('d', pathD)
          .attr('fill', 'none')
          .attr('stroke', edgeColor)
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '8 240')
          .attr('stroke-dashoffset', 300)
          .attr('opacity', 0)
          .attr('pointer-events', 'none')
          .style('animation', `particle-travel ${2 + (i % 3) * 0.7}s ease-in-out ${(i * 0.4) % 3}s infinite`);
      });
    });

    return () => { simulation.stop(); };
  }, [loading, graphData]);


  // ── Secondary Effect: Visual updates on hover/select states (No simulation rebuilds) ──
  useEffect(() => {
    if (loading || !svgRef.current || graphData.nodes.length === 0) return;
    const svg = d3.select(svgRef.current);

    // 1. Update link opacities based on hoveredNode
    svg.selectAll('.links path')
      .transition().duration(150)
      .attr('stroke-opacity', (d) => {
        if (hoveredNode) {
          const isRelated = d.sourceId === hoveredNode.id || d.targetId === hoveredNode.id;
          return isRelated ? 0.95 : 0.08;
        }
        return 0.45;
      });

    // 2. Update node opacities based on hoveredNode
    svg.selectAll('.nodes > g')
      .transition().duration(150)
      .style('opacity', (d) => {
        if (hoveredNode) {
          const isCurrent = d.id === hoveredNode.id;
          const isConnected = graphData.edges.some(e =>
            (parseInt(e.source) === d.id && parseInt(e.target) === hoveredNode.id) ||
            (parseInt(e.target) === d.id && parseInt(e.source) === hoveredNode.id)
          );
          return (isCurrent || isConnected) ? 1.0 : 0.25;
        }
        return 1.0;
      });

    // 3. Update cover border/shadow class inside foreignObject based on selectedBook
    svg.selectAll('.nodes > g').each(function (d) {
      const isActive = selectedBook?.id === d.id;
      const cover = getCover(d.title || 'Unknown');
      d3.select(this).select('foreignObject > div')
        .attr('class', `w-full h-full rounded-md border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 halo-glow`)
        .style('border-color', isActive ? '#fe932c' : cover.bg + '99')
        .style('box-shadow', isActive ? '0 0 24px rgba(254,147,44,0.5)' : null)
        .style('transform', isActive ? 'scale(1.05)' : null);
    });
  }, [hoveredNode, selectedBook, loading, graphData]);
  // Zoom control triggers
  function zoomIn() { d3.select(svgRef.current).transition().duration(300).call(zoomRef.current?.scaleBy, 1.3); }
  function zoomOut() { d3.select(svgRef.current).transition().duration(300).call(zoomRef.current?.scaleBy, 0.75); }
  function reset() { d3.select(svgRef.current).transition().duration(400).call(zoomRef.current?.transform, d3.zoomIdentity); }

  // Compute top-bar stats
  const edgeCount = graphData.edges.length;
  const nodeCount = graphData.nodes.length;
  const avgSim = edgeCount > 0
    ? Math.round(graphData.edges.reduce((s, e) => s + parseFloat(e.similarity), 0) / edgeCount * 100)
    : 0;
  const authorEdges = graphData.edges.filter(e => e.edgeType === 'author').length;
  const themeEdges  = graphData.edges.filter(e => e.edgeType === 'theme').length;

  // Inspector panel — derived values for selected book
  const inspectorData = useMemo(() => {
    if (!selectedBook) return { bookEdges: [], connTotal: 0, authorConns: 0, themeConns: 0, eraConns: 0 };
    const bookEdges = graphData.edges
      .filter(e => parseInt(e.source) === selectedBook.id || parseInt(e.target) === selectedBook.id)
      .sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));
    return {
      bookEdges,
      connTotal:   bookEdges.length,
      authorConns: bookEdges.filter(e => e.edgeType === 'author').length,
      themeConns:  bookEdges.filter(e => e.edgeType === 'theme').length,
      eraConns:    bookEdges.filter(e => e.edgeType === 'contextual').length,
    };
  }, [selectedBook, graphData.edges]);
  const { bookEdges, connTotal, authorConns, themeConns, eraConns } = inspectorData;

  return (
    <div className="relative flex-grow w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--graph-bg)', color: 'var(--graph-text)' }}>
      {/* ── Top Stats Ribbon ── */}
      {!loading && nodeCount > 0 && (
        <div className="shrink-0 flex items-center gap-6 px-6 py-2.5 border-b z-20 text-[10px] font-mono overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--graph-border)', background: 'var(--graph-bg)', color: 'var(--graph-text-dim)' }}>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[13px] text-[#8b5cf6]">hub</span>
            <span className="text-white/70 font-bold">{nodeCount}</span>
            <span>Books Mapped</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[13px] text-[#10b981]">link</span>
            <span className="text-white/70 font-bold">{edgeCount}</span>
            <span>Connections</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[13px] text-[#f59e0b]">percent</span>
            <span className="text-white/70 font-bold">{avgSim}%</span>
            <span>Avg Strength</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[13px] text-[#10b981]">person</span>
            <span className="text-white/70 font-bold">{authorEdges}</span>
            <span>Author Links</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[13px] text-[#8b5cf6]">auto_awesome</span>
            <span className="text-white/70 font-bold">{themeEdges}</span>
            <span>Thematic Links</span>
          </div>
          <div className="flex-grow" />
          <div className="flex items-center gap-1.5 shrink-0 text-white/30">
            <span className="material-symbols-outlined text-[11px]">info</span>
            <span>Hover edges for breakdown · Click nodes to inspect</span>
          </div>
        </div>
      )}

      {/* ── Graph Canvas Area ── */}
      <div ref={wrapRef} className="flex-grow relative overflow-hidden">

        {loading && (
          <div className="absolute inset-0 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3" style={{ background: 'var(--graph-bg)', opacity: 0.9 }}>
            <LoadingSpinner size={32} />
            <span className="font-mono text-xs tracking-wider" style={{ color: 'var(--graph-text-dim)' }}>Recalculating similarity vector spaces...</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-30 flex items-center justify-center text-error font-mono text-sm">
            ⚠️ {error}
          </div>
        )}
        {!loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 text-tertiary-fixed-dim select-none">
            <span className="material-symbols-outlined text-[64px] opacity-40">hub</span>
            <p className="font-mono text-xs max-w-xs text-center leading-relaxed">
              Add at least two books to your library to visualize the AI connection map.
            </p>
          </div>
        )}

        {/* The SVG Canvas */}
        <svg ref={svgRef} className="w-full h-full block" style={{ zIndex: 1 }} />

        {/* Floating Controls Overlay (Left) */}
        <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-4">
          {/* Connection Types Legend */}
          <div className="backdrop-blur-md border rounded-xl p-4 shadow-lg w-64" style={{ background: 'var(--graph-overlay-bg)', borderColor: 'var(--graph-border)' }}>
            <h3 className="font-mono text-[10px] uppercase tracking-wider mb-3 font-semibold" style={{ color: 'var(--graph-text-dim)' }}>Connection Types</h3>
            <div className="flex flex-col gap-2.5">
              {Object.entries(EDGE_STYLES).map(([key, s]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-[2px] rounded-full"
                      style={{
                        background: s.dash ? `repeating-linear-gradient(90deg,${s.color} 0,${s.color} 3px,transparent 3px,transparent 6px)` : s.color,
                      }}
                    />
                    <span className="font-mono text-[10px]" style={{ color: 'var(--graph-text-dim)' }}>{s.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[12px]" style={{ color: s.color, opacity: 0.8 }}>{s.icon}</span>
                </div>
              ))}
            </div>
          </div>


          {/* Connection Strength Slider */}
          <div className="backdrop-blur-md border rounded-xl p-4 shadow-lg w-60" style={{ background: 'var(--graph-overlay-bg)', borderColor: 'var(--graph-border)' }}>
            <div className="flex justify-between items-center mb-2">
              <label className="font-mono text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--graph-text-dim)' }}>Connection Strength</label>
              <span className="font-mono text-xs text-[var(--secondary-container)] font-extrabold">{Math.round(threshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-[var(--secondary-container)]"
              style={{ background: 'var(--surface-container-highest)' }}
            />
          </div>
        </div>

        {/* Minimal Zoom controls (Top Right Corner) */}
        <div className="absolute top-6 right-6 z-20 flex gap-2">
          <button onClick={zoomIn} className="p-2 rounded-lg border transition-colors" style={{ background: 'var(--graph-overlay-bg)', borderColor: 'var(--graph-border)', color: 'var(--graph-text)' }} title="Zoom In">
            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
          </button>
          <button onClick={zoomOut} className="p-2 rounded-lg border transition-colors" style={{ background: 'var(--graph-overlay-bg)', borderColor: 'var(--graph-border)', color: 'var(--graph-text)' }} title="Zoom Out">
            <span className="material-symbols-outlined text-[18px]">zoom_out</span>
          </button>
          <button onClick={reset} className="p-2 rounded-lg border transition-colors" style={{ background: 'var(--graph-overlay-bg)', borderColor: 'var(--graph-border)', color: 'var(--graph-text)' }} title="Reset View">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          </button>
        </div>
      </div>

      {/* ── Interactive Side Inspector Panel (Right) ── */}
      <AnimatePresence>
        {selectedBook && (
            <div key={selectedBook.id} className="w-80 h-full backdrop-blur-xl border-l z-30 flex flex-col overflow-hidden relative shadow-2xl shrink-0" style={{ background: 'var(--graph-overlay-bg)', borderColor: 'var(--graph-border)' }}>
              {/* Header — gradient banner from book cover color */}
              {(() => {
                const cover = getCover(selectedBook.title);
                return (
                  <div className="h-28 relative shrink-0" style={{ background: cover.bg }}>
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--graph-overlay-bg) 0%, transparent 60%)' }} />
                    <button
                      onClick={() => setSelectedBook(null)}
                      className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors bg-black/20 rounded-full p-1.5 flex items-center justify-center border border-white/10"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                    {connTotal > 0 && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
                        <span className="material-symbols-outlined text-[12px] text-[#10b981]">hub</span>
                        <span className="font-mono text-[10px] text-white font-bold">{connTotal} links</span>
                      </div>
                    )}
                    {/* Mini cover */}
                    {(() => {
                      return (
                        <div className="absolute left-4 bottom-[-20px] w-12 rounded-md border shadow-lg flex items-center justify-center" style={{ height: '68px', background: cover.bg, borderColor: cover.text + '33' }}>
                          <span className="font-serif text-2xl font-bold" style={{ color: cover.text }}>{selectedBook.title?.charAt(0).toUpperCase()}</span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Book Info Area */}
              <div className="px-5 pb-6 flex-grow flex flex-col mt-6 overflow-y-auto no-scrollbar">

                <h2 className="font-serif text-lg font-bold text-white leading-tight mb-0.5">{selectedBook.title}</h2>
                <p className="font-mono text-[11px] text-secondary-fixed mb-3">by {selectedBook.author}</p>

                {/* Badges */}
                {(selectedBook.setting || selectedBook.era) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedBook.setting && (
                      <span className="flex items-center gap-0.5 font-mono text-[9px] text-[#fe932c] bg-[#fe932c]/5 border border-[#fe932c]/20 px-2 py-0.5 rounded-full font-bold">
                        <span className="material-symbols-outlined text-[10px]">location_on</span>
                        {selectedBook.setting}
                      </span>
                    )}
                    {selectedBook.era && (
                      <span className="flex items-center gap-0.5 font-mono text-[9px] text-primary-fixed bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                        {selectedBook.era}
                      </span>
                    )}
                  </div>
                )}

                {/* Themes */}
                {selectedBook.themes?.filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedBook.themes.filter(Boolean).map((t, i) => (
                      <span key={i} className="font-mono text-[9px] border border-[#8b5cf6]/35 bg-[#8b5cf6]/5 px-2 py-0.5 rounded text-purple-200">{t}</span>
                    ))}
                  </div>
                )}

                <p className="font-mono text-[10px] text-white/40 leading-relaxed mb-4 italic border-l-2 border-white/10 pl-3">
                  {selectedBook.generated_summary || 'No AI summary available.'}
                </p>

                {/* Connection Fingerprint */}
                {connTotal > 0 && (
                  <div className="mb-4 bg-white/3 border border-white/8 rounded-xl p-3 shrink-0">
                    <h4 className="font-mono text-[9px] text-white/40 uppercase tracking-wider mb-2.5 font-bold">Connection Fingerprint</h4>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Author', count: authorConns, color: 'bg-emerald-500', icon: 'person' },
                        { label: 'Thematic', count: themeConns, color: 'bg-purple-500', icon: 'auto_awesome' },
                        { label: 'Era/Time', count: eraConns, color: 'bg-amber-500', icon: 'schedule' },
                      ].map(({ label, count, color, icon }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[11px] ${color.replace('bg-', 'text-')}`}>{icon}</span>
                          <span className="font-mono text-[9px] text-white/50 w-14">{label}</span>
                          <div className="flex-grow h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${connTotal > 0 ? (count / connTotal) * 100 : 0}%` }} />
                          </div>
                          <span className="font-mono text-[9px] text-white/40 w-4 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Connections List */}
                <div className="pt-3 border-t border-white/8 flex-grow min-h-0">
                  <h4 className="font-mono text-[9px] text-on-tertiary-container mb-2.5 uppercase tracking-wider font-semibold">
                    {connTotal > 0 ? `All Connections (${connTotal})` : 'No Connections'}
                  </h4>
                  <div className="flex flex-col gap-1">
                    {bookEdges.slice(0, 8).map((edge, idx) => {
                      const otherId = parseInt(edge.source) === selectedBook.id ? parseInt(edge.target) : parseInt(edge.source);
                      const otherBook = graphData.nodes.find(n => n.id === otherId);
                      if (!otherBook) return null;
                      const pct = Math.round(parseFloat(edge.similarity) * 100);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedBook(otherBook);
                            const w = wrapRef.current?.clientWidth || 900;
                            const h = wrapRef.current?.clientHeight || 600;
                            d3.select(svgRef.current).transition().duration(400).call(
                              zoomRef.current.transform,
                              d3.zoomIdentity.translate(w/2 - otherBook.x * 0.8, h/2 - otherBook.y * 0.8).scale(0.8)
                            );
                          }}
                          className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/8"
                        >
                          <span className={`material-symbols-outlined text-[13px] shrink-0 ${
                            edge.edgeType === 'author' ? 'text-emerald-500' :
                            edge.edgeType === 'contextual' ? 'text-amber-500' : 'text-purple-500'
                          }`}>{EDGE_STYLES[edge.edgeType]?.icon || 'link'}</span>
                          <span className="font-mono text-[10px] text-white/60 flex-grow truncate">{otherBook.title}</span>
                          <div className="shrink-0 flex items-center gap-1">
                            <div className="w-10 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-secondary-container rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono text-[9px] text-secondary-container font-bold w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {connTotal === 0 && (
                      <p className="font-mono text-[10px] text-white/25 italic">Lower the connection strength slider to reveal links.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}
      </AnimatePresence>


      {/* ── Float Hovering Edge Tooltip ── */}
      {edgeTooltip && (
        <div
          className="fixed pointer-events-none z-50 border rounded-xl p-4 shadow-2xl w-60"
          style={{ left: edgeTooltip.x + 15, top: edgeTooltip.y, background: 'var(--graph-overlay-bg)', borderColor: 'var(--graph-border)', color: 'var(--graph-text)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`material-symbols-outlined text-base ${edgeTooltip.data.edgeType === 'author' ? 'text-emerald-500' :
                edgeTooltip.data.edgeType === 'contextual' ? 'text-amber-500' : 'text-purple-500'
              }`}>
              {EDGE_STYLES[edgeTooltip.data.edgeType]?.icon}
            </span>
            <span className="font-mono text-xs font-bold text-tertiary-fixed">
              {EDGE_STYLES[edgeTooltip.data.edgeType]?.label}
            </span>
          </div>

          <div className="font-mono text-xs text-secondary-container font-extrabold mb-3">
            Composite: {Math.round(parseFloat(edgeTooltip.data.similarity) * 100)}%
          </div>

          {/* Breakdown bars */}
          {edgeTooltip.data.scores && (
            <div className="flex flex-col gap-2 border-t border-outline-variant/10 pt-2.5">
              {[
                { name: 'Theme', val: edgeTooltip.data.scores.theme, color: 'bg-purple-500' },
                { name: 'Setting', val: edgeTooltip.data.scores.setting, color: 'bg-amber-500' },
                { name: 'Era', val: edgeTooltip.data.scores.era, color: 'bg-yellow-500' },
                { name: 'Style', val: edgeTooltip.data.scores.style, color: 'bg-cyan-500' },
              ].map((bar) => (
                <div key={bar.name} className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-tertiary-fixed-dim w-12">{bar.name}</span>
                  <div className="flex-grow mx-2 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color}`}
                      style={{ width: `${Math.round(bar.val * 100)}%` }}
                    />
                  </div>
                  <span className="text-tertiary-fixed-dim w-8 text-right">{Math.round(bar.val * 100)}%</span>
                </div>
              ))}
              {edgeTooltip.data.sameAuthor && (
                <div className="text-[9px] text-emerald-400 font-mono mt-1 border-t border-outline-variant/5 pt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  <span>Same author bonus +35%</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
