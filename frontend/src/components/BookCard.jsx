import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';

// Authentic library book cover color pairs [bg, text, accentBorder]
const LIBRARY_COVERS = [
  { bg: 'linear-gradient(160deg, #6b1a1a 0%, #8b2222 100%)', text: '#f5e6d0', border: '#a83030' },   // Burgundy/Oxblood
  { bg: 'linear-gradient(160deg, #1a3a2a 0%, #1e5c3a 100%)', text: '#d4ead8', border: '#2d7a4f' },   // Forest Green
  { bg: 'linear-gradient(160deg, #0f2a4a 0%, #1a3d6b 100%)', text: '#c8ddf5', border: '#2255a0' },   // Navy Ink
  { bg: 'linear-gradient(160deg, #6b3a1a 0%, #8c4e22 100%)', text: '#f5e4c8', border: '#c06020' },   // Cognac/Tan
  { bg: 'linear-gradient(160deg, #2a2010 0%, #3d3018 100%)', text: '#e8d8a0', border: '#806040' },   // Dark Walnut
  { bg: 'linear-gradient(160deg, #4a1a35 0%, #6b2248 100%)', text: '#f5d0e4', border: '#8a2d60' },   // Plum/Mauve
  { bg: 'linear-gradient(160deg, #1a2a3a 0%, #243550 100%)', text: '#c8d8e8', border: '#365070' },   // Slate Blue
  { bg: 'linear-gradient(160deg, #3a2a0a 0%, #5a4010 100%)', text: '#f0e0a0', border: '#806820' },   // Antique Gold
  { bg: 'linear-gradient(160deg, #1a3a3a 0%, #1e5555 100%)', text: '#c0e0dc', border: '#257a70' },   // Teal Cloth
  { bg: 'linear-gradient(160deg, #3a1010 0%, #601818 100%)', text: '#f0cec8', border: '#882020' },   // Deep Red
  { bg: 'linear-gradient(160deg, #2a3a1a 0%, #3d5522 100%)', text: '#d8e8c0', border: '#557030' },   // Sage Green
  { bg: 'linear-gradient(160deg, #1a1a3a 0%, #252560 100%)', text: '#c8c8f0', border: '#3535a0' },   // Midnight Blue
];

const getCover = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LIBRARY_COVERS[Math.abs(hash) % LIBRARY_COVERS.length];
};

export function BookCard({ book, onDelete, onUpdate, index }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus]     = useState(book.status);
  const [rating, setRating]     = useState(book.rating || 0);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function handleReanalyze() {
    try {
      setReanalyzing(true);
      const res = await api.reanalyzeBook(book.id);
      // Merge all the new AI fields into the book object
      onUpdate?.({ ...book, ...res });
    } catch (err) {
      alert('Failed to re-analyze: ' + err.message);
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setStatus(newStatus);
    await api.updateBook(book.id, { status: newStatus });
    onUpdate?.({ ...book, status: newStatus });
  }

  async function handleRating(newRating) {
    setRating(newRating);
    await api.updateBook(book.id, { rating: newRating });
    onUpdate?.({ ...book, rating: newRating });
  }

  async function handleDelete() {
    if (!confirm(`Delete "${book.title}"?`)) return;
    await api.deleteBook(book.id);
    onDelete?.(book.id);
  }

  const themes = book.themes?.filter(Boolean) || [];
  const spineColorClass =
    status === 'want_to_read' ? 'bg-[var(--outline)]' :
    status === 'reading' ? 'bg-[var(--secondary-container)]' : 'bg-emerald-500';

  const cover = getCover(book.title || 'Unknown');
  const initial = book.title ? book.title.charAt(0).toUpperCase() : '?';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      whileHover={{ y: -6 }}
      onClick={() => setExpanded(!expanded)}
      className="group relative flex w-full max-w-[280px] shrink-0 flex-col rounded-lg overflow-hidden border cursor-pointer self-center transition-all duration-300"
      style={{
        backgroundColor: 'var(--surface-container-lowest)',
        borderColor: cover.border + '55',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      {/* Dynamic left spine — status indicator */}
      <div
        className={`absolute left-0 top-0 h-full w-2 ${spineColorClass} transition-all z-20 group-hover:shadow-[0_0_12px_rgba(254,147,44,0.3)]`}
      />

      {/* Book Cover Graphics */}
      <div className="relative aspect-[2/3] w-full overflow-hidden select-none">
        {/* Authentic Cloth-Bound Cover */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center"
          style={{ background: cover.bg }}
        >
          {/* Cloth texture lines */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)',
          }} />
          {/* Inner border frame — classic bookbinding style */}
          <div className="absolute inset-3 rounded opacity-40" style={{ border: `1px solid ${cover.text}` }} />
          <div className="absolute inset-5 rounded opacity-20" style={{ border: `1px solid ${cover.text}` }} />
          {/* Large initial */}
          <span
            className="font-serif text-6xl font-bold relative z-10 leading-none drop-shadow-lg"
            style={{ color: cover.text }}
          >
            {initial}
          </span>
          <span
            className="font-mono text-[9px] mt-3 tracking-widest relative z-10 max-w-[80%] truncate uppercase"
            style={{ color: cover.text, opacity: 0.7 }}
          >
            {book.author}
          </span>
        </div>

        {/* Sliding Summary Layer on Hover */}
        <div
          className="absolute inset-x-0 bottom-0 translate-y-full backdrop-blur-md p-4 transition-transform duration-300 ease-out group-hover:translate-y-0 z-10"
          style={{ backgroundColor: 'var(--surface-container-lowest)', borderTop: '1px solid var(--outline-variant)' }}
        >
          <p className="text-xs line-clamp-4 leading-relaxed italic" style={{ color: 'var(--on-surface-variant)' }}>
            {book.generated_summary || 'No AI summary generated yet.'}
          </p>
        </div>
      </div>

      {/* Book Details Container */}
      <div className="flex flex-col gap-1 p-4 pl-[20px] relative z-20" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
        <h3 className="font-serif text-lg font-bold line-clamp-1 transition-colors" style={{ color: 'var(--on-surface)' }}>
          {book.title}
        </h3>
        <p className="italic text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          by {book.author || 'Unknown'}
        </p>

        {/* Rating Row & Delete Button */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-0.5 text-amber-500" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((val) => (
              <button 
                key={val} 
                onClick={() => handleRating(val)}
                className="hover:scale-110 transition-transform"
              >
                <span className={`material-symbols-outlined text-[16px] ${val <= rating ? 'fill-1' : ''}`} style={{ fontVariationSettings: `'FILL' ${val <= rating ? 1 : 0}` }}>
                  star
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="text-outline hover:text-error transition-colors p-1 rounded hover:bg-surface-container-low"
            title="Delete Book"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>

        {/* Context Badges (Setting, Era, Tone, Style) */}
        {(book.setting || book.era || book.emotional_tone || book.style) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {book.emotional_tone && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] text-rose-500 bg-rose-500/5 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                <span className="material-symbols-outlined text-[10px]">favorite</span>
                {book.emotional_tone}
              </span>
            )}
            {book.style && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] text-cyan-600 bg-cyan-500/5 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                <span className="material-symbols-outlined text-[10px]">menu_book</span>
                {book.style}
              </span>
            )}
            {book.setting && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] text-[#fe932c] bg-[#fe932c]/5 border border-[#fe932c]/20 px-2 py-0.5 rounded-full font-bold">
                <span className="material-symbols-outlined text-[10px]">location_on</span>
                {book.setting}
              </span>
            )}
            {book.era && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                <span className="material-symbols-outlined text-[10px]">schedule</span>
                {book.era}
              </span>
            )}
          </div>
        )}

        {/* Dynamic drop-down settings menu */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-outline-variant/20 mt-3 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-3">
                {/* Theme Tag List */}
                {themes.length > 0 && (
                  <div>
                    <label className="font-mono text-[9px] text-on-surface-variant block uppercase tracking-wider mb-1">Themes</label>
                    <div className="flex flex-wrap gap-1">
                      {themes.map((t, idx) => (
                        <span key={idx} className="font-mono text-[9px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 text-on-surface-variant font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Selector & Reanalyze */}
                <div className="flex gap-2 items-end">
                  <div className="flex-grow">
                    <label className="font-mono text-[9px] text-on-surface-variant block uppercase tracking-wider mb-1">Status</label>
                    <select
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-2 py-1 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                      value={status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      <option value="want_to_read">Want to Read</option>
                      <option value="reading">Currently Reading</option>
                      <option value="read">Finished</option>
                    </select>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReanalyze(); }}
                    disabled={reanalyzing}
                    className="shrink-0 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 transition-colors h-[26px] px-3 rounded font-mono text-[9px] uppercase tracking-wider font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Re-run AI Analysis"
                  >
                    {reanalyzing ? (
                      <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[12px] mr-1">auto_awesome</span>
                        Re-analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
