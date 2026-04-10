"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideDiploma() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "Reconnaissance de Diplôme", emoji: "🎓", phase: "Phase 2 — Fondations",
      why: "Ton diplôme étranger doit être évalué et reconnu pour accéder aux emplois qualifiés aux USA. WES et ECE sont les organismes les plus reconnus.",
      steps: [{"title": "Rassemble tes diplômes originaux", "desc": "Collecte tes diplômes, relevés de notes officiels et certificats. Ils doivent être officiels (tamponnés par l'université)."}, {"title": "Fais traduire tes documents", "desc": "Si tes documents ne sont pas en anglais, fais-les traduire par un traducteur certifié. Coût : $50-150 par document."}, {"title": "Soumets ta demande à WES ou ECE", "desc": "WES (World Education Services) est le plus utilisé. Crée un compte sur wes.org, choisis le type d'évaluation et envoie tes documents."}, {"title": "Attends l'évaluation", "desc": "WES envoie un rapport d'équivalence qui compare ton diplôme aux standards américains. Ce rapport est accepté par la plupart des employeurs et universités."}, {"title": "Utilise ton rapport pour postuler", "desc": "Inclus le rapport WES/ECE dans tes candidatures d'emploi ou demandes d'admission universitaire."}],
      docs: ["Diplômes originaux", "Relevés de notes officiels", "Traductions certifiées", "SSN ou passeport"],
      cost: "WES : $100-250 selon le type d'évaluation. Traduction : $50-150/document.", delay: "7 jours (express) à 7 semaines (standard).",
      links: [{"label": "WES — World Education Services", "url": "https://www.wes.org"}, {"label": "ECE — Educational Credential Evaluators", "url": "https://www.ece.org"}, {"label": "NACES — Liste évaluateurs agréés", "url": "https://www.naces.org"}],
      tip: "💡 Astuce : Certains employeurs ou écoles ont leur propre liste d'organismes acceptés. Vérifie d'abord quelle organisation ils préfèrent avant de commander ton évaluation.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Degree Recognition", emoji: "🎓", phase: "Phase 2 — Foundations",
      why: "Your foreign degree must be evaluated and recognized to access qualified jobs in the USA. WES and ECE are the most recognized organizations.",
      steps: [{"title": "Gather your original diplomas", "desc": "Collect your diplomas, official transcripts and certificates. They must be official (stamped by the university)."}, {"title": "Have your documents translated", "desc": "If your documents are not in English, have them translated by a certified translator. Cost: $50-150 per document."}, {"title": "Submit your application to WES or ECE", "desc": "WES (World Education Services) is the most widely used. Create an account on wes.org, choose the evaluation type and send your documents."}, {"title": "Wait for the evaluation", "desc": "WES sends an equivalency report comparing your degree to American standards. This report is accepted by most employers and universities."}, {"title": "Use your report to apply", "desc": "Include the WES/ECE report in your job applications or university admission requests."}],
      docs: ["Original diplomas", "Official transcripts", "Certified translations", "SSN or passport"],
      cost: "WES: $100-250 depending on evaluation type. Translation: $50-150/document.", delay: "7 days (express) to 7 weeks (standard).",
      links: [{"label": "WES — World Education Services", "url": "https://www.wes.org"}, {"label": "ECE — Educational Credential Evaluators", "url": "https://www.ece.org"}, {"label": "NACES — Liste évaluateurs agréés", "url": "https://www.naces.org"}],
      tip: "💡 Tip: Some employers or schools have their own list of accepted organizations. Check first which organization they prefer before ordering your evaluation.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Reconocimiento de Título", emoji: "🎓", phase: "Fase 2 — Cimientos",
      why: "Tu título extranjero debe ser evaluado y reconocido para acceder a empleos calificados en EE.UU. WES y ECE son las organizaciones más reconocidas.",
      steps: [{"title": "Reúne tus diplomas originales", "desc": "Recopila tus diplomas, expedientes académicos oficiales y certificados. Deben ser oficiales (sellados por la universidad)."}, {"title": "Haz traducir tus documentos", "desc": "Si tus documentos no están en inglés, hazlos traducir por un traductor certificado. Costo: $50-150 por documento."}, {"title": "Presenta tu solicitud a WES o ECE", "desc": "WES (World Education Services) es el más utilizado. Crea una cuenta en wes.org, elige el tipo de evaluación y envía tus documentos."}, {"title": "Espera la evaluación", "desc": "WES envía un informe de equivalencia que compara tu título con los estándares americanos. Este informe es aceptado por la mayoría de empleadores y universidades."}, {"title": "Usa tu informe para postular", "desc": "Incluye el informe WES/ECE en tus solicitudes de empleo o admisión universitaria."}],
      docs: ["Diplomas originales", "Expedientes académicos oficiales", "Traducciones certificadas", "SSN o pasaporte"],
      cost: "WES: $100-250 según el tipo de evaluación. Traducción: $50-150/documento.", delay: "7 días (exprés) a 7 semanas (estándar).",
      links: [{"label": "WES — World Education Services", "url": "https://www.wes.org"}, {"label": "ECE — Educational Credential Evaluators", "url": "https://www.ece.org"}, {"label": "NACES — Liste évaluateurs agréés", "url": "https://www.naces.org"}],
      tip: "💡 Consejo: Algunos empleadores o escuelas tienen su propia lista de organizaciones aceptadas. Verifica primero qué organización prefieren antes de pedir tu evaluación.",
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
          setIsDone((data?.completedSteps || []).includes("diploma_recognition"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "diploma_recognition") : [...steps, "diploma_recognition"];
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
