"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const T: Record<Lang, any> = {
  en: {
    title: "Your profile is ready!",
    sub: "Here's a summary — everything looks good 🎯",
    confirm: "Start my journey →",
    back: "Back",
    step: "Final step",
    labels: {
      reason:  "Your situation",
      arrival: "Where you are",
      country: "Destination",
      region:  "Region / State",
      ssn:     "SSN status",
      goal:    "Main priority",
    },
    reasons: {
      dv: "DV Lottery 🎰", work: "Work visa 💼",
      student: "Student 🎓", family: "Family 👨‍👩‍👧",
      refugee: "Refugee 🕊️", worldcup: "World Cup 🏆",
      tourist: "Tourism ✈️", other: "Other 🌍",
    },
    arrivals: {
      abroad: "Not arrived yet 🌍", new: "Just arrived ✈️",
      months: "A few months 📅", settled: "Settled 🏠",
    },
    countries: {
      us: "🇺🇸 United States", fr: "🇫🇷 France",
      ca: "🇨🇦 Canada", be: "🇧🇪 Belgium",
      ch: "🇨🇭 Switzerland", uk: "🇬🇧 United Kingdom",
      other: "🌍 Other",
    },
    ssnStatus: {
      yes: "Already have it ✅",
      no:  "Not yet — top priority 🔴",
    },
    goals: {
      ssn: "Get SSN first 🪪",
      docs: "Documents 📄", housing: "Housing 🏠",
      work: "Work 💼", school: "School 🎓", all: "Everything 🚀",
    },
  },
  fr: {
    title: "Ton profil est prêt !",
    sub: "Voici un résumé — tout est bon 🎯",
    confirm: "Commencer mon parcours →",
    back: "Retour",
    step: "Dernière étape",
    labels: {
      reason:  "Ta situation",
      arrival: "Où tu es",
      country: "Destination",
      region:  "Région / État",
      ssn:     "Statut SSN",
      goal:    "Priorité principale",
    },
    reasons: {
      dv: "DV Lottery 🎰", work: "Visa travail 💼",
      student: "Étudiant 🎓", family: "Famille 👨‍👩‍👧",
      refugee: "Réfugié 🕊️", worldcup: "Coupe du monde 🏆",
      tourist: "Tourisme ✈️", other: "Autre 🌍",
    },
    arrivals: {
      abroad: "Pas encore arrivé 🌍", new: "Viens d'arriver ✈️",
      months: "Quelques mois 📅", settled: "Installé 🏠",
    },
    countries: {
      us: "🇺🇸 États-Unis", fr: "🇫🇷 France",
      ca: "🇨🇦 Canada", be: "🇧🇪 Belgique",
      ch: "🇨🇭 Suisse", uk: "🇬🇧 Royaume-Uni",
      other: "🌍 Autre",
    },
    ssnStatus: {
      yes: "Déjà obtenu ✅",
      no:  "Pas encore — priorité absolue 🔴",
    },
    goals: {
      ssn: "Obtenir le SSN 🪪",
      docs: "Documents 📄", housing: "Logement 🏠",
      work: "Emploi 💼", school: "École 🎓", all: "Tout 🚀",
    },
  },
  es: {
    title: "¡Tu perfil está listo!",
    sub: "Aquí tienes un resumen — todo está bien 🎯",
    confirm: "Comenzar mi camino →",
    back: "Atrás",
    step: "Último paso",
    labels: {
      reason:  "Tu situación",
      arrival: "Dónde estás",
      country: "Destino",
      region:  "Región / Estado",
      ssn:     "Estado SSN",
      goal:    "Prioridad principal",
    },
    reasons: {
      dv: "Lotería DV 🎰", work: "Visa trabajo 💼",
      student: "Estudiante 🎓", family: "Familia 👨‍👩‍👧",
      refugee: "Refugiado 🕊️", worldcup: "Copa del Mundo 🏆",
      tourist: "Turismo ✈️", other: "Otro 🌍",
    },
    arrivals: {
      abroad: "Aún no he llegado 🌍", new: "Recién llegado ✈️",
      months: "Algunos meses 📅", settled: "Establecido 🏠",
    },
    countries: {
      us: "🇺🇸 Estados Unidos", fr: "🇫🇷 Francia",
      ca: "🇨🇦 Canadá", be: "🇧🇪 Bélgica",
      ch: "🇨🇭 Suiza", uk: "🇬🇧 Reino Unido",
      other: "🌍 Otro",
    },
    ssnStatus: {
      yes: "Ya lo tengo ✅",
      no:  "Todavía no — prioridad máxima 🔴",
    },
    goals: {
      ssn: "Obtener SSN 🪪",
      docs: "Documentos 📄", housing: "Vivienda 🏠",
      work: "Trabajo 💼", school: "Escuela 🎓", all: "Todo 🚀",
    },
  },
};

// ══════════════════════════════════════════════
// FINAL ANIMATION
// ══════════════════════════════════════════════
function FinalAnimation({ lang, name, onDone }: {
  lang: Lang; name: string; onDone: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1100);
    const t4 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const particles = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.7,
    dur: 1.4 + Math.random() * 1.0,
    color: ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa","#f472b6","#60a5fa"][i % 7],
    size: 7 + Math.random() * 9,
    isCircle: Math.random() > 0.5,
  }));

  const msgs = {
    en: { title: "You're all set! 🎉", sub: `${name}, your dashboard is ready. Let's go!`, cta: "Tap to continue" },
    fr: { title: "Tout est prêt ! 🎉", sub: `${name}, ton tableau de bord est prêt. C'est parti !`, cta: "Tape pour continuer" },
    es: { title: "¡Todo listo! 🎉", sub: `${name}, tu panel está listo. ¡Vamos!`, cta: "Toca para continuar" },
  }[lang];

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(800deg); opacity: 0; }
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardPop {
          0%   { transform: translate(-50%,-50%) scale(0.4); opacity: 0; }
          60%  { transform: translate(-50%,-50%) scale(1.06); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        @keyframes emojiPop {
          0%   { transform: scale(0) rotate(-20deg); }
          60%  { transform: scale(1.3) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes barFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes ringPulse {
          0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
      `}</style>

      <div onClick={onDone} style={{
        position: "fixed", inset: 0,
        background: "rgba(11,15,26,0.93)",
        backdropFilter: "blur(6px)",
        zIndex: 9997, cursor: "pointer",
        animation: "overlayIn 0.3s ease forwards",
      }} />

      {step >= 1 && particles.map(p => (
        <div key={p.id} style={{
          position: "fixed",
          left: p.x + "%", top: "-20px",
          width: p.size, height: p.size,
          borderRadius: p.isCircle ? "50%" : "3px",
          background: p.color,
          zIndex: 9998, pointerEvents: "none",
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}

      {step >= 1 && [0, 1].map(i => (
        <div key={i} style={{
          position: "fixed", top: "50%", left: "50%",
          width: 160, height: 160, borderRadius: "50%",
          border: "3px solid rgba(232,184,75,0.4)",
          zIndex: 9998, pointerEvents: "none",
          animation: `ringPulse 0.8s ${i * 0.3}s ease-out forwards`,
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
          border: "1.5px solid rgba(232,184,75,0.5)",
          borderRadius: 24, padding: "32px 24px 28px",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 60px rgba(232,184,75,0.15)",
        }}>
          {step >= 1 && (
            <div style={{
              fontSize: 72, marginBottom: 12,
              display: "inline-block",
              animation: "emojiPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
            }}>🎉</div>
          )}
          {step >= 1 && (
            <div style={{ fontSize: 18, letterSpacing: 4, marginBottom: 12 }}>⭐⭐⭐</div>
          )}
          {step >= 2 && (
            <div style={{
              fontSize: 22, fontWeight: 800, color: "#e8b84b",
              marginBottom: 12, animation: "slideUp 0.4s ease forwards",
            }}>
              {msgs.title}
            </div>
          )}
          {step >= 3 && (
            <div style={{
              fontSize: 13, color: "rgba(244,241,236,0.75)",
              lineHeight: 1.6, marginBottom: 20,
              animation: "slideUp 0.4s ease forwards",
            }}>
              {msgs.sub}
            </div>
          )}
          <div style={{ height: 4, background: "#1e2a3a", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
              borderRadius: 4,
              animation: "barFill 3s linear forwards",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>{msgs.cta}</div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// STEP 5
// ══════════════════════════════════════════════
export default function Step5() {
  const router = useRouter();

  const [lang, setLang]           = useState<Lang>("fr");
  const [saving, setSaving]       = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [userName, setUserName]   = useState("friend");
  const [mounted, setMounted]     = useState(false);

  const [profile, setProfile] = useState({
    reason:   "",
    arrival:  "",
    country:  "",
    region:   "",
    hasSSN:   "",
    goal:     "",
    priority: "",
  });

  const hasData = !!(profile.reason || profile.arrival || profile.country);

  useEffect(() => {
    // ── ÉTAPE 1 — localStorage IMMÉDIAT
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["en","fr","es"].includes(savedLang)) setLang(savedLang);
    setUserName(localStorage.getItem("userName") || "friend");

    const fromStorage = {
      reason:   localStorage.getItem("reason")   || "",
      arrival:  localStorage.getItem("arrival")  || "",
      country:  localStorage.getItem("country")  || "",
      region:   localStorage.getItem("region")   || "",
      hasSSN:   localStorage.getItem("hasSSN")   || "",
      goal:     localStorage.getItem("goal")     || "",
      priority: localStorage.getItem("priority") || "",
    };

    setProfile(fromStorage);
    setTimeout(() => setMounted(true), 100);

    // ── ÉTAPE 2 — Firestore enrichit quand ça répond
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "/login"; return; }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          const userLang = (data?.lang as Lang) || savedLang || "fr";

          setLang(userLang);
          setUserName(data.name || localStorage.getItem("userName") || "friend");
          localStorage.setItem("lang", userLang);
          if (data.name) localStorage.setItem("userName", data.name);

          setProfile({
            reason:   data.reason   || fromStorage.reason,
            arrival:  data.arrival  || fromStorage.arrival,
            country:  data.country  || fromStorage.country,
            region:   data.region   || fromStorage.region,
            hasSSN:   data.hasSSN === true  ? "yes"
                    : data.hasSSN === false ? "no"
                    : fromStorage.hasSSN,
            goal:     data.goal     || fromStorage.goal,
            priority: data.priority || fromStorage.priority,
          });
        }
      } catch (e) {
        console.error("Firestore error:", e);
      }
    });

    return () => unsub();
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

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          onboardingCompleted: true,
        });
      }
    } catch { /* continue */ }
    setShowFinal(true);
  };

  // ── Redirige vers la page loading motivante
  const handleFinalDone = () => {
    setShowFinal(false);
    window.location.href = "/onboarding/loading";
  };

  const text = T[lang];

  const getLabel = (map: Record<string, string>, value: string): string => {
    if (!value) return "—";
    return map?.[value] || value;
  };

  const rows = [
    profile.reason  ? { label: text.labels.reason,  value: getLabel(text.reasons,  profile.reason)  } : null,
    profile.arrival ? { label: text.labels.arrival, value: getLabel(text.arrivals, profile.arrival) } : null,
    profile.country ? { label: text.labels.country, value: getLabel(text.countries,profile.country) } : null,
    profile.region  ? { label: text.labels.region,  value: profile.region } : null,
    (profile.country === "us" && profile.hasSSN)
      ? { label: text.labels.ssn, value: text.ssnStatus[profile.hasSSN as "yes"|"no"] || profile.hasSSN }
      : null,
    (profile.priority || profile.goal)
      ? { label: text.labels.goal, value: getLabel(text.goals, profile.priority || profile.goal) }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div style={container}>

      {showFinal && (
        <FinalAnimation lang={lang} name={userName} onDone={handleFinalDone} />
      )}

      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={() => window.location.href = "/onboarding/step4"}>
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

          {/* Progress 100% */}
          <div style={{ marginBottom: 24 }}>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: "100%" }} />
            </div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          <div style={iconCircle}>🎯</div>
          <h2 style={titleStyle}>{text.title}</h2>
          <p style={subStyle}>{text.sub}</p>

          {/* Résumé */}
          <div style={summaryCard}>
            {!hasData ? (
              [1,2,3,4].map(i => (
                <div key={i} style={{
                  ...summaryRow,
                  borderBottom: i < 4 ? "1px solid #1e2a3a" : "none",
                }}>
                  <div style={{
                    height: 12, width: "35%", borderRadius: 6,
                    background: "#1e2a3a",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                  <div style={{
                    height: 12, width: "45%", borderRadius: 6,
                    background: "#1a2438",
                    animation: "pulse 1.5s ease-in-out infinite",
                    animationDelay: "0.2s",
                  }} />
                </div>
              ))
            ) : (
              rows.map((row, i) => (
                <div key={i} style={{
                  ...summaryRow,
                  borderBottom: i < rows.length - 1 ? "1px solid #1e2a3a" : "none",
                }}>
                  <span style={rowLabel}>{row.label}</span>
                  <span style={rowValue}>{row.value}</span>
                </div>
              ))
            )}
          </div>

          {/* Bouton */}
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{ ...nextBtn, opacity: saving ? 0.8 : 1 }}
          >
            {saving && !showFinal ? (
              <svg width="20" height="20" viewBox="0 0 20 20"
                style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5" strokeOpacity="0.3" />
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38" />
              </svg>
            ) : text.confirm}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
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
const iconCircle: CSSProperties = {
  width: 64, height: 64, borderRadius: "50%",
  background: "rgba(232,184,75,0.1)",
  border: "1px solid rgba(232,184,75,0.25)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 30, margin: "0 auto 20px",
};
const titleStyle: CSSProperties = {
  fontSize: 24, fontWeight: 800,
  margin: "0 0 8px", textAlign: "center", color: "#f4f1ec",
};
const subStyle: CSSProperties = {
  fontSize: 13, color: "#aaa",
  margin: "0 0 24px", lineHeight: 1.5, textAlign: "center",
};
const summaryCard: CSSProperties = {
  background: "#0f1521",
  border: "1px solid #1e2a3a",
  borderRadius: 16, overflow: "hidden", marginBottom: 24,
};
const summaryRow: CSSProperties = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "14px 18px",
};
const rowLabel: CSSProperties = {
  fontSize: 12, color: "#555",
  letterSpacing: "0.05em", flexShrink: 0,
};
const rowValue: CSSProperties = {
  fontSize: 14, fontWeight: 600,
  color: "#f4f1ec", textAlign: "right", maxWidth: "60%",
};
const nextBtn: CSSProperties = {
  width: "100%", padding: "16px",
  background: "#e8b84b", color: "#000",
  border: "none", borderRadius: 14,
  fontWeight: 700, fontSize: 15,
  cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 8px 24px rgba(232,184,75,0.2)",
};