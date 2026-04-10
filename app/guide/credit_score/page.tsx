"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft, CheckCircle2 } from "lucide-react";

type Lang = "fr" | "en" | "es";

const CONTENT = {
  fr: {
    title: "Credit Score",
    emoji: "📈",
    phase: "Phase 2 — Fondations",
    why: "Un bon credit score (+700) est indispensable aux USA. Il détermine si tu peux louer un appartement, obtenir un prêt voiture, acheter une maison ou même avoir certains emplois.",
    steps: [
      { title: "Ouvre une Secured Credit Card", desc: "Dépose $200-500 comme garantie chez Discover, Capital One ou Bank of America. Cette carte fonctionne comme une carte normale mais utilise ton dépôt comme limite." },
      { title: "Utilise la carte régulièrement", desc: "Fais de petits achats chaque mois (courses, essence). L'objectif est d'utiliser moins de 30% de ta limite — si ta limite est $500, ne dépasse pas $150." },
      { title: "Paie TOUJOURS à temps", desc: "La ponctualité représente 35% de ton score. Mets en place un paiement automatique pour ne jamais oublier. Même un seul retard peut faire chuter ton score de 100 points." },
      { title: "Ne ferme jamais tes comptes anciens", desc: "L'ancienneté de tes comptes compte pour 15% de ton score. Garde ta première carte même si tu ne l'utilises plus." },
      { title: "Vérifie ton score gratuitement", desc: "Utilise Credit Karma, Experian ou le site de ta banque pour suivre ton score chaque mois. Signale toute erreur immédiatement." },
    ],
    docs: ["Secured Credit Card", "Relevés bancaires", "SSN (pour certaines cartes)"],
    cost: "Dépôt initial : $200-500 (remboursé après 12-18 mois de bonne utilisation)",
    delay: "Score initial visible : 3-6 mois. Score 700+ : 12-18 mois",
    links: [
      { label: "Credit Karma (gratuit)", url: "https://www.creditkarma.com" },
      { label: "Discover Secured Card", url: "https://www.discover.com/credit-cards/secured/" },
      { label: "Capital One Secured", url: "https://www.capitalone.com/credit-cards/secured-mastercard/" },
    ],
    tip: "💡 Astuce : Après 12 mois de bonne utilisation, la plupart des banques convertissent automatiquement ta secured card en carte normale et te remboursent ton dépôt.",
    done: "✅ Marquer comme fait",
    undone: "↩️ Retirer",
    back: "← Retour",
  },
  en: {
    title: "Credit Score",
    emoji: "📈",
    phase: "Phase 2 — Foundations",
    why: "A good credit score (+700) is essential in the USA. It determines if you can rent an apartment, get a car loan, buy a house, or even get certain jobs.",
    steps: [
      { title: "Open a Secured Credit Card", desc: "Deposit $200-500 as collateral with Discover, Capital One, or Bank of America. This card works like a normal card but uses your deposit as the limit." },
      { title: "Use the card regularly", desc: "Make small purchases each month (groceries, gas). The goal is to use less than 30% of your limit — if your limit is $500, don't exceed $150." },
      { title: "ALWAYS pay on time", desc: "Punctuality represents 35% of your score. Set up automatic payment so you never forget. Even one late payment can drop your score by 100 points." },
      { title: "Never close old accounts", desc: "Account age counts for 15% of your score. Keep your first card even if you no longer use it." },
      { title: "Check your score for free", desc: "Use Credit Karma, Experian, or your bank's website to track your score each month. Report any errors immediately." },
    ],
    docs: ["Secured Credit Card", "Bank statements", "SSN (for some cards)"],
    cost: "Initial deposit: $200-500 (refunded after 12-18 months of good use)",
    delay: "Initial score visible: 3-6 months. Score 700+: 12-18 months",
    links: [
      { label: "Credit Karma (free)", url: "https://www.creditkarma.com" },
      { label: "Discover Secured Card", url: "https://www.discover.com/credit-cards/secured/" },
      { label: "Capital One Secured", url: "https://www.capitalone.com/credit-cards/secured-mastercard/" },
    ],
    tip: "💡 Tip: After 12 months of good use, most banks automatically convert your secured card to a regular card and refund your deposit.",
    done: "✅ Mark as done",
    undone: "↩️ Remove",
    back: "← Back",
  },
  es: {
    title: "Puntaje de Crédito",
    emoji: "📈",
    phase: "Fase 2 — Cimientos",
    why: "Un buen puntaje de crédito (+700) es esencial en EE.UU. Determina si puedes alquilar un apartamento, obtener un préstamo de auto, comprar una casa o incluso conseguir ciertos trabajos.",
    steps: [
      { title: "Abre una Tarjeta de Crédito Asegurada", desc: "Deposita $200-500 como garantía en Discover, Capital One o Bank of America. Esta tarjeta funciona como una tarjeta normal pero usa tu depósito como límite." },
      { title: "Usa la tarjeta regularmente", desc: "Haz pequeñas compras cada mes (comestibles, gasolina). El objetivo es usar menos del 30% de tu límite — si tu límite es $500, no superes $150." },
      { title: "SIEMPRE paga a tiempo", desc: "La puntualidad representa el 35% de tu puntaje. Configura el pago automático para no olvidar nunca. Incluso un solo pago tardío puede bajar tu puntaje 100 puntos." },
      { title: "Nunca cierres cuentas antiguas", desc: "La antigüedad de las cuentas cuenta el 15% de tu puntaje. Conserva tu primera tarjeta aunque ya no la uses." },
      { title: "Verifica tu puntaje gratis", desc: "Usa Credit Karma, Experian o el sitio web de tu banco para seguir tu puntaje cada mes. Reporta cualquier error de inmediato." },
    ],
    docs: ["Tarjeta de Crédito Asegurada", "Estados de cuenta bancarios", "SSN (para algunas tarjetas)"],
    cost: "Depósito inicial: $200-500 (reembolsado después de 12-18 meses de buen uso)",
    delay: "Puntaje inicial visible: 3-6 meses. Puntaje 700+: 12-18 meses",
    links: [
      { label: "Credit Karma (gratis)", url: "https://www.creditkarma.com" },
      { label: "Discover Secured Card", url: "https://www.discover.com/credit-cards/secured/" },
      { label: "Capital One Secured", url: "https://www.capitalone.com/credit-cards/secured-mastercard/" },
    ],
    tip: "💡 Consejo: Después de 12 meses de buen uso, la mayoría de los bancos convierten automáticamente tu tarjeta asegurada en una tarjeta normal y te reembolsan tu depósito.",
    done: "✅ Marcar como hecho",
    undone: "↩️ Quitar",
    back: "← Volver",
  },
};

export default function GuideCreditScore() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);
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
          setIsDone((data?.completedSteps || []).includes("credit_score"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "credit_score") : [...steps, "credit_score"];
      await updateDoc(doc(db, "users", user.uid), { completedSteps: updated });
      setIsDone(!isDone);
    } catch {}
    setSaving(false);
  };

  return (
    <div style={{ background: "#0b0f1a", minHeight: "100dvh", color: "#fff", padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
      <button onClick={() => window.location.href = "/dashboard"} style={{ background: "none", border: "none", color: "#2dd4bf", fontSize: 14, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
        <ChevronLeft size={16} /> {c.back}
      </button>
      <div style={{ fontSize: 10, color: "#2dd4bf", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{c.phase}</div>
      <div style={{ fontSize: 32, marginBottom: 6 }}>{c.emoji}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f4f1ec", marginBottom: 16 }}>{c.title}</div>

      <div style={{ background: "rgba(232,184,75,0.06)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 14, padding: "14px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#e8b84b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>💡 Pourquoi c'est important</div>
        <div style={{ fontSize: 13, color: "#f4f1ec", lineHeight: 1.7 }}>{c.why}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>📋 Étapes</div>
        {c.steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#2dd4bf", flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>📄 Documents nécessaires</div>
        {c.docs.map((d, i) => <div key={i} style={{ fontSize: 12, color: "#f4f1ec", marginBottom: 4 }}>• {d}</div>)}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: "#e8b84b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>💰 Coût</div>
          <div style={{ fontSize: 11, color: "#f4f1ec", lineHeight: 1.5 }}>{c.cost}</div>
        </div>
        <div style={{ flex: 1, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: "#2dd4bf", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>⏱ Délai</div>
          <div style={{ fontSize: 11, color: "#f4f1ec", lineHeight: 1.5 }}>{c.delay}</div>
        </div>
      </div>

      <div style={{ background: "rgba(45,212,191,0.05)", border: "1px solid rgba(45,212,191,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#2dd4bf", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🔗 Liens utiles</div>
        {c.links.map((link, i) => (
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
