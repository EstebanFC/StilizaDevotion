"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("sd_theme_v2") as Theme | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        // Por defecto usar dark mode como atmósfera boutique
        setThemeState("dark");
        applyTheme("dark");
      }
    } catch {
      // Ignorar
    }
    setMounted(true);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
    }
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem("sd_theme_v2", t);
    } catch {
      // Ignorar
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback amigable
    return {
      theme: "dark" as Theme,
      isDark: true,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}

/**
 * Componente Botón de Cambio de Modo Oscuro / Claro
 * Diseñado con los colores #7B6E86 (Primario) y #D2C483 (Secundario)
 */
export function ThemeToggleButton({
  className = "",
}: {
  className?: string;
}) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={
        isDark
          ? "Cambiar a Modo Claro (Boutique Sanctuary)"
          : "Cambiar a Modo Oscuro (Studio Obsidian)"
      }
      aria-label={
        isDark ? "Activar tema claro" : "Activar tema oscuro"
      }
      className={`relative inline-flex items-center gap-2 rounded-xl p-2 px-3 text-xs font-bold transition-all duration-200 border ${
        isDark
          ? "bg-[#25202B] hover:bg-[#322A3A] text-[#D2C483] border-[#7B6E86]/40 shadow-sm"
          : "bg-white hover:bg-stone-100 text-[#7B6E86] border-[#7B6E86]/30 shadow-sm"
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 text-[#D2C483] animate-in spin-in-90 duration-300" />
          <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-[#D2C483]">
            Modo Claro
          </span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-[#7B6E86] animate-in spin-in-90 duration-300" />
          <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-[#7B6E86]">
            Modo Oscuro
          </span>
        </>
      )}
    </button>
  );
}
