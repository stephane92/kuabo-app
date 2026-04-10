"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideInvest() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "Commencer à Investir", emoji: "📈", phase: "Phase 3 — Croissance",
      why: "Investir tôt est la clé de la richesse à long terme grâce aux intérêts composés. $100 investis à 25 ans valent ~$1,700 à 65 ans à 7% de rendement annuel. Les immigrants avec Green Card ont accès aux mêmes investissements que les citoyens.",
      steps: [{"title": "Maximise ton 401(k) employeur", "desc": "Si ton employeur offre un 401(k) avec 'match', contribue au moins jusqu'au match maximum. C'est de l'argent gratuit ! Ex: employeur donne 50% jusqu'à 6% de ton salaire = contribue 6%."}, {"title": "Ouvre un Roth IRA", "desc": "Le Roth IRA te permet d'investir $7,000/an (2024) avec des retraits sans impôts à la retraite. Ouvre-en un sur Fidelity, Vanguard ou Schwab."}, {"title": "Investis dans des ETFs (fonds indiciels)", "desc": "VTI (Vanguard Total Market), VOO (S&P 500), ou VXUS (international). Ces fonds diversifient automatiquement et ont des frais très bas."}, {"title": "Automatise tes investissements", "desc": "Programme des achats automatiques mensuels. Même $50-200/mois fait une énorme différence sur 20-30 ans."}, {"title": "Ne vends jamais en panique", "desc": "Les marchés montent et descendent. Les meilleurs investisseurs ne font rien lors des baisses. 'Time in the market beats timing the market'."}],
      docs: ["SSN", "Compte bancaire US", "Formulaires W-9 (pour les comptes d'investissement)"],
      cost: "Roth IRA, Fidelity, Vanguard : $0 de frais d'ouverture. ETFs : 0.03-0.20% de frais annuels.", delay: "Ouverture de compte : 1-3 jours. Premier investissement : immédiat.",
      links: [{"label": "Fidelity — Roth IRA", "url": "https://www.fidelity.com/retirement-ira/roth-ira"}, {"label": "Vanguard — ETFs", "url": "https://investor.vanguard.com/investment-products/etfs"}, {"label": "Investopedia — ETF pour débutants", "url": "https://www.investopedia.com/terms/e/etf.asp"}],
      tip: "💡 Astuce : La règle des 50/30/20 : 50% de tes revenus pour les dépenses essentielles, 30% pour ce que tu veux, 20% pour l'épargne et l'investissement. Commence petit et augmente progressivement.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Start Investing", emoji: "📈", phase: "Phase 3 — Growth",
      why: "Investing early is the key to long-term wealth through compound interest. $100 invested at 25 is worth ~$1,700 at 65 with 7% annual return. Immigrants with a Green Card have access to the same investments as citizens.",
      steps: [{"title": "Maximize your employer 401(k)", "desc": "If your employer offers a 401(k) with match, contribute at least up to the maximum match. That's free money! Ex: employer gives 50% up to 6% of your salary = contribute 6%."}, {"title": "Open a Roth IRA", "desc": "The Roth IRA lets you invest $7,000/year (2024) with tax-free withdrawals in retirement. Open one on Fidelity, Vanguard, or Schwab."}, {"title": "Invest in ETFs (index funds)", "desc": "VTI (Vanguard Total Market), VOO (S&P 500), or VXUS (international). These funds automatically diversify and have very low fees."}, {"title": "Automate your investments", "desc": "Set up automatic monthly purchases. Even $50-200/month makes a huge difference over 20-30 years."}, {"title": "Never sell in panic", "desc": "Markets go up and down. The best investors do nothing during downturns. 'Time in the market beats timing the market'."}],
      docs: ["SSN", "US bank account", "W-9 forms (for investment accounts)"],
      cost: "Roth IRA, Fidelity, Vanguard: $0 opening fees. ETFs: 0.03-0.20% annual fees.", delay: "Account opening: 1-3 days. First investment: immediate.",
      links: [{"label": "Fidelity — Roth IRA", "url": "https://www.fidelity.com/retirement-ira/roth-ira"}, {"label": "Vanguard — ETFs", "url": "https://investor.vanguard.com/investment-products/etfs"}, {"label": "Investopedia — ETF pour débutants", "url": "https://www.investopedia.com/terms/e/etf.asp"}],
      tip: "💡 Tip: The 50/30/20 rule: 50% of your income for essential expenses, 30% for wants, 20% for savings and investing. Start small and increase gradually.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Empezar a Invertir", emoji: "📈", phase: "Fase 3 — Crecimiento",
      why: "Invertir temprano es la clave de la riqueza a largo plazo gracias al interés compuesto. $100 invertidos a los 25 años valen ~$1,700 a los 65 con un rendimiento anual del 7%. Los inmigrantes con Green Card tienen acceso a las mismas inversiones que los ciudadanos.",
      steps: [{"title": "Maximiza tu 401(k) del empleador", "desc": "Si tu empleador ofrece un 401(k) con 'match', contribuye al menos hasta el match máximo. ¡Es dinero gratis! Ej: el empleador da el 50% hasta el 6% de tu salario = contribuye el 6%."}, {"title": "Abre un Roth IRA", "desc": "El Roth IRA te permite invertir $7,000/año (2024) con retiros libres de impuestos en la jubilación. Abre uno en Fidelity, Vanguard o Schwab."}, {"title": "Invierte en ETFs (fondos indexados)", "desc": "VTI (Vanguard Total Market), VOO (S&P 500), o VXUS (internacional). Estos fondos diversifican automáticamente y tienen comisiones muy bajas."}, {"title": "Automatiza tus inversiones", "desc": "Configura compras automáticas mensuales. Incluso $50-200/mes hace una enorme diferencia en 20-30 años."}, {"title": "Nunca vendas en pánico", "desc": "Los mercados suben y bajan. Los mejores inversores no hacen nada durante las caídas. 'El tiempo en el mercado supera al tiempo del mercado'."}],
      docs: ["SSN", "Cuenta bancaria de EE.UU.", "Formularios W-9 (para cuentas de inversión)"],
      cost: "Roth IRA, Fidelity, Vanguard: $0 de tarifas de apertura. ETFs: 0.03-0.20% de tarifas anuales.", delay: "Apertura de cuenta: 1-3 días. Primera inversión: inmediata.",
      links: [{"label": "Fidelity — Roth IRA", "url": "https://www.fidelity.com/retirement-ira/roth-ira"}, {"label": "Vanguard — ETFs", "url": "https://investor.vanguard.com/investment-products/etfs"}, {"label": "Investopedia — ETF pour débutants", "url": "https://www.investopedia.com/terms/e/etf.asp"}],
      tip: "💡 Consejo: La regla 50/30/20: 50% de tus ingresos para gastos esenciales, 30% para lo que quieres, 20% para ahorros e inversión. Empieza pequeño y aumenta gradualmente.",
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
          setIsDone((data?.completedSteps || []).includes("invest"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "invest") : [...steps, "invest"];
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
