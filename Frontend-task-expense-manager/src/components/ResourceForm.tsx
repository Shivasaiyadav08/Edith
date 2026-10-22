import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal, Spinner } from './ui';
import { useWorkspace } from '../lib/workspace-context';
import { errorMessage } from '../lib/api';
import type { Resource, Task, Expense, Project, DraftExpense } from '../lib/types';
import { currencies } from '../lib/types';

export default function ResourceForm({
  resource,
  item,
  draft,
  onClose,
}: {
  resource: Resource;
  item?: Task | Expense | Project;
  draft?: DraftExpense;
  onClose: () => void;
}) {
  const { data, mutate, workspace, setCurrency } = useWorkspace();
  const [chosenCurrency, chooseCurrency] = useState<string>();
  const currency = chosenCurrency || workspace.currency;
  const [currencyAcknowledged, acknowledgeCurrency] = useState(false);
  const currencyChanged = currency !== workspace.currency;
  const hasFinancialRecords = !!(data?.projects.length || data?.stats.totalExpenses);
  const existing = item as
    | (Partial<Omit<Task, 'status'> & Expense & Omit<Project, 'status'>> & {
        status?: string;
      })
    | undefined;
  const [title, setTitle] = useState(existing?.title || existing?.name || draft?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [project, setProject] = useState(existing?.project || '');
  const [date, setDate] = useState(
    (resource === 'expenses'
      ? existing?.date || draft?.date || new Date().toISOString()
      : existing?.dueDate || ''
    ).slice(0, 10),
  );
  const [amount, setAmount] = useState(
    String(
      resource === 'projects'
        ? (existing?.budgetMinor || 0) / 100
        : (existing?.amount ?? draft?.amount ?? ''),
    ),
  );
  const [category, setCategory] = useState(existing?.category || draft?.category || 'Software');
  const [merchant, setMerchant] = useState(existing?.merchant || draft?.merchant || '');
  const [notes, setNotes] = useState(existing?.notes || draft?.notes || '');
  const [client, setClient] = useState(existing?.client || '');
  const [revenue, setRevenue] = useState(
    existing?.revenueMinor == null ? '' : String(existing.revenueMinor / 100),
  );
  const [status, setStatus] = useState(
    existing?.status || (resource === 'projects' ? 'active' : 'todo'),
  );
  const [priority, setPriority] = useState<string>(existing?.priority || 'medium');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const foreignCurrency = draft && draft.currency !== currency;
  const type = resource === 'projects' ? 'project' : resource === 'tasks' ? 'task' : 'expense';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (foreignCurrency && !confirmed) throw new Error('Review the currency before saving.');
      if (currencyChanged) {
        if (hasFinancialRecords && !currencyAcknowledged)
          throw new Error('Confirm the workspace currency change before saving.');
        await setCurrency(currency, currencyAcknowledged);
      }
      const body =
        resource === 'projects'
          ? {
              name: title,
              description,
              client,
              budget: Number(amount),
              revenue: revenue.trim() === '' ? null : Number(revenue),
              status,
              dueDate: date || null,
            }
          : resource === 'tasks'
            ? {
                title,
                description,
                project: project || null,
                status,
                priority,
                dueDate: date || null,
              }
            : {
                title,
                amount: Number(amount),
                category,
                merchant,
                project: project || null,
                date,
                notes,
              };
      await mutate(resource, body, item?._id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`${item ? 'Edit' : draft ? 'Review' : 'New'} ${type}`} onClose={onClose}>
      <form className="resource-form" onSubmit={submit}>
        {error && (
          <div className="form-alert error" role="alert">
            {error}
          </div>
        )}
        {draft && (
          <div className="form-alert info">
            AI draft — review every field before saving.
            {foreignCurrency &&
              ` This receipt uses ${draft.currency}. Enter the amount in ${currency}; no conversion is applied.`}
          </div>
        )}
        <label>
          {resource === 'projects' ? 'Project name' : 'Title'}
          <input
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              resource === 'projects' ? 'Your next big idea' : 'A little detail about this item'
            }
          />
        </label>
        {resource !== 'expenses' && (
          <label>
            Description
            <textarea
              maxLength={3000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A little context goes a long way."
            />
          </label>
        )}
        {resource !== 'projects' && (
          <label>
            Project
            <select value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">No project</option>
              {data?.projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {resource === 'tasks' && (
          <div className="form-grid">
            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>
          </div>
        )}
        {resource !== 'tasks' && (
          <label>
            Currency
            <select
              aria-label="Form currency"
              value={currency}
              onChange={(event) => {
                chooseCurrency(event.target.value);
                acknowledgeCurrency(false);
                setConfirmed(false);
              }}
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code} — {new Intl.DisplayNames(['en'], { type: 'currency' }).of(code)}
                </option>
              ))}
            </select>
            <span className="input-hint">
              Used across this workspace’s expenses, budgets, and revenue. Amounts are not
              converted.
            </span>
          </label>
        )}
        {currencyChanged && hasFinancialRecords && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              required
              checked={currencyAcknowledged}
              onChange={(event) => acknowledgeCurrency(event.target.checked)}
            />
            Use {currency} for this workspace; keep existing numeric amounts without conversion.
          </label>
        )}
        {resource === 'projects' && (
          <>
            <div className="form-grid">
              <label>
                Client
                <input maxLength={150} value={client} onChange={(e) => setClient(e.target.value)} />
              </label>
              <label>
                Budget ({currency})
                <input
                  type="number"
                  min="0"
                  max="100000000"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>
            <label>
              Recorded revenue ({currency}, optional)
              <input
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="Leave blank until revenue is known"
              />
              <span className="input-hint">
                Total income recorded for this project. Profit/loss = revenue minus linked expenses.
                This is separate from your spending budget.
              </span>
            </label>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="on-hold">On hold</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </>
        )}
        {resource === 'expenses' && (
          <>
            <div className="form-grid">
              <label>
                Amount ({currency})
                <input
                  type="number"
                  min="0"
                  max="100000000"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                Category
                <input
                  required
                  maxLength={60}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="categories"
                />
                <datalist id="categories">
                  {[
                    'Software',
                    'Creative',
                    'Infrastructure',
                    'Meals',
                    'Travel',
                    'Equipment',
                    'Other',
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </datalist>
              </label>
            </div>
            <label>
              Merchant
              <input
                maxLength={200}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </label>
            <label>
              Notes
              <textarea
                rows={2}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          {resource === 'expenses' ? 'Transaction date' : 'Due date'}
          <input
            type="date"
            required={resource === 'expenses'}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {foreignCurrency && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I have entered the amount in {currency}.
          </label>
        )}
        <div className="modal-actions">
          <button className="button button-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-dark"
            disabled={busy || (!!foreignCurrency && !confirmed)}
          >
            {busy ? <Spinner /> : item ? 'Save changes' : `Add ${type}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
