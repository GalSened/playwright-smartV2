import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function DarkModeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-8 w-14 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      data-testid="dark-mode-toggle"
    >
      <div
        className={`absolute left-1 h-6 w-6 transform rounded-full bg-primary transition-transform duration-200 ease-in-out ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
      <div className="relative flex w-full items-center justify-between px-2">
        <Sun className={`h-3 w-3 transition-opacity ${isDark ? 'opacity-40' : 'opacity-100'}`} />
        <Moon className={`h-3 w-3 transition-opacity ${isDark ? 'opacity-100' : 'opacity-40'}`} />
      </div>
    </button>
  );
}