"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideSavings() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "Compte Épargne", emoji: "💰", phase: "Phase 2 — Fondations",
      why: "Un compte épargne avec 3 mois de salaire te protège en cas d'urgence — perte d'emploi, maladie, réparation de voiture. C'est ta bouée de sauvetage financière.",
      steps: [{"title": "Ouvre un High-Yield Savings Account", "desc": "Les meilleurs taux sont en ligne : Marcus by Goldman Sachs, Ally Bank, SoFi offrent 4-5% d'intérêts annuels. Bien mieux qu'un compte courant classique (~0.01%)."}, {"title": "Définis ton objectif d'épargne", "desc": "Calcule 3 mois de tes dépenses essentielles (loyer, nourriture, transport, assurance). C'est ton objectif minimum."}, {"title": "Automatise tes virements", "desc": "Programme un virement automatique dès le jour de ta paie. Même $50-100 par mois est un bon début. 'Pay yourself first'."}, {"title": "Ne touche à cet argent qu'en cas d'urgence", "desc": "Ce n'est pas un compte pour les vacances ou les achats. C'est uniquement pour les vraies urgences."}, {"title": "Augmente progressivement", "desc": "Vise 10% de tes revenus épargnés chaque mois. Une fois les 3 mois atteints, continue pour viser 6 mois."}],
      docs: ["SSN", "Compte bancaire US existant", "Adresse US"],
      cost: "Gratuit — la plupart des HYSA n'ont pas de frais.", delay: "Ouverture en ligne : 10-15 minutes. Activation : 1-3 jours.",
      links: [{"label": "Marcus by Goldman Sachs", "url": "https://www.marcus.com"}, {"label": "Ally Bank", "url": "https://www.ally.com/bank/online-savings-account/"}, {"label": "SoFi Savings", "url": "https://www.sofi.com/banking/savings/"}],
      tip: "💡 Astuce : Un HYSA (High-Yield Savings Account) te rapporte 40-50x plus d'intérêts qu'un compte épargne classique. Sur $5,000 d'épargne, ça peut représenter $200-250 de plus par an.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Savings Account", emoji: "💰", phase: "Phase 2 — Foundations",
      why: "A savings account with 3 months of salary protects you in emergencies — job loss, illness, car repair. It's your financial lifeline.",
      steps: [{"title": "Open a High-Yield Savings Account", "desc": "The best rates are online: Marcus by Goldman Sachs, Ally Bank, SoFi offer 4-5% annual interest. Much better than a regular checking account (~0.01%)."}, {"title": "Set your savings goal", "desc": "Calculate 3 months of your essential expenses (rent, food, transportation, insurance). This is your minimum goal."}, {"title": "Automate your transfers", "desc": "Set up an automatic transfer on payday. Even $50-100 per month is a good start. 'Pay yourself first'."}, {"title": "Only touch this money in real emergencies", "desc": "This is not an account for vacations or purchases. It's only for real emergencies."}, {"title": "Increase gradually", "desc": "Aim to save 10% of your income each month. Once you reach 3 months, continue to aim for 6 months."}],
      docs: ["SSN", "Existing US bank account", "US address"],
      cost: "Free — most HYSA have no fees.", delay: "Online opening: 10-15 minutes. Activation: 1-3 days.",
      links: [{"label": "Marcus by Goldman Sachs", "url": "https://www.marcus.com"}, {"label": "Ally Bank", "url": "https://www.ally.com/bank/online-savings-account/"}, {"label": "SoFi Savings", "url": "https://www.sofi.com/banking/savings/"}],
      tip: "💡 Tip: A HYSA (High-Yield Savings Account) earns you 40-50x more interest than a regular savings account. On $5,000 in savings, that can mean $200-250 more per year.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Cuenta de Ahorros", emoji: "💰", phase: "Fase 2 — Cimientos",
      why: "Una cuenta de ahorros con 3 meses de salario te protege en emergencias — pérdida de empleo, enfermedad, reparación de auto. Es tu salvavidas financiero.",
      steps: [{"title": "Abre una Cuenta de Ahorros de Alto Rendimiento", "desc": "Las mejores tasas son en línea: Marcus by Goldman Sachs, Ally Bank, SoFi ofrecen 4-5% de interés anual. Mucho mejor que una cuenta corriente normal (~0.01%)."}, {"title": "Define tu objetivo de ahorro", "desc": "Calcula 3 meses de tus gastos esenciales (alquiler, comida, transporte, seguro). Este es tu objetivo mínimo."}, {"title": "Automatiza tus transferencias", "desc": "Configura una transferencia automática el día de tu pago. Incluso $50-100 por mes es un buen comienzo. 'Págate primero a ti mismo'."}, {"title": "Solo toca este dinero en verdaderas emergencias", "desc": "No es una cuenta para vacaciones o compras. Es solo para verdaderas emergencias."}, {"title": "Aumenta gradualmente", "desc": "Apunta a ahorrar el 10% de tus ingresos cada mes. Una vez que alcances los 3 meses, continúa apuntando a 6 meses."}],
      docs: ["SSN", "Cuenta bancaria de EE.UU. existente", "Dirección de EE.UU."],
      cost: "Gratis — la mayoría de las HYSA no tienen tarifas.", delay: "Apertura en línea: 10-15 minutos. Activación: 1-3 días.",
      links: [{"label": "Marcus by Goldman Sachs", "url": "https://www.marcus.com"}, {"label": "Ally Bank", "url": "https://www.ally.com/bank/online-savings-account/"}, {"label": "SoFi Savings", "url": "https://www.sofi.com/banking/savings/"}],
      tip: "💡 Consejo: Una HYSA (Cuenta de Ahorros de Alto Rendimiento) te genera 40-50x más intereses que una cuenta de ahorros normal. Con $5,000 de ahorros, eso puede significar $200-250 más por año.",
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
          setIsDone((data?.completedSteps || []).includes("savings_account"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "savings_account") : [...steps, "savings_account"];
      await updateDoc(doc(db, "users", user.uid), { completedSteps: updated });
      setIsDone(!isDone);
    } catch {} 
    setSaving(false);
  };

  const color = "#22c55e";

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
