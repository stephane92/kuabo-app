"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const T: Record<Lang, any> = {
  en: {
    title: "Where are you right now?",
    sub: "This helps us prioritize what's most urgent for you",
    next: "Continue",
    back: "Back",
    step: "Step 2 of 4",
    options: [
      { label: "Not arrived yet",              value: "abroad",  icon: "🌍", desc: "I'm still in my home country" },
      { label: "Just arrived (< 1 month)",     value: "new",     icon: "✈️", desc: "Everything is new and urgent" },
      { label: "A few months here",            value: "months",  icon: "📅", desc: "Getting settled, still lots to do" },
      { label: "Settled (1+ year)",            value: "settled", icon: "🏠", desc: "Looking to optimize my situation" },
    ],
    motivation: {
      abroad:  { emoji: "🌍", title: "Get ready before you arrive!", msg: "Kuabo will prepare you for everything — so you hit the ground running from day 1." },
      new:     { emoji: "✈️", title: "Welcome! Let's move fast.", msg: "The first weeks are critical. Kuabo will tell you exactly what to do and in what order." },
      months:  { emoji: "📅", title: "You're on your way!", msg: "Kuabo will help you fill the gaps and make sure nothing important is missed." },
      settled: { emoji: "🏠", title: "Let's optimize your life!", msg: "Kuabo will help you unlock the next level — credit, career, community and more." },
    },
  },
  fr: {
    title: "Où es-tu en ce moment ?",
    sub: "Ça nous aide à prioriser ce qui est le plus urgent pour toi",
    next: "Continuer",
    back: "Retour",
    step: "Étape 2 sur 4",
    options: [
      { label: "Pas encore arrivé",            value: "abroad",  icon: "🌍", desc: "Je suis encore dans mon pays d'origine" },
      { label: "Viens d'arriver (< 1 mois)",   value: "new",     icon: "✈️", desc: "Tout est nouveau et urgent" },
      { label: "Ici depuis quelques mois",      value: "months",  icon: "📅", desc: "Je m'installe, encore beaucoup à faire" },
      { label: "Installé (plus de 1 an)",       value: "settled", icon: "🏠", desc: "Je cherche à optimiser ma situation" },
    ],
    motivation: {
      abroad:  { emoji: "🌍", title: "Prépare-toi avant d'arriver !", msg: "Kuabo va te préparer à tout — pour que tu sois opérationnel dès le jour 1." },
      new:     { emoji: "✈️", title: "Bienvenue ! Allons vite.", msg: "Les premières semaines sont critiques. Kuabo te dit exactement quoi faire et dans quel ordre." },
      months:  { emoji: "📅", title: "Tu es sur la bonne voie !", msg: "Kuabo va t'aider à combler les manques et s'assurer que rien d'important n'est oublié." },
      settled: { emoji: "🏠", title: "Optimisons ta vie !", msg: "Kuabo va t'aider à passer au niveau supérieur — crédit, carrière, communauté et plus encore." },
    },
  },
  es: {
    title: "¿Dónde estás ahora mismo?",
    sub: "Esto nos ayuda a priorizar lo más urgente para ti",
    next: "Continuar",
    back: "Atrás",
    step: "Paso 2 de 4",
    options: [
      { label: "Aún no he llegado",            value: "abroad",  icon: "🌍", desc: "Todavía estoy en mi país de origen" },
      { label: "Acabo de llegar (< 1 mes)",    value: "new",     icon: "✈️", desc: "Todo es nuevo y urgente" },
      { label: "Llevo algunos meses aquí",      value: "months",  icon: "📅", desc: "Me estoy instalando, aún mucho por hacer" },
      { label: "Establecido (más de 1 año)",    value: "settled", icon: "🏠", desc: "Busco optimizar mi situación" },
    ],
    motivation: {
      abroad:  { emoji: "🌍", title: "¡Prepárate antes de llegar!", msg: "Kuabo te preparará para todo — para que estés listo desde el día 1." },
      new:     { emoji: "✈️", title: "¡Bienvenido! Vamos rápido.", msg: "Las primeras semanas son críticas. Kuabo te dirá exactamente qué hacer y en qué orden." },
      months:  { emoji: "📅", title: "¡Vas por buen camino!", msg: "Kuabo te ayudará a llenar los vacíos y asegurarse de que nada importante se pierda." },
      settled: { emoji: "🏠", title: "¡Optimicemos tu vida!", msg: "Kuabo te ayudará a pasar al siguiente nivel — crédito, carrera, comunidad y más." },
    },
  },
};

// ══════════════════════════════════════════════
// MOTIVATION OVERLAY
// ══════════════════════════════════════════════
function MotivationOverlay({ lang, value, onDone }: {
  lang: Lang; value: string; onDone: () => void;
}) {
  const mot = T[lang].motivation[value];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.2 + Math.random() * 0.8,
    color: ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa"][i % 5],
    size: 6 + Math.random() * 8,
  }));

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardPop {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0; }
          60%  { transform: translate(-50%,-50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        @keyframes emojiPop {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes barFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      <div onClick={onDone} style={{
        position: "fixed", inset: 0,
        background: "rgba(11,15,26,0.92)",
        backdropFilter: "blur(6px)",
        zIndex: 9998,
        animation: "overlayIn 0.3s ease forwards",
        cursor: "pointer",
      }} />

      {step >= 1 && particles.map(p => (
        <div key={p.id} style={{
          position: "fixed",
          left: p.x + "%", top: "-20px",
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: p.color,
          zIndex: 9999,
          pointerEvents: "none",
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}

      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        zIndex: 10000, width: 300,
        animation: "cardPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #0f1521, #1a2438)",
          border: "1.5px solid rgba(232,184,75,0.4)",
          borderRadius: 24,
          padding: "32px 24px 28px",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 40px rgba(232,184,75,0.1)",
        }}>
          {step >= 1 && (
            <div style={{
              fontSize: 64, marginBottom: 16,
              display: "inline-block",
              animation: "emojiPop 0.4s cubic-bezier(.34,1.56,.64,1) forwards",
            }}>
              {mot.emoji}
            </div>
          )}
          {step >= 2 && (
            <div style={{
              fontSize: 20, fontWeight: 800,
              color: "#e8b84b", marginBottom: 10,
              animation: "slideUp 0.4s ease forwards",
            }}>
              {mot.title}
            </div>
          )}
          {step >= 3 && (
            <div style={{
              fontSize: 13, color: "rgba(244,241,236,0.7)",
              lineHeight: 1.6, marginBottom: 20,
              animation: "slideUp 0.4s ease forwards",
            }}>
              {mot.msg}
            </div>
          )}
          <div style={{ height: 3, background: "#1e2a3a", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
              borderRadius: 3,
              animation: "barFill 2.8s linear forwards",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>
            {lang === "fr" ? "Tape pour continuer" : lang === "es" ? "Toca para continuar" : "Tap to continue"}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// STEP 2
// ══════════════════════════════════════════════
export default function Step2() {
  const router = useRouter();

  const [selected, setSelected]           = useState("");
  const [lang, setLang]                   = useState<Lang>("en");
  const [ready, setReady]                 = useState(false);
  const [mounted, setMounted]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["en","fr","es"].includes(savedLang)) setLang(savedLang);

    const timeout = setTimeout(() => {
      setReady(true);
      setTimeout(() => setMounted(true), 50);
    }, 5000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          const userLang = (data?.lang as Lang) || savedLang || "en";
          setLang(userLang);
          localStorage.setItem("lang", userLang);
        }
      } catch { /* continue */ }
      setReady(true);
      setTimeout(() => setMounted(true), 50);
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const changeLang = async (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    const user = auth.currentUser;
    if (user) {
      try { await updateDoc(doc(db, "users", user.uid), { lang: newLang }); }
      catch { /* continue */ }
    }
  };

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      localStorage.setItem("arrival", selected);
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), { arrival: selected });
      }
    } catch { /* continue */ }
    setShowMotivation(true);
  };

  const handleMotivationDone = () => {
    setShowMotivation(false);
    window.location.href = "/onboarding/step3";
  };

  const text = T[lang];

  if (!ready) return <div style={{ minHeight: "100dvh", background: "#0b0f1a" }} />;

  return (
    <div style={container}>

      {showMotivation && (
        <MotivationOverlay lang={lang} value={selected} onDone={handleMotivationDone} />
      )}

      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={() => window.location.href = "/onboarding/step1"}>
          ← {text.back}
        </button>
        <div style={logoStyle}>
          <span style={{ color: "#e8b84b" }}>Ku</span>
          <span style={{ color: "#f4f1ec" }}>abo</span>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 20, cursor: "pointer" }}>
          <span onClick={() => changeLang("fr")}>🇫🇷</span>
          <span onClick={() => changeLang("en")}>🇺🇸</span>
          <span onClick={() => changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: "flex",
        justifyContent: "center", alignItems: "center",
        padding: "88px 20px 40px",
      }}>
        <div style={{
          width: "100%", maxWidth: 420,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease",
        }}>

          {/* Progress */}
          <div style={{ marginBottom: 24 }}>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: "50%" }} />
            </div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          {/* Title */}
          <h2 style={titleStyle}>{text.title}</h2>
          <p style={subStyle}>{text.sub}</p>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {text.options.map((opt: any) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  style={{
                    ...optionBtn,
                    background: active ? "rgba(232,184,75,0.1)" : "#0f1521",
                    border: "1.5px solid " + (active ? "#e8b84b" : "#1e2a3a"),
                    transform: active ? "scale(1.01)" : "scale(1)",
                  }}
                >
                  <div style={optionIcon}>{opt.icon}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{
                      fontSize: 15, fontWeight: active ? 600 : 400,
                      color: active ? "#e8b84b" : "#f4f1ec",
                      transition: "color 0.2s",
                      marginBottom: 2,
                    }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#555" }}>
                      {opt.desc}
                    </div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: "2px solid " + (active ? "#e8b84b" : "#2a3448"),
                    background: active ? "#e8b84b" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all 0.2s",
                  }}>
                    {active && <span style={{ fontSize: 11, color: "#000", fontWeight: 800 }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bouton */}
          <button
            onClick={handleNext}
            disabled={!selected || saving}
            style={{
              ...nextBtn,
              opacity: selected && !saving ? 1 : 0.4,
              marginTop: 24,
            }}
          >
            {saving && !showMotivation ? (
              <svg width="20" height="20" viewBox="0 0 20 20"
                style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5" strokeOpacity="0.3" />
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38" />
              </svg>
            ) : text.next + " →"}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:active { transform: scale(0.98) !important; }
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
  top: "-10%", left: "50%",
  transform: "translateX(-50%)",
  width: 500, height: 400,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)",
  pointerEvents: "none",
};
const headerStyle: CSSProperties = {
  position: "fixed",
  top: 0, left: 0, right: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 20px",
  background: "rgba(11,15,26,0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #1e2a3a",
  zIndex: 100,
};
const backBtn: CSSProperties = {
  background: "none", border: "none",
  color: "#aaa", cursor: "pointer",
  fontSize: 14, fontFamily: "inherit",
};
const logoStyle: CSSProperties = {
  fontWeight: 900, fontSize: 20, fontFamily: "serif",
};
const progressTrack: CSSProperties = {
  height: 3, background: "#1e2a3a",
  borderRadius: 3, overflow: "hidden", marginBottom: 8,
};
const progressFill: CSSProperties = {
  height: "100%",
  background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
  borderRadius: 3, transition: "width 0.5s ease",
};
const progressLabel: CSSProperties = {
  fontSize: 11, color: "#555",
  letterSpacing: "0.08em", textTransform: "uppercase",
};
const titleStyle: CSSProperties = {
  fontSize: 22, fontWeight: 700,
  margin: "0 0 8px", color: "#f4f1ec",
};
const subStyle: CSSProperties = {
  fontSize: 13, color: "#aaa",
  margin: "0 0 20px", lineHeight: 1.5,
};
const optionBtn: CSSProperties = {
  display: "flex", alignItems: "center",
  gap: 14, padding: "14px 16px",
  borderRadius: 14, cursor: "pointer",
  fontFamily: "inherit", textAlign: "left",
  width: "100%", transition: "all 0.2s ease",
};
const optionIcon: CSSProperties = {
  width: 44, height: 44, borderRadius: 12,
  background: "#141d2e", border: "1px solid #1e2a3a",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 22, flexShrink: 0,
};
const nextBtn: CSSProperties = {
  width: "100%", padding: "15px",
  background: "#e8b84b", color: "#000",
  border: "none", borderRadius: 14,
  fontWeight: 700, fontSize: 15,
  cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "opacity 0.2s",
  boxShadow: "0 8px 24px rgba(232,184,75,0.15)",
};