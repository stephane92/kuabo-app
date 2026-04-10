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
    bg:          "#0b0f1a",
    bgCard:      "#141d2e",
    bgDeep:      "#0f1521",
    bgInput:     "#1a2438",
    border:      "#1e2a3a",
    borderLight: "#2a3448",
    text:        "#f4f1ec",
    textMuted:   "#aaa",
    textFaint:   "#555",
    gold:        "#e8b84b",
    teal:        "#2dd4bf",
    green:       "#22c55e",
    red:         "#ef4444",
    orange:      "#f97316",
    purple:      "#a78bfa",
    navBg:       "#0f1521",
    navBorder:   "#1e2a3a",
    shadow:      "rgba(0,0,0,0.4)",
    overlay:     "rgba(0,0,0,0.85)",
  },
  light: {
    bg:          "#f2f2f2",   // fond gris très clair (comme Walmart) ✅
    bgCard:      "#ffffff",   // cards blanc pur ✅
    bgDeep:      "#e8e8e8",   // sections légèrement plus sombres ✅
    bgInput:     "#f8f8f8",   // inputs légers ✅
    border:      "#e0e0e0",   // bordures discrètes ✅
    borderLight: "#ececec",
    text:        "#1a1a1a",   // noir quasi-pur — lisibilité maximale ✅
    textMuted:   "#444444",   // gris foncé lisible ✅
    textFaint:   "#888888",   // gris moyen lisible ✅
    gold:        "#b8860b",   // or foncé sur blanc — bon contraste ✅
    teal:        "#0a7c74",   // teal foncé sur blanc ✅
    green:       "#15803d",   // vert foncé ✅
    red:         "#b91c1c",   // rouge foncé ✅
    orange:      "#c2410c",   // orange foncé ✅
    purple:      "#6d28d9",   // violet foncé ✅
    navBg:       "#ffffff",   // nav blanche ✅
    navBorder:   "#e0e0e0",   // bordure nav discrète ✅
    shadow:      "rgba(0,0,0,0.08)",
    overlay:     "rgba(0,0,0,0.5)",
  },
};

// ══════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════
const ThemeContext = createContext<{
  theme:       Theme;
  colors:      typeof THEME_COLORS.dark & typeof THEME_COLORS.light;
  toggleTheme: () => void;
}>({
  theme:       "dark",
  colors:      THEME_COLORS.dark as any,
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
