import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  Circle,
  Columns3,
  List,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../lib/workspace-context';
import { errorMessage } from '../lib/api';
import { PageHeading, Empty, Spinner } from '../components/ui';
import { DeleteConfirm } from '../components/workspace-ui';
import ResourceForm from '../components/ResourceForm';
import type { Task, Status } from '../lib/types';
import { statusLabel, shortDate } from '../lib/types';
import DateFilter from '../components/DateFilter';
import useReport from '../lib/useReport';

export default function Tasks() {
  const { data: allData, mutate, notify, openAssistant } = useWorkspace();
  const [period, setPeriod] = useState({ from: '', to: '' });
  const [params] = useSearchParams();
  const [query, setQuery] = useState(''),
    [project, setProject] = useState(params.get('project') || 'all'),
    [filter, setFilter] = useState('all'),
    [board, setBoard] = useState(false);
  const [form, setForm] = useState<Task | 'new' | null>(null),
    [deleting, setDeleting] = useState<Task | null>(null),
    [busy, setBusy] = useState(false);
  const report = useReport(project === 'all' ? '' : project, period.from, period.to);
  const loadMore = report.loadMore;
  const data = report.data || (allData ? { ...allData, tasks: [] } : null);
  if (!data || !allData) return null;
  const filtered = data.tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) &&
      (project === 'all' || t.project === project) &&
      (filter === 'all' || t.status === filter),
  );
  const updateStatus = async (task: Task, status: Status) => {
    try {
      await mutate('tasks', { status }, task._id);
    } catch (err) {
      notify(errorMessage(err));
    }
  };
  const projectName = (task: Task) =>
    allData.projects.find((p) => p._id === task.project)?.name || 'No project';
  function statusSelect(t: Task) {
    return (
      <select
        className={`status-select ${t.status}`}
        aria-label={`Status for ${t.title}`}
        value={t.status}
        onChange={(e) => void updateStatus(t, e.target.value as Status)}
      >
        {(['todo', 'in-progress', 'done'] as Status[]).map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
    );
  }
  return (
    <>
      <PageHeading
        shortTitle="Tasks"
        eyebrow="ONE STEP AT A TIME"
        title="Make room for meaningful work."
        description="Small steps make big things happen. Here’s what’s on your plate."
        action={
          <div className="heading-actions">
            <button className="button button-outline" onClick={() => openAssistant('plan')}>
              <Sparkles size={15} />
              Plan with AI
            </button>
            <button className="button button-dark" onClick={() => setForm('new')}>
              <Plus size={16} />
              New task
            </button>
          </div>
        }
      />
      <DateFilter onApply={setPeriod} />
      {report.error && (
        <p role="alert" className="form-alert error">
          {report.error}
        </p>
      )}
      {report.busy && (
        <div className="report-loading">
          <Spinner /> Updating tasks…
        </div>
      )}
      <div className="list-toolbar">
        <div className="filter-tabs">
          {[
            ['all', 'All tasks'],
            ['todo', 'To do'],
            ['in-progress', 'In progress'],
            ['done', 'Done'],
          ].map(([v, label]) => (
            <button
              key={v}
              aria-pressed={filter === v}
              className={filter === v ? 'active' : ''}
              onClick={() => setFilter(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="view-toggle">
          <button
            aria-label="List view"
            aria-pressed={!board}
            className={!board ? 'active' : ''}
            onClick={() => setBoard(false)}
          >
            <List size={16} />
            <span className="mobile-only">List</span>
          </button>
          <button
            aria-label="Board view"
            aria-pressed={board}
            className={board ? 'active' : ''}
            onClick={() => setBoard(true)}
          >
            <Columns3 size={16} />
            <span className="mobile-only">Board</span>
          </button>
        </div>
      </div>
      <div className="secondary-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by project"
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
        <span className="muted">{filtered.length} tasks shown</span>
      </div>
      {!filtered.length ? (
        <Empty
          icon={<ListTodo />}
          title="A little room for your next step."
          action={
            <button className="button button-dark" onClick={() => setForm('new')}>
              Add a task
            </button>
          }
        >
          Add something new or try a different filter.
        </Empty>
      ) : board ? (
        <div className="kanban-board">
          {(['todo', 'in-progress', 'done'] as Status[]).map((status) => (
            <section className="kanban-column" key={status}>
              <h3>
                {statusLabel(status)}
                <span>{filtered.filter((t) => t.status === status).length}</span>
              </h3>
              {filtered
                .filter((t) => t.status === status)
                .map((t) => (
                  <article className="kanban-card" key={t._id}>
                    <span className="project-client">{projectName(t)}</span>
                    <button className="table-title" onClick={() => setForm(t)}>
                      {t.title}
                    </button>
                    <p>{t.description}</p>
                    <div className="kanban-card-footer">
                      <span className={`priority-label ${t.priority}`}>
                        <i />
                        {t.priority}
                      </span>
                      <span>{shortDate(t.dueDate)}</span>
                    </div>
                    {statusSelect(t)}
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="table-panel">
          <table className="responsive-table tasks-table">
            <thead>
              <tr>
                <th />
                <th>Task</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Due date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id}>
                  <td data-label="Complete">
                    <button
                      className={`task-check ${t.status === 'done' ? 'is-done' : ''}`}
                      aria-label={`${t.status === 'done' ? 'Reopen' : 'Complete'} ${t.title}`}
                      onClick={() => void updateStatus(t, t.status === 'done' ? 'todo' : 'done')}
                    >
                      {t.status === 'done' ? <Check size={18} /> : <Circle size={18} />}
                    </button>
                  </td>
                  <td data-label="Task">
                    <button
                      className={`table-title ${t.status === 'done' ? 'struck' : ''}`}
                      onClick={() => setForm(t)}
                    >
                      {t.title}
                    </button>
                  </td>
                  <td data-label="Project">
                    <span className="project-tag">{projectName(t)}</span>
                  </td>
                  <td data-label="Priority">
                    <span className={`priority-label ${t.priority}`}>
                      <i />
                      {t.priority}
                    </span>
                  </td>
                  <td data-label="Due date" className="muted">
                    {shortDate(t.dueDate)}
                  </td>
                  <td data-label="Status">{statusSelect(t)}</td>
                  <td data-label="Actions">
                    <button
                      className="icon-button"
                      aria-label={`Delete ${t.title}`}
                      onClick={() => setDeleting(t)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.tasks.length < data.stats.totalTasks && (
        <button
          className="button button-outline load-more"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await loadMore('tasks');
            } catch (err) {
              notify(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Spinner /> : 'Load more tasks'}
        </button>
      )}
      {form && (
        <ResourceForm
          resource="tasks"
          item={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}
      {deleting && (
        <DeleteConfirm
          resource="tasks"
          id={deleting._id}
          name={deleting.title}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
