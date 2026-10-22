import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Sparkles, CircleCheck, MoreHorizontal } from 'lucide-react';
import { useWorkspace } from '../lib/workspace-context';
import { money, shortDate } from '../lib/types';
import type { Snapshot } from '../lib/types';

export default function OverviewBoard({ snapshot }: { snapshot?: Snapshot }) {
  const { data: workspaceData, workspace, prefix, openAssistant } = useWorkspace();
  const data = snapshot || workspaceData;
  const [group, setGroup] = useState('categories');
  const [question, setQuestion] = useState('');
  if (!data) return null;
  const { stats } = data;
  const series =
    group === 'categories'
      ? stats.categories.map((c) => ({ label: c._id, value: c.amountMinor }))
      : stats.trend.map((t) => ({ label: t._id, value: t.amountMinor }));
  const max = Math.max(1, ...series.map((s) => s.value));
  const remaining = data.projects.reduce((sum, p) => sum + p.budgetMinor - p.spentMinor, 0);
  const completion = stats.totalTasks ? stats.completedTasks / stats.totalTasks : 0;
  const metrics = [
    ['Total spending', money(stats.totalSpentMinor, workspace.currency)],
    ['Expenses recorded', String(stats.totalExpenses).padStart(2, '0')],
    ['Completed tasks', String(stats.completedTasks).padStart(2, '0')],
    ['Open tasks', String(stats.totalTasks - stats.completedTasks).padStart(2, '0')],
    ['Project budgets', money(stats.totalBudgetMinor, workspace.currency)],
  ];
  return (
    <div className="overview-grid">
      <section className="data-card spending-card">
        <div className="card-heading">
          <h2>Spending overview</h2>
          <select
            aria-label="Group spending"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="categories">By category</option>
            <option value="months">By month</option>
          </select>
        </div>
        <div className="inline-metrics">
          {metrics.map(([label, value], i) => (
            <div key={label} className={i === 0 ? 'metric-active' : ''}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div
          className="striped-chart"
          role="img"
          aria-label={`Spending ${group === 'categories' ? 'by category' : 'by month'}. ${series.map((s) => `${s.label}: ${money(s.value, workspace.currency)}`).join('. ')}`}
        >
          <div className="chart-grid-lines">
            <span />
            <span />
            <span />
          </div>
          {series.length ? (
            series.map((s) => (
              <div className="chart-column" key={s.label}>
                <div className="bar-space">
                  <div
                    className="striped-bar"
                    style={{ height: `${Math.max(2, (s.value / max) * 100)}%` }}
                  >
                    <span>{money(s.value, workspace.currency)}</span>
                  </div>
                </div>
                <small>{s.label}</small>
              </div>
            ))
          ) : (
            <p className="chart-empty">Your first expense starts the picture.</p>
          )}
        </div>
        <form
          className="inline-ask"
          onSubmit={(e) => {
            e.preventDefault();
            openAssistant('ask', question || 'Summarize my spending and project budgets.');
          }}
        >
          <label htmlFor="overview-question">
            <Sparkles size={13} />
            What would you like to explore?
          </label>
          <div>
            <input
              id="overview-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Why is this project spending more than expected?"
              maxLength={2000}
            />
            <button aria-label="Ask Ultron about your workspace">
              <ArrowUpRight size={18} />
            </button>
          </div>
        </form>
      </section>
      <section className="data-card budget-volume">
        <div className="card-heading">
          <h2>Budget balance</h2>
          <Link to={`${prefix}/reports`} aria-label="View budget reports">
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <strong className="volume-number">{money(remaining, workspace.currency)}</strong>
        <span className="card-subtitle">Remaining across project budgets</span>
        <div className="budget-segments">
          {data.projects.slice(0, 4).map((p, i) => (
            <Link key={p._id} to={`${prefix}/projects?q=${encodeURIComponent(p.name)}`}>
              <span>
                {p.name}
                <strong>
                  {p.budgetMinor ? Math.round((p.spentMinor / p.budgetMinor) * 100) : 0}% used
                </strong>
              </span>
              <div>
                <i
                  className={`segment-${i}`}
                  style={{
                    width: `${Math.min(100, p.budgetMinor ? (p.spentMinor / p.budgetMinor) * 100 : 0)}%`,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
        {!data.projects.length && (
          <p className="card-subtitle">Create a project to set your first budget.</p>
        )}
        <Link className="card-bottom-link" to={`${prefix}/projects`}>
          View projects <ChevronRight size={14} />
        </Link>
      </section>
      <section className="data-card completion-card">
        <div className="card-heading">
          <h2>Task momentum</h2>
          <CircleCheck size={16} />
        </div>
        <div className="completion-main">
          <div>
            <span className="card-subtitle">Completed</span>
            <strong>
              {Math.round(completion * 100)}
              <small>%</small>
            </strong>
          </div>
          <div
            className="completion-matrix"
            role="img"
            aria-label={`${stats.completedTasks} of ${stats.totalTasks} tasks completed`}
          >
            {Array.from({ length: 35 }, (_, i) => (
              <i className={i < Math.round(completion * 35) ? 'filled' : ''} key={i} />
            ))}
          </div>
        </div>
        <div className="completion-footer">
          <span>
            {stats.completedTasks} completed · {stats.totalTasks - stats.completedTasks} open
          </span>
          <Link to={`${prefix}/tasks`}>
            See tasks <ArrowUpRight size={13} />
          </Link>
        </div>
      </section>
      <section className="data-card latest-card">
        <div className="card-heading">
          <h2>Latest expenses</h2>
          <Link to={`${prefix}/expenses`} aria-label="All expenses">
            <MoreHorizontal size={18} />
          </Link>
        </div>
        {data.expenses.length ? (
          data.expenses.slice(0, 3).map((e) => (
            <Link
              className="compact-expense"
              key={e._id}
              to={`${prefix}/expenses?q=${encodeURIComponent(e.title)}`}
            >
              <span className="merchant-initial">{e.title[0]}</span>
              <span>
                <strong>{e.title}</strong>
                <small>
                  {e.category} · {shortDate(e.date)}
                </small>
              </span>
              <b>{money(e.amountMinor, workspace.currency)}</b>
            </Link>
          ))
        ) : (
          <p className="card-subtitle">Your recorded expenses will appear here.</p>
        )}
      </section>
      <button
        className="data-card edith-insight"
        onClick={() =>
          openAssistant('ask', 'Summarize my workspace and tell me what needs attention.')
        }
      >
        <span className="insight-tag">
          <Sparkles size={12} /> ULTRON INTELLIGENCE
        </span>
        <strong>
          Less searching.
          <br />
          Better decisions.
        </strong>
        <p>Ask a question. Get context from your own work.</p>
        <span className="insight-bottom">
          Ask Ultron <ArrowUpRight size={20} />
        </span>
      </button>
    </div>
  );
}
