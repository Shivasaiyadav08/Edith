import type { Project } from '../lib/types';
import { money } from '../lib/types';

export default function FinancialSummary({
  projects,
  currency,
}: {
  projects: Project[];
  currency: string;
}) {
  const recorded = projects.filter((p) => p.revenueMinor != null);
  const revenue = recorded.reduce((sum, p) => sum + (p.revenueMinor || 0), 0);
  const cost = recorded.reduce((sum, p) => sum + p.spentMinor, 0);
  return (
    <section className="finance-summary">
      <div className="finance-caption">
        <strong>Project profitability</strong>
        <span>
          All time · {recorded.length} of {projects.length} projects with revenue recorded
        </span>
      </div>
      {recorded.length ? (
        <div className="finance-grid">
          <article>
            <span>Recorded revenue</span>
            <strong>{money(revenue, currency)}</strong>
          </article>
          <article>
            <span>Linked expenses</span>
            <strong>{money(cost, currency)}</strong>
          </article>
          <article className={revenue - cost < 0 ? 'finance-loss' : 'finance-profit'}>
            <span>{revenue - cost < 0 ? 'Net loss' : 'Net profit'}</span>
            <strong>{money(revenue - cost, currency)}</strong>
          </article>
        </div>
      ) : (
        <p>
          {projects.length
            ? 'Add optional revenue when editing a project to see profit and loss.'
            : 'No projects match the selected filters.'}
        </p>
      )}
      {recorded.length > 0 && (
        <small>
          Only matching projects with recorded revenue are included. Profitability uses their
          all-time revenue and linked expenses.
        </small>
      )}
    </section>
  );
}
