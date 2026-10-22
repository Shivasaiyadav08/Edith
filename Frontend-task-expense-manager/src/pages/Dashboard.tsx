import { useState } from 'react';
import { CalendarDays, Plus, Link2 } from 'lucide-react';
import OverviewBoard from '../components/OverviewBoard';
import ResourceForm from '../components/ResourceForm';
import FinancialSummary from '../components/FinancialSummary';
import { useWorkspace } from '../lib/workspace-context';
import useReport from '../lib/useReport';
import { Spinner } from '../components/ui';
import DateFilter from '../components/DateFilter';

export default function Dashboard() {
  const [newProject, setNewProject] = useState(false);
  const [project, setProject] = useState('');
  const [period, setPeriod] = useState({ from: '', to: '' });
  const { data, workspace } = useWorkspace();
  const report = useReport(project, period.from, period.to);
  return (
    <>
      <div className="overview-heading">
        <div>
          <span className="section-kicker">YOUR WORKSPACE, AT A GLANCE</span>
          <h1>
            Overview <Link2 size={20} />
          </h1>
          <p>Projects, progress, and every expense. One connected picture.</p>
        </div>
        <div className="overview-actions">
          <label className="project-filter">
            Project
            <select
              aria-label="Overview project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">All projects</option>
              {data?.projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <span className="period-pill">
            <CalendarDays size={13} />
            {period.from || period.to ? 'Selected activity dates' : 'All recorded activity'}
          </span>
          <button className="button button-dark" onClick={() => setNewProject(true)}>
            <Plus size={14} />
            New project
          </button>
        </div>
      </div>
      <DateFilter onApply={setPeriod} />
      {report.error && (
        <p role="alert" className="form-alert error">
          {report.error}
        </p>
      )}
      {report.busy ? (
        <div className="report-loading">
          <Spinner /> Updating project overview…
        </div>
      ) : (
        report.data && (
          <>
            <OverviewBoard snapshot={report.data} />
            <FinancialSummary projects={report.data.projects} currency={workspace.currency} />
          </>
        )
      )}
      {newProject && <ResourceForm resource="projects" onClose={() => setNewProject(false)} />}
    </>
  );
}
