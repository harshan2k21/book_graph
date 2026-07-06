import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { LoadingSpinner } from './ui';

// Authentic library book cover colors (mirrors BookCard)
const LIBRARY_COVERS = [
  { bg: '#6b1a1a', text: '#f5e6d0' },
  { bg: '#1a3a2a', text: '#d4ead8' },
  { bg: '#0f2a4a', text: '#c8ddf5' },
  { bg: '#6b3a1a', text: '#f5e4c8' },
  { bg: '#2a2010', text: '#e8d8a0' },
  { bg: '#4a1a35', text: '#f5d0e4' },
  { bg: '#1a2a3a', text: '#c8d8e8' },
  { bg: '#3a2a0a', text: '#f0e0a0' },
  { bg: '#1a3a3a', text: '#c0e0dc' },
  { bg: '#3a1010', text: '#f0cec8' },
  { bg: '#2a3a1a', text: '#d8e8c0' },
  { bg: '#1a1a3a', text: '#c8c8f0' },
];
const getCover = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return LIBRARY_COVERS[Math.abs(hash) % LIBRARY_COVERS.length];
};

const EDGE_TYPE_COLORS = {
  author:    { text: 'text-emerald-400', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30',  label: 'Same Author',          icon: 'person' },
  theme:     { text: 'text-purple-400',  bg: 'bg-purple-500/10',   border: 'border-purple-500/30',   label: 'Thematic Link',        icon: 'auto_awesome' },
  emotional: { text: 'text-rose-400',    bg: 'bg-rose-500/10',     border: 'border-rose-500/30',     label: 'Emotional Resonance',  icon: 'favorite' },
  style:     { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',     border: 'border-cyan-500/30',     label: 'Narrative Style',      icon: 'menu_book' },
  contextual:{ text: 'text-amber-400',   bg: 'bg-amber-500/10',    border: 'border-amber-500/30',    label: 'Era / Setting',        icon: 'schedule' }, // legacy fallback
};


// ── Mini book cover ──
function MiniCover({ title, size = 'sm' }) {
  const initial = title?.charAt(0).toUpperCase() || '?';
  const cover = getCover(title);
  const dims = size === 'lg' ? 'w-16 h-24' : size === 'md' ? 'w-12 h-17' : 'w-10 h-14';
  const textSz = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl';
  return (
    <div
      className={`${dims} rounded-md flex items-center justify-center shrink-0 shadow-md border`}
      style={{ background: cover.bg, borderColor: cover.text + '33' }}
    >
      <span className={`font-serif ${textSz} font-bold select-none`} style={{ color: cover.text }}>{initial}</span>
    </div>
  );
}

// ── Section header ──
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">{icon}</span>
      <div>
        <h2 className="font-serif text-xl font-semibold text-on-surface">{title}</h2>
        {subtitle && <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Book Pair Connection Card ──
function ConnectionCard({ edge, nodeMap, onClick }) {
  const src = nodeMap[edge.source];
  const tgt = nodeMap[edge.target];
  if (!src || !tgt) return null;
  const pct = Math.round(parseFloat(edge.similarity) * 100);
  const style = EDGE_TYPE_COLORS[edge.edgeType] || EDGE_TYPE_COLORS.theme;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick?.(src, tgt)}
      className="group cursor-pointer bg-surface-container-low/60 border border-outline-variant/20 rounded-xl p-4 hover:border-outline-variant/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all"
    >
      {/* Books Row */}
      <div className="flex items-center gap-3 mb-3">
        <MiniCover title={src.title} size="md" />
        {/* Connection line */}
        <div className="flex-grow flex flex-col items-center gap-1">
          <div className={`flex items-center gap-1 text-[9px] font-mono font-bold ${style.text} ${style.bg} ${style.border} border px-2 py-0.5 rounded-full`}>
            <span className="material-symbols-outlined text-[11px]">{style.icon}</span>
            {style.label}
          </div>
          <div className="w-full h-[2px] bg-outline-variant/20 relative">
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="font-mono text-[10px] text-primary font-extrabold">{pct}% match</span>
        </div>
        <MiniCover title={tgt.title} size="md" />
      </div>

      {/* Titles */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-serif text-xs font-semibold text-on-surface truncate">{src.title}</p>
          <p className="font-mono text-[9px] text-on-surface-variant truncate">{src.author}</p>
        </div>
        <span className="material-symbols-outlined text-[14px] text-outline/50 shrink-0 mt-0.5">compare_arrows</span>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-serif text-xs font-semibold text-on-surface truncate">{tgt.title}</p>
          <p className="font-mono text-[9px] text-on-surface-variant truncate">{tgt.author}</p>
        </div>
      </div>

      {/* Breakdown scores */}
      {edge.scores && (
        <div className="mt-3 pt-3 border-t border-outline-variant/15 grid grid-cols-4 gap-1">
          {[
            { label: 'Theme', val: edge.scores.theme, color: 'bg-purple-500' },
            { label: 'Setting', val: edge.scores.setting, color: 'bg-amber-500' },
            { label: 'Era', val: edge.scores.era, color: 'bg-yellow-400' },
            { label: 'Style', val: edge.scores.style, color: 'bg-cyan-500' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-mono text-[8px] text-outline">{label}</span>
              <div className="h-1 bg-outline-variant/20 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round((val || 0) * 100)}%` }} />
              </div>
              <span className="font-mono text-[8px] text-on-surface-variant">{Math.round((val || 0) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── "Because you read X" Recommendation Card ──
function RecommendationCard({ sourceBook, targetBook, edge, reason }) {
  const pct = Math.round(parseFloat(edge.similarity) * 100);
  const style = EDGE_TYPE_COLORS[edge.edgeType] || EDGE_TYPE_COLORS.theme;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4 hover:border-primary/30 hover:shadow-[0_8px_30px_rgba(53,37,205,0.08)] transition-all cursor-default"
    >
      {/* Because you read */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="font-mono text-[9px] text-on-surface-variant">Because you read</span>
        <span className="font-mono text-[9px] font-bold text-primary truncate max-w-[120px]">{sourceBook.title}</span>
      </div>

      {/* Target book */}
      <div className="flex items-center gap-3">
        <MiniCover title={targetBook.title} size="lg" />
        <div className="flex-grow min-w-0">
          <h3 className="font-serif text-base font-bold text-on-surface line-clamp-2 leading-tight mb-0.5">{targetBook.title}</h3>
          <p className="font-mono text-[10px] text-on-surface-variant italic mb-2">by {targetBook.author}</p>

          {/* Connection type badge */}
          <div className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold ${style.text} ${style.bg} ${style.border} border px-2 py-0.5 rounded-full mb-2`}>
            <span className="material-symbols-outlined text-[10px]">{style.icon}</span>
            {style.label} · {pct}% match
          </div>

          {/* Themes of target */}
          {targetBook.themes?.filter(Boolean).slice(0, 3).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {targetBook.themes.filter(Boolean).slice(0, 3).map((t, i) => (
                <span key={i} className="font-mono text-[8px] bg-surface-container border border-outline-variant/25 px-1.5 py-0.5 rounded text-on-surface-variant">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Why matched */}
      {reason && (
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-3 border-t border-outline-variant/10 pt-2 italic leading-relaxed">{reason}</p>
      )}
    </motion.div>
  );
}

// ── Theme Cluster Card ──
function ClusterCard({ theme, books, connCount }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      layout
      className="bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4 hover:border-outline-variant/40 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[16px] text-purple-500">auto_awesome</span>
            <h3 className="font-serif text-base font-semibold text-on-surface capitalize">{theme}</h3>
          </div>
          <p className="font-mono text-[9px] text-outline">{books.length} book{books.length !== 1 ? 's' : ''} · {connCount} connection{connCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-outline hover:text-primary transition-colors p-1 rounded"
        >
          <span className="material-symbols-outlined text-[16px]">{expanded ? 'expand_less' : 'expand_more'}</span>
        </button>
      </div>

      {/* Book stack */}
      <div className="flex -space-x-2 mb-2">
        {books.slice(0, 5).map((b, i) => (
          <div key={b.id} className="relative" style={{ zIndex: books.length - i }}>
            <MiniCover title={b.title} size="sm" />
          </div>
        ))}
        {books.length > 5 && (
          <div className="w-10 h-14 bg-surface-container border border-outline-variant/30 rounded-md flex items-center justify-center">
            <span className="font-mono text-[9px] text-outline">+{books.length - 5}</span>
          </div>
        )}
      </div>

      {/* Expanded list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-outline-variant/15 mt-3 pt-3"
          >
            <div className="flex flex-col gap-1.5">
              {books.map(b => (
                <div key={b.id} className="flex items-center gap-2">
                  <MiniCover title={b.title} size="sm" />
                  <div className="min-w-0">
                    <p className="font-serif text-xs font-semibold text-on-surface truncate">{b.title}</p>
                    <p className="font-mono text-[9px] text-on-surface-variant truncate">{b.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main DiscoverView ──
export function DiscoverView({ books }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Use low threshold to get all possible connections for discovery
        const data = await api.getGraph(0.40);
        setGraphData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const insights = useMemo(() => {
    if (!graphData || graphData.nodes.length < 2) return null;

    const { nodes, edges } = graphData;
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // ── 1. Most-connected hub book ──
    const connScore = {};
    edges.forEach(e => {
      const sim = parseFloat(e.similarity);
      connScore[e.source] = (connScore[e.source] || 0) + sim;
      connScore[e.target] = (connScore[e.target] || 0) + sim;
    });
    const hubId = Object.entries(connScore).sort((a, b) => b[1] - a[1])[0]?.[0];
    const hubBook = hubId ? nodeMap[parseInt(hubId)] : null;
    const hubConnections = edges.filter(e =>
      parseInt(e.source) === parseInt(hubId) || parseInt(e.target) === parseInt(hubId)
    ).sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity)).slice(0, 4);

    // ── 2. Strongest pairs (top 6) ──
    const topPairs = edges.slice(0, 6);

    // ── 3. Theme clusters ──
    const themeToBooks = {};
    nodes.forEach(n => {
      (n.themes || []).filter(Boolean).forEach(theme => {
        if (!themeToBooks[theme]) themeToBooks[theme] = new Set();
        themeToBooks[theme].add(n.id);
      });
    });
    // Count connections within each theme cluster
    const clusters = Object.entries(themeToBooks)
      .filter(([, bookSet]) => bookSet.size >= 2)
      .map(([theme, bookSet]) => {
        const clusterBooks = [...bookSet].map(id => nodeMap[id]).filter(Boolean);
        const clusterEdges = edges.filter(e =>
          bookSet.has(parseInt(e.source)) && bookSet.has(parseInt(e.target))
        );
        return { theme, books: clusterBooks, connCount: clusterEdges.length };
      })
      .sort((a, b) => b.books.length - a.books.length || b.connCount - a.connCount)
      .slice(0, 6);

    // ── 4. "Because you read X" recommendations ──
    // Find finished or reading books, then find best unread match
    const readBooks = nodes.filter(n => n.status === 'read' || n.status === 'reading');
    const wantBooks = nodes.filter(n => n.status === 'want_to_read');
    const recommendations = [];

    readBooks.forEach(src => {
      const bestEdge = edges
        .filter(e => {
          const otherId = parseInt(e.source) === src.id
            ? parseInt(e.target)
            : parseInt(e.target) === src.id
              ? parseInt(e.source)
              : null;
          if (otherId === null) return false;
          const other = nodeMap[otherId];
          return other && other.status === 'want_to_read';
        })
        .sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity))[0];

      if (bestEdge) {
        const otherId = parseInt(bestEdge.source) === src.id ? parseInt(bestEdge.target) : parseInt(bestEdge.source);

        const target = nodeMap[otherId];
        if (target) {
          const sharedThemes = (src.themes || []).filter(t => (target.themes || []).includes(t)).slice(0, 2);
          const reason = sharedThemes.length > 0
            ? `Both explore "${sharedThemes[0]}"${sharedThemes[1] ? ` and "${sharedThemes[1]}"` : ''}`
            : bestEdge.edgeType === 'author'
              ? `Same author as ${src.title}`
              : bestEdge.edgeType === 'contextual'
                ? `Similar historical era and setting`
                : `Strong thematic overlap`;
          recommendations.push({ sourceBook: src, targetBook: target, edge: bestEdge, reason });
        }
      }
    });

    // If no read books, recommend most-connected want_to_read
    if (recommendations.length === 0 && wantBooks.length >= 2) {
      const topWant = wantBooks
        .map(n => ({ book: n, score: connScore[n.id] || 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      topWant.forEach(({ book: src }) => {
        const bestEdge = edges
          .filter(e => parseInt(e.source) === src.id || parseInt(e.target) === src.id)
          .sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity))[0];
        if (bestEdge) {
          const otherId = parseInt(bestEdge.source) === src.id ? parseInt(bestEdge.target) : parseInt(bestEdge.source);
          const target = nodeMap[otherId];
          if (target && target.id !== src.id) {
            recommendations.push({
              sourceBook: src, targetBook: target, edge: bestEdge,
              reason: 'Most connected book in your library — a great place to start',
            });
          }
        }
      });
    }

    // ── 5. Hidden gems — high similarity but different authors & themes ──
    const hiddenGems = edges
      .filter(e => !e.sameAuthor && e.edgeType === 'theme' && parseFloat(e.similarity) > 0.55)
      .sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity))
      .slice(0, 3);

    return { hubBook, hubConnections, topPairs, clusters, recommendations: recommendations.slice(0, 4), hiddenGems, nodeMap };
  }, [graphData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-on-surface-variant">
        <LoadingSpinner size={28} />
        <span className="font-mono text-sm">Analyzing your library connections…</span>
      </div>
    );
  }
  if (error) {
    return <p className="text-center font-mono text-sm text-error py-16">⚠️ {error}</p>;
  }
  if (!graphData || graphData.nodes.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-on-surface-variant max-w-md mx-auto text-center">
        <span className="material-symbols-outlined text-[64px] text-outline/30">explore</span>
        <h3 className="font-serif text-xl font-semibold text-on-surface">Add more books to discover connections</h3>
        <p className="font-mono text-sm">You need at least 2 books with AI analysis for Discovery to work.</p>
      </div>
    );
  }

  const { hubBook, hubConnections, topPairs, clusters, recommendations, hiddenGems, nodeMap } = insights;

  return (
    <div className="flex flex-col gap-14 pb-24 w-full">

      {/* ── Hero: Library Hub ── */}
      {hubBook && (
        <section>
          <SectionHeader
            icon="hub"
            title="Your Library Hub"
            subtitle="The book most deeply connected to the rest of your library"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-low/40"
          >
            {/* Cover color accent */}
            <div className="absolute inset-0 opacity-5" style={{ background: getCover(hubBook.title).bg }} />
            <div className="relative p-6 flex flex-col md:flex-row gap-6">
              <MiniCover title={hubBook.title} size="lg" />
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Most Connected</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-on-surface mb-0.5">{hubBook.title}</h3>
                <p className="font-mono text-xs text-on-surface-variant italic mb-3">by {hubBook.author}</p>

                {hubBook.themes?.filter(Boolean).slice(0, 4).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {hubBook.themes.filter(Boolean).slice(0, 4).map((t, i) => (
                      <span key={i} className="font-mono text-[9px] border border-[#8b5cf6]/35 bg-[#8b5cf6]/5 px-2 py-0.5 rounded text-purple-600">{t}</span>
                    ))}
                  </div>
                )}

                {/* Connected to list */}
                <div>
                  <p className="font-mono text-[9px] text-outline uppercase tracking-wider mb-2">Connected to</p>
                  <div className="flex flex-wrap gap-2">
                    {hubConnections.map((edge, i) => {
                      const otherId = parseInt(edge.source) === hubBook.id ? parseInt(edge.target) : parseInt(edge.source);
                      const other = nodeMap[otherId];
                      if (!other) return null;
                      const style = EDGE_TYPE_COLORS[edge.edgeType] || EDGE_TYPE_COLORS.theme;
                      return (
                        <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${style.border} ${style.bg}`}>
                          <MiniCover title={other.title} size="sm" />
                          <div>
                            <p className={`font-serif text-[11px] font-semibold text-on-surface`}>{other.title}</p>
                            <p className={`font-mono text-[8px] ${style.text}`}>{Math.round(parseFloat(edge.similarity) * 100)}% · {style.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ── Because You Read ── */}
      {recommendations.length > 0 && (
        <section>
          <SectionHeader
            icon="recommend"
            title="Because You Read…"
            subtitle="Books in your TBR pile most similar to what you've already read"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {recommendations.map((rec, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <RecommendationCard {...rec} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Strongest Connections ── */}
      {topPairs.length > 0 && (
        <section>
          <SectionHeader
            icon="link"
            title="Strongest Book Pairs"
            subtitle="The most similar books in your library — ranked by AI connection score"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topPairs.map((edge, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <ConnectionCard edge={edge} nodeMap={nodeMap} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Theme Clusters ── */}
      {clusters.length > 0 && (
        <section>
          <SectionHeader
            icon="category"
            title="Theme Clusters"
            subtitle="Books in your library that share common themes — your reading identity"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster, i) => (
              <motion.div key={cluster.theme} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <ClusterCard {...cluster} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Hidden Gems ── */}
      {hiddenGems.length > 0 && (
        <section>
          <SectionHeader
            icon="diamond"
            title="Hidden Thematic Gems"
            subtitle="Surprising connections — different authors & eras, yet deeply similar themes"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hiddenGems.map((edge, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <ConnectionCard edge={edge} nodeMap={nodeMap} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
