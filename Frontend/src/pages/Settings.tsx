import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useClerk } from '@clerk/react';
import { useWorkspace } from '../lib/workspace-context';
import { errorMessage } from '../lib/api';
import { PageHeading, Spinner } from '../components/ui';
import { currencies } from '../lib/types';

export default function Settings() {
  const { user, data, demo, notify, workspace, setCurrency } = useWorkspace();
  const { openUserProfile } = useClerk();
  const [currency, chooseCurrency] = useState(workspace.currency),
    [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your space. Your way."
        description="The essentials for your account, all in one place."
      />
      <div className="settings-layout">
        <section className="panel">
          <div className="section-title">
            <h2>Workspace currency</h2>
          </div>
          <form
            className="resource-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await setCurrency(currency, acknowledge);
                setAcknowledge(false);
              } catch (err) {
                notify(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Currency
              <select
                value={currency}
                onChange={(e) => {
                  chooseCurrency(e.target.value);
                  setAcknowledge(false);
                }}
              >
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code} — {new Intl.DisplayNames(['en'], { type: 'currency' }).of(code)}
                  </option>
                ))}
              </select>
            </label>
            <p className="input-hint">
              One currency is used for every project, budget, expense, and export. Changing it keeps
              existing numeric amounts; it does not apply exchange rates.
            </p>
            {currency !== workspace.currency &&
              !!(data?.projects.length || data?.stats.totalExpenses) && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    required
                    checked={acknowledge}
                    onChange={(e) => setAcknowledge(e.target.checked)}
                  />
                  I understand existing amounts will be labeled {currency} without conversion.
                </label>
              )}
            <button
              className="button button-dark"
              disabled={busy || currency === workspace.currency}
            >
              {busy ? <Spinner /> : 'Save currency'}
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>Your profile</h2>
            <span className="avatar">{user.name[0]}</span>
          </div>
          <div className="resource-form">
            <label>
              Full name
              <input value={user.name} readOnly />
            </label>
            <label>
              Email address
              <input value={user.email} disabled />
            </label>
            <span className="input-hint">
              {user.emailVerified
                ? 'Your email is verified.'
                : 'Your email has not been verified yet.'}
            </span>
            <button
              className="button button-dark"
              disabled={demo}
              onClick={() => openUserProfile()}
            >
              Manage account
            </button>
          </div>
        </section>
        <section className="panel settings-security">
          <LockKeyhole size={23} />
          <h2>A secure place for your work.</h2>
          <p>
            Clerk manages your sign-in methods, verified email addresses, passwords, and active
            devices.
          </p>
          <button
            className="button button-outline"
            disabled={demo}
            onClick={() => openUserProfile()}
          >
            Account security
          </button>
          <p className="input-hint">
            AI usage: {data?.usage.requests || 0} of 20 requests this calendar month. All budgets
            and expenses use {workspace.currency}.
          </p>
        </section>
      </div>
    </>
  );
}
