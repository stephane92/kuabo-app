"use client";

import { useTheme } from "./ThemeContext";
import type { Lang } from "./data";

// ══════════════════════════════════════════════
// THEME TOGGLE BUTTON
// ══════════════════════════════════════════════
export function ThemeToggle({ lang }: { lang: Lang }) {
  const { theme, colors, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const label = {
    fr: isDark ? "Passer en mode clair ☀️"  : "Passer en mode sombre 🌙",
    en: isDark ? "Switch to light mode ☀️"  : "Switch to dark mode 🌙",
    es: isDark ? "Cambiar a modo claro ☀️"  : "Cambiar a modo oscuro 🌙",
  }[lang];

  const sublabel = {
    fr: isDark ? "Fond clair · Or foncé"    : "Fond sombre · Or clair",
    en: isDark ? "Light bg · Dark gold"     : "Dark bg · Light gold",
    es: isDark ? "Fondo claro · Oro oscuro" : "Fondo oscuro · Oro claro",
  }[lang];

  return (
    <button
      onClick={toggleTheme}
      style={{
        width:          "100%",
        background:     colors.bgCard,
        border:         `1px solid ${colors.border}`,
        borderRadius:   12,
        padding:        "13px 16px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        cursor:         "pointer",
        fontFamily:     "inherit",
        transition:     "background 0.2s, border 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Icône animée */}
        <div style={{
          width:          34,
          height:         34,
          borderRadius:   9,
          background:     isDark ? "rgba(232,184,75,0.1)" : "rgba(201,149,42,0.1)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       18,
          transition:     "background 0.2s",
        }}>
          {isDark ? "🌙" : "☀️"}
        </div>

        <div style={{ textAlign: "left" as const }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{label}</div>
          <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>{sublabel}</div>
        </div>
      </div>

      {/* Toggle visuel */}
      <div style={{
        width:        50,
        height:       28,
        borderRadius: 14,
        background:   isDark ? "#2a3448" : colors.gold,
        position:     "relative",
        flexShrink:   0,
        transition:   "background 0.2s",
      }}>
        <div style={{
          position:     "absolute",
          top:          4,
          left:         isDark ? 4 : 26,
          width:        20,
          height:       20,
          borderRadius: "50%",
          background:   "#fff",
          transition:   "left 0.2s",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          fontSize:     11,
        }}>
          {isDark ? "🌙" : "☀️"}
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════
// MINI TOGGLE (pour la navbar ou le header)
// ══════════════════════════════════════════════
export function ThemeToggleMini() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      style={{
        background:     "none",
        border:         "none",
        cursor:         "pointer",
        fontSize:       20,
        padding:        "4px 6px",
        borderRadius:   8,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        transition:     "opacity 0.2s",
      }}
      title={isDark ? "Mode clair" : "Mode sombre"}
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
