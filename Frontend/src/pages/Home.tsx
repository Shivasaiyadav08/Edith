import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Bot, Check, Sparkles, Layers2, ReceiptText } from 'lucide-react';
import { Logo } from '../components/ui';
import ThemeToggle from '../components/ThemeToggle';
import WorkspaceProvider from '../components/WorkspaceProvider';
import { useWorkspace } from '../lib/workspace-context';
import { money } from '../lib/types';

function Landing() {
  const { data, openAssistant } = useWorkspace();
  if (!data) return null;
  const max = Math.max(1, ...data.stats.categories.map((c) => c.amountMinor));
  return (
    <div className="landing-page">
      <a className="skip-link" href="#landing-content">
        Skip to content
      </a>
      <header className="landing-nav">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#inside-edith">The workspace</a>
          <a href="#meet-ultron">
            Meet Ultron <Sparkles size={13} />
          </a>
          <Link to="/dashboard">
            Open workspace <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <Link to="/login">Log in</Link>
          <Link className="landing-button small" to="/register">
            Get started <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main id="landing-content">
        <div className="landing-intro">
          <div>
            <span className="landing-eyebrow">YOUR PERSONAL WORKSPACE, RECONSIDERED</span>
            <p>
              Good work has a lot of moving parts.
              <br />
              <strong>Give them a place to come together.</strong>
            </p>
          </div>
          <span className="demo-caption">
            <i /> WORKSPACE PREVIEW <span>YOUR WORK, CONNECTED ↙</span>
          </span>
        </div>
        <section className="landing-board" aria-label="Explore Edith">
          <article className="manifesto-tile">
            <span className="tile-label">A LITTLE STRUCTURE. A LOT OF POSSIBILITY.</span>
            <h1>
              Plan it.
              <br />
              Build it.
              <br />
              <em>Own it.</em>
            </h1>
            <p>
              Your projects. Your money.
              <br />
              Your next great idea.
              <br />
              One connected workspace.
            </p>
            <Link className="landing-button" to="/register">
              Make it happen <ArrowUpRight size={21} />
            </Link>
            <span className="manifesto-bottom">
              EDITH / WORK WITH PERSPECTIVE <Layers2 size={21} />
            </span>
          </article>
          <section className="projects-tile">
            <div className="tile-heading">
              <span className="tile-label">THE WORK, IN MOTION</span>
              <Link to="/projects" aria-label="Explore sample projects">
                <ArrowUpRight size={20} />
              </Link>
            </div>
            <h2>
              Big ideas.
              <br />
              Small, steady steps.
            </h2>
            <div className="preview-projects">
              {data.projects.slice(0, 3).map((p, index) => (
                <Link key={p._id} to={`/projects?q=${encodeURIComponent(p.name)}`}>
                  <span className={`preview-project-icon tone-${index}`}>
                    <Layers2 size={20} />
                  </span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.doneCount} of {p.taskCount} tasks complete
                    </small>
                  </span>
                  <span className="mini-project-progress">
                    <i
                      style={{ width: `${p.taskCount ? (p.doneCount / p.taskCount) * 100 : 0}%` }}
                    />
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
            <Link className="tile-bottom-link" to="/projects">
              See the bigger picture <ArrowRight size={17} />
            </Link>
          </section>
          <section className="ultron-tile">
            <div className="tile-heading">
              <span className="tile-label">YOUR EXTRA BRAIN</span>
              <span className="online-mark">
                <i /> ON CALL
              </span>
            </div>
            <div className="landing-bot">
              <Bot size={62} strokeWidth={1.6} />
              <span>HI, I'M ULTRON.</span>
            </div>
            <h2>
              A little less
              <br />
              “where do I start?”
            </h2>
            <button
              onClick={() =>
                openAssistant('plan', 'Help me turn a website launch idea into clear priorities.')
              }
              className="ultron-tile-action"
            >
              Find your first step <ArrowUpRight size={19} />
            </button>
          </section>
          <section className="money-tile">
            <div className="tile-heading">
              <span className="tile-label">SPENDING, WITH CONTEXT</span>
              <ReceiptText size={22} />
            </div>
            <div className="money-tile-main">
              <div>
                <h2>
                  Every little
                  <br />
                  detail adds up.
                </h2>
                <strong>{money(data.stats.totalSpentMinor)}</strong>
                <span>Sample recorded spending</span>
              </div>
              <div className="landing-bars" role="img" aria-label="Sample spending by category">
                {data.stats.categories.slice(0, 5).map((c) => (
                  <span
                    key={c._id}
                    title={`${c._id}: ${money(c.amountMinor)}`}
                    style={{ height: `${Math.max(5, (c.amountMinor / max) * 100)}%` }}
                  />
                ))}
              </div>
            </div>
            <Link className="tile-bottom-link" to="/reports">
              Know your numbers <ArrowUpRight size={18} />
            </Link>
          </section>
          <section className="tasks-tile">
            <div className="tile-heading">
              <span className="tile-label">ONE THING AT A TIME</span>
              <Check size={21} />
            </div>
            <h2>
              Make a little
              <br />
              room for progress.
            </h2>
            <div className="landing-checklist">
              {data.tasks.slice(0, 3).map((t) => (
                <Link to="/tasks" key={t._id}>
                  <span className={t.status === 'done' ? 'checked' : ''}>
                    {t.status === 'done' && <Check size={12} />}
                  </span>
                  <span>{t.title}</span>
                </Link>
              ))}
            </div>
            <Link className="tile-bottom-link" to="/tasks">
              Meet your next move <ArrowRight size={17} />
            </Link>
          </section>
        </section>
        <section id="inside-edith" className="landing-details">
          <div className="details-heading">
            <span className="landing-eyebrow">LESS SCATTERED. MORE SORTED.</span>
            <h2>
              A place for the work.
              <br />
              <em>And everything around it.</em>
            </h2>
          </div>
          <div className="landing-detail-rows">
            <Link to="/projects">
              <span>01 /</span>
              <h3>Bring the idea.</h3>
              <p>Projects, priorities, and deadlines. Connect each task to the bigger picture.</p>
              <ArrowUpRight />
            </Link>
            <Link to="/reports">
              <span>02 /</span>
              <h3>Follow the money.</h3>
              <p>Track expenses, record revenue, and understand project profit and loss.</p>
              <ArrowUpRight />
            </Link>
            <button onClick={() => openAssistant('receipt')}>
              <span>03 /</span>
              <h3>Skip the busywork.</h3>
              <p>Scan a receipt, PDF, or Word document. Review the draft. Get back to your work.</p>
              <ArrowUpRight />
            </button>
          </div>
        </section>
        <section id="meet-ultron" className="landing-ai-section">
          <div>
            <span className="landing-eyebrow">
              <Bot size={18} /> ULTRON, BUILT RIGHT IN
            </span>
            <h2>
              Less figuring it out.
              <br />
              <em>More moving it forward.</em>
            </h2>
            <p>
              Turn a brief into a plan, paperwork into an expense draft, or workspace data into a
              clearer answer. Ultron gets things started. You stay in control.
            </p>
          </div>
          <div className="landing-ai-prompts">
            <span>GIVE IT SOMETHING TO THINK ABOUT</span>
            <button
              onClick={() =>
                openAssistant('plan', 'Plan a website launch with clear milestones and priorities.')
              }
            >
              Plan my next project <ArrowUpRight size={19} />
            </button>
            <button onClick={() => openAssistant('receipt')}>
              Read a receipt or document <ArrowUpRight size={19} />
            </button>
            <button
              onClick={() =>
                openAssistant(
                  'ask',
                  'Summarize my project budgets, revenue, and profit or loss where revenue is recorded.',
                )
              }
            >
              Make sense of my numbers <ArrowUpRight size={19} />
            </button>
            <small>Create your workspace to use Ultron with your projects and expenses.</small>
          </div>
        </section>
        <section className="landing-closing">
          <span className="landing-eyebrow">A CLEARER HEAD STARTS HERE</span>
          <div>
            <h2>
              Let’s get to it<span>.</span>
            </h2>
            <Link to="/register" className="landing-button">
              Create your workspace <ArrowUpRight size={21} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <span>Independent work. Connected thinking.</span>
        <Link to="/dashboard">Open workspace ↗</Link>
        <span>© {new Date().getFullYear()} Edith</span>
      </footer>
    </div>
  );
}
export default function Home() {
  return (
    <WorkspaceProvider
      demo
      user={{ id: 'demo-user', name: 'Alex Morgan', email: 'alex@example.com' }}
    >
      <Landing />
    </WorkspaceProvider>
  );
}
