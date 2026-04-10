"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideHealthInsurance() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "Assurance Santé", emoji: "🏥", phase: "Phase 2 — Fondations",
      why: "Une seule visite aux urgences sans assurance peut coûter $5,000 à $30,000. L'assurance santé est indispensable pour protéger ta santé et tes finances.",
      steps: [{"title": "Vérifie si ton employeur offre une assurance", "desc": "La plupart des employeurs à temps plein offrent une assurance santé. C'est souvent la meilleure option car l'employeur paye une partie de la prime."}, {"title": "Explore le Health Insurance Marketplace", "desc": "Va sur healthcare.gov pour comparer les plans disponibles. L'inscription est ouverte en novembre-décembre pour janvier, ou lors d'un événement qualifiant (nouvel emploi, mariage, naissance)."}, {"title": "Vérifie ton éligibilité à Medicaid", "desc": "Si tes revenus sont bas (<138% du niveau de pauvreté fédérale), tu peux avoir droit à Medicaid gratuit. Va sur medicaid.gov pour vérifier."}, {"title": "Compare les plans (HMO vs PPO)", "desc": "HMO = moins cher mais médecins limités. PPO = plus cher mais plus de flexibilité. Choisis selon tes besoins médicaux et ton budget."}, {"title": "Souscris et active ton assurance", "desc": "Une fois inscrit, paye ta première prime pour activer ta couverture. Garde ta carte d'assurance avec toi en permanence."}],
      docs: ["SSN", "Preuve de revenus (W-2 ou paystubs)", "Preuve de résidence", "Preuve de statut légal (Green Card)"],
      cost: "Employeur : $0-300/mois (ta part). Marketplace : $100-500/mois. Medicaid : gratuit.", delay: "Activation : 1-30 jours après inscription.",
      links: [{"label": "healthcare.gov", "url": "https://www.healthcare.gov"}, {"label": "Medicaid.gov", "url": "https://www.medicaid.gov"}, {"label": "Find a doctor", "url": "https://www.healthcare.gov/find-provider/"}],
      tip: "💡 Astuce : Si tu viens de perdre ton emploi ou d'arriver aux USA, tu as 60 jours pour t'inscrire hors de la période ouverte — c'est un 'Special Enrollment Period'.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Health Insurance", emoji: "🏥", phase: "Phase 2 — Foundations",
      why: "A single emergency room visit without insurance can cost $5,000 to $30,000. Health insurance is essential to protect your health and finances.",
      steps: [{"title": "Check if your employer offers insurance", "desc": "Most full-time employers offer health insurance. This is often the best option as the employer pays part of the premium."}, {"title": "Explore the Health Insurance Marketplace", "desc": "Go to healthcare.gov to compare available plans. Open enrollment is in November-December for January, or during a qualifying event (new job, marriage, birth)."}, {"title": "Check your Medicaid eligibility", "desc": "If your income is low (<138% of the federal poverty level), you may qualify for free Medicaid. Go to medicaid.gov to check."}, {"title": "Compare plans (HMO vs PPO)", "desc": "HMO = cheaper but limited doctors. PPO = more expensive but more flexibility. Choose based on your medical needs and budget."}, {"title": "Enroll and activate your insurance", "desc": "Once enrolled, pay your first premium to activate your coverage. Keep your insurance card with you at all times."}],
      docs: ["SSN", "Proof of income (W-2 or paystubs)", "Proof of residence", "Proof of legal status (Green Card)"],
      cost: "Employer: $0-300/month (your share). Marketplace: $100-500/month. Medicaid: free.", delay: "Activation: 1-30 days after enrollment.",
      links: [{"label": "healthcare.gov", "url": "https://www.healthcare.gov"}, {"label": "Medicaid.gov", "url": "https://www.medicaid.gov"}, {"label": "Find a doctor", "url": "https://www.healthcare.gov/find-provider/"}],
      tip: "💡 Tip: If you just lost your job or arrived in the USA, you have 60 days to enroll outside the open period — this is a 'Special Enrollment Period'.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Seguro de Salud", emoji: "🏥", phase: "Fase 2 — Cimientos",
      why: "Una sola visita a urgencias sin seguro puede costar $5,000 a $30,000. El seguro de salud es indispensable para proteger tu salud y finanzas.",
      steps: [{"title": "Verifica si tu empleador ofrece seguro", "desc": "La mayoría de empleadores a tiempo completo ofrecen seguro médico. Esta suele ser la mejor opción ya que el empleador paga parte de la prima."}, {"title": "Explora el Mercado de Seguros de Salud", "desc": "Ve a healthcare.gov para comparar los planes disponibles. La inscripción abierta es en noviembre-diciembre para enero, o durante un evento calificador."}, {"title": "Verifica tu elegibilidad para Medicaid", "desc": "Si tus ingresos son bajos (<138% del nivel de pobreza federal), puedes calificar para Medicaid gratis. Ve a medicaid.gov para verificar."}, {"title": "Compara los planes (HMO vs PPO)", "desc": "HMO = más barato pero médicos limitados. PPO = más caro pero más flexibilidad. Elige según tus necesidades médicas y presupuesto."}, {"title": "Inscríbete y activa tu seguro", "desc": "Una vez inscrito, paga tu primera prima para activar tu cobertura. Lleva tu tarjeta de seguro contigo en todo momento."}],
      docs: ["SSN", "Prueba de ingresos (W-2 o talones de pago)", "Prueba de residencia", "Prueba de estatus legal (Green Card)"],
      cost: "Empleador: $0-300/mes (tu parte). Marketplace: $100-500/mes. Medicaid: gratis.", delay: "Activación: 1-30 días después de la inscripción.",
      links: [{"label": "healthcare.gov", "url": "https://www.healthcare.gov"}, {"label": "Medicaid.gov", "url": "https://www.medicaid.gov"}, {"label": "Find a doctor", "url": "https://www.healthcare.gov/find-provider/"}],
      tip: "💡 Consejo: Si acabas de perder tu trabajo o llegaste a EE.UU., tienes 60 días para inscribirte fuera del período abierto — esto se llama 'Período de Inscripción Especial'.",
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
          setIsDone((data?.completedSteps || []).includes("health_insurance"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "health_insurance") : [...steps, "health_insurance"];
      await updateDoc(doc(db, "users", user.uid), { completedSteps: updated });
      setIsDone(!isDone);
    } catch {} 
    setSaving(false);
  };

  const color = "#ef4444";

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
