import { ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, SignUp, useUser } from '@clerk/react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { Spinner } from '../components/ui';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { isSignedIn } = useUser();
  if (isSignedIn) return <Navigate to="/dashboard" replace />;
  return (
    <main className="clerk-auth-page">
      <header className="auth-topbar">
        <Link to="/">
          <ArrowLeft size={16} /> Back to Edith
        </Link>
        <ThemeToggle />
      </header>
      <div className="clerk-auth-content">
        <ClerkLoading>
          <Spinner />
        </ClerkLoading>
        <ClerkFailed>
          <div role="alert">
            <p>Sign-in could not load. Check your connection and try again.</p>
            <button className="button button-dark" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </ClerkFailed>
        <ClerkLoaded>
          {mode === 'login' ? (
            <SignIn routing="path" path="/login" signUpUrl="/register" />
          ) : (
            <SignUp routing="path" path="/register" signInUrl="/login" />
          )}
        </ClerkLoaded>
      </div>
    </main>
  );
}
