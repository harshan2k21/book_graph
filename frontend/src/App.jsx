import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './api';
import { AddBookModal } from './components/AddBookModal';
import { LibraryView }  from './components/LibraryView';
import { GraphView }    from './components/GraphView';
import { DiscoverView } from './components/DiscoverView';
import { LoadingSpinner } from './components/ui';

// ── Theme Context ──────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ theme: 'light', toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

export default function App() {
  const [view, setView]           = useState('library');
  const [books, setBooks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [health, setHealth]       = useState(null);
  const [graphKey, setGraphKey]   = useState(0);

  // ── Theme state — persisted in localStorage ──
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bookgraph-theme') || 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('bookgraph-theme', next);
      return next;
    });
  }, []);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Load books ──
  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBooks();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Check health ──
  const checkHealth = useCallback(async () => {
    try {
      const h = await api.health();
      setHealth(h);
    } catch {
      setHealth({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    loadBooks();
    checkHealth();
  }, [loadBooks, checkHealth]);

  // ── Sync body bg with theme + view ──
  useEffect(() => {
    if (view === 'graph') {
      const graphBg = theme === 'dark' ? '#1A1208' : '#fcf9f4';
      document.body.style.backgroundColor = graphBg;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.backgroundColor = theme === 'dark' ? '#131210' : '#fcf9f4';
      document.body.style.color = theme === 'dark' ? '#e8e5df' : '#1c1c19';
      document.body.style.overflow = 'unset';
    }
  }, [view, theme]);

  // ── Handlers ──
  function handleBookAdded({ book, themes }) {
    const full = { ...book, themes: themes.map((t) => t) };
    setBooks((prev) => [full, ...prev]);
    setGraphKey((k) => k + 1);
  }

  function handleDelete(id) {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setGraphKey((k) => k + 1);
  }

  function handleUpdate(updated) {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }

  const healthy  = health?.status === 'ok';
  const ollamaOk = health?.ollama === 'connected';
  const isDark   = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
      <div className={`flex flex-col ${view === 'graph' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        {/* ── Navbar ── */}
        <header className={`backdrop-blur-xl sticky top-0 z-50 border-b shadow-sm transition-colors duration-300 ${
          isDark
            ? 'bg-[var(--surface)]/80 border-[var(--outline-variant)]/20'
            : 'bg-[var(--surface)]/80 border-[var(--outline-variant)]/30'
        }`}>
          <div className="flex justify-between items-center w-full px-6 py-4 max-w-[1800px] mx-auto">
            {/* Brand & Navigation */}
            <div className="flex items-center gap-8 md:gap-12">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-bold tracking-tight text-[var(--primary)]">
                  BookGraph V2
                </span>
                <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-[var(--surface-container-low)] rounded-full border border-[var(--outline-variant)]/30">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    ollamaOk ? 'bg-[var(--secondary-container)]' : 'bg-amber-500'
                  }`} />
                  <span className="font-mono text-[10px] text-[var(--on-surface-variant)] font-semibold tracking-wider uppercase">
                    {ollamaOk ? 'AI Sync' : 'AI Offline'}
                  </span>
                </div>
              </div>
              
              <nav className="hidden md:flex gap-6 font-mono text-sm mt-1">
                <button 
                  onClick={() => setView('library')}
                  className={`pb-1 hover:text-[var(--primary)] transition-all duration-200 cursor-pointer ${
                    view === 'library' 
                      ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] font-bold scale-100' 
                      : 'text-[var(--on-surface-variant)] opacity-85 hover:opacity-100 scale-95'
                  }`}
                >
                  My Library
                </button>
                <button 
                  onClick={() => setView('discover')}
                  className={`pb-1 transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    view === 'discover' 
                      ? 'text-emerald-500 border-b-2 border-emerald-500 font-bold scale-100' 
                      : 'text-[var(--on-surface-variant)] opacity-85 hover:opacity-100 scale-95'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">explore</span>
                  Discover
                </button>
                <button 
                  onClick={() => setView('graph')}
                  className={`pb-1 transition-all duration-200 cursor-pointer ${
                    view === 'graph' 
                      ? 'text-[var(--secondary-container)] border-b-2 border-[var(--secondary-container)] font-bold scale-100' 
                      : 'text-[var(--on-surface-variant)] opacity-85 hover:opacity-100 scale-95'
                  }`}
                >
                  Connections Map
                </button>
              </nav>
            </div>

            {/* Trailing Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-[var(--on-surface-variant)] mr-2">
                <span className="material-symbols-outlined text-[18px]">library_books</span>
                <span>{books.length} Titles</span>
              </div>

              <button 
                onClick={() => { checkHealth(); loadBooks(); }}
                className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors p-2 rounded-full hover:bg-[var(--surface-container-low)] cursor-pointer"
                title="Refresh status & books"
              >
                <span className="material-symbols-outlined text-[20px]">sensors</span>
              </button>

              {/* ── Theme Toggle ── */}
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
              >
                <div className="theme-toggle-thumb">
                  {isDark ? '🌙' : '☀️'}
                </div>
              </button>

              <button 
                onClick={() => setShowModal(true)}
                className="shimmer-btn bg-[var(--primary)] text-white font-mono text-xs px-6 py-2.5 rounded-full shadow-[0_4px_15px_rgba(53,37,205,0.25)] hover:shadow-[0_6px_20px_rgba(53,37,205,0.35)] hover:-translate-y-0.5 transition-all flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">add</span>
                Add to Collection
              </button>
            </div>
          </div>
        </header>

        {/* ── Main Content Canvas ── */}
        <main className={`flex-grow w-full flex flex-col ${
          view === 'graph' 
            ? 'px-0 py-0 overflow-hidden' 
            : 'max-w-[1800px] mx-auto px-6 py-8'
        }`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-grow py-32 gap-3 text-[var(--on-surface-variant)]">
              <LoadingSpinner size={32} />
              <span className="font-mono text-sm tracking-wide">Loading your library...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {view === 'library' ? (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex-grow"
                >
                  <LibraryView books={books} onDelete={handleDelete} onUpdate={handleUpdate} />
                </motion.div>
              ) : view === 'discover' ? (
                <motion.div
                  key="discover"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex-grow"
                >
                  <DiscoverView books={books} />
                </motion.div>
              ) : (
                <motion.div
                  key="graph"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex-grow h-full w-full flex flex-col"
                >
                  <GraphView refreshTrigger={graphKey} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>

        {/* ── Add Book Modal ── */}
        <AnimatePresence>
          {showModal && (
            <AddBookModal
              onClose={() => setShowModal(false)}
              onSuccess={handleBookAdded}
            />
          )}
        </AnimatePresence>
      </div>
    </ThemeContext.Provider>
  );
}
