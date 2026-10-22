import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCheck,
  FolderKanban,
  Wallet,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useWorkspace } from '../lib/workspace-context';
import type { Project, Resource, Snapshot } from '../lib/types';
import { money, shortDate } from '../lib/types';
import { Modal, Spinner } from './ui';
import { errorMessage } from '../lib/api';
export function StatCards({ snapshot }: { snapshot?: Snapshot }) {
  const { data: workspaceData, workspace } = useWorkspace();
  const data = snapshot || workspaceData;
  if (!data) return null;
  const { stats } = data;
  return (
    <div className="stat-grid">
      <article className="stat-card">
        <div>
          <span>Active projects</span>
          <FolderKanban size={18} />
        </div>
        <strong>
          {String(data.projects.filter((p) => p.status === 'active').length).padStart(2, '0')}
        </strong>
        <small>
          <span className="stat-dot violet" /> Ideas moving forward
        </small>
      </article>
      <article className="stat-card">
        <div>
          <span>Tasks completed</span>
          <CheckCheck size={18} />
        </div>
        <strong>
          {String(stats.completedTasks).padStart(2, '0')}
          <span> / {stats.totalTasks}</span>
        </strong>
        <small>
          <ArrowUpRight size={14} />
          {stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% of
          the way there
        </small>
      </article>
      <article className="stat-card">
        <div>
          <span>Total expenses</span>
          <ArrowDownRight size={18} />
        </div>
        <strong>{money(stats.totalSpentMinor, workspace?.currency)}</strong>
        <small>{stats.totalExpenses} recorded expenses</small>
      </article>
      <article className="stat-card stat-highlight">
        <div>
          <span>Budget remaining</span>
          <Wallet size={18} />
        </div>
        <strong>
          {money(
            data.projects.reduce((s, p) => s + p.budgetMinor - p.spentMinor, 0),
            workspace?.currency,
          )}
        </strong>
        <small>
          <span className="stat-dot green" /> All-time project budgets
        </small>
      </article>
    </div>
  );
}
export function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { workspace } = useWorkspace();
  const progress = project.taskCount
    ? Math.round((project.doneCount / project.taskCount) * 100)
    : 0;
  const over = project.budgetMinor > 0 && project.spentMinor > project.budgetMinor;
  return (
    <button className="project-card" onClick={onClick}>
      <div className="project-card-top">
        <span className={`project-icon ${project.color}`}>
          <FolderKanban size={21} />
        </span>
        <span className={`badge ${project.status === 'completed' ? 'green' : ''}`}>
          {project.status === 'on-hold'
            ? 'On hold'
            : project.status === 'completed'
              ? 'Completed'
              : 'In progress'}
        </span>
        <ArrowUpRight size={17} />
      </div>
      <span className="project-client">{project.client || 'Your workspace'}</span>
      <h3>{project.name}</h3>
      <p>{project.description || 'A fresh space for your next good idea.'}</p>
      <div className="project-progress-label">
        <span>Task progress</span>
        <strong>{progress}%</strong>
      </div>
      <div className={`progress-track ${project.color}`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="project-card-budget">
        <span>
          {money(project.spentMinor, workspace?.currency)}{' '}
          <small>of {money(project.budgetMinor, workspace?.currency)}</small>
        </span>
        {over && (
          <span className="budget-warning">
            <AlertTriangle size={12} /> Over budget
          </span>
        )}
      </div>
      <div className="project-card-bottom">
        {project.revenueMinor != null && (
          <span
            className={
              project.revenueMinor < project.spentMinor
                ? 'finance-loss-text'
                : 'finance-profit-text'
            }
          >
            {project.revenueMinor < project.spentMinor ? 'Loss' : 'Profit'}{' '}
            {money(project.revenueMinor - project.spentMinor, workspace?.currency)}
          </span>
        )}
        <span>
          {project.doneCount}/{project.taskCount} tasks
        </span>
        <span>Due {shortDate(project.dueDate)}</span>
      </div>
    </button>
  );
}
export function SectionTitle({
  title,
  to,
  children,
}: {
  title: string;
  to?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {to ? (
        <Link className="text-link" to={to}>
          View all <ArrowUpRight size={14} />
        </Link>
      ) : (
        children
      )}
    </div>
  );
}
export function DeleteConfirm({
  resource,
  id,
  name,
  onClose,
}: {
  resource: Resource;
  id: string;
  name: string;
  onClose: () => void;
}) {
  const { mutate } = useWorkspace();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal title="Remove this item?" onClose={onClose}>
      <div className="resource-form">
        <p>“{name}” will be permanently deleted.</p>
        {error && (
          <div role="alert" className="form-alert error">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose}>
            Keep it
          </button>
          <button
            className="button button-danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await mutate(resource, undefined, id, true);
                onClose();
              } catch (err) {
                setError(errorMessage(err));
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <Spinner />
            ) : (
              <>
                <X size={15} />
                Delete item
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
