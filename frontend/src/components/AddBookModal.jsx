import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';

export function AddBookModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ title: '', author: '', status: 'want_to_read' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [step, setStep]     = useState('idle'); // idle | parsing | mapping | saving | done

  const [parsingProgress, setParsingProgress] = useState(0);
  const [mappingProgress, setMappingProgress] = useState(0);

  useEffect(() => {
    let timer;
    if (step === 'parsing') {
      setParsingProgress(0);
      timer = setInterval(() => {
        setParsingProgress(prev => {
          if (prev >= 100) { clearInterval(timer); setStep('mapping'); return 100; }
          return prev + 5;
        });
      }, 150);
    } else if (step === 'mapping') {
      setMappingProgress(0);
      timer = setInterval(() => {
        setMappingProgress(prev => {
          if (prev >= 100) { clearInterval(timer); return 100; }
          return prev + 3;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [step]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) return;
    setError('');
    setLoading(true);
    setStep('parsing');
    try {
      const result = await api.addBook(form);
      setParsingProgress(100);
      setStep('mapping');
      setMappingProgress(100);
      setTimeout(() => {
        setStep('done');
        onSuccess(result);
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message);
      setStep('idle');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-lg overflow-hidden flex flex-col relative rounded-2xl"
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--modal-border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-5 flex items-start gap-4"
          style={{ borderBottom: '1px solid var(--modal-divider)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--modal-icon-bg)' }}
          >
            <span
              className="material-symbols-outlined animate-pulse-glow"
              style={{ color: 'var(--primary)', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--modal-text)' }}>
              Add to Library
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--modal-text-dim)' }}>
              AI will analyze and connect this book to your graph.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-full p-1.5 flex items-center justify-center transition-colors"
            style={{ color: 'var(--modal-text-dim)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--modal-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Form Body ── */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-6" style={{ background: 'var(--modal-body-bg)' }}>

            {/* Title & Author inputs */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label
                  className="font-mono text-[9px] uppercase tracking-widest font-bold"
                  style={{ color: 'var(--modal-text-dim)' }}
                  htmlFor="book-title"
                >
                  Book Title
                </label>
                <input
                  id="book-title"
                  className="w-full py-2.5 px-3 font-serif text-lg rounded-lg border outline-none transition-all"
                  style={{
                    background: 'var(--modal-input-bg)',
                    borderColor: 'var(--modal-input-border)',
                    color: 'var(--modal-text)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-focus)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--modal-input-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="e.g. The Name of the Wind"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="font-mono text-[9px] uppercase tracking-widest font-bold"
                  style={{ color: 'var(--modal-text-dim)' }}
                  htmlFor="book-author"
                >
                  Author
                </label>
                <input
                  id="book-author"
                  className="w-full py-2.5 px-3 text-base rounded-lg border outline-none italic transition-all"
                  style={{
                    background: 'var(--modal-input-bg)',
                    borderColor: 'var(--modal-input-border)',
                    color: 'var(--modal-text)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-focus)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--modal-input-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="e.g. Patrick Rothfuss"
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Reading Status Pills */}
            <div>
              <label
                className="font-mono text-[9px] uppercase tracking-widest font-bold block mb-2.5"
                style={{ color: 'var(--modal-text-dim)' }}
              >
                Reading Status
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'want_to_read', label: 'Want to Read',  dot: 'var(--outline)',   activeColor: 'var(--on-surface)',   activeBorder: 'var(--outline)' },
                  { value: 'reading',      label: 'Reading',        dot: 'var(--primary)',   activeColor: 'var(--primary)',      activeBorder: 'var(--primary)' },
                  { value: 'read',         label: 'Finished',       dot: '#10b981',          activeColor: '#059669',            activeBorder: '#10b981' },
                ].map(({ value, label, dot, activeColor, activeBorder }) => {
                  const active = form.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, status: value })}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono font-semibold transition-all duration-200"
                      style={{
                        background: active ? 'var(--modal-pill-active-bg)' : 'var(--modal-input-bg)',
                        borderColor: active ? activeBorder : 'var(--modal-input-border)',
                        color: active ? activeColor : 'var(--modal-text-dim)',
                        borderWidth: active ? '2px' : '1px',
                        boxShadow: active ? `0 0 0 3px ${dot}22` : 'none',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Analysis Progress */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl p-4 border"
                  style={{
                    background: 'var(--modal-progress-bg)',
                    borderColor: 'var(--modal-progress-border)',
                  }}
                >
                  <div className="flex flex-col gap-4">
                    {/* Step 1 */}
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-lg ${step === 'parsing' ? 'animate-pulse-glow' : ''}`} style={{ color: 'var(--secondary-container)' }}>
                        psychology
                      </span>
                      <div className="flex-grow">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--modal-text)' }}>Llama3 parsing metadata...</span>
                          <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--modal-text)' }}>{parsingProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--modal-track-bg)' }}>
                          <div className="h-full rounded-full transition-all duration-150" style={{ width: `${parsingProgress}%`, background: 'var(--secondary-container)' }} />
                        </div>
                      </div>
                      {parsingProgress >= 100
                        ? <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                        : <span className="material-symbols-outlined text-sm animate-pulse" style={{ color: 'var(--modal-text-dim)' }}>more_horiz</span>
                      }
                    </div>

                    {/* Step 2 */}
                    {(step === 'mapping' || parsingProgress >= 100) && (
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-lg ${step === 'mapping' ? 'animate-pulse-glow' : ''}`} style={{ color: 'var(--primary)' }}>
                          account_tree
                        </span>
                        <div className="flex-grow">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--modal-text)' }}>Mapping themes & vectors...</span>
                            <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{mappingProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--modal-track-bg)' }}>
                            <div className="h-full rounded-full transition-all duration-150" style={{ width: `${mappingProgress}%`, background: 'var(--primary)' }} />
                          </div>
                        </div>
                        {mappingProgress >= 100
                          ? <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                          : <span className="material-symbols-outlined text-sm animate-pulse" style={{ color: 'var(--modal-text-dim)' }}>more_horiz</span>
                        }
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div
                className="text-xs font-mono px-3 py-2.5 rounded-lg border flex items-center gap-2"
                style={{ color: 'var(--error)', background: 'color-mix(in srgb, var(--error) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--error) 30%, transparent)' }}
              >
                <span className="material-symbols-outlined text-base">warning</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="px-6 py-4 flex justify-end gap-3"
            style={{
              borderTop: '1px solid var(--modal-divider)',
              background: 'var(--modal-footer-bg)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg font-mono text-xs font-semibold border transition-all"
              style={{
                color: 'var(--modal-text-dim)',
                borderColor: 'var(--modal-input-border)',
                background: 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--modal-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              style={{
                background: loading ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : 'var(--primary)',
                color: loading ? 'var(--primary)' : '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Analyzing…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Generate &amp; Save
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
