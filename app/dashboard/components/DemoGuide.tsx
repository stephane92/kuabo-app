"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { Lang } from "./data";

// ══════════════════════════════════════════════
// ÉTAPES DE LA DÉMO
// ══════════════════════════════════════════════
type DemoStep = {
  id:       string;
  emoji:    string;
  title:    Record<Lang, string>;
  desc:     Record<Lang, string>;
  // Quelle zone du dashboard mettre en avant
  // Utilisé pour scroller et highlighter
  target:   "phases" | "deadlines" | "streak" | "documents" | "explorer" | "profile" | "ai";
  tabHint?: "home" | "documents" | "explorer" | "profile";
};

const DEMO_STEPS: DemoStep[] = [
  {
    id:      "phases",
    emoji:   "🚀",
    title:   { fr:"Tes phases d'installation", en:"Your settlement phases", es:"Tus fases de instalación" },
    desc:    { fr:"Kuabo découpe ton parcours en 5 phases — de l'Atterrissage à Kuabo à Vie. Coche chaque étape pour avancer et débloquer la phase suivante.", en:"Kuabo breaks your journey into 5 phases — from Landing to Kuabo for Life. Check each step to progress and unlock the next phase.", es:"Kuabo divide tu camino en 5 fases — del Aterrizaje a Kuabo de por Vida. Marca cada paso para avanzar y desbloquear la siguiente fase." },
    target:  "phases",
    tabHint: "home",
  },
  {
    id:      "deadlines",
    emoji:   "⏱",
    title:   { fr:"Tes deadlines urgentes", en:"Your urgent deadlines", es:"Tus fechas límite urgentes" },
    desc:    { fr:"Ici tu vois les étapes les plus urgentes avec le nombre de jours restants. Le SSN est toujours en premier — c'est la priorité absolue dès ton arrivée.", en:"Here you see the most urgent steps with days remaining. SSN is always first — it's the top priority from day one.", es:"Aquí ves los pasos más urgentes con los días restantes. El SSN siempre es primero — es la prioridad absoluta desde tu llegada." },
    target:  "deadlines",
    tabHint: "home",
  },
  {
    id:      "ai",
    emoji:   "🤖",
    title:   { fr:"Kuabo AI — ton assistant", en:"Kuabo AI — your assistant", es:"Kuabo AI — tu asistente" },
    desc:    { fr:"Pose toutes tes questions à Kuabo AI — immigration, logement, emploi, taxes... Il connaît ta situation et te répond en français, anglais ou espagnol.", en:"Ask Kuabo AI anything — immigration, housing, jobs, taxes... It knows your situation and answers in your language.", es:"Pregunta a Kuabo AI lo que sea — inmigración, vivienda, trabajo, impuestos... Conoce tu situación y responde en tu idioma." },
    target:  "ai",
    tabHint: "home",
  },
  {
    id:      "documents",
    emoji:   "📄",
    title:   { fr:"Tes documents importants", en:"Your important documents", es:"Tus documentos importantes" },
    desc:    { fr:"Retrouve tous tes papiers — passeport, SSN, Green Card, permis. Kuabo t'aide si tu en perds un avec les étapes exactes à suivre.", en:"Find all your papers — passport, SSN, Green Card, license. Kuabo helps if you lose one with the exact steps to follow.", es:"Encuentra todos tus papeles — pasaporte, SSN, Green Card, licencia. Kuabo te ayuda si pierdes uno con los pasos exactos a seguir." },
    target:  "documents",
    tabHint: "documents",
  },
  {
    id:      "explorer",
    emoji:   "📍",
    title:   { fr:"Explorer près de toi", en:"Explore near you", es:"Explora cerca de ti" },
    desc:    { fr:"Trouve les bureaux SSA, DMV, banques et services USCIS autour de toi sur une carte interactive. Tu peux aussi voir les autres membres Kuabo de ta ville.", en:"Find SSA offices, DMV, banks and USCIS services around you on an interactive map. You can also see other Kuabo members in your city.", es:"Encuentra oficinas SSA, DMV, bancos y servicios USCIS a tu alrededor en un mapa interactivo. También puedes ver otros miembros Kuabo en tu ciudad." },
    target:  "explorer",
    tabHint: "explorer",
  },
  {
    id:      "profile",
    emoji:   "👤",
    title:   { fr:"Ton profil Kuabo", en:"Your Kuabo profile", es:"Tu perfil Kuabo" },
    desc:    { fr:"Modifie ton nom, ta langue, ton statut Army, ton état de résidence. Tu peux aussi partager Kuabo à d'autres immigrants — chaque personne aidée compte.", en:"Edit your name, language, Army status, state of residence. You can also share Kuabo with other immigrants — every person helped matters.", es:"Edita tu nombre, idioma, estado Army, estado de residencia. También puedes compartir Kuabo con otros inmigrantes — cada persona ayudada cuenta." },
    target:  "profile",
    tabHint: "profile",
  },
];

// ══════════════════════════════════════════════
// TEXTES UI
// ══════════════════════════════════════════════
const UI: Record<Lang, Record<string, string>> = {
  fr: {
    welcomeTitle:   "Ton dashboard est prêt ! 🎉",
    welcomeSub:     "Bienvenue dans Kuabo.",
    welcomeQuestion:"Veux-tu une visite guidée\npour découvrir les fonctionnalités clés ?",
    tourList:       "La visite explique :",
    btnYes:         "🚀 Oui, montre-moi !",
    btnNo:          "Non merci, j'explore seul",
    btnNext:        "Suivant →",
    btnFinish:      "Terminer la visite 🎉",
    btnStop:        "Arrêter la visite",
    doneTitle:      "Tu es prêt ! 🎊",
    doneSub:        "Commence par cocher ta première étape.\nBonne installation aux USA !",
    btnReplay:      "↩ Revoir la visite",
    btnClose:       "Fermer",
    progress:       "Étape",
    of:             "sur",
    tabHint_home:       "→ Onglet Accueil",
    tabHint_documents:  "→ Onglet Documents",
    tabHint_explorer:   "→ Onglet Explorer",
    tabHint_profile:    "→ Onglet Profil",
  },
  en: {
    welcomeTitle:   "Your dashboard is ready! 🎉",
    welcomeSub:     "Welcome to Kuabo.",
    welcomeQuestion:"Would you like a guided tour\nto discover the key features?",
    tourList:       "The tour explains:",
    btnYes:         "🚀 Yes, show me!",
    btnNo:          "No thanks, I'll explore",
    btnNext:        "Next →",
    btnFinish:      "Finish tour 🎉",
    btnStop:        "Stop tour",
    doneTitle:      "You're ready! 🎊",
    doneSub:        "Start by checking your first step.\nEnjoy settling in the USA!",
    btnReplay:      "↩ Replay tour",
    btnClose:       "Close",
    progress:       "Step",
    of:             "of",
    tabHint_home:       "→ Home tab",
    tabHint_documents:  "→ Documents tab",
    tabHint_explorer:   "→ Explorer tab",
    tabHint_profile:    "→ Profile tab",
  },
  es: {
    welcomeTitle:   "¡Tu dashboard está listo! 🎉",
    welcomeSub:     "Bienvenido a Kuabo.",
    welcomeQuestion:"¿Quieres una visita guiada\npara descubrir las funciones clave?",
    tourList:       "La visita explica:",
    btnYes:         "🚀 ¡Sí, muéstrame!",
    btnNo:          "No gracias, exploro solo",
    btnNext:        "Siguiente →",
    btnFinish:      "Terminar visita 🎉",
    btnStop:        "Detener visita",
    doneTitle:      "¡Estás listo! 🎊",
    doneSub:        "Empieza marcando tu primer paso.\n¡Buena instalación en EE.UU.!",
    btnReplay:      "↩ Ver de nuevo",
    btnClose:       "Cerrar",
    progress:       "Paso",
    of:             "de",
    tabHint_home:       "→ Pestaña Inicio",
    tabHint_documents:  "→ Pestaña Documentos",
    tabHint_explorer:   "→ Pestaña Explorar",
    tabHint_profile:    "→ Pestaña Perfil",
  },
};

// ══════════════════════════════════════════════
// HOOK — sauvegarder que la démo a été vue
// ══════════════════════════════════════════════
async function markDemoSeen() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    localStorage.setItem("kuabo_demo_seen", "true");
    await updateDoc(doc(db, "users", user.uid), { demoSeen: true });
  } catch {}
}

// ══════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════
type Phase = "welcome" | "demo" | "done" | "hidden";

export default function DemoGuide({
  lang,
  userName,
  onTabChange,
  onHighlight,
}: {
  lang:        Lang;
  userName:    string;
  onTabChange: (tab: string) => void;
  onHighlight: (target: string | null) => void;
}) {
  const [phase,   setPhase]   = useState<Phase>("welcome");
  const [stepIdx, setStepIdx] = useState(0);
  const [animIn,  setAnimIn]  = useState(true);
  const [particles, setParticles] = useState<any[]>([]);

  const t    = UI[lang];
  const step = DEMO_STEPS[stepIdx];
  const isLast = stepIdx === DEMO_STEPS.length - 1;

  // Générer confettis
  useEffect(() => {
    setParticles(Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x:     Math.random() * 100,
      delay: Math.random() * 0.6,
      dur:   1.2 + Math.random() * 0.8,
      color: ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa","#f472b6"][i % 6],
      size:  6 + Math.random() * 8,
    })));
  }, []);

  // Syncer highlight + tab avec l'étape courante
  useEffect(() => {
    if (phase === "demo" && step) {
      onHighlight(step.target);
      if (step.tabHint) onTabChange(step.tabHint);
    } else {
      onHighlight(null);
    }
  }, [phase, stepIdx]);

  const startDemo = () => {
    setPhase("demo");
    setStepIdx(0);
    setAnimIn(true);
  };

  const skipDemo = async () => {
    onHighlight(null);
    onTabChange("home");
    setPhase("hidden");
    await markDemoSeen();
  };

  const goNext = () => {
    setAnimIn(false);
    setTimeout(() => {
      if (isLast) {
        onHighlight(null);
        onTabChange("home");
        setPhase("done");
      } else {
        setStepIdx(i => i + 1);
        setAnimIn(true);
      }
    }, 180);
  };

  const finish = async () => {
    setPhase("hidden");
    await markDemoSeen();
  };

  const replay = () => {
    setPhase("welcome");
    setStepIdx(0);
    onHighlight(null);
    onTabChange("home");
  };

  if (phase === "hidden") return null;

  const firstName = userName.split(" ")[0] || userName;

  return (
    <>
      <style>{`
        @keyframes demoFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes demoPop     { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.05);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes demoSlideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes demoSlideDown { from{transform:translateY(0);opacity:1} to{transform:translateY(20px);opacity:0} }
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes demoGlow    { 0%,100%{box-shadow:0 0 0 0 rgba(232,184,75,0)} 50%{box-shadow:0 0 0 6px rgba(232,184,75,0.15)} }
      `}</style>

      {/* ══════ ÉCRAN BIENVENUE ══════ */}
      {phase === "welcome" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1500,
          background: "rgba(11,15,26,0.94)",
          backdropFilter: "blur(10px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px 20px",
          animation: "demoFadeIn 0.4s ease",
        }}>
          {/* Confettis */}
          {particles.map(p => (
            <div key={p.id} style={{
              position: "fixed", left: p.x + "%", top: "-20px",
              width: p.size, height: p.size, borderRadius: "50%",
              background: p.color, pointerEvents: "none",
              animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
            }}/>
          ))}

          <div style={{ width: "100%", maxWidth: 420, animation: "demoPop 0.5s cubic-bezier(.34,1.56,.64,1)" }}>

            {/* Emoji + titre */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f4f1ec", marginBottom: 6, lineHeight: 1.3 }}>
                {t.welcomeTitle}
              </div>
              <div style={{ fontSize: 14, color: "#aaa", marginBottom: 4 }}>
                {t.welcomeSub}
              </div>
              <div style={{ fontSize: 14, color: "#f4f1ec", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {t.welcomeQuestion.replace(/\n/, " ")}
              </div>
            </div>

            {/* Liste de ce que la visite explique */}
            <div style={{
              background: "rgba(232,184,75,0.06)",
              border: "1px solid rgba(232,184,75,0.18)",
              borderRadius: 14, padding: "14px 16px", marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: "#e8b84b", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>
                {t.tourList}
              </div>
              {DEMO_STEPS.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{s.emoji}</span>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{s.title[lang]}</span>
                </div>
              ))}
            </div>

            {/* Boutons */}
            <button onClick={startDemo} style={{
              width: "100%", padding: "14px",
              background: "#e8b84b", border: "none", borderRadius: 13,
              color: "#000", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", marginBottom: 10,
            }}>
              {t.btnYes}
            </button>
            <button onClick={skipDemo} style={{
              width: "100%", padding: "12px",
              background: "transparent", border: "1px solid #1e2a3a", borderRadius: 13,
              color: "#aaa", fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {t.btnNo}
            </button>
          </div>
        </div>
      )}

      {/* ══════ DÉMO GUIDÉE ══════ */}
      {phase === "demo" && step && (
        <>
          {/* Fond semi-transparent */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 1400,
            background: "rgba(11,15,26,0.6)",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}/>

          {/* Tooltip flottant en bas */}
          <div style={{
            position: "fixed",
            bottom: 80, left: 16, right: 16,
            zIndex: 1500,
            animation: animIn ? "demoSlideUp 0.35s cubic-bezier(.34,1.56,.64,1)" : "demoSlideDown 0.18s ease",
          }}>
            <div style={{
              background: "linear-gradient(135deg,#0f1521,#141d2e)",
              border: "1.5px solid rgba(232,184,75,0.3)",
              borderRadius: 20,
              padding: "20px 18px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(232,184,75,0.08)",
              maxWidth: 480, margin: "0 auto",
            }}>

              {/* Barre de progression */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, display: "flex", gap: 4 }}>
                  {DEMO_STEPS.map((_, i) => (
                    <div key={i} style={{
                      flex: i === stepIdx ? 2 : 1,
                      height: 4, borderRadius: 2,
                      background: i === stepIdx ? "#e8b84b" : i < stepIdx ? "#22c55e" : "#1e2a3a",
                      transition: "all 0.3s",
                    }}/>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>
                  {t.progress} {stepIdx + 1} {t.of} {DEMO_STEPS.length}
                </span>
              </div>

              {/* Tab hint */}
              {step.tabHint && (
                <div style={{
                  fontSize: 10, color: "#2dd4bf", fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase" as const,
                  marginBottom: 8,
                }}>
                  {t[`tabHint_${step.tabHint}` as keyof typeof t]}
                </div>
              )}

              {/* Emoji + titre */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}>
                  {step.emoji}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#f4f1ec", lineHeight: 1.3 }}>
                  {step.title[lang]}
                </div>
              </div>

              {/* Description */}
              <div style={{
                fontSize: 13, color: "rgba(244,241,236,0.75)",
                lineHeight: 1.75, marginBottom: 16,
              }}>
                {step.desc[lang]}
              </div>

              {/* Boutons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={skipDemo} style={{
                  flex: 1, padding: "11px",
                  background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11,
                  color: "#aaa", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  {t.btnStop}
                </button>
                <button onClick={goNext} style={{
                  flex: 2, padding: "11px",
                  background: isLast ? "#22c55e" : "#e8b84b",
                  border: "none", borderRadius: 11,
                  color: "#000", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  {isLast ? t.btnFinish : t.btnNext}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════ ÉCRAN FIN ══════ */}
      {phase === "done" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1500,
          background: "rgba(11,15,26,0.94)",
          backdropFilter: "blur(10px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px 20px",
          animation: "demoFadeIn 0.4s ease",
        }}>
          {/* Confettis fin */}
          {particles.map(p => (
            <div key={p.id} style={{
              position: "fixed", left: p.x + "%", top: "-20px",
              width: p.size, height: p.size, borderRadius: "50%",
              background: p.color, pointerEvents: "none",
              animation: `confettiFall ${p.dur}s ${p.delay * 0.5}s ease-in forwards`,
            }}/>
          ))}

          <div style={{ width: "100%", maxWidth: 380, textAlign: "center", animation: "demoPop 0.5s cubic-bezier(.34,1.56,.64,1)" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎊</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f4f1ec", marginBottom: 10 }}>
              {t.doneTitle}
            </div>
            <div style={{
              fontSize: 13, color: "#aaa", lineHeight: 1.7,
              marginBottom: 28, whiteSpace: "pre-line",
            }}>
              {t.doneSub}
            </div>

            <button onClick={finish} style={{
              width: "100%", padding: "14px",
              background: "#e8b84b", border: "none", borderRadius: 13,
              color: "#000", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", marginBottom: 10,
            }}>
              {t.btnClose} ✨
            </button>
            <button onClick={replay} style={{
              width: "100%", padding: "12px",
              background: "transparent", border: "1px solid #1e2a3a", borderRadius: 13,
              color: "#aaa", fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {t.btnReplay}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
