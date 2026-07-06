import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={`spin ${className}`} />;
}

export function StatusBadge({ status }) {
  const map = {
    reading:      { label: 'Reading',       cls: 'badge-reading' },
    read:         { label: 'Read',           cls: 'badge-read'    },
    want_to_read: { label: 'Want to Read',   cls: 'badge-want'    },
  };
  const { label, cls } = map[status] || { label: status, cls: 'badge-want' };
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`star ${value >= n ? 'filled' : 'empty'}`}
          onClick={() => onChange?.(n)}
          style={{ fontSize: '1rem', color: value >= n ? '#fbbf24' : '#3f3f46' }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function ThemeTag({ label }) {
  return <span className="tag">{label}</span>;
}
