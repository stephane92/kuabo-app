"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideLlc() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "Créer une LLC", emoji: "🏢", phase: "Phase 3 — Croissance",
      why: "Une LLC (Limited Liability Company) te protège personnellement — si ton entreprise a des dettes ou des problèmes légaux, tes biens personnels sont protégés. C'est aussi plus crédible professionnellement et offre des avantages fiscaux.",
      steps: [{"title": "Choisis un nom pour ta LLC", "desc": "Le nom doit être unique dans ton état. Vérifie la disponibilité sur le site du Secretary of State de ton état. Le nom doit inclure 'LLC' ou 'L.L.C.'."}, {"title": "Choisis un Registered Agent", "desc": "C'est une personne ou entreprise qui reçoit les documents officiels en ton nom. Tu peux être ton propre agent ou utiliser un service (~$50-150/an)."}, {"title": "Dépose tes Articles of Organization", "desc": "Va sur le site du Secretary of State de ton état (Maryland : dat.maryland.gov) et soumets les Articles of Organization. Paye les frais d'enregistrement."}, {"title": "Obtiens ton EIN (numéro fiscal d'entreprise)", "desc": "L'EIN est le SSN de ton entreprise. Demande-le gratuitement sur irs.gov. Tu en as besoin pour ouvrir un compte bancaire d'entreprise et payer des impôts."}, {"title": "Ouvre un compte bancaire d'entreprise", "desc": "Garde TOUJOURS tes finances personnelles et professionnelles séparées. Ouvre un compte bancaire au nom de ta LLC."}],
      docs: ["SSN ou ITIN", "Adresse US", "Nom de ta LLC (vérifié)", "Frais d'enregistrement"],
      cost: "Maryland : $100 (Articles of Organization) + $300/an (rapport annuel). EIN : gratuit.", delay: "Enregistrement en ligne : 1-5 jours ouvrables. EIN : immédiat en ligne.",
      links: [{"label": "Maryland SDAT — Enregistrer une LLC", "url": "https://dat.maryland.gov/businesses"}, {"label": "IRS — Obtenir un EIN", "url": "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"}, {"label": "LegalZoom — LLC", "url": "https://www.legalzoom.com/business/business-formation/llc-overview.html"}],
      tip: "💡 Astuce : Tu peux créer une LLC même si tu as une Green Card — pas besoin d'être citoyen. Les immigrants peuvent être propriétaires à 100% d'une LLC aux USA.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Create an LLC", emoji: "🏢", phase: "Phase 3 — Growth",
      why: "An LLC (Limited Liability Company) protects you personally — if your business has debts or legal problems, your personal assets are protected. It's also more professional and offers tax advantages.",
      steps: [{"title": "Choose a name for your LLC", "desc": "The name must be unique in your state. Check availability on your state's Secretary of State website. The name must include 'LLC' or 'L.L.C.'."}, {"title": "Choose a Registered Agent", "desc": "This is a person or company that receives official documents on your behalf. You can be your own agent or use a service (~$50-150/year)."}, {"title": "File your Articles of Organization", "desc": "Go to your state's Secretary of State website (Maryland: dat.maryland.gov) and submit the Articles of Organization. Pay the registration fees."}, {"title": "Get your EIN (business tax number)", "desc": "The EIN is your business's SSN. Request it for free on irs.gov. You need it to open a business bank account and pay taxes."}, {"title": "Open a business bank account", "desc": "ALWAYS keep your personal and business finances separate. Open a bank account in your LLC's name."}],
      docs: ["SSN or ITIN", "US address", "Your LLC name (verified)", "Registration fees"],
      cost: "Maryland: $100 (Articles of Organization) + $300/year (annual report). EIN: free.", delay: "Online registration: 1-5 business days. EIN: immediate online.",
      links: [{"label": "Maryland SDAT — Enregistrer une LLC", "url": "https://dat.maryland.gov/businesses"}, {"label": "IRS — Obtenir un EIN", "url": "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"}, {"label": "LegalZoom — LLC", "url": "https://www.legalzoom.com/business/business-formation/llc-overview.html"}],
      tip: "💡 Tip: You can create an LLC even with a Green Card — no need to be a citizen. Immigrants can be 100% owners of an LLC in the USA.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Crear una LLC", emoji: "🏢", phase: "Fase 3 — Crecimiento",
      why: "Una LLC (Limited Liability Company) te protege personalmente — si tu empresa tiene deudas o problemas legales, tus bienes personales están protegidos. También es más profesional y ofrece ventajas fiscales.",
      steps: [{"title": "Elige un nombre para tu LLC", "desc": "El nombre debe ser único en tu estado. Verifica la disponibilidad en el sitio web del Secretario de Estado de tu estado. El nombre debe incluir 'LLC' o 'L.L.C.'."}, {"title": "Elige un Agente Registrado", "desc": "Es una persona o empresa que recibe documentos oficiales en tu nombre. Puedes ser tu propio agente o usar un servicio (~$50-150/año)."}, {"title": "Presenta tus Artículos de Organización", "desc": "Ve al sitio web del Secretario de Estado de tu estado (Maryland: dat.maryland.gov) y presenta los Artículos de Organización. Paga las tarifas de registro."}, {"title": "Obtén tu EIN (número fiscal empresarial)", "desc": "El EIN es el SSN de tu empresa. Solicítalo gratis en irs.gov. Lo necesitas para abrir una cuenta bancaria empresarial y pagar impuestos."}, {"title": "Abre una cuenta bancaria empresarial", "desc": "SIEMPRE mantén tus finanzas personales y empresariales separadas. Abre una cuenta bancaria a nombre de tu LLC."}],
      docs: ["SSN o ITIN", "Dirección de EE.UU.", "Nombre de tu LLC (verificado)", "Tarifas de registro"],
      cost: "Maryland: $100 (Artículos de Organización) + $300/año (informe anual). EIN: gratis.", delay: "Registro en línea: 1-5 días hábiles. EIN: inmediato en línea.",
      links: [{"label": "Maryland SDAT — Enregistrer une LLC", "url": "https://dat.maryland.gov/businesses"}, {"label": "IRS — Obtenir un EIN", "url": "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"}, {"label": "LegalZoom — LLC", "url": "https://www.legalzoom.com/business/business-formation/llc-overview.html"}],
      tip: "💡 Consejo: Puedes crear una LLC incluso con una Green Card — no necesitas ser ciudadano. Los inmigrantes pueden ser dueños al 100% de una LLC en EE.UU.",
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
          setIsDone((data?.completedSteps || []).includes("create_llc"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "create_llc") : [...steps, "create_llc"];
      await updateDoc(doc(db, "users", user.uid), { completedSteps: updated });
      setIsDone(!isDone);
    } catch {} 
    setSaving(false);
  };

  const color = "#2dd4bf";

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
