import { useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react';

type Dates = { from: string; to: string };
const dateText = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
export default function DateFilter({
  onApply,
  children,
  onClear,
  active = false,
  busy = false,
  description = 'Projects and tasks use their creation date. Expenses use the transaction date.',
}: {
  onApply: (dates: Dates) => void;
  children?: ReactNode;
  onClear?: () => void;
  active?: boolean;
  busy?: boolean;
  description?: string;
}) {
  const [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const [applied, setApplied] = useState<Dates>({ from: '', to: '' });
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(() => window.matchMedia('(min-width: 681px)').matches);
  const dateLabel =
    applied.from && applied.to
      ? `${dateText(applied.from)} – ${dateText(applied.to)}`
      : applied.from
        ? `From ${dateText(applied.from)}`
        : applied.to
          ? `Until ${dateText(applied.to)}`
          : active
            ? 'Project selected'
            : 'All dates';
  return (
    <details
      className="date-filter-panel"
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary className="date-filter-summary">
        <CalendarDays size={18} aria-hidden="true" />
        <strong>{children ? 'Report filters' : 'Date filters'}</strong>
        <span title={[applied.from, applied.to].filter(Boolean).join(' – ')}>{dateLabel}</span>
        <ChevronDown size={16} className="filter-chevron" aria-hidden="true" />
      </summary>
      <form
        className="date-filter-form"
        aria-label="Filter records by date"
        onSubmit={(e) => {
          e.preventDefault();
          if (from && to && from > to) {
            setError('Choose an end date on or after the start.');
            return;
          }
          setError('');
          setApplied({ from, to });
          onApply({ from, to });
          if (window.matchMedia('(max-width: 680px)').matches) setExpanded(false);
        }}
      >
        <div className="date-filter-fields">
          {children && <div className="date-filter-project">{children}</div>}
          <label>
            From
            <input
              type="date"
              value={from}
              aria-invalid={!!error}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              aria-invalid={!!error}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <div className="date-filter-actions">
            <button className="button button-dark" disabled={busy}>
              Apply dates
            </button>
            {(from || to || active) && (
              <button
                type="button"
                className="button button-outline"
                disabled={busy}
                onClick={() => {
                  setFrom('');
                  setTo('');
                  setApplied({ from: '', to: '' });
                  setError('');
                  onApply({ from: '', to: '' });
                  onClear?.();
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>
        {error && (
          <p className="date-filter-error" role="alert">
            {error}
          </p>
        )}
        <details className="date-filter-help">
          <summary>How dates apply</summary>
          <p>{description}</p>
        </details>
      </form>
    </details>
  );
}
