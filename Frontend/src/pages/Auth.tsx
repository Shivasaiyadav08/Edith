import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, Info, LockKeyhole, Sparkles } from 'lucide-react';
import { authClient, api, errorMessage } from '../lib/api';
import { Spinner } from '../components/ui';
import type { Config } from '../lib/types';
import ThemeToggle from '../components/ThemeToggle';
type Mode = 'login' | 'register' | 'forgot' | 'reset';
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04Z" />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.82 1.52l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59A5.99 5.99 0 0 1 12 5.95Z"
      />
    </svg>
  );
}
export default function Auth({ mode }: { mode: Mode }) {
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [visible, setVisible] = useState(false),
    [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [config, setConfig] = useState<Config | null>(null);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const params = useParams();
  const destination = '/dashboard';
  useEffect(() => {
    api<Config>('/config')
      .then((settings) => {
        // OAuth state cookies must stay on one hostname throughout sign-in.
        if (import.meta.env.DEV && settings.authOrigin) {
          const canonical = new URL(settings.authOrigin);
          const loopback = ['localhost', '127.0.0.1'];
          if (
            loopback.includes(window.location.hostname) &&
            loopback.includes(canonical.hostname) &&
            window.location.origin !== canonical.origin
          ) {
            window.location.replace(
              new URL(window.location.pathname + window.location.search, canonical.origin),
            );
            return;
          }
        }
        setConfig(settings);
      })
      .catch(() => setConfig(null));
  }, []);
  const titles = {
    login: 'Welcome back.',
    register: 'Make room for good work.',
    forgot: 'A fresh start.',
    reset: 'Set a new password.',
  };
  if (!isPending && session && !['reset', 'forgot'].includes(mode))
    return <Navigate to={destination} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'login') {
        const result = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          rememberMe: remember,
        });
        if (result.error) throw new Error(result.error.message);
        navigate(destination);
      } else if (mode === 'register') {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          callbackURL: `${window.location.origin}${destination}`,
        });
        if (result.error) throw new Error(result.error.message);
        if (result.data?.token) navigate(destination);
        else {
          setNotice(
            'Check your inbox and spam folder to verify your account. You can resend the link below.',
          );
          setCooldown(60);
        }
      } else if (mode === 'forgot') {
        if (!config?.email)
          throw new Error(
            'Password recovery is unavailable until email delivery is configured. Please contact your administrator.',
          );
        const result = await authClient.requestPasswordReset({
          email: email.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw new Error(result.error.message);
        setNotice('If an account exists for that address, we’ve sent a password reset link.');
      } else {
        const token = search.get('token') || params.token;
        if (!token || search.get('error'))
          throw new Error('This reset link is invalid or expired. Request a new one.');
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (result.error) throw new Error(result.error.message);
        setNotice('Your password has been updated. You can now sign in.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setError('');
    if (!config?.google) {
      setError(
        'Google sign-in is not configured yet. Please use email or ask your administrator to enable Google OAuth.',
      );
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}${destination}`,
        errorCallbackURL: `${window.location.origin}/login?error=oauth`,
      });
      if (result.error) throw new Error(result.error.message);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-theme">
        <ThemeToggle />
      </div>

      <main className="auth-main">
        <Link to="/" className="auth-back">
          <ArrowLeft size={15} /> Back to Edith
        </Link>
        <div className="auth-form-wrap">
          <span className="auth-overline">
            <Sparkles size={15} /> A GOOD PLACE TO BEGIN
          </span>
          <h1>{titles[mode]}</h1>
          <p className="auth-description">
            {mode === 'login'
              ? 'Pick up where your ideas left off.'
              : mode === 'register'
                ? 'Your ideas deserve a workspace of their own.'
                : mode === 'forgot'
                  ? 'Enter your email and we’ll send you a reset link.'
                  : 'Choose a strong password for your workspace.'}
          </p>
          {mode === 'register' && config?.google && config.emailDeliveryLimited && (
            <aside className="auth-signup-notice" aria-label="Email signup availability">
              <Info size={19} aria-hidden="true" />
              <div>
                <strong>Continue with Google to get started</strong>
                <p>
                  Email verification and password recovery are currently limited on this hosted
                  demo. Please use Google sign-in when creating your account.
                </p>
              </div>
            </aside>
          )}
          {(mode === 'login' || mode === 'register') && (
            <>
              <button className="button google-button" onClick={google} disabled={busy}>
                <GoogleIcon /> Continue with Google
              </button>
              <div className="auth-divider">
                <span>or continue with email</span>
              </div>
            </>
          )}
          {(error || search.get('error')) && (
            <div className="form-alert error" role="alert">
              {error || 'Sign-in could not be completed. Please try again.'}
            </div>
          )}
          {notice && (
            <div className="form-alert success" role="status">
              {notice}
            </div>
          )}
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <label>
                Full name
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
            )}
            {mode !== 'reset' && (
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourstudio.com"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode !== 'forgot' && (
              <label>
                Password
                <div className="password-input">
                  <input
                    type={visible ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={mode === 'login' ? 1 : 10}
                    maxLength={128}
                    required
                    placeholder={
                      mode === 'login' ? 'Enter your password' : 'At least 10 characters'
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            {mode === 'register' && (
              <span className="input-hint">Use a unique password with at least 10 characters.</span>
            )}
            {mode === 'login' && (
              <div className="auth-form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            <button className="button button-dark auth-submit" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  {mode === 'login'
                    ? 'Welcome back in'
                    : mode === 'register'
                      ? 'Create your workspace'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : 'Update password'}{' '}
                  <ArrowUpRight size={17} />
                </>
              )}
            </button>
          </form>
          {(mode === 'login' || mode === 'register') && config?.email && (
            <button
              className="text-link resend-verification"
              disabled={busy || cooldown > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
              onClick={async () => {
                setBusy(true);
                setError('');
                setNotice('');
                try {
                  const result = await authClient.sendVerificationEmail({
                    email: email.trim().toLowerCase(),
                    callbackURL: `${window.location.origin}/dashboard`,
                  });
                  if (result.error) throw new Error(result.error.message);
                  setCooldown(60);
                  setNotice(
                    'If this address has an unverified account, a verification link has been sent. Check your inbox and spam folder.',
                  );
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {cooldown ? `Resend verification in ${cooldown}s` : 'Resend verification email'}
            </button>
          )}
          <p className="auth-switch">
            {mode === 'login'
              ? 'New around here?'
              : mode === 'register'
                ? 'Already have a workspace?'
                : 'Ready to get back to work?'}{' '}
            <Link to={mode === 'login' ? '/register' : '/login'}>
              {mode === 'login' ? 'Start for free' : 'Log in'}
            </Link>
          </p>
          <div className="auth-footnote">
            <LockKeyhole size={13} /> Secure sign-in. No passwords stored in your browser.
          </div>
        </div>
        <footer className="auth-footer">A little less admin. A lot more flow.</footer>
      </main>
    </div>
  );
}
