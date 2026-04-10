"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideBuyHouse() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "Acheter une Maison", emoji: "🏡", phase: "Phase 3 — Croissance",
      why: "Acheter une maison aux USA est le meilleur investissement à long terme. Tu construis du patrimoine au lieu de payer un loyer qui n'enrichit que ton propriétaire. Les immigrants avec Green Card ont les mêmes droits que les citoyens pour l'achat immobilier.",
      steps: [{"title": "Améliore ton credit score à 700+", "desc": "Un score de 700+ te donne accès aux meilleurs taux hypothécaires. Avec un score de 620-680, tu peux quand même obtenir un prêt FHA avec seulement 3.5% de mise de fonds."}, {"title": "Économise pour la mise de fonds (Down Payment)", "desc": "Conventionnel : 20% du prix (évite l'assurance PMI). FHA : 3.5% minimum. VA (Army) : 0% pour les militaires. Sur une maison de $300,000, 20% = $60,000."}, {"title": "Obtiens une pré-approbation hypothécaire", "desc": "Va voir une banque ou un courtier hypothécaire avec ton W-2, relevés bancaires et SSN. La pré-approbation montre aux vendeurs que tu es un acheteur sérieux."}, {"title": "Trouve un agent immobilier", "desc": "Un bon agent immobilier est gratuit pour l'acheteur (le vendeur paie sa commission). Il te guide dans toutes les démarches."}, {"title": "Fais une offre et signe le contrat", "desc": "Ton agent t'aide à négocier le prix. Une fois l'offre acceptée, tu as ~30-45 jours pour finaliser le prêt et faire l'inspection de la maison."}, {"title": "Closing Day — tu reçois les clés !", "desc": "Le jour du closing, tu signes tous les documents, verses les fonds restants et reçois les clés. Tu es propriétaire !"}],
      docs: ["Green Card", "SSN", "W-2 des 2 dernières années", "Relevés bancaires (3 mois)", "Pré-approbation hypothécaire"],
      cost: "Mise de fonds : 3.5-20% du prix. Frais de closing : 2-5% du prix. Inspection : $300-500.", delay: "Recherche : 1-6 mois. Processus d'achat : 30-60 jours après l'offre acceptée.",
      links: [{"label": "Zillow — Trouver une maison", "url": "https://www.zillow.com"}, {"label": "Realtor.com", "url": "https://www.realtor.com"}, {"label": "FHA Loan Info", "url": "https://www.hud.gov/buying/loans"}],
      tip: "💡 Astuce Army : Si tu es dans l'US Army, tu as accès aux prêts VA avec 0% de mise de fonds et sans assurance PMI. C'est l'un des meilleurs avantages militaires !",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Buy a House", emoji: "🏡", phase: "Phase 3 — Growth",
      why: "Buying a house in the USA is the best long-term investment. You build wealth instead of paying rent that only enriches your landlord. Immigrants with a Green Card have the same rights as citizens for real estate purchases.",
      steps: [{"title": "Improve your credit score to 700+", "desc": "A score of 700+ gives you access to the best mortgage rates. With a score of 620-680, you can still get an FHA loan with only 3.5% down payment."}, {"title": "Save for the down payment", "desc": "Conventional: 20% of price (avoids PMI insurance). FHA: 3.5% minimum. VA (Army): 0% for military. On a $300,000 house, 20% = $60,000."}, {"title": "Get a mortgage pre-approval", "desc": "Visit a bank or mortgage broker with your W-2, bank statements and SSN. Pre-approval shows sellers you're a serious buyer."}, {"title": "Find a real estate agent", "desc": "A good real estate agent is free for the buyer (the seller pays their commission). They guide you through all the steps."}, {"title": "Make an offer and sign the contract", "desc": "Your agent helps you negotiate the price. Once the offer is accepted, you have ~30-45 days to finalize the loan and have the house inspected."}, {"title": "Closing Day — you get the keys!", "desc": "On closing day, you sign all documents, pay the remaining funds, and receive the keys. You're a homeowner!"}],
      docs: ["Green Card", "SSN", "W-2 from the last 2 years", "Bank statements (3 months)", "Mortgage pre-approval"],
      cost: "Down payment: 3.5-20% of price. Closing costs: 2-5% of price. Inspection: $300-500.", delay: "Search: 1-6 months. Purchase process: 30-60 days after accepted offer.",
      links: [{"label": "Zillow — Trouver une maison", "url": "https://www.zillow.com"}, {"label": "Realtor.com", "url": "https://www.realtor.com"}, {"label": "FHA Loan Info", "url": "https://www.hud.gov/buying/loans"}],
      tip: "💡 Army Tip: If you're in the US Army, you have access to VA loans with 0% down payment and no PMI insurance. This is one of the best military benefits!",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Comprar una Casa", emoji: "🏡", phase: "Fase 3 — Crecimiento",
      why: "Comprar una casa en EE.UU. es la mejor inversión a largo plazo. Construyes patrimonio en lugar de pagar un alquiler que solo enriquece a tu propietario. Los inmigrantes con Green Card tienen los mismos derechos que los ciudadanos para comprar bienes raíces.",
      steps: [{"title": "Mejora tu puntaje de crédito a 700+", "desc": "Un puntaje de 700+ te da acceso a las mejores tasas hipotecarias. Con un puntaje de 620-680, aún puedes obtener un préstamo FHA con solo el 3.5% de enganche."}, {"title": "Ahorra para el enganche (Down Payment)", "desc": "Convencional: 20% del precio (evita el seguro PMI). FHA: mínimo 3.5%. VA (Army): 0% para militares. En una casa de $300,000, 20% = $60,000."}, {"title": "Obtén una preaprobación hipotecaria", "desc": "Ve a un banco o corredor hipotecario con tu W-2, estados de cuenta y SSN. La preaprobación muestra a los vendedores que eres un comprador serio."}, {"title": "Encuentra un agente de bienes raíces", "desc": "Un buen agente de bienes raíces es gratis para el comprador (el vendedor paga su comisión). Te guía en todos los trámites."}, {"title": "Haz una oferta y firma el contrato", "desc": "Tu agente te ayuda a negociar el precio. Una vez aceptada la oferta, tienes ~30-45 días para finalizar el préstamo y hacer la inspección de la casa."}, {"title": "Día de Cierre — ¡recibes las llaves!", "desc": "En el día de cierre, firmas todos los documentos, pagas los fondos restantes y recibes las llaves. ¡Eres propietario!"}],
      docs: ["Green Card", "SSN", "W-2 de los últimos 2 años", "Estados de cuenta bancarios (3 meses)", "Preaprobación hipotecaria"],
      cost: "Enganche: 3.5-20% del precio. Costos de cierre: 2-5% del precio. Inspección: $300-500.", delay: "Búsqueda: 1-6 meses. Proceso de compra: 30-60 días después de la oferta aceptada.",
      links: [{"label": "Zillow — Trouver une maison", "url": "https://www.zillow.com"}, {"label": "Realtor.com", "url": "https://www.realtor.com"}, {"label": "FHA Loan Info", "url": "https://www.hud.gov/buying/loans"}],
      tip: "💡 Consejo Army: Si estás en el US Army, tienes acceso a préstamos VA con 0% de enganche y sin seguro PMI. ¡Este es uno de los mejores beneficios militares!",
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
          setIsDone((data?.completedSteps || []).includes("buy_house"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "buy_house") : [...steps, "buy_house"];
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
