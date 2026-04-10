"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideVote() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "S'inscrire pour Voter", emoji: "🗳️", phase: "Phase 3 — Croissance",
      why: "ATTENTION : Seuls les citoyens américains peuvent voter aux élections fédérales et d'état. Les résidents permanents (Green Card) NE PEUVENT PAS voter aux élections fédérales. Voter illégalement peut entraîner la déportation et l'annulation de ta Green Card.",
      steps: [{"title": "Vérifie ton éligibilité", "desc": "Tu dois être citoyen américain pour voter aux élections fédérales et d'état. Certaines villes permettent aux résidents permanents de voter aux élections locales — vérifie les lois de ta ville."}, {"title": "Obtiens la citoyenneté d'abord", "desc": "Si tu n'es pas encore citoyen, complète d'abord la Phase 4 (naturalisation). Une fois citoyen, tu peux t'inscrire immédiatement."}, {"title": "Inscris-toi sur vote.gov", "desc": "Va sur vote.gov ou le site de ton état pour t'inscrire. Tu peux aussi t'inscrire au DMV lors du renouvellement de ton permis."}, {"title": "Vérifie ton inscription avant chaque élection", "desc": "Les inscriptions peuvent être annulées si tu déménages et ne mets pas à jour ton adresse. Vérifie ton statut sur le site de ton état."}, {"title": "Vote à chaque élection", "desc": "Présidentielle (tous les 4 ans), mi-mandat (tous les 2 ans), et élections locales. Chaque vote compte !"}],
      docs: ["Certificat de naturalisation (ou passport US)", "Preuve d'adresse", "SSN (parfois requis)"],
      cost: "Gratuit", delay: "Inscription en ligne : immédiate. Confirmation : 1-2 semaines.",
      links: [{"label": "Vote.gov", "url": "https://vote.gov"}, {"label": "Maryland — S'inscrire pour voter", "url": "https://voterservices.elections.maryland.gov/OnlineVoterRegistration/InstructionsStep1"}, {"label": "Can I vote? — Vérifier son statut", "url": "https://www.vote.gov/register/"}],
      tip: "💡 Important : Ne coche JAMAIS la case 'citoyen' sur un formulaire officiel si tu n'as pas encore la citoyenneté. Même une erreur involontaire peut avoir des conséquences graves sur ton statut d'immigration.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Register to Vote", emoji: "🗳️", phase: "Phase 3 — Growth",
      why: "WARNING: Only US citizens can vote in federal and state elections. Permanent residents (Green Card) CANNOT vote in federal elections. Voting illegally can result in deportation and cancellation of your Green Card.",
      steps: [{"title": "Check your eligibility", "desc": "You must be a US citizen to vote in federal and state elections. Some cities allow permanent residents to vote in local elections — check your city's laws."}, {"title": "Get citizenship first", "desc": "If you're not yet a citizen, complete Phase 4 (naturalization) first. Once a citizen, you can register immediately."}, {"title": "Register on vote.gov", "desc": "Go to vote.gov or your state's website to register. You can also register at the DMV when renewing your license."}, {"title": "Check your registration before each election", "desc": "Registrations can be cancelled if you move and don't update your address. Check your status on your state's website."}, {"title": "Vote in every election", "desc": "Presidential (every 4 years), midterm (every 2 years), and local elections. Every vote counts!"}],
      docs: ["Naturalization certificate (or US passport)", "Proof of address", "SSN (sometimes required)"],
      cost: "Free", delay: "Online registration: immediate. Confirmation: 1-2 weeks.",
      links: [{"label": "Vote.gov", "url": "https://vote.gov"}, {"label": "Maryland — S'inscrire pour voter", "url": "https://voterservices.elections.maryland.gov/OnlineVoterRegistration/InstructionsStep1"}, {"label": "Can I vote? — Vérifier son statut", "url": "https://www.vote.gov/register/"}],
      tip: "💡 Important: NEVER check the 'citizen' box on an official form if you don't yet have citizenship. Even an unintentional error can have serious consequences on your immigration status.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Registrarse para Votar", emoji: "🗳️", phase: "Fase 3 — Crecimiento",
      why: "ADVERTENCIA: Solo los ciudadanos americanos pueden votar en las elecciones federales y estatales. Los residentes permanentes (Green Card) NO PUEDEN votar en las elecciones federales. Votar ilegalmente puede resultar en deportación y cancelación de tu Green Card.",
      steps: [{"title": "Verifica tu elegibilidad", "desc": "Debes ser ciudadano americano para votar en las elecciones federales y estatales. Algunas ciudades permiten a los residentes permanentes votar en las elecciones locales — verifica las leyes de tu ciudad."}, {"title": "Obtén la ciudadanía primero", "desc": "Si aún no eres ciudadano, completa primero la Fase 4 (naturalización). Una vez ciudadano, puedes registrarte de inmediato."}, {"title": "Regístrate en vote.gov", "desc": "Ve a vote.gov o al sitio web de tu estado para registrarte. También puedes registrarte en el DMV al renovar tu licencia."}, {"title": "Verifica tu registro antes de cada elección", "desc": "Los registros pueden cancelarse si te mudas y no actualizas tu dirección. Verifica tu estado en el sitio web de tu estado."}, {"title": "Vota en cada elección", "desc": "Presidencial (cada 4 años), a mitad de período (cada 2 años) y elecciones locales. ¡Cada voto cuenta!"}],
      docs: ["Certificado de naturalización (o pasaporte de EE.UU.)", "Prueba de dirección", "SSN (a veces requerido)"],
      cost: "Gratis", delay: "Registro en línea: inmediato. Confirmación: 1-2 semanas.",
      links: [{"label": "Vote.gov", "url": "https://vote.gov"}, {"label": "Maryland — S'inscrire pour voter", "url": "https://voterservices.elections.maryland.gov/OnlineVoterRegistration/InstructionsStep1"}, {"label": "Can I vote? — Vérifier son statut", "url": "https://www.vote.gov/register/"}],
      tip: "💡 Importante: NUNCA marques la casilla 'ciudadano' en un formulario oficial si aún no tienes la ciudadanía. Incluso un error involuntario puede tener graves consecuencias en tu estatus migratorio.",
      done: "✅ Marcar como hecho", undone: "↩️ Quitar", back: "← Volver",
      docsLabel: "Documentos necesarios", stepsLabel: "Pasos", whyLabel: "Por qué es importante",
      costLabel: "Costo", delayLabel: "Plazo", linksLabel: "Enlaces útiles",
    },
  };

  const c = CONTENT[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["fr","en","es"].includes(savedLang)) setLang(savedLang);
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setIsDone((data?.completedSteps || []).includes("vote_register"));
        }
      } catch {}
    });
    return () => unsub();
  }, []);

  const toggle = async () => {
    const user = auth.currentUser; if (!user) return;
    setSaving(true);
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() as any : {};
      const steps: string[] = data?.completedSteps || [];
      const updated = isDone ? steps.filter((s: string) => s !== "vote_register") : [...steps, "vote_register"];
      await updateDoc(doc(db, "users", user.uid), { completedSteps: updated });
      setIsDone(!isDone);
    } catch {} 
    setSaving(false);
  };

  const color = "#a78bfa";

  return (
    <div style={{ background: "#0b0f1a", minHeight: "100dvh", color: "#fff", padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
      <button onClick={() => window.location.href = "/dashboard"} style={{ background: "none", border: "none", color: "#2dd4bf", fontSize: 14, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
        <ChevronLeft size={16} /> {c.back}
      </button>
      <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{c.phase}</div>
      <div style={{ fontSize: 32, marginBottom: 6 }}>{c.emoji}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f4f1ec", marginBottom: 16 }}>{c.title}</div>

      <div style={{ background: "rgba(232,184,75,0.06)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 14, padding: "14px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#e8b84b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>💡 {c.whyLabel}</div>
        <div style={{ fontSize: 13, color: "#f4f1ec", lineHeight: 1.7 }}>{c.why}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>📋 {c.stepsLabel}</div>
        {c.steps.map((step: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${color}15`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>📄 {c.docsLabel}</div>
        {c.docs.map((d: string, i: number) => <div key={i} style={{ fontSize: 12, color: "#f4f1ec", marginBottom: 4 }}>• {d}</div>)}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: "#e8b84b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>💰 {c.costLabel}</div>
          <div style={{ fontSize: 11, color: "#f4f1ec", lineHeight: 1.5 }}>{c.cost}</div>
        </div>
        <div style={{ flex: 1, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: "#2dd4bf", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>⏱ {c.delayLabel}</div>
          <div style={{ fontSize: 11, color: "#f4f1ec", lineHeight: 1.5 }}>{c.delay}</div>
        </div>
      </div>

      <div style={{ background: "rgba(45,212,191,0.05)", border: "1px solid rgba(45,212,191,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#2dd4bf", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🔗 {c.linksLabel}</div>
        {c.links.map((link: any, i: number) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12, color: "#e8b84b", marginBottom: 6, textDecoration: "none" }}>→ {link.label}</a>
        ))}
      </div>

      <div style={{ background: "rgba(232,184,75,0.05)", border: "1px solid rgba(232,184,75,0.18)", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#f4f1ec", lineHeight: 1.7 }}>{c.tip}</div>
      </div>

      <button onClick={toggle} disabled={saving} style={{ width: "100%", padding: "14px", background: isDone ? "#141d2e" : "#22c55e", border: isDone ? "1px solid #1e2a3a" : "none", borderRadius: 14, color: isDone ? "#aaa" : "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
        {saving ? "..." : isDone ? c.undone : c.done}
      </button>
    </div>
  );
}
