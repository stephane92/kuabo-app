"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const LANGUAGES = [
  { code: "en" as Lang, flag: "🇺🇸", name: "English",  sub: "Continue in English"   },
  { code: "fr" as Lang, flag: "🇫🇷", name: "Français", sub: "Continuer en français" },
  { code: "es" as Lang, flag: "🇲🇽", name: "Español",  sub: "Continuar en español"  },
];

const T = {
  en: { title: "Welcome to", sub: "Choose your language to get started", tagline: '"Welcome home" — Fon language, Benin 🇧🇯' },
  fr: { title: "Bienvenue sur", sub: "Choisis ta langue pour commencer", tagline: '"Bienvenue chez toi" — langue Fon, Bénin 🇧🇯' },
  es: { title: "Bienvenido a", sub: "Elige tu idioma para comenzar", tagline: '"Bienvenido a casa" — idioma Fon, Benín 🇧🇯' },
};

function LoadingOverlay({ lang }: { lang: Lang }) {
  const msgs = {
    en: ["Setting up your experience...", "Almost ready...", "Welcome to Kuabo!"],
    fr: ["Préparation...", "Presque prêt...", "Bienvenue sur Kuabo !"],
    es: ["Preparando...", "Casi listo...", "¡Bienvenido a Kuabo!"],
  };
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % 3), 500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0b0f1a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 24, zIndex: 9999,
    }}>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "serif" }}>
        <span style={{ color: "#e8b84b" }}>Ku</span>
        <span style={{ color: "#f4f1ec" }}>abo</span>
      </div>
      <svg width="44" height="44" viewBox="0 0 44 44"
        style={{ animation: "spin 1s linear infinite" }}>
        <circle cx="22" cy="22" r="18" fill="none" stroke="#1e2a3a" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke="#e8b84b" strokeWidth="4"
          strokeLinecap="round" strokeDasharray="113" strokeDashoffset="85" />
      </svg>
      <div style={{ fontSize: 14, color: "#aaa", textAlign: "center", padding: "0 40px" }}>
        {msgs[lang][idx]}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LanguagePage() {
  const router = useRouter();

  const [mounted, setMounted]         = useState(false);
  const [selected, setSelected]       = useState<Lang | null>(null);
  const [showLoader, setShowLoader]   = useState(false);
  const [displayLang, setDisplayLang] = useState<Lang>("en");

  // ── Animation d'entrée SEULEMENT — pas de skip automatique
  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  // ── Rotation du texte
  useEffect(() => {
    const langs: Lang[] = ["en", "fr", "es"];
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % langs.length;
      setDisplayLang(langs[i]);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // ── Sélectionner une langue
  const handleSelect = (lang: Lang) => {
    if (showLoader) return;
    setSelected(lang);
    localStorage.setItem("lang", lang);

    setTimeout(() => {
      setShowLoader(true);
      setTimeout(() => {
        window.location.href = "/home";
      }, 1200);
    }, 200);
  };

  const t = T[displayLang];

  if (showLoader) return <LoadingOverlay lang={selected || "en"} />;

  return (
    <div style={container}>

      <div style={bgGlow} />
      <div style={bgGrid} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: 400,
        padding: "0 24px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.7s ease",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={logoWrap}>
          <div style={logoStyle}>
            <span style={{ color: "#e8b84b" }}>Ku</span>
            <span style={{ color: "#f4f1ec" }}>abo</span>
          </div>
          <div style={logoDot} />
        </div>

        {/* Title rotatif */}
        <div style={{ textAlign: "center", marginBottom: 8, minHeight: 52 }}>
          <div style={{ fontSize: 15, color: "#aaa", letterSpacing: "0.05em", marginBottom: 6 }}>
            {t.title}
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>
            {t.sub}
          </div>
        </div>

        {/* Language cards */}
        <div style={cardsWrap}>
          {LANGUAGES.map((l, idx) => {
            const isSelected = selected === l.code;
            return (
              <button
                key={l.code}
                onClick={() => handleSelect(l.code)}
                disabled={!!selected}
                style={{
                  ...langCard,
                  opacity: mounted ? 1 : 0,
                  background: isSelected
                    ? "rgba(232,184,75,0.12)"
                    : "rgba(20,29,46,0.8)",
                  border: "1.5px solid " + (isSelected
                    ? "rgba(232,184,75,0.6)"
                    : "#1e2a3a"),
                  boxShadow: isSelected
                    ? "0 8px 32px rgba(232,184,75,0.15)"
                    : "0 2px 12px rgba(0,0,0,0.3)",
                  transform: isSelected
                    ? "scale(1.02) translateY(0)"
                    : mounted
                    ? "scale(1) translateY(0)"
                    : "scale(1) translateY(20px)",
                  transition: `all 0.5s ease ${idx * 0.08}s`,
                }}
              >
                <div style={flagWrap}>
                  <span style={{ fontSize: 32 }}>{l.flag}</span>
                </div>
                <div style={{ flex: 1, textAlign: "left" as const }}>
                  <div style={{
                    fontSize: 17, fontWeight: 700,
                    color: isSelected ? "#e8b84b" : "#f4f1ec",
                    marginBottom: 3, transition: "color 0.2s",
                  }}>
                    {l.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: isSelected ? "rgba(232,184,75,0.7)" : "#555",
                    transition: "color 0.2s",
                  }}>
                    {l.sub}
                  </div>
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: "1.5px solid " + (isSelected ? "#e8b84b" : "#2a3448"),
                  background: isSelected ? "#e8b84b" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: isSelected ? 14 : 12,
                    color: isSelected ? "#000" : "#555",
                    fontWeight: 700,
                  }}>
                    {isSelected ? "✓" : "›"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: 32, fontSize: 12,
          color: "#333", textAlign: "center",
          fontStyle: "italic", lineHeight: 1.6,
        }}>
          {t.tagline}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
          {(["en", "fr", "es"] as Lang[]).map(l => (
            <div key={l} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: displayLang === l ? "#e8b84b" : "#1e2a3a",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

      </div>
    </div>
  );
}

const container: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "#0b0f1a",
  color: "#f4f1ec",
  position: "relative",
  overflow: "hidden",
};
const bgGlow: CSSProperties = {
  position: "absolute",
  top: "-10%", left: "50%",
  transform: "translateX(-50%)",
  width: 700, height: 500,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)",
  pointerEvents: "none",
};
const bgGrid: CSSProperties = {
  position: "absolute", inset: 0,
  backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  pointerEvents: "none",
};
const logoWrap: CSSProperties = {
  position: "relative",
  marginBottom: 32,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const logoStyle: CSSProperties = {
  fontSize: 52,
  fontWeight: 900,
  fontFamily: "serif",
  letterSpacing: "-0.02em",
  lineHeight: 1,
};
const logoDot: CSSProperties = {
  width: 6, height: 6,
  borderRadius: "50%",
  background: "#e8b84b",
  marginTop: 8,
  boxShadow: "0 0 12px rgba(232,184,75,0.5)",
};
const cardsWrap: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 16,
};
const langCard: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "16px 18px",
  borderRadius: 16,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left" as const,
};
const flagWrap: CSSProperties = {
  width: 52, height: 52,
  borderRadius: 14,
  background: "#0b0f1a",
  border: "1px solid #1e2a3a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};