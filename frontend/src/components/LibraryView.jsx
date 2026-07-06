import { AnimatePresence, motion } from 'framer-motion';
import { BookCard } from './BookCard';
import { StatsPanel } from './StatsPanel';

const COLUMNS = [
  { key: 'want_to_read', label: 'Want to Read' },
  { key: 'reading',      label: 'Currently Reading' },
  { key: 'read',         label: 'Finished' },
];

// Authentic library book cover colors — same palette as BookCard for consistency
const LIBRARY_COVERS = [
  { bg: '#6b1a1a', text: '#f5e6d0', border: '#a83030' },   // Burgundy/Oxblood
  { bg: '#1a3a2a', text: '#d4ead8', border: '#2d7a4f' },   // Forest Green
  { bg: '#0f2a4a', text: '#c8ddf5', border: '#2255a0' },   // Navy Ink
  { bg: '#6b3a1a', text: '#f5e4c8', border: '#c06020' },   // Cognac/Tan
  { bg: '#2a2010', text: '#e8d8a0', border: '#806040' },   // Dark Walnut
  { bg: '#4a1a35', text: '#f5d0e4', border: '#8a2d60' },   // Plum/Mauve
  { bg: '#1a2a3a', text: '#c8d8e8', border: '#365070' },   // Slate Blue
  { bg: '#3a2a0a', text: '#f0e0a0', border: '#806820' },   // Antique Gold
  { bg: '#1a3a3a', text: '#c0e0dc', border: '#257a70' },   // Teal Cloth
  { bg: '#3a1010', text: '#f0cec8', border: '#882020' },   // Deep Red
  { bg: '#2a3a1a', text: '#d8e8c0', border: '#557030' },   // Sage Green
  { bg: '#1a1a3a', text: '#c8c8f0', border: '#3535a0' },   // Midnight Blue
];

function getCover(title) {
  let hash = 0;
  for (let i = 0; i < (title || '').length; i++) {
    hash = (title.charCodeAt(i) + ((hash << 5) - hash));
  }
  return LIBRARY_COVERS[Math.abs(hash) % LIBRARY_COVERS.length];
}

export function LibraryView({ books, onDelete, onUpdate }) {
  const byStatus = (key) => books.filter((b) => b.status === key);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-on-surface-variant max-w-md mx-auto text-center">
        <span className="material-symbols-outlined text-[64px] text-outline/40">auto_stories</span>
        <h3 className="font-serif text-xl font-semibold" style={{ color: 'var(--on-surface)' }}>Your library is currently empty</h3>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Log a book title and author. Our local AI will analyze themes, setting, and timeline, then construct a beautiful 3D connections map.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16 pb-24 w-full">
      <StatsPanel books={books} />
      {COLUMNS.map((col) => {
        const colBooks = byStatus(col.key);
        return (
          <section key={col.key} className="flex flex-col w-full">
            {/* Shelf Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl italic font-semibold" style={{ color: 'var(--on-surface)' }}>{col.label}</h2>
              <div className="h-[1px] flex-grow mx-6" style={{ background: 'var(--outline-variant)', opacity: 0.3 }} />
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full border" style={{ color: 'var(--outline)', background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}>
                {colBooks.length} {colBooks.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Shelf Row */}
            <div className="shelf-row shelf-shadow flex items-end gap-2 px-6 pb-2 overflow-x-auto no-scrollbar w-full rounded-b-md">
              <AnimatePresence>
                {colBooks.length === 0 ? (
                  <div className="h-28 w-full rounded-lg border border-dashed flex flex-col items-center justify-center text-xs font-mono gap-1 select-none transition-colors duration-200 mb-2" style={{ borderColor: 'var(--outline-variant)', color: 'var(--outline)', background: 'var(--surface-container-low)' }}>
                    <span className="material-symbols-outlined text-[20px] opacity-60">bookmark</span>
                    <span>No books here yet</span>
                  </div>
                ) : (
                  colBooks.map((book, i) => {
                    const cover = getCover(book.title);
                    return (
                      <motion.div
                        key={book.id}
                        initial={{ opacity: 0, scale: 0.8, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className="book-spine-container mb-2"
                      >
                        {/* Book Spine — authentic library color */}
                        <div
                          className="book-spine flex items-center justify-center py-4 rounded-t"
                          style={{
                            backgroundColor: cover.bg,
                            borderLeft: `4px solid ${cover.border}`,
                            boxShadow: `-3px 0 8px rgba(0,0,0,0.3), inset 2px 0 4px rgba(255,255,255,0.06)`,
                          }}
                        >
                          {/* Cloth texture overlay */}
                          <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.07) 3px, rgba(255,255,255,0.07) 4px)',
                            borderRadius: 'inherit',
                          }} />
                          <span
                            className="spine-title font-serif text-sm font-semibold uppercase tracking-tighter truncate max-h-[180px] relative z-10"
                            style={{ color: cover.text }}
                          >
                            {book.title}
                          </span>
                        </div>

                        {/* Book Card Popout */}
                        <div className="book-popout">
                          <BookCard
                            book={book}
                            index={i}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                          />
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>

              {/* Decorative dummy spines at the end of the shelf */}
              {colBooks.length > 0 && (
                <>
                  <div className="w-[30px] h-[220px] rounded-t shrink-0 shadow-sm mb-2 opacity-40" style={{ background: 'var(--outline-variant)', borderLeft: '2px solid var(--outline-variant)' }} />
                  <div className="w-[35px] h-[230px] rounded-t shrink-0 shadow-sm mb-2 opacity-25" style={{ background: 'var(--outline-variant)', borderLeft: '2px solid var(--outline-variant)' }} />
                  <div className="w-[28px] h-[210px] rounded-t shrink-0 shadow-sm mb-2 opacity-35" style={{ background: 'var(--outline-variant)', borderLeft: '2px solid var(--outline-variant)' }} />
                </>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
