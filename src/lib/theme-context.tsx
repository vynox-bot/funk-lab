"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface Theme {
  primary: string;
  secondary: string;
  bg: string;
  card: string;
  border: string;
}

export const DEFAULT_THEME: Theme = {
  primary: "#a855f7",
  secondary: "#c026d3",
  bg: "#09090b",
  card: "#18101f",
  border: "#2d1a42",
};

export const PRESETS: { name: string; theme: Theme }[] = [
  { name: "Purple Rain", theme: DEFAULT_THEME },
  {
    name: "Golden",
    theme: { primary: "#f5c518", secondary: "#ff6b35", bg: "#0d0d0d", card: "#1a1a1a", border: "#2a2a2a" },
  },
  {
    name: "Midnight",
    theme: { primary: "#3b82f6", secondary: "#06b6d4", bg: "#020718", card: "#070e2e", border: "#1a2060" },
  },
  {
    name: "Deep Red",
    theme: { primary: "#ef4444", secondary: "#f97316", bg: "#0c0000", card: "#1a0606", border: "#3a0a0a" },
  },
  {
    name: "Forest",
    theme: { primary: "#22c55e", secondary: "#84cc16", bg: "#020b00", card: "#061508", border: "#0f3016" },
  },
];

const STORAGE_KEY = "funklab-theme";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

function applyTheme(t: Theme) {
  const r = document.documentElement;
  r.style.setProperty("--funk-yellow", t.primary);
  r.style.setProperty("--funk-orange", t.secondary);
  r.style.setProperty("--funk-dark", t.bg);
  r.style.setProperty("--funk-card", t.card);
  r.style.setProperty("--funk-border", t.border);
  document.body.style.backgroundColor = t.bg;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed: Theme = saved ? (JSON.parse(saved) as Theme) : DEFAULT_THEME;
      setThemeState(parsed);
      applyTheme(parsed);
    } catch {
      applyTheme(DEFAULT_THEME);
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    } catch {
      /* ignore */
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, panelOpen, setPanelOpen }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
