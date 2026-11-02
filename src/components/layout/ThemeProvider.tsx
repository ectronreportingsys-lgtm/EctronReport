'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import clsx from 'clsx';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('ectron-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    if (newTheme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('ectron-theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggleSwitch() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      className={clsx(
        "relative inline-flex items-center h-9 w-[76px] rounded-full p-1 transition-all duration-300 cursor-pointer border shadow-inner select-none",
        isLight
          ? "bg-gradient-to-r from-[#0F766E] to-[#14B8A6] border-[#14B8A6]/40 shadow-[0_2px_10px_rgba(20,184,166,0.25)]"
          : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
      )}
    >
      {/* Background Icons */}
      <span className="flex items-center justify-between w-full px-1.5 pointer-events-none">
        <Sun
          className={clsx(
            "w-4 h-4 transition-all duration-300",
            isLight ? "text-white opacity-100 scale-100" : "text-zinc-500 opacity-50 scale-90"
          )}
        />
        <Moon
          className={clsx(
            "w-4 h-4 transition-all duration-300",
            !isLight ? "text-[#00a99d] opacity-100 scale-100" : "text-white/70 opacity-50 scale-90"
          )}
        />
      </span>

      {/* Sliding Knob */}
      <span
        className={clsx(
          "absolute top-1 left-1 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
          isLight
            ? "translate-x-[40px] bg-white text-[#0F766E]"
            : "translate-x-0 bg-gradient-to-tr from-[#1b497f] to-[#00a99d] text-white"
        )}
      >
        {isLight ? (
          <Sun className="w-4 h-4 text-[#14B8A6] fill-[#14B8A6]/20" />
        ) : (
          <Moon className="w-4 h-4 text-white fill-white/20" />
        )}
      </span>
    </button>
  );
}
