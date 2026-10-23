import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, CreditCard, Plus, Search, Sparkles, Trash2, Receipt } from 'lucide-react';
import { useWorkspace } from '../lib/workspace-context';
import { apiFetch, errorMessage } from '../lib/api';
import { PageHeading, Empty, Spinner } from '../components/ui';
import { DeleteConfirm } from '../components/workspace-ui';
import ResourceForm from '../components/ResourceForm';
import type { Expense } from '../lib/types';
import { money, shortDate } from '../lib/types';
import DateFilter from '../components/DateFilter';
import useReport from '../lib/useReport';
export default function Expenses() {
  const { data: allData, workspace, openAssistant, demo, notify } = useWorkspace();
  const [period, setPeriod] = useState({ from: '', to: '' });
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || ''),
    [project, setProject] = useState(params.get('project') || 'all'),
    [category, setCategory] = useState('all'),
    [form, setForm] = useState<Expense | 'new' | null>(null),
    [deleting, setDeleting] = useState<Expense | null>(null),
    [busy, setBusy] = useState(false);
  const report = useReport(
    project === 'all' ? '' : project,
    period.from,
    period.to,
    category === 'all' ? '' : category,
    query,
  );
  const data = report.data;
  const loadMore = report.loadMore;
  if (!allData) return null;
  const filtered = (data?.expenses || []).filter(
    (e) =>
      `${e.title} ${e.merchant}`.toLowerCase().includes(query.toLowerCase()) &&
      (project === 'all' || e.project === project) &&
      (category === 'all' || e.category === category),
  );
  async function exportCSV() {
    setBusy(true);
    try {
      let blob: Blob;
      if (demo) {
        const cell = (v: unknown) => {
          let s = String(v ?? '');
          if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
          return `"${s.replaceAll('"', '""')}"`;
        };
        blob = new Blob(
          [
            'Title,Amount,Currency,Category,Merchant,Date,Billable\r\n',
            ...filtered.map(
              (e) =>
                [
                  e.title,
                  e.amount,
                  workspace.currency,
                  e.category,
                  e.merchant,
                  e.date.slice(0, 10),
                  e.billable,
                ]
                  .map(cell)
                  .join(',') + '\r\n',
            ),
          ],
          { type: 'text/csv;charset=utf-8' },
        );
      } else {
        const res = await apiFetch(`/export/expenses?${report.query}`);
        if (!res.ok) throw new Error('Export could not be completed.');
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'edith-expenses.csv';
      anchor.click();
      URL.revokeObjectURL(url);
      notify('Your expense export is ready.');
    } catch (err) {
      notify(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="THE DETAILS ADD UP"
        title="Every expense, in its place."
        description="A little clarity about where it all goes. Your spending, connected to your work."
        action={
          <div className="heading-actions">
            <button
              className="button button-outline"
              disabled={busy}
              onClick={() => void exportCSV()}
            >
              <ArrowDownToLine size={15} />
              Export CSV
            </button>
            <button className="button button-dark" onClick={() => setForm('new')}>
              <Plus size={16} />
              Add expense
            </button>
          </div>
        }
      />
      <DateFilter onApply={setPeriod} />
      {report.error && (
        <p className="form-alert error" role="alert">
          {report.error}
        </p>
      )}
      <div className="expense-overview">
        <article className="expense-total">
          <span className="eyebrow">TOTAL RECORDED SPENDING</span>
          <strong>
            {report.busy ? '…' : money(data?.stats.totalSpentMinor || 0, workspace.currency)}
          </strong>
          <span>
            {data?.stats.totalExpenses || 0} matching expenses · {workspace.currency}
          </span>
          <CreditCard size={36} />
        </article>
        <article className="expense-category-summary">
          <span className="eyebrow">BY CATEGORY</span>
          <div className="category-bars">
            {(data?.stats.categories || []).slice(0, 4).map((c, i) => (
              <div key={c._id}>
                <span>
                  <i className={`category-dot cat-${i}`} />
                  {c._id}
                </span>
                <strong>{money(c.amountMinor, workspace?.currency)}</strong>
              </div>
            ))}
            {!data?.stats.categories.length && (
              <p className="muted">Your spending categories will appear here.</p>
            )}
          </div>
        </article>
        <button onClick={() => openAssistant('receipt')} className="receipt-prompt">
          <span className="ai-icon">
            <Receipt size={23} />
          </span>
          <strong>A receipt. A little less typing.</strong>
          <p>Let AI read the details. Review the draft before you save.</p>
          <span className="text-link">
            Scan a receipt <Sparkles size={14} />
          </span>
        </button>
      </div>
      <div className="secondary-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an expense..."
            aria-label="Search expenses"
          />
        </label>
        <select
          aria-label="Filter expenses by project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="all">All projects</option>
          {allData.projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {allData.stats.categories.map((c) => (
            <option key={c._id}>{c._id}</option>
          ))}
        </select>
        <span className="muted">{filtered.length} expenses shown</span>
      </div>
      {report.busy ? (
        <div className="report-loading">
          <Spinner /> Updating expenses…
        </div>
      ) : filtered.length ? (
        <div className="table-panel">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Category</th>
                <th>Project</th>
                <th>Date</th>
                <th>Billable</th>
                <th className="align-right">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e._id}
                  className="expense-row"
                  tabIndex={0}
                  aria-label={`Edit expense ${e.title}`}
                  onClick={() => setForm(e)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      ['Enter', ' '].includes(event.key)
                    ) {
                      event.preventDefault();
                      setForm(e);
                    }
                  }}
                >
                  <td data-label="Expense">
                    <button className="expense-title" onClick={() => setForm(e)}>
                      <span className="expense-merchant-icon">{(e.merchant || e.title)[0]}</span>
                      <span>
                        <strong>{e.title}</strong>
                        <small>{e.merchant || 'No merchant'}</small>
                      </span>
                    </button>
                  </td>
                  <td data-label="Category">
                    <span className="badge">{e.category}</span>
                  </td>
                  <td data-label="Project">
                    <span className="project-tag">
                      {allData.projects.find((p) => p._id === e.project)?.name || 'No project'}
                    </span>
                  </td>
                  <td data-label="Date" className="muted">
                    {shortDate(e.date)}
                  </td>
                  <td data-label="Billable">
                    <span className={`badge ${e.billable ? 'green' : ''}`}>
                      {e.billable ? 'Billable' : 'Internal'}
                    </span>
                  </td>
                  <td data-label="Amount" className="align-right amount-cell">
                    {money(e.amountMinor, workspace.currency)}
                  </td>
                  <td data-label="Actions">
                    <button
                      className="icon-button subtle-delete"
                      aria-label={`Delete ${e.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleting(e);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={<CreditCard />}
          title={
            allData.expenses.length
              ? 'Nothing matches that search.'
              : 'Start with your first expense.'
          }
          action={
            <button className="button button-dark" onClick={() => setForm('new')}>
              Add an expense
            </button>
          }
        >
          {allData.expenses.length
            ? 'Try another category, project, or search.'
            : 'Add a purchase or scan a receipt to see where your budget goes.'}
        </Empty>
      )}
      {data && data.expenses.length < data.stats.totalExpenses && (
        <button
          className="button button-outline load-more"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await loadMore('expenses');
            } catch (err) {
              notify(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <Spinner />
          ) : (
            `Load more expenses (${data.expenses.length} of ${data.stats.totalExpenses})`
          )}
        </button>
      )}
      {form && (
        <ResourceForm
          resource="expenses"
          item={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}
      {deleting && (
        <DeleteConfirm
          resource="expenses"
          id={deleting._id}
          name={deleting.title}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
