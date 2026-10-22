import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('edith-theme') === 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('edith-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button
      className="icon-button theme-toggle"
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
      onClick={() => setDark(!dark)}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
