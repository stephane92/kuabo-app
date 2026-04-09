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
    step: "Step 4 of 4",
    back: "Back",
    next: "Continue",
    // ── USA SSN question
    ssnTitle: "Do you have your SSN yet?",
    ssnDesc: "The Social Security Number is essential — you need it to work, open a bank account, and access most services.",
    ssnYes: "Yes, I have it ✅",
    ssnNo: "Not yet ❌",
    ssnNoInfo: "No problem — Kuabo will guide you to get it first.",
    // ── Priority (tous pays)
    goalTitle: "What's your main priority right now?",
    goalSub: "We'll personalize your dashboard based on this",
    goals: [
      { label: "Documents & Admin",  value: "docs",    icon: "📄", desc: "Permits, ID, residence..." },
      { label: "Housing",            value: "housing", icon: "🏠", desc: "Find an apartment fast" },
      { label: "Work",               value: "work",    icon: "💼", desc: "Job search, contracts..." },
      { label: "School / Education", value: "school",  icon: "🎓", desc: "For you or your kids" },
      { label: "Everything",         value: "all",     icon: "🚀", desc: "I need guidance on all fronts" },
    ],
    motivation: {
      ssn_no:  { emoji: "🪪", title: "SSN first!", msg: "Smart move. Kuabo will guide you step by step to get your SSN — it unlocks everything." },
      ssn_yes: { emoji: "✅", title: "Great — SSN done!", msg: "You're ahead of the game. Now let's focus on what matters most to you." },
      docs:    { emoji: "📄", title: "Documents first!", msg: "Kuabo will guide you through every admin step — fast and stress-free." },
      housing: { emoji: "🏠", title: "Let's find you a home!", msg: "Kuabo will help you find housing quickly with the best tips and resources." },
      work:    { emoji: "💼", title: "Time to work!", msg: "Kuabo will guide you through job search, contracts and everything you need." },
      school:  { emoji: "🎓", title: "Education first!", msg: "Kuabo will help you navigate the school system for you and your family." },
      all:     { emoji: "🚀", title: "Let's do it all!", msg: "Kuabo has you covered on every front — documents, housing, work and more." },
    },
  },
  fr: {
    step: "Étape 4 sur 4",
    back: "Retour",
    next: "Continuer",
    ssnTitle: "As-tu déjà ton SSN ?",
    ssnDesc: "Le numéro de Sécurité Sociale américain est essentiel — tu en as besoin pour travailler, ouvrir un compte et accéder aux services.",
    ssnYes: "Oui, je l'ai ✅",
    ssnNo: "Pas encore ❌",
    ssnNoInfo: "Pas de problème — Kuabo va te guider pour l'obtenir en premier.",
    goalTitle: "Quelle est ta priorité principale en ce moment ?",
    goalSub: "On va personnaliser ton tableau de bord selon ça",
    goals: [
      { label: "Documents & Admin",  value: "docs",    icon: "📄", desc: "Permis, pièces d'identité, résidence..." },
      { label: "Logement",           value: "housing", icon: "🏠", desc: "Trouver un appartement rapidement" },
      { label: "Emploi",             value: "work",    icon: "💼", desc: "Recherche d'emploi, contrats..." },
      { label: "École / Éducation",  value: "school",  icon: "🎓", desc: "Pour toi ou tes enfants" },
      { label: "Tout à la fois",     value: "all",     icon: "🚀", desc: "J'ai besoin de guide sur tout" },
    ],
    motivation: {
      ssn_no:  { emoji: "🪪", title: "SSN en premier !", msg: "Bonne décision. Kuabo va te guider étape par étape pour obtenir ton SSN — il débloque tout." },
      ssn_yes: { emoji: "✅", title: "SSN déjà fait !", msg: "Tu es en avance. Maintenant concentrons-nous sur ce qui compte le plus pour toi." },
      docs:    { emoji: "📄", title: "Les documents d'abord !", msg: "Kuabo va te guider dans chaque démarche administrative — vite et sans stress." },
      housing: { emoji: "🏠", title: "Trouvons-toi un logement !", msg: "Kuabo va t'aider à trouver un logement rapidement avec les meilleurs conseils." },
      work:    { emoji: "💼", title: "Au travail !", msg: "Kuabo va te guider dans la recherche d'emploi, les contrats et tout ce qu'il faut." },
      school:  { emoji: "🎓", title: "L'éducation d'abord !", msg: "Kuabo va t'aider à naviguer dans le système scolaire pour toi et ta famille." },
      all:     { emoji: "🚀", title: "On fait tout !", msg: "Kuabo t'accompagne sur tous les fronts — documents, logement, emploi et plus." },
    },
  },
  es: {
    step: "Paso 4 de 4",
    back: "Atrás",
    next: "Continuar",
    ssnTitle: "¿Ya tienes tu SSN?",
    ssnDesc: "El Número de Seguro Social es esencial — lo necesitas para trabajar, abrir cuenta y acceder a servicios.",
    ssnYes: "Sí, lo tengo ✅",
    ssnNo: "Todavía no ❌",
    ssnNoInfo: "No hay problema — Kuabo te guiará para obtenerlo primero.",
    goalTitle: "¿Cuál es tu prioridad principal ahora mismo?",
    goalSub: "Personalizaremos tu panel según esto",
    goals: [
      { label: "Documentos & Admin", value: "docs",    icon: "📄", desc: "Permisos, ID, residencia..." },
      { label: "Vivienda",           value: "housing", icon: "🏠", desc: "Encontrar apartamento rápido" },
      { label: "Trabajo",            value: "work",    icon: "💼", desc: "Búsqueda de empleo, contratos..." },
      { label: "Escuela / Educación",value: "school",  icon: "🎓", desc: "Para ti o tus hijos" },
      { label: "Todo a la vez",      value: "all",     icon: "🚀", desc: "Necesito guía en todo" },
    ],
    motivation: {
      ssn_no:  { emoji: "🪪", title: "¡SSN primero!", msg: "Buena decisión. Kuabo te guiará paso a paso para obtener tu SSN — desbloquea todo." },
      ssn_yes: { emoji: "✅", title: "¡SSN ya hecho!", msg: "Vas adelantado. Ahora enfoquémonos en lo que más importa para ti." },
      docs:    { emoji: "📄", title: "¡Documentos primero!", msg: "Kuabo te guiará en cada trámite administrativo — rápido y sin estrés." },
      housing: { emoji: "🏠", title: "¡Busquemos tu hogar!", msg: "Kuabo te ayudará a encontrar vivienda rápidamente con los mejores consejos." },
      work:    { emoji: "💼", title: "¡A trabajar!", msg: "Kuabo te guiará en la búsqueda de empleo, contratos y todo lo necesario." },
      school:  { emoji: "🎓", title: "¡La educación primero!", msg: "Kuabo te ayudará a navegar el sistema escolar para ti y tu familia." },
      all:     { emoji: "🚀", title: "¡Lo hacemos todo!", msg: "Kuabo te cubre en todos los frentes — documentos, vivienda, trabajo y más." },
    },
  },
};

// ══════════════════════════════════════════════
// MOTIVATION OVERLAY
// ══════════════════════════════════════════════
function MotivationOverlay({ lang, value, onDone }: {
  lang: Lang; value: string; onDone: () => void;
}) {
  const mot = T[lang].motivation[value] || T[lang].motivation.all;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
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
        zIndex: 9998, cursor: "pointer",
        animation: "overlayIn 0.3s ease forwards",
      }} />

      {step >= 1 && particles.map(p => (
        <div key={p.id} style={{
          position: "fixed",
          left: p.x + "%", top: "-20px",
          width: p.size, height: p.size,
          borderRadius: "50%", background: p.color,
          zIndex: 9999, pointerEvents: "none",
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}

      <div style={{
        position: "fixed", top: "50%", left: "50%",
        zIndex: 10000, width: 300,
        animation: "cardPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #0f1521, #1a2438)",
          border: "1.5px solid rgba(232,184,75,0.4)",
          borderRadius: 24, padding: "32px 24px 28px",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
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
              fontSize: 20, fontWeight: 800, color: "#e8b84b",
              marginBottom: 10, animation: "slideUp 0.4s ease forwards",
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
              borderRadius: 3, animation: "barFill 2.8s linear forwards",
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
// STEP 4
// ══════════════════════════════════════════════
export default function Step4() {
  const router = useRouter();

  const [lang, setLang]                     = useState<Lang>("en");
  const [ready, setReady]                   = useState(false);
  const [mounted, setMounted]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [motivKey, setMotivKey]             = useState("");
  const [country, setCountry]               = useState("us");

  // ── USA: 2 étapes (SSN → priorité)
  const [ssnStep, setSsnStep]       = useState<"ssn" | "goal">("ssn");
  const [hasSSN, setHasSSN]         = useState<boolean | null>(null);
  const [selectedGoal, setSelectedGoal] = useState("");

  const isUSA = country === "us";

  useEffect(() => {
    const savedLang    = localStorage.getItem("lang") as Lang;
    const savedCountry = localStorage.getItem("country") || "us";
    if (savedLang && ["en","fr","es"].includes(savedLang)) setLang(savedLang);
    setCountry(savedCountry);

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
          setCountry(data.country || savedCountry);
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

  // ── USA: pas de SSN → save et animation
  const handleNoSSN = async () => {
    if (saving) return;
    setSaving(true);
    try {
      localStorage.setItem("priority", "ssn");
      localStorage.setItem("hasSSN", "no");
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          priority: "ssn", hasSSN: false,
        });
      }
    } catch { /* continue */ }
    setHasSSN(false);
    setMotivKey("ssn_no");
    setShowMotivation(true);
  };

  // ── USA: a le SSN → passe à l'étape priorité
  const handleHasSSN = () => {
    setHasSSN(true);
    setMotivKey("ssn_yes");
    setShowMotivation(true);
  };

  // ── Après animation SSN yes → montre les goals
  const handleSSNMotivDone = () => {
    setShowMotivation(false);
    if (hasSSN) {
      setSsnStep("goal");
      setSaving(false);
    } else {
      // SSN no → va directement step5
      window.location.href = "/onboarding/step5";
    }
  };

  // ── Goal (tous pays)
  const handleGoal = async () => {
    if (!selectedGoal || saving) return;
    setSaving(true);
    try {
      localStorage.setItem("goal", selectedGoal);
      localStorage.setItem("priority", selectedGoal);
      if (hasSSN !== null) localStorage.setItem("hasSSN", hasSSN ? "yes" : "no");
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          goal: selectedGoal,
          priority: selectedGoal,
          ...(hasSSN !== null && { hasSSN }),
        });
      }
    } catch { /* continue */ }
    setMotivKey(selectedGoal);
    setShowMotivation(true);
  };

  const handleGoalMotivDone = () => {
    setShowMotivation(false);
    window.location.href = "/onboarding/step5";
  };

  const text = T[lang];

  // Détermine quel handler utiliser après l'animation
  const handleMotivDone = () => {
    if (motivKey === "ssn_no" || motivKey === "ssn_yes") {
      handleSSNMotivDone();
    } else {
      handleGoalMotivDone();
    }
  };

  if (!ready) return <div style={{ minHeight: "100dvh", background: "#0b0f1a" }} />;

  // ── Contenu selon situation
  const showSSNQuestion = isUSA && ssnStep === "ssn";
  const showGoals       = !isUSA || ssnStep === "goal";

  return (
    <div style={container}>

      {showMotivation && (
        <MotivationOverlay lang={lang} value={motivKey} onDone={handleMotivDone} />
      )}

      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={() => {
          if (isUSA && ssnStep === "goal") {
            setSsnStep("ssn");
            setHasSSN(null);
          } else {
            window.location.href = "/onboarding/step3";
          }
        }}>
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
              <div style={{ ...progressFill, width: "100%" }} />
            </div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          {/* ══ USA — Question SSN ══ */}
          {showSSNQuestion && (
            <>
              {/* Badge USA */}
              <div style={usaBadge}>🇺🇸 USA</div>

              <h2 style={titleStyle}>{text.ssnTitle}</h2>

              <div style={infoCard}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>🪪</div>
                <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, margin: 0 }}>
                  {text.ssnDesc}
                </p>
              </div>

              <button onClick={handleHasSSN} style={yesBtn}>
                {text.ssnYes}
              </button>

              <button onClick={handleNoSSN} disabled={saving} style={noBtn}>
                {saving ? (
                  <svg width="18" height="18" viewBox="0 0 18 18"
                    style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="9" cy="9" r="7" fill="none"
                      stroke="#f4f1ec" strokeWidth="2" strokeOpacity="0.3" />
                    <circle cx="9" cy="9" r="7" fill="none"
                      stroke="#f4f1ec" strokeWidth="2"
                      strokeLinecap="round" strokeDasharray="44" strokeDashoffset="33" />
                  </svg>
                ) : text.ssnNo}
              </button>

              <div style={ssnHint}>{text.ssnNoInfo}</div>
            </>
          )}

          {/* ══ Goals (tous pays ou USA après SSN) ══ */}
          {showGoals && (
            <>
              <h2 style={titleStyle}>{text.goalTitle}</h2>
              <p style={subStyle}>{text.goalSub}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {text.goals.map((g: any) => {
                  const active = selectedGoal === g.value;
                  return (
                    <button
                      key={g.value}
                      onClick={() => setSelectedGoal(g.value)}
                      style={{
                        ...optionBtn,
                        background: active ? "rgba(232,184,75,0.1)" : "#0f1521",
                        border: "1.5px solid " + (active ? "#e8b84b" : "#1e2a3a"),
                        transform: active ? "scale(1.01)" : "scale(1)",
                      }}
                    >
                      <div style={optionIcon}>{g.icon}</div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{
                          fontSize: 15, fontWeight: active ? 600 : 400,
                          color: active ? "#e8b84b" : "#f4f1ec",
                          marginBottom: 2, transition: "color 0.2s",
                        }}>
                          {g.label}
                        </div>
                        <div style={{ fontSize: 11, color: "#555" }}>{g.desc}</div>
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

              <button
                onClick={handleGoal}
                disabled={!selectedGoal || saving}
                style={{
                  ...nextBtn,
                  opacity: selectedGoal && !saving ? 1 : 0.4,
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
            </>
          )}

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
  background: "#0b0f1a", color: "#f4f1ec",
  display: "flex", flexDirection: "column",
  position: "relative", overflow: "hidden",
};
const bgGlow: CSSProperties = {
  position: "absolute", top: "-10%", left: "50%",
  transform: "translateX(-50%)",
  width: 500, height: 400,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)",
  pointerEvents: "none",
};
const headerStyle: CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0,
  display: "flex", justifyContent: "space-between", alignItems: "center",
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
  borderRadius: 3,
};
const progressLabel: CSSProperties = {
  fontSize: 11, color: "#555",
  letterSpacing: "0.08em", textTransform: "uppercase",
};
const usaBadge: CSSProperties = {
  display: "inline-flex",
  padding: "5px 12px",
  borderRadius: 20,
  background: "rgba(232,184,75,0.1)",
  border: "1px solid rgba(232,184,75,0.3)",
  fontSize: 12, color: "#e8b84b",
  fontWeight: 600, marginBottom: 16,
};
const titleStyle: CSSProperties = {
  fontSize: 22, fontWeight: 700,
  margin: "0 0 16px", color: "#f4f1ec",
};
const subStyle: CSSProperties = {
  fontSize: 13, color: "#aaa",
  margin: "0 0 20px", lineHeight: 1.5,
};
const infoCard: CSSProperties = {
  background: "#0f1521",
  border: "1px solid #1e2a3a",
  borderRadius: 14, padding: "20px",
  marginBottom: 20, textAlign: "center",
};
const yesBtn: CSSProperties = {
  width: "100%", padding: "15px",
  background: "#e8b84b", color: "#000",
  border: "none", borderRadius: 14,
  fontWeight: 700, fontSize: 15,
  cursor: "pointer", fontFamily: "inherit",
  marginBottom: 10,
};
const noBtn: CSSProperties = {
  width: "100%", padding: "15px",
  background: "#0f1521",
  border: "1.5px solid #1e2a3a",
  color: "#f4f1ec", borderRadius: 14,
  fontWeight: 500, fontSize: 15,
  cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const ssnHint: CSSProperties = {
  fontSize: 12, color: "#555",
  marginTop: 12, textAlign: "center",
  lineHeight: 1.5,
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