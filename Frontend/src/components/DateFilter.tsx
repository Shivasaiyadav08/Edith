import { useState } from 'react';

export default function DateFilter({
  onApply,
}: {
  onApply: (dates: { from: string; to: string }) => void;
}) {
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [error, setError] = useState('');
  return (
    <form
      className="report-range date-filter"
      onSubmit={(e) => {
        e.preventDefault();
        if (from && to && from > to) {
          setError('Choose an end date on or after the start.');
          return;
        }
        setError('');
        onApply({ from, to });
      }}
    >
      <span>Date range</span>
      <label>
        From
        <input type="date" value={from} onInput={(e) => setFrom(e.currentTarget.value)} />
      </label>
      <label>
        To
        <input type="date" value={to} onInput={(e) => setTo(e.currentTarget.value)} />
      </label>
      <button className="button button-dark">Apply dates</button>
      {(from || to) && (
        <button
          type="button"
          className="button button-ghost"
          onClick={() => {
            setFrom('');
            setTo('');
            setError('');
            onApply({ from: '', to: '' });
          }}
        >
          Clear dates
        </button>
      )}
      <small>Projects and tasks: created date. Expenses: transaction date.</small>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
