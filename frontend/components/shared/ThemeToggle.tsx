'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import Tooltip from './Tooltip';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Éviter le flash pendant le chargement
  if (!mounted) {
    return (
      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
    );
  }

  return (
    <Tooltip content={theme === 'light' ? 'Mode sombre' : 'Mode clair'} position="bottom">
      <button
        onClick={toggleTheme}
        className="p-2.5 sm:p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
        aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
        aria-pressed={theme === 'dark'}
      >
        {theme === 'light' ? (
          <Moon size={18} className="sm:w-5 sm:h-5" />
        ) : (
          <Sun size={18} className="sm:w-5 sm:h-5" />
        )}
      </button>
    </Tooltip>
  );
}
