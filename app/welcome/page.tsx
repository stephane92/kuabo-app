"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const T = {
  en: {
    welcome: "Welcome",
    tagline: "Your new home starts here.",
    desc: "Kuabo will guide you step by step — documents, housing, work, community. Wherever you land.",
    sub: "Answer a few quick questions so we can personalize your journey.",
    btn: "Let's go →",
    steps: [
      { emoji: "📋", label: "Your situation" },
      { emoji: "🏠", label: "Where you are" },
      { emoji: "🌍", label: "Your destination" },
      { emoji: "🎯", label: "Your goals" },
    ],
  },
  fr: {
    welcome: "Bienvenue",
    tagline: "Ton nouveau chez-toi commence ici.",
    desc: "Kuabo va te guider étape par étape — documents, logement, emploi, communauté. Où que tu arrives.",
    sub: "Réponds à quelques questions rapides pour personnaliser ton parcours.",
    btn: "C'est parti →",
    steps: [
      { emoji: "📋", label: "Ta situation" },
      { emoji: "🏠", label: "Où tu es" },
      { emoji: "🌍", label: "Ta destination" },
      { emoji: "🎯", label: "Tes objectifs" },
    ],
  },
  es: {
    welcome: "Bienvenido",
    tagline: "Tu nuevo hogar empieza aquí.",
    desc: "Kuabo te guiará paso a paso — documentos, vivienda, trabajo, comunidad. Donde llegues.",
    sub: "Responde algunas preguntas rápidas para personalizar tu camino.",
    btn: "¡Vamos →",
    steps: [
      { emoji: "📋", label: "Tu situación" },
      { emoji: "🏠", label: "Dónde estás" },
      { emoji: "🌍", label: "Tu destino" },
      { emoji: "🎯", label: "Tus objetivos" },
    ],
  },
};

export default function Welcome() {
  const router = useRouter();

  const [name, setName]       = useState("User");
  const [lang, setLang]       = useState<Lang>("en");
  const [ready, setReady]     = useState(false);
  const [going, setGoing]     = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // ── Récupère la langue depuis localStorage immédiatement
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["en", "fr", "es"].includes(savedLang)) {
      setLang(savedLang);
    }

    const savedName = localStorage.getItem("userName");
    if (savedName) setName(savedName);

    // ── Timeout 5s max — plus long pour mobile
    const timeout = setTimeout(() => {
      // Si Firebase n'a pas répondu en 5s — on affiche quand même
      // Si pas de user connu, on reste sur welcome (on ne redirige PAS vers login)
      setReady(true);
      setTimeout(() => setMounted(true), 50);
    }, 5000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);

      if (!user) {
        // ── Pas connecté — redirige vers login
        window.location.href = "/login";
        return;
      }

      // ── Connecté — charge les données
      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          const data = snap.data() as any;
          const userLang = (data.lang as Lang) || savedLang || "en";

          setLang(userLang);
          setName(data.name || savedName || "User");
          localStorage.setItem("lang", userLang);
          localStorage.setItem("userName", data.name || "User");

          // Déjà fait l'onboarding
          if (data.onboardingCompleted) {
            window.location.href = "/dashboard";
            return;
          }
        }
      } catch {
        // Firebase error — on affiche quand même la page
        // On ne redirige PAS vers login en cas d'erreur réseau
      }

      setReady(true);
      setTimeout(() => setMounted(true), 50);
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const changeLang = async (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { lang: newLang });
      } catch { /* continue */ }
    }
  };

  const handleStart = () => {
    setGoing(true);
    setTimeout(() => { window.location.href = "/onboarding/step1"; }, 600);
  };

  const text = T[lang];

  // ── Fond noir invisible pendant le check
  if (!ready) return <div style={{ minHeight: "100dvh", background: "#0b0f1a" }} />;

  return (
    <div style={container}>

      <div style={bgGlow} />
      <div style={bgGrid} />

      {/* Header */}
      <div style={headerStyle}>
        <div style={logoStyle}>
          <span style={{ color: "#e8b84b" }}>Ku</span>
          <span style={{ color: "#f4f1ec" }}>abo</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 22, cursor: "pointer" }}>
          <span onClick={() => changeLang("fr")}>🇫🇷</span>
          <span onClick={() => changeLang("en")}>🇺🇸</span>
          <span onClick={() => changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 24px 48px",
      }}>
        <div style={{
          maxWidth: 400, width: "100%",
          textAlign: "center",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(28px)",
          transition: "all 0.7s ease",
          position: "relative", zIndex: 1,
        }}>

          {/* Emoji wave */}
          <div style={{
            fontSize: 68, marginBottom: 20,
            display: "inline-block",
            animation: "wave 0.8s ease-in-out 2",
            transformOrigin: "bottom center",
          }}>
            👋
          </div>

          {/* Nom */}
          <h1 style={titleStyle}>
            {text.welcome},<br />
            <span style={{ color: "#e8b84b" }}>{name}</span> !
          </h1>

          {/* Tagline */}
          <div style={taglineStyle}>{text.tagline}</div>

          {/* Description */}
          <p style={descStyle}>{text.desc}</p>

          {/* Steps preview */}
          <div style={stepsWrap}>
            {text.steps.map((s: any, i: number) => (
              <div key={i} style={{
                ...stepCard,
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: `all 0.5s ease ${i * 0.1}s`,
              }}>
                <div style={stepEmoji}>{s.emoji}</div>
                <div style={stepLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sub */}
          <p style={subStyle}>{text.sub}</p>

          {/* Bouton — OBLIGATOIRE */}
          <button
            onClick={handleStart}
            disabled={going}
            style={{ ...btnStyle, opacity: going ? 0.8 : 1 }}
          >
            {going ? (
              <svg width="20" height="20" viewBox="0 0 20 20"
                style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5" strokeOpacity="0.3" />
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38" />
              </svg>
            ) : text.btn}
          </button>

          {/* Tagline Bénin */}
          <div style={beninStyle}>
            🇧🇯 "Kuabo" — {
              lang === "fr" ? "bienvenue chez toi" :
              lang === "es" ? "bienvenido a casa" :
              "welcome home"
            } en Fon, Bénin
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wave {
          0%,100% { transform: rotate(0deg);  }
          20%     { transform: rotate(-20deg); }
          40%     { transform: rotate(20deg);  }
          60%     { transform: rotate(-10deg); }
          80%     { transform: rotate(10deg);  }
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
  background: "#0b0f1a",
  color: "#f4f1ec",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};
const bgGlow: CSSProperties = {
  position: "absolute",
  top: "-5%", left: "50%",
  transform: "translateX(-50%)",
  width: 600, height: 500,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.08), transparent 65%)",
  pointerEvents: "none",
};
const bgGrid: CSSProperties = {
  position: "absolute", inset: 0,
  backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
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
  fontWeight: 900, fontSize: 22, fontFamily: "serif",
};
const titleStyle: CSSProperties = {
  fontSize: 30, fontWeight: 800,
  lineHeight: 1.2, margin: "0 0 14px",
  fontFamily: "serif",
};
const taglineStyle: CSSProperties = {
  fontSize: 15, fontWeight: 600,
  color: "#f4f1ec", marginBottom: 14,
};
const descStyle: CSSProperties = {
  fontSize: 14, color: "#aaa",
  lineHeight: 1.7, margin: "0 0 24px",
};
const stepsWrap: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
  marginBottom: 24,
};
const stepCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
};
const stepEmoji: CSSProperties = {
  width: 52, height: 52,
  borderRadius: 14,
  background: "#0f1521",
  border: "1px solid #1e2a3a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
};
const stepLabel: CSSProperties = {
  fontSize: 10, color: "#555",
  letterSpacing: "0.05em",
  maxWidth: 60,
  textAlign: "center",
};
const subStyle: CSSProperties = {
  fontSize: 13, color: "#555",
  marginBottom: 28, lineHeight: 1.6,
};
const btnStyle: CSSProperties = {
  width: "100%", padding: "16px",
  background: "#e8b84b", color: "#000",
  border: "none", borderRadius: 14,
  fontWeight: 700, fontSize: 16,
  cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 8px 24px rgba(232,184,75,0.2)",
  marginBottom: 20,
};
const beninStyle: CSSProperties = {
  fontSize: 11, color: "#333",
  fontStyle: "italic", lineHeight: 1.6,
};