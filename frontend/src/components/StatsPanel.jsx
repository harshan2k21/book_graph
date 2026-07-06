import { useMemo } from 'react';
import { motion } from 'framer-motion';

function AnimatedBar({ value, color, delay = 0 }) {
  return (
    <div className="h-2 bg-surface-container rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent = 'text-primary' }) {
  return (
    <div className="flex flex-col gap-1 bg-surface-container-low/60 border border-outline-variant/20 rounded-xl p-4 hover:border-outline-variant/40 transition-colors">
      <span className={`material-symbols-outlined text-[22px] ${accent}`}>{icon}</span>
      <span className="font-mono text-2xl font-extrabold text-on-surface mt-1">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</span>
      {sub && <span className="font-mono text-[9px] text-outline mt-0.5">{sub}</span>}
    </div>
  );
}

export function StatsPanel({ books }) {
  const stats = useMemo(() => {
    if (!books || books.length === 0) return null;

    // Theme frequency
    const themeCount = {};
    books.forEach(b => {
      (b.themes || []).filter(Boolean).forEach(t => {
        themeCount[t] = (themeCount[t] || 0) + 1;
      });
    });
    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const maxTheme = topThemes[0]?.[1] || 1;

    // Author frequency
    const authorCount = {};
    books.forEach(b => {
      if (b.author) authorCount[b.author] = (authorCount[b.author] || 0) + 1;
    });
    const topAuthor = Object.entries(authorCount).sort((a, b) => b[1] - a[1])[0];

    // Status split
    const finished = books.filter(b => b.status === 'read').length;
    const reading  = books.filter(b => b.status === 'reading').length;
    const tbr      = books.filter(b => b.status === 'want_to_read').length;

    // Average rating (exclude unrated)
    const rated = books.filter(b => b.rating && b.rating > 0);
    const avgRating = rated.length > 0 
      ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) 
      : null;

    // Era distribution
    const eraCount = {};
    books.forEach(b => {
      if (b.era) eraCount[b.era] = (eraCount[b.era] || 0) + 1;
    });
    const topEras = Object.entries(eraCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

    // Emotional Tone distribution
    const toneCount = {};
    books.forEach(b => {
      if (b.emotional_tone) toneCount[b.emotional_tone] = (toneCount[b.emotional_tone] || 0) + 1;
    });
    const topTones = Object.entries(toneCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

    // Style distribution
    const styleCount = {};
    books.forEach(b => {
      if (b.style) styleCount[b.style] = (styleCount[b.style] || 0) + 1;
    });
    const topStyles = Object.entries(styleCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

    // Estimated pages (rough average 320 pages/book)
    const estPages = finished * 320;

    return { topThemes, maxTheme, topAuthor, finished, reading, tbr, avgRating, topEras, topTones, topStyles, estPages };
  }, [books]);

  if (!stats) return null;

  const themeColors = [
    'bg-primary', 'bg-purple-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500'
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full mb-12"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-primary text-[22px]">insights</span>
        <h2 className="font-serif text-2xl font-semibold text-on-surface italic">Your Reading DNA</h2>
        <div className="flex-grow h-[1px] bg-outline-variant/30" />
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon="library_books" label="Total Books" value={books.length} sub={`${stats.finished} finished`} accent="text-primary" />
        <StatCard icon="bookmark_check" label="On the shelf" value={stats.tbr} sub="want to read" accent="text-amber-500" />
        <StatCard 
          icon="auto_stories" 
          label="Est. Pages Read" 
          value={stats.estPages > 1000 ? `${(stats.estPages/1000).toFixed(1)}k` : stats.estPages} 
          sub="from finished books"
          accent="text-emerald-500"
        />
        <StatCard 
          icon="star" 
          label="Avg. Rating" 
          value={stats.avgRating ? `${stats.avgRating}★` : '—'} 
          sub={stats.avgRating ? `from ${books.filter(b=>b.rating>0).length} rated` : 'No ratings yet'}
          accent="text-amber-400"
        />
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Themes */}
        {stats.topThemes.length > 0 && (
          <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-5">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-4 font-bold">
              Recurring Themes
            </h3>
            <div className="flex flex-col gap-3">
              {stats.topThemes.map(([theme, count], i) => (
                <div key={theme} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-on-surface truncate max-w-[200px]">{theme}</span>
                    <span className="font-mono text-[10px] text-outline ml-2">{count}×</span>
                  </div>
                  <AnimatedBar 
                    value={(count / stats.maxTheme) * 100} 
                    color={themeColors[i % themeColors.length]}
                    delay={i * 0.08}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Author + Eras */}
        <div className="flex flex-col gap-3">
          {/* Top Author */}
          {stats.topAuthor && stats.topAuthor[1] > 1 && (
            <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-5">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-3 font-bold">
                Most Read Author
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="font-serif text-lg font-bold text-primary">
                    {stats.topAuthor[0].charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-serif text-base font-semibold text-on-surface">{stats.topAuthor[0]}</p>
                  <p className="font-mono text-[10px] text-outline">{stats.topAuthor[1]} books in your library</p>
                </div>
              </div>
            </div>
          )}

          {/* Eras / Periods */}
          {stats.topEras.length > 0 && (
            <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-4 flex-grow">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2 font-bold">
                Time Periods
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.topEras.map(([era, count]) => (
                  <div key={era} className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/25">
                    <span className="material-symbols-outlined text-[12px] text-amber-500">schedule</span>
                    <span className="font-mono text-[10px] text-on-surface">{era}</span>
                    <span className="font-mono text-[9px] text-outline bg-outline-variant/20 px-1 rounded-full">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotional Resonance */}
          {stats.topTones.length > 0 && (
            <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-4 flex-grow">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2 font-bold">
                Emotional Resonance
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.topTones.map(([tone, count]) => (
                  <div key={tone} className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/25">
                    <span className="material-symbols-outlined text-[12px] text-rose-500">favorite</span>
                    <span className="font-mono text-[10px] text-on-surface">{tone}</span>
                    <span className="font-mono text-[9px] text-outline bg-outline-variant/20 px-1 rounded-full">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Narrative Style */}
          {stats.topStyles.length > 0 && (
            <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-4 flex-grow">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2 font-bold">
                Narrative Styles
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.topStyles.map(([style, count]) => (
                  <div key={style} className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/25">
                    <span className="material-symbols-outlined text-[12px] text-cyan-600">menu_book</span>
                    <span className="font-mono text-[10px] text-on-surface">{style}</span>
                    <span className="font-mono text-[9px] text-outline bg-outline-variant/20 px-1 rounded-full">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reading Progress Breakdown */}
          <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-5">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-3 font-bold">
              Status Breakdown
            </h3>
            <div className="flex gap-2 h-3 rounded-full overflow-hidden mb-3">
              {stats.finished > 0 && (
                <motion.div 
                  className="bg-emerald-500 h-full" 
                  style={{ flex: stats.finished }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                />
              )}
              {stats.reading > 0 && (
                <motion.div 
                  className="bg-primary h-full" 
                  style={{ flex: stats.reading }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                />
              )}
              {stats.tbr > 0 && (
                <motion.div 
                  className="bg-outline-variant h-full" 
                  style={{ flex: stats.tbr }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                />
              )}
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-[10px] text-on-surface-variant">Finished ({stats.finished})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono text-[10px] text-on-surface-variant">Reading ({stats.reading})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-outline-variant" />
                <span className="font-mono text-[10px] text-on-surface-variant">TBR ({stats.tbr})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
