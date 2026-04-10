"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

// ══════════════════════════════════════════════
// TYPES + COULEURS
// ══════════════════════════════════════════════
export type Theme = "dark" | "light";

export const THEME_COLORS = {
  dark: {
    bg:           "#0b0f1a",
    bgCard:       "#141d2e",
    bgDeep:       "#0f1521",
    border:       "#1e2a3a",
    borderLight:  "#2a3448",
    text:         "#f4f1ec",
    textMuted:    "#aaa",
    textFaint:    "#555",
    gold:         "#e8b84b",   // or sur fond sombre
    teal:         "#2dd4bf",
    green:        "#22c55e",
    red:          "#ef4444",
    orange:       "#f97316",
    purple:       "#a78bfa",
  },
  light: {
    bg:           "#f5f0e8",
    bgCard:       "#ffffff",
    bgDeep:       "#ede8df",
    border:       "#d8d0c4",
    borderLight:  "#c8c0b4",
    text:         "#1a1a2e",
    textMuted:    "#555",
    textFaint:    "#999",
    gold:         "#c9952a",   // or sur fond clair (jamais #e8b84b sur fond clair !)
    teal:         "#0d9488",
    green:        "#16a34a",
    red:          "#dc2626",
    orange:       "#ea580c",
    purple:       "#7c3aed",
  },
};

// ══════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════
const ThemeContext = createContext<{
  theme:     Theme;
  colors:    typeof THEME_COLORS.dark;
  toggleTheme: () => void;
}>({
  theme:       "dark",
  colors:      THEME_COLORS.dark,
  toggleTheme: () => {},
});

// ══════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // Charger le thème depuis localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem("kuabo_theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, []);

  // Appliquer le thème sur le body
  useEffect(() => {
    document.body.style.background = THEME_COLORS[theme].bg;
    document.body.style.color      = THEME_COLORS[theme].text;
  }, [theme]);

  const toggleTheme = async () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("kuabo_theme", next);

    // Sauvegarder dans Firebase
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { theme: next });
      } catch {}
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: THEME_COLORS[theme], toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ══════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════
export function useTheme() {
  return useContext(ThemeContext);
}
