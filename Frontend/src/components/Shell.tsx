import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useClerk } from '@clerk/react';
import { ArrowUpRight, Check, LogOut, X, Sparkles, Menu } from 'lucide-react';
import { useWorkspace } from '../lib/workspace-context';
import { errorMessage } from '../lib/api';
import { Logo, Spinner } from './ui';
import ThemeToggle from './ThemeToggle';

const links = [
  ['/dashboard', 'Overview'],
  ['/projects', 'Projects'],
  ['/tasks', 'Tasks'],
  ['/expenses', 'Expenses'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
];
export default function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { demo, prefix, user, loading, error, refresh, toast, notify, openAssistant } =
    useWorkspace();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  async function logout() {
    try {
      if (!demo) {
        await signOut();
      }
      navigate('/');
    } catch (err) {
      notify(errorMessage(err));
    }
  }
  return (
    <div className="app-layout">
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <div className="edith-app-frame">
        <header className="product-nav">
          <Logo />
          <nav
            id="workspace-navigation"
            aria-label="Workspace navigation"
            className={menuOpen ? 'is-open' : ''}
          >
            {links.map(([path, label]) => (
              <NavLink key={path} to={`${prefix}${path}`} onClick={() => setMenuOpen(false)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-tools">
            <button
              className="icon-button"
              aria-label="Open Ultron assistant"
              onClick={() => openAssistant('ask')}
            >
              <Sparkles size={17} />
            </button>
            <ThemeToggle />
            <span className="avatar" title={user.name}>
              {user.name[0]}
            </span>
            <button
              className="icon-button"
              aria-label={demo ? 'Exit demo' : 'Sign out'}
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
            <button
              className="icon-button mobile-nav-toggle"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-controls="workspace-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <span className="live-dot" /> Preview workspace · changes stay in this browser
            </span>
            <Link to="/register">
              Create your workspace <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <main className="workspace-content" id="workspace-content">
          {loading ? (
            <div className="loading-page">
              <Spinner />
              <p>Loading your workspace…</p>
            </div>
          ) : error ? (
            <div className="error-page">
              <h2>We couldn’t load your workspace.</h2>
              <p>{error}</p>
              <button className="button button-dark" onClick={() => void refresh().catch(() => {})}>
                Try again
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="workspace-footer">
          <span>Edith · Work with perspective.</span>
          <span>{demo ? 'Illustrative data' : user.email}</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => notify('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
