import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FolderKanban, Plus, Search, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import { PageHeading, Empty, Modal, Spinner } from '../components/ui';
import DateFilter from '../components/DateFilter';
import useReport from '../lib/useReport';
import { ProjectCard, DeleteConfirm } from '../components/workspace-ui';
import ResourceForm from '../components/ResourceForm';
import { useWorkspace } from '../lib/workspace-context';
import type { Project } from '../lib/types';
import { money, shortDate } from '../lib/types';
export default function Projects() {
  const { data: allData, workspace, prefix } = useWorkspace();
  const [period, setPeriod] = useState({ from: '', to: '' });
  const report = useReport('', period.from, period.to);
  const data = report.data || (allData ? { ...allData, projects: [] } : null);
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || ''),
    [filter, setFilter] = useState('all'),
    [form, setForm] = useState<Project | 'new' | null>(null),
    [selected, setSelected] = useState<Project | null>(null),
    [deleting, setDeleting] = useState<Project | null>(null);
  if (!data) return null;
  const filtered = data.projects.filter(
    (p) =>
      `${p.name} ${p.client}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' || p.status === filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="THE BIG PICTURE"
        title="Good ideas, in motion."
        description="A home for the work you care about. Keep every moving part connected."
        action={
          <button className="button button-dark" onClick={() => setForm('new')}>
            <Plus size={16} />
            New project
          </button>
        }
      />
      <DateFilter onApply={setPeriod} />
      {report.error && (
        <p role="alert" className="form-alert error">
          {report.error}
        </p>
      )}
      <div className="list-toolbar">
        <div className="filter-tabs">
          {[
            ['all', 'All projects'],
            ['active', 'Active'],
            ['completed', 'Completed'],
            ['on-hold', 'On hold'],
          ].map(([v, label]) => (
            <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>
              {label}
              {v === 'all' && <span>{data.projects.length}</span>}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search projects"
            placeholder="Find a project..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {report.busy ? (
        <div className="report-loading">
          <Spinner /> Updating projects…
        </div>
      ) : filtered.length ? (
        <div className="project-grid full-project-grid">
          {filtered.map((p) => (
            <ProjectCard key={p._id} project={p} onClick={() => setSelected(p)} />
          ))}
          {
            <button className="new-project-card" onClick={() => setForm('new')}>
              <span>
                <Plus size={24} />
              </span>
              <strong>A little space for a new idea.</strong>
              <p>Create a project</p>
            </button>
          }
        </div>
      ) : (
        <Empty
          icon={<FolderKanban />}
          title={
            allData?.projects.length
              ? 'No projects match these filters.'
              : 'Your next chapter starts here.'
          }
          action={
            <button className="button button-dark" onClick={() => setForm('new')}>
              Create a project
            </button>
          }
        >
          {allData?.projects.length
            ? 'Try another search or filter.'
            : 'Create your first project and give the details somewhere to belong.'}
        </Empty>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="resource-form">
            <span className="eyebrow">{selected.client || 'YOUR WORKSPACE'}</span>
            <p>{selected.description || 'No description yet.'}</p>
            <div className="detail-stats">
              <span>
                Budget
                <strong>{money(selected.budgetMinor, workspace?.currency)}</strong>
              </span>
              <span>
                Spent
                <strong>{money(selected.spentMinor, workspace?.currency)}</strong>
              </span>
              <span>
                Remaining
                <strong>
                  {money(selected.budgetMinor - selected.spentMinor, workspace?.currency)}
                </strong>
              </span>
            </div>
            <p className="input-hint">
              {selected.revenueMinor != null && (
                <>
                  Revenue {money(selected.revenueMinor, workspace?.currency)} ·{' '}
                  <strong
                    className={
                      selected.revenueMinor < selected.spentMinor
                        ? 'finance-loss-text'
                        : 'finance-profit-text'
                    }
                  >
                    {selected.revenueMinor < selected.spentMinor ? 'Loss' : 'Profit'}{' '}
                    {money(selected.revenueMinor - selected.spentMinor, workspace?.currency)}
                  </strong>
                  <br />
                </>
              )}
              Due {shortDate(selected.dueDate)} · {selected.doneCount} of {selected.taskCount} tasks
              complete
            </p>
            <Link className="text-link" to={`${prefix}/tasks?project=${selected._id}`}>
              See project tasks <ArrowUpRight size={15} />
            </Link>
            <Link className="text-link" to={`${prefix}/expenses?project=${selected._id}`}>
              See project expenses <ArrowUpRight size={15} />
            </Link>
            {
              <div className="modal-actions">
                <button
                  className="button button-ghost danger-text"
                  onClick={() => {
                    setDeleting(selected);
                    setSelected(null);
                  }}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
                <button
                  className="button button-dark"
                  onClick={() => {
                    setForm(selected);
                    setSelected(null);
                  }}
                >
                  <Pencil size={15} />
                  Edit project
                </button>
              </div>
            }
          </div>
        </Modal>
      )}
      {form && (
        <ResourceForm
          resource="projects"
          item={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}
      {deleting && (
        <DeleteConfirm
          resource="projects"
          id={deleting._id}
          name={deleting.name}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
