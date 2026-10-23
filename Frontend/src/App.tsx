import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useUser } from '@clerk/react';
import Home from './pages/Home';
import Auth from './pages/Auth';
import WorkspaceProvider from './components/WorkspaceProvider';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import { Spinner } from './components/ui';

// Charts load only when the reports page is opened.
const Reports = lazy(() => import('./pages/Reports'));
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () =>
      document.documentElement.style.setProperty(
        '--visible-height',
        `${viewport?.height || window.innerHeight}px`,
      );
    update();
    viewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return null;
}
function Loading() {
  return (
    <div className="loading-page">
      <Spinner />
      <p>Getting things ready…</p>
    </div>
  );
}
function Protected() {
  const { user, isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <Loading />;
  if (!isSignedIn || !user) return <Navigate to="/login" replace />;
  return (
    <WorkspaceProvider
      demo={false}
      key={user.id}
      user={{
        id: user.id,
        name: user.fullName || user.username || 'My account',
        email: user.primaryEmailAddress?.emailAddress || '',
        emailVerified: user.primaryEmailAddress?.verification.status === 'verified',
      }}
    >
      <Shell />
    </WorkspaceProvider>
  );
}
function AuthSetup() {
  return (
    <main className="not-found">
      <h1>Sign-in is being configured.</h1>
      <p>Please check back shortly.</p>
      {import.meta.env.DEV && (
        <p>Add VITE_CLERK_PUBLISHABLE_KEY to Frontend/.env and restart Vite.</p>
      )}
      <a className="button button-dark" href="/">
        Back to Edith
      </a>
    </main>
  );
}
function Demo() {
  return (
    <WorkspaceProvider
      demo
      user={{
        id: 'demo-user',
        name: 'Alex Morgan',
        email: 'alex@example.com',
        emailVerified: true,
      }}
    >
      <Shell />
    </WorkspaceProvider>
  );
}
const pages = (
  <>
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="projects" element={<Projects />} />
    <Route path="tasks" element={<Tasks />} />
    <Route path="expenses" element={<Expenses />} />
    <Route path="assistant" element={<Navigate to="../dashboard" replace />} />
    <Route path="reports" element={<Reports />} />
    <Route path="settings" element={<Settings />} />
  </>
);

export default function App() {
  const configured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/login/*"
              element={configured ? <Auth key="login" mode="login" /> : <AuthSetup />}
            />
            <Route
              path="/register/*"
              element={configured ? <Auth key="register" mode="register" /> : <AuthSetup />}
            />
            <Route element={configured ? <Protected /> : <AuthSetup />}>{pages}</Route>
            {import.meta.env.DEV && configured && (
              <Route path="/demo" element={<Demo />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                {pages}
              </Route>
            )}
            <Route
              path="*"
              element={
                <div className="not-found">
                  <h1>A little off track.</h1>
                  <p>This page doesn’t exist. Let’s find your way back.</p>
                  <a className="button button-dark" href="/">
                    Back to Edith
                  </a>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}
