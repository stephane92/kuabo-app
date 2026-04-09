"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Globe } from "lucide-react";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const T = {
  en: {
    badge: "🌍 Welcome home",
    title: "Your new home,",
    titleEm: "step by step.",
    sub: "Documents, housing, work, community — we guide every immigrant, wherever you land.",
    start: "Get started",
    login: "I already have an account",
    change: "Change language",
    stats: ["50+", "3", "Free"],
    statsLabel: ["Guided steps", "Languages", "Forever"],
    welcome: "Kuabo! 👋",
    welcomeSub: "Let's build your new life together 🚀",
    tagline: '"Welcome home" — Fon language, Benin 🇧🇯',
  },
  fr: {
    badge: "🌍 Bienvenue chez toi",
    title: "Ton nouveau chez-toi,",
    titleEm: "étape par étape.",
    sub: "Documents, logement, emploi, communauté — on guide chaque immigrant, où que tu arrives.",
    start: "Commencer",
    login: "J'ai déjà un compte",
    change: "Changer la langue",
    stats: ["50+", "3", "Gratuit"],
    statsLabel: ["Étapes guidées", "Langues", "Pour toujours"],
    welcome: "Kuabo ! 👋",
    welcomeSub: "Construisons ta nouvelle vie ensemble 🚀",
    tagline: '"Bienvenue chez toi" — langue Fon, Bénin 🇧🇯',
  },
  es: {
    badge: "🌍 Bienvenido a casa",
    title: "Tu nuevo hogar,",
    titleEm: "paso a paso.",
    sub: "Documentos, vivienda, trabajo, comunidad — guiamos a cada inmigrante, donde llegues.",
    start: "Comenzar",
    login: "Ya tengo una cuenta",
    change: "Cambiar idioma",
    stats: ["50+", "3", "Gratis"],
    statsLabel: ["Pasos guiados", "Idiomas", "Para siempre"],
    welcome: "¡Kuabo! 👋",
    welcomeSub: "Construyamos tu nueva vida juntos 🚀",
    tagline: '"Bienvenido a casa" — idioma Fon, Benín 🇧🇯',
  },
};

// ══════════════════════════════════════════════
// WELCOME ANIMATION
// ══════════════════════════════════════════════
function WelcomeAnimation({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const t = T[lang];

  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes overlayFade {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes popIn {
          0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          60%  { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
          80%  { transform: translate(-50%, -50%) scale(0.96); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes waveHand {
          0%,100% { transform: rotate(0deg);  }
          20%     { transform: rotate(-20deg); }
          40%     { transform: rotate(20deg);  }
          60%     { transform: rotate(-10deg); }
          80%     { transform: rotate(10deg);  }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes ripple {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.5; }
          100% { transform: translate(-50%,-50%) scale(3); opacity: 0;   }
        }
        @keyframes celebFade {
          0%,75% { opacity: 1; }
          100%   { opacity: 0; }
        }
      `}</style>

      {/* Overlay plein écran — couvre TOUT y compris la page home */}
      <div
        onClick={onDone}
        style={{
          position: "fixed", inset: 0,
          background: "#0b0f1a",
          zIndex: 9998,
          animation: "celebFade 1.8s ease forwards",
          cursor: "pointer",
        }}
      />

      {/* Backdrop blur par-dessus */}
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(11,15,26,0.6)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        pointerEvents: "none",
        animation: "celebFade 1.8s ease forwards",
      }} />

      {/* Ripple rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "fixed",
          top: "50%", left: "50%",
          width: 120, height: 120,
          borderRadius: "50%",
          border: "2px solid rgba(232,184,75,0.35)",
          zIndex: 10000,
          pointerEvents: "none",
          animation: `ripple 1.4s ${i * 0.25}s ease-out forwards`,
        }} />
      ))}

      {/* Card centrale */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        zIndex: 10001,
        pointerEvents: "none",
        animation: "popIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
        textAlign: "center",
        width: 260,
      }}>
        {/* Emoji main */}
        <div style={{
          fontSize: 72, lineHeight: 1,
          marginBottom: 16,
          display: "inline-block",
          animation: "waveHand 0.8s 0.3s ease infinite",
          transformOrigin: "bottom center",
          filter: "drop-shadow(0 0 20px rgba(232,184,75,0.4))",
        }}>
          👋
        </div>

        {/* Logo */}
        <div style={{
          fontSize: 36, fontWeight: 900,
          fontFamily: "serif", marginBottom: 8,
          animation: "slideUp 0.4s 0.2s ease forwards",
          opacity: 0,
        }}>
          <span style={{ color: "#e8b84b" }}>Ku</span>
          <span style={{ color: "#f4f1ec" }}>abo</span>
        </div>

        {/* Welcome */}
        <div style={{
          fontSize: 20, fontWeight: 700,
          color: "#f4f1ec", marginBottom: 6,
          animation: "slideUp 0.4s 0.35s ease forwards",
          opacity: 0,
        }}>
          {t.welcome}
        </div>

        {/* Sub */}
        <div style={{
          fontSize: 14, color: "#aaa",
          animation: "slideUp 0.4s 0.5s ease forwards",
          opacity: 0, lineHeight: 1.5,
        }}>
          {t.welcomeSub}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// HOME PAGE
// ══════════════════════════════════════════════
export default function HomePage() {
  const router = useRouter();

  const [lang, setLang]             = useState<Lang>("en");
  const [mounted, setMounted]       = useState(false);
  const [ready, setReady]           = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    if (!saved || !["en", "fr", "es"].includes(saved)) {
      router.replace("/language");
      return;
    }
    setLang(saved);
    setReady(true);
    setTimeout(() => setMounted(true), 80);
  }, [router]);

  const t = T[lang];

  const handleStart = () => setShowWelcome(true);

  const handleWelcomeDone = useCallback(() => {
    router.push("/signup");
  }, [router]);

  if (!ready) return <div style={{ minHeight: "100dvh", background: "#0b0f1a" }} />;

  return (
    <div style={container}>

      {/* Animation par-dessus tout */}
      {showWelcome && (
        <WelcomeAnimation lang={lang} onDone={handleWelcomeDone} />
      )}

      {/* Background */}
      <div style={bgGlow} />
      <div style={bgGrid} />

      {/* Header */}
      <div style={headerStyle}>
        <div style={logoStyle}>
          <span style={{ color: "#e8b84b" }}>Ku</span>
          <span style={{ color: "#f4f1ec" }}>abo</span>
        </div>
        <button
          style={langBtn}
          onClick={() => {
            localStorage.removeItem("lang");
            router.push("/language");
          }}
        >
          <Globe size={13} color="#aaa" />
          {t.change}
        </button>
      </div>

      {/* Content — se cache pendant l'animation */}
      <div style={{
        ...content,
        opacity: showWelcome ? 0 : mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(24px)",
        transition: showWelcome
          ? "opacity 0.1s ease"
          : "all 0.7s ease",
        pointerEvents: showWelcome ? "none" : "auto",
      }}>

        {/* Badge */}
        <div style={badge}>
          <span style={badgeDot} />
          {t.badge}
        </div>

        {/* Title */}
        <h1 style={titleStyle}>
          {t.title}
          <br />
          <em style={titleEm}>{t.titleEm}</em>
        </h1>

        {/* Subtitle — universel, pas spécifique USA */}
        <p style={subStyle}>{t.sub}</p>

        {/* Stats */}
        <div style={statsRow}>
          {t.stats.map((val, i) => (
            <div key={i} style={statCard}>
              <div style={statNum}>{val}</div>
              <div style={statLabelStyle}>{t.statsLabel[i]}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={btnsWrap}>
          <button style={mainBtn} onClick={handleStart}>
            {t.start} →
          </button>
          <button style={outlineBtn} onClick={() => router.push("/login")}>
            {t.login}
          </button>
        </div>

        {/* Tagline — dans la langue choisie */}
        <div style={taglineStyle}>
          🇧🇯 {t.tagline}
        </div>

      </div>

      <style>{`
        button:active { transform: scale(0.97); }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const container: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "#0b0f1a",
  color: "#f4f1ec",
  padding: "80px 24px 40px",
  position: "relative",
  overflow: "hidden",
};
const bgGlow: CSSProperties = {
  position: "absolute",
  top: "-5%", left: "50%",
  transform: "translateX(-50%)",
  width: 700, height: 500,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.07), transparent 65%)",
  pointerEvents: "none",
};
const bgGrid: CSSProperties = {
  position: "absolute", inset: 0,
  backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  pointerEvents: "none",
};
const headerStyle: CSSProperties = {
  position: "fixed",
  top: 0, left: 0, right: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  background: "rgba(11,15,26,0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #1e2a3a",
  zIndex: 100,
};
const logoStyle: CSSProperties = {
  fontWeight: 900, fontSize: 22,
  fontFamily: "serif",
};
const langBtn: CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  background: "#141d2e",
  border: "1px solid #1e2a3a",
  borderRadius: 10, padding: "7px 12px",
  color: "#aaa", fontSize: 12,
  cursor: "pointer", fontFamily: "inherit",
};
const content: CSSProperties = {
  width: "100%", maxWidth: 380,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  position: "relative",
  zIndex: 1,
};
const badge: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "7px 16px", borderRadius: 100,
  border: "1px solid rgba(232,184,75,0.3)",
  background: "rgba(232,184,75,0.08)",
  fontSize: 12, letterSpacing: "0.1em",
  color: "#e8b84b", marginBottom: 24, fontWeight: 500,
};
const badgeDot: CSSProperties = {
  width: 6, height: 6, borderRadius: "50%",
  background: "#e8b84b",
  animation: "blink 2s infinite",
  display: "inline-block",
};
const titleStyle: CSSProperties = {
  fontSize: "clamp(28px, 7vw, 42px)",
  fontWeight: 800, lineHeight: 1.15,
  letterSpacing: "-0.02em",
  margin: "0 0 16px",
  color: "#f4f1ec", fontFamily: "serif",
};
const titleEm: CSSProperties = {
  fontStyle: "italic", color: "#e8b84b",
};
const subStyle: CSSProperties = {
  fontSize: 14, color: "#aaa",
  lineHeight: 1.7, margin: "0 0 28px",
  maxWidth: 320,
};
const statsRow: CSSProperties = {
  display: "flex", gap: 10,
  width: "100%", marginBottom: 28,
};
const statCard: CSSProperties = {
  flex: 1, background: "#0f1521",
  border: "1px solid #1e2a3a",
  borderRadius: 14, padding: "14px 8px",
  textAlign: "center",
};
const statNum: CSSProperties = {
  fontSize: 22, fontWeight: 800,
  color: "#e8b84b", lineHeight: 1, marginBottom: 4,
};
const statLabelStyle: CSSProperties = {
  fontSize: 10, color: "#555",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const btnsWrap: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 10, marginBottom: 28,
};
const mainBtn: CSSProperties = {
  width: "100%", padding: "15px",
  background: "#e8b84b", color: "#000",
  border: "none", borderRadius: 14,
  fontWeight: 700, fontSize: 16,
  cursor: "pointer", fontFamily: "inherit",
  boxShadow: "0 8px 24px rgba(232,184,75,0.2)",
};
const outlineBtn: CSSProperties = {
  width: "100%", padding: "14px",
  background: "#0f1521",
  border: "1px solid #1e2a3a",
  color: "#f4f1ec", borderRadius: 14,
  fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
};
const taglineStyle: CSSProperties = {
  fontSize: 12, color: "#333",
  fontStyle: "italic", lineHeight: 1.6,
  textAlign: "center",
};