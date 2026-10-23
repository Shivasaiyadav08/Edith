import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/react';
import './index.css';
import './edith.css';
import './landing.css';
import './enhancements.css';
import './responsive.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        signInUrl="/login"
        signUpUrl="/register"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        afterSignOutUrl="/"
        appearance={{
          variables: {
            colorPrimary: 'var(--blue)',
            colorBackground: 'var(--paper)',
            colorForeground: 'var(--ink)',
            colorMutedForeground: 'var(--muted)',
            colorInput: 'var(--paper)',
            colorInputForeground: 'var(--ink)',
            colorBorder: 'var(--line)',
            borderRadius: '0.75rem',
          },
        }}
      >
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
