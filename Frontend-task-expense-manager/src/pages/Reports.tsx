import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ArrowUpRight, ArrowDownToLine, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading, Empty, Spinner } from '../components/ui';
import { StatCards } from '../components/workspace-ui';
import { useWorkspace } from '../lib/workspace-context';
import { money } from '../lib/types';
import useReport from '../lib/useReport';
import FinancialSummary from '../components/FinancialSummary';
import { downloadCSV } from '../lib/download';
import { errorMessage } from '../lib/api';
export default function Reports() {
  const { data, workspace, prefix, notify, demo } = useWorkspace();
  const [exporting, setExporting] = useState(false);
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [project, setProject] = useState(''),
    [period, setPeriod] = useState({ from: '', to: '' });
  const report = useReport(project, period.from, period.to);
  const { busy } = report;
  if (!data) return null;
  const active = report.data;
  const selectedPeriod = Boolean(period.from || period.to);
  const currency = workspace?.currency || 'USD';
  const colors = ['#3475ed', '#20ac82', '#fa9b45', '#ec6688', '#d9b72a', '#7496a6'];
  const categoryData = (active?.stats.categories || []).map((c) => ({
    name: c._id,
    value: c.amountMinor / 100,
  }));
  return (
    <>
      <PageHeading
        eyebrow="A CLEARER PERSPECTIVE"
        title="See how it all adds up."
        description="The big picture, grounded in your actual work and spending."
        action={
          <div className="heading-actions">
            <button
              className="button button-dark"
              disabled={exporting || busy || !active}
              onClick={async () => {
                setExporting(true);
                try {
                  if (demo) throw new Error('Sign in to export a full report from your workspace.');
                  await downloadCSV(`/export/report?${report.query}`, 'edith-report.csv');
                  notify('Full report exported: summary, projects, tasks, and expenses.');
                } catch (err) {
                  notify(errorMessage(err));
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? <Spinner /> : <ArrowDownToLine size={15} />} Export report
            </button>
            <Link className="button button-outline" to={`${prefix}/expenses`}>
              Manage expenses <ArrowUpRight size={15} />
            </Link>
          </div>
        }
      />
      <form
        className="report-range"
        onSubmit={(e) => {
          e.preventDefault();
          if (from && to && from > to) {
            notify('Choose an end date after the start date.');
            return;
          }
          setPeriod({ from, to });
        }}
      >
        <label>
          Project
          <select
            aria-label="Reports project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">All projects</option>
            {data.projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <span>Reporting period</span>
        <label>
          From
          <input type="date" value={from} onInput={(e) => setFrom(e.currentTarget.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onInput={(e) => setTo(e.currentTarget.value)} />
        </label>
        <button className="button button-dark" disabled={busy}>
          {busy ? <Spinner /> : 'Apply dates'}
        </button>
        {(project || selectedPeriod) && (
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              setPeriod({ from: '', to: '' });
              setProject('');
              setFrom('');
              setTo('');
            }}
          >
            Clear
          </button>
        )}
      </form>
      <p className="report-date-note">
        Dates apply to project/task creation and expense transactions. Project budgets, revenue, and
        profit/loss are all-time for projects created in the selected range. Export includes every
        matching record, including those beyond the first 100.
      </p>
      {report.error && (
        <p role="alert" className="form-alert error">
          {report.error}
        </p>
      )}
      {busy && (
        <div className="report-loading">
          <Spinner /> Updating report…
        </div>
      )}
      {active && !busy && (
        <>
          <StatCards snapshot={active} />
          <FinancialSummary projects={active.projects} currency={currency} />
          <div className="reports-charts">
            <section className="panel">
              <div className="section-title">
                <h2>Spending over time</h2>
                <span className="badge">
                  {selectedPeriod ? 'Selected period' : 'All recorded months'}
                </span>
              </div>
              {active.stats.trend.length ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={active.stats.trend.map((t) => ({
                        month: new Date(`${t._id}-15`).toLocaleDateString('en-US', {
                          month: 'short',
                          year: '2-digit',
                        }),
                        amount: t.amountMinor / 100,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#eaeae5" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#82867f', fontSize: 12 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#82867f', fontSize: 11 }}
                      />
                      <Tooltip formatter={(v) => money(Number(v) * 100, currency)} />
                      <Bar
                        dataKey="amount"
                        name="Spending"
                        fill="#3475ed"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty icon={<BarChart3 />} title="A fresh canvas.">
                  Add expenses in this period to see your spending over time.
                </Empty>
              )}
            </section>
            <section className="panel">
              <div className="section-title">
                <h2>Where the money goes</h2>
                <span className="badge">{currency}</span>
              </div>
              {categoryData.length ? (
                <>
                  <div className="donut-chart">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {categoryData.map((c, i) => (
                            <Cell key={c.name} fill={colors[i % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => money(Number(v) * 100, currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-legend">
                    {categoryData.map((c, i) => (
                      <div key={c.name}>
                        <span>
                          <i style={{ background: colors[i % colors.length] }} />
                          {c.name}
                        </span>
                        <strong>{money(c.value * 100, currency)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Empty title="No spending to show.">
                  Your expense categories will appear here.
                </Empty>
              )}
            </section>
          </div>
          <section className="panel project-budget-panel">
            <div className="section-title">
              <h2>Project budget health</h2>
              <span className="muted">All time · {currency}</span>
            </div>
            {active.projects.length ? (
              <div className="table-panel borderless">
                <table className="responsive-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Remaining</th>
                      <th>Revenue</th>
                      <th>Profit / loss</th>
                      <th>Budget used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.projects.map((p) => {
                      const percent = p.budgetMinor
                        ? Math.round((p.spentMinor / p.budgetMinor) * 100)
                        : 0;
                      return (
                        <tr key={p._id}>
                          <td data-label="Project">
                            <strong>{p.name}</strong>
                          </td>
                          <td data-label="Budget">{money(p.budgetMinor, currency)}</td>
                          <td data-label="Spent">{money(p.spentMinor, currency)}</td>
                          <td
                            data-label="Remaining"
                            className={p.budgetMinor < p.spentMinor ? 'danger-text' : ''}
                          >
                            {money(p.budgetMinor - p.spentMinor, currency)}
                          </td>
                          <td data-label="Revenue">
                            {p.revenueMinor == null
                              ? 'Not recorded'
                              : money(p.revenueMinor, currency)}
                          </td>
                          <td
                            data-label="Profit / loss"
                            className={
                              p.revenueMinor == null
                                ? ''
                                : p.revenueMinor < p.spentMinor
                                  ? 'finance-loss-text'
                                  : 'finance-profit-text'
                            }
                          >
                            {p.revenueMinor == null
                              ? '—'
                              : money(p.revenueMinor - p.spentMinor, currency)}
                          </td>
                          <td data-label="Budget used">
                            <div
                              className={`budget-progress ${percent > 100 ? 'over-budget' : ''}`}
                            >
                              <span style={{ width: `${Math.min(100, percent)}%` }} />
                            </div>
                            <small>{p.budgetMinor ? `${percent}% used` : 'No budget set'}</small>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title={
                  selectedPeriod
                    ? 'No projects created in this period.'
                    : 'Give your next idea a budget.'
                }
              >
                {selectedPeriod
                  ? 'Adjust the date range to include earlier projects.'
                  : 'Create a project to follow its spending here.'}
              </Empty>
            )}
          </section>
        </>
      )}
    </>
  );
}
