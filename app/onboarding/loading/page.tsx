"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const STEPS = {
  en: [
    { icon: "🎯", title: "Analyzing your profile...",    sub: "We're reading your answers carefully" },
    { icon: "📋", title: "Preparing your documents...",  sub: "SSN, permits, ID — all mapped out" },
    { icon: "🏠", title: "Mapping your housing...",      sub: "Best areas for your situation" },
    { icon: "💼", title: "Finding opportunities...",     sub: "Jobs and resources near you" },
    { icon: "🚀", title: "Your dashboard is ready!",     sub: "Welcome to your new life" },
  ],
  fr: [
    { icon: "🎯", title: "Analyse de ton profil...",     sub: "On lit tes réponses attentivement" },
    { icon: "📋", title: "Préparation des documents...", sub: "SSN, permis, pièces — tout est cartographié" },
    { icon: "🏠", title: "Recherche de logement...",     sub: "Les meilleures zones pour ta situation" },
    { icon: "💼", title: "Trouver des opportunités...",  sub: "Emplois et ressources près de toi" },
    { icon: "🚀", title: "Ton dashboard est prêt !",     sub: "Bienvenue dans ta nouvelle vie" },
  ],
  es: [
    { icon: "🎯", title: "Analizando tu perfil...",      sub: "Leemos tus respuestas con cuidado" },
    { icon: "📋", title: "Preparando documentos...",     sub: "SSN, permisos, ID — todo mapeado" },
    { icon: "🏠", title: "Buscando vivienda...",         sub: "Las mejores zonas para tu situación" },
    { icon: "💼", title: "Encontrando oportunidades...", sub: "Empleos y recursos cerca de ti" },
    { icon: "🚀", title: "¡Tu panel está listo!",        sub: "Bienvenido a tu nueva vida" },
  ],
};

const PROMISES = {
  en: [
    "We handle the complexity — you focus on living.",
    "Every step, we're right beside you.",
    "No more lost in translation.",
    "Your journey, simplified.",
  ],
  fr: [
    "On gère la complexité — toi tu vis ta vie.",
    "À chaque étape, on est là à tes côtés.",
    "Plus jamais perdu dans les démarches.",
    "Ton parcours, simplifié.",
  ],
  es: [
    "Nosotros manejamos la complejidad — tú vive tu vida.",
    "En cada paso, estamos a tu lado.",
    "Nunca más perdido en los trámites.",
    "Tu camino, simplificado.",
  ],
};

export default function OnboardingLoading() {

  const [lang, setLang]         = useState<Lang>("fr");
  const [stepIdx, setStepIdx]   = useState(0);
  const [progress, setProgress] = useState(0);
  const [promise, setPromise]   = useState(0);
  const [fadeOut, setFadeOut]   = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    if (saved && ["en","fr","es"].includes(saved)) setLang(saved);
    setTimeout(() => setMounted(true), 100);
  }, []);

  // ── Progress bar — 5 secondes
  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min(100, (elapsed / duration) * 100));
      if (elapsed >= duration) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  // ── Steps animation
  useEffect(() => {
    const timings = [0, 1000, 2000, 3200, 4200];
    const timers = timings.map((t, i) =>
      setTimeout(() => setStepIdx(i), t)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Promises rotation
  useEffect(() => {
    const iv = setInterval(() => {
      setPromise(p => (p + 1) % PROMISES[lang].length);
    }, 1200);
    return () => clearInterval(iv);
  }, [lang]);

  // ── Redirect après 5s
  useEffect(() => {
    const t = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  const steps   = STEPS[lang];
  const current = steps[stepIdx];

  return (
    <div style={{
      ...container,
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? "opacity 0.6s ease" : "none",
    }}>

      {/* Background glow */}
      <div style={bgGlow} />
      <div style={bgGrid} />

      {/* Particules flottantes */}
      {mounted && [
        { x: 15, y: 20, size: 5, dur: 3.2, delay: 0    },
        { x: 80, y: 30, size: 4, dur: 4.1, delay: 0.5  },
        { x: 25, y: 65, size: 6, dur: 3.8, delay: 1.2  },
        { x: 70, y: 70, size: 4, dur: 4.5, delay: 0.3  },
        { x: 50, y: 15, size: 5, dur: 3.5, delay: 0.8  },
        { x: 90, y: 55, size: 3, dur: 4.2, delay: 1.5  },
      ].map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: p.x + "%", top: p.y + "%",
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: "#e8b84b",
          opacity: 0.15,
          animation: `float ${p.dur}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: "none",
        }} />
      ))}

      {/* Logo */}
      <div style={{
        ...logoStyle,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.6s ease",
      }}>
        <span style={{ color: "#e8b84b" }}>Ku</span>
        <span style={{ color: "#f4f1ec" }}>abo</span>
      </div>

      {/* Main content */}
      <div style={{
        ...content,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s 0.2s ease",
      }}>

        {/* Steps */}
        <div style={stepsTrack}>
          {steps.map((s, i) => {
            const done   = i < stepIdx;
            const active = i === stepIdx;
            const future = i > stepIdx;
            return (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 12,
                background: active
                  ? "rgba(232,184,75,0.08)"
                  : done ? "rgba(34,197,94,0.05)" : "transparent",
                border: active
                  ? "1px solid rgba(232,184,75,0.2)"
                  : done ? "1px solid rgba(34,197,94,0.15)" : "1px solid transparent",
                transition: "all 0.4s ease",
                opacity: future ? 0.3 : 1,
              }}>

                {/* Icon */}
                <div style={{
                  width: 38, height: 38,
                  borderRadius: 10,
                  background: done
                    ? "rgba(34,197,94,0.15)"
                    : active ? "rgba(232,184,75,0.12)" : "#0f1521",
                  border: "1px solid " + (
                    done   ? "rgba(34,197,94,0.3)"  :
                    active ? "rgba(232,184,75,0.3)" : "#1e2a3a"
                  ),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}>
                  {done ? "✅" : s.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    color: done ? "#22c55e" : active ? "#e8b84b" : "#555",
                    transition: "color 0.3s",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                  }}>
                    {s.title}
                  </div>
                  {active && (
                    <div style={{
                      fontSize: 11, color: "#aaa",
                      marginTop: 2,
                      animation: "fadeIn 0.4s ease forwards",
                    }}>
                      {s.sub}
                    </div>
                  )}
                </div>

                {/* Spinner sur le step actif */}
                {active && (
                  <svg width="18" height="18" viewBox="0 0 18 18"
                    style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                    <circle cx="9" cy="9" r="7"
                      fill="none" stroke="#1e2a3a" strokeWidth="2" />
                    <circle cx="9" cy="9" r="7"
                      fill="none" stroke="#e8b84b" strokeWidth="2"
                      strokeLinecap="round" strokeDasharray="44" strokeDashoffset="33" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Promise rotative */}
        <div style={promiseWrap}>
          <div
            key={promise}
            style={{
              fontSize: 13,
              color: "#aaa",
              fontStyle: "italic",
              textAlign: "center",
              animation: "fadeIn 0.5s ease forwards",
            }}
          >
            ✨ {PROMISES[lang][promise]}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={progressTrack}>
            <div style={{
              height: "100%",
              width: progress + "%",
              background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
              borderRadius: 4,
              transition: "width 0.1s linear",
              boxShadow: "0 0 8px rgba(232,184,75,0.4)",
            }} />
          </div>
          <div style={{
            fontSize: 11, color: "#555",
            textAlign: "center",
            letterSpacing: "0.05em",
          }}>
            {Math.round(progress)}%
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0);    }
          50%     { transform: translateY(-12px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.06; }
          50%     { opacity: 0.12; }
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
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
  padding: "40px 24px",
};
const bgGlow: CSSProperties = {
  position: "absolute",
  top: "-10%", left: "50%",
  transform: "translateX(-50%)",
  width: 600, height: 500,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.08), transparent 65%)",
  pointerEvents: "none",
  animation: "glowPulse 3s ease-in-out infinite",
};
const bgGrid: CSSProperties = {
  position: "absolute", inset: 0,
  backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  pointerEvents: "none",
};
const logoStyle: CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  fontFamily: "serif",
  marginBottom: 40,
  position: "relative",
  zIndex: 1,
};
const content: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  position: "relative",
  zIndex: 1,
};
const stepsTrack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 32,
};
const promiseWrap: CSSProperties = {
  padding: "16px",
  background: "rgba(232,184,75,0.04)",
  border: "1px solid rgba(232,184,75,0.12)",
  borderRadius: 14,
  marginBottom: 24,
  minHeight: 52,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const progressTrack: CSSProperties = {
  height: 4,
  background: "#1e2a3a",
  borderRadius: 4,
  overflow: "hidden",
};