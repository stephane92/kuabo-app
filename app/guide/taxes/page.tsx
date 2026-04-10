"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

const CONTENT = {
  fr: {
    title: "Taxes IRS",
    emoji: "📊",
    phase: "Phase 2 — Fondations",
    why: "Déclarer tes impôts avant le 15 avril est une obligation légale aux USA. Ne pas le faire peut entraîner des pénalités, des intérêts et des problèmes avec l'USCIS lors du renouvellement de ta Green Card ou de la naturalisation.",
    steps: [
      { title: "Rassemble tes documents", desc: "Collecte ton W-2 (fourni par ton employeur avant le 31 janvier), ton SSN, et tout document de revenus (1099 si tu es freelance, intérêts bancaires, etc.)." },
      { title: "Choisis une méthode de déclaration", desc: "Gratuit : IRS Free File (si revenus < $73,000). Payant : TurboTax, H&R Block, TaxAct (~$50-100). Ou un comptable (CPA) si ta situation est complexe." },
      { title: "Remplis ta déclaration", desc: "Tu as besoin du formulaire 1040. Si c'est ta première déclaration aux USA, coche la case pour les non-résidents ou résidents de première année. Déclare TOUS tes revenus mondiaux." },
      { title: "Soumets avant le 15 avril", desc: "La deadline est le 15 avril chaque année. Si tu as besoin de plus de temps, demande une extension automatique (formulaire 4868) — mais tu dois quand même payer l'impôt estimé." },
      { title: "Conserve tes déclarations", desc: "Garde une copie de chaque déclaration pendant au moins 7 ans. L'USCIS peut te les demander lors de la naturalisation." },
    ],
    docs: ["Formulaire W-2 (de ton employeur)", "SSN", "Formulaire 1099 (si freelance)", "Déclarations des années précédentes"],
    cost: "IRS Free File : gratuit. TurboTax/H&R Block : $50-150. Comptable : $150-300+",
    delay: "Deadline : 15 avril chaque année. Extension possible jusqu'au 15 octobre.",
    links: [
      { label: "IRS Free File", url: "https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free" },
      { label: "TurboTax", url: "https://turbotax.intuit.com" },
      { label: "IRS — Formulaires officiels", url: "https://www.irs.gov/forms-instructions" },
    ],
    tip: "💡 Astuce : Si tu as travaillé peu ou eu peu de revenus, tu peux avoir droit à un remboursement (refund). Beaucoup d'immigrants reçoivent $500-2000 de remboursement leur première année !",
    done: "✅ Marquer comme fait",
    undone: "↩️ Retirer",
    back: "← Retour",
    stepId: "taxes_first",
  },
  en: {
    title: "IRS Taxes",
    emoji: "📊",
    phase: "Phase 2 — Foundations",
    why: "Filing your taxes before April 15 is a legal obligation in the USA. Failing to do so can result in penalties, interest, and problems with USCIS when renewing your Green Card or applying for naturalization.",
    steps: [
      { title: "Gather your documents", desc: "Collect your W-2 (provided by your employer before January 31), your SSN, and any income documents (1099 if self-employed, bank interest, etc.)." },
      { title: "Choose a filing method", desc: "Free: IRS Free File (if income < $73,000). Paid: TurboTax, H&R Block, TaxAct (~$50-100). Or a CPA accountant if your situation is complex." },
      { title: "Complete your return", desc: "You need Form 1040. If this is your first US tax return, check the box for non-residents or first-year residents. Report ALL your worldwide income." },
      { title: "Submit before April 15", desc: "The deadline is April 15 every year. If you need more time, request an automatic extension (Form 4868) — but you must still pay the estimated tax." },
      { title: "Keep your returns", desc: "Keep a copy of each return for at least 7 years. USCIS may ask for them during naturalization." },
    ],
    docs: ["Form W-2 (from your employer)", "SSN", "Form 1099 (if self-employed)", "Previous year returns"],
    cost: "IRS Free File: free. TurboTax/H&R Block: $50-150. Accountant: $150-300+",
    delay: "Deadline: April 15 every year. Extension possible until October 15.",
    links: [
      { label: "IRS Free File", url: "https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free" },
      { label: "TurboTax", url: "https://turbotax.intuit.com" },
      { label: "IRS — Official Forms", url: "https://www.irs.gov/forms-instructions" },
    ],
    tip: "💡 Tip: If you worked little or had low income, you may be entitled to a refund. Many immigrants receive $500-2000 in refunds in their first year!",
    done: "✅ Mark as done",
    undone: "↩️ Remove",
    back: "← Back",
    stepId: "taxes_first",
  },
  es: {
    title: "Impuestos IRS",
    emoji: "📊",
    phase: "Fase 2 — Cimientos",
    why: "Declarar tus impuestos antes del 15 de abril es una obligación legal en EE.UU. No hacerlo puede resultar en multas, intereses y problemas con USCIS al renovar tu Green Card o solicitar la naturalización.",
    steps: [
      { title: "Reúne tus documentos", desc: "Recopila tu W-2 (proporcionado por tu empleador antes del 31 de enero), tu SSN y cualquier documento de ingresos (1099 si eres autónomo, intereses bancarios, etc.)." },
      { title: "Elige un método de declaración", desc: "Gratis: IRS Free File (si ingresos < $73,000). De pago: TurboTax, H&R Block, TaxAct (~$50-100). O un contador (CPA) si tu situación es compleja." },
      { title: "Completa tu declaración", desc: "Necesitas el Formulario 1040. Si esta es tu primera declaración en EE.UU., marca la casilla para no residentes o residentes de primer año. Declara TODOS tus ingresos mundiales." },
      { title: "Presenta antes del 15 de abril", desc: "La fecha límite es el 15 de abril cada año. Si necesitas más tiempo, solicita una extensión automática (Formulario 4868) — pero debes pagar el impuesto estimado." },
      { title: "Conserva tus declaraciones", desc: "Guarda una copia de cada declaración durante al menos 7 años. USCIS puede pedirlas durante la naturalización." },
    ],
    docs: ["Formulario W-2 (de tu empleador)", "SSN", "Formulario 1099 (si eres autónomo)", "Declaraciones de años anteriores"],
    cost: "IRS Free File: gratis. TurboTax/H&R Block: $50-150. Contador: $150-300+",
    delay: "Fecha límite: 15 de abril cada año. Extensión posible hasta el 15 de octubre.",
    links: [
      { label: "IRS Free File", url: "https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free" },
      { label: "TurboTax", url: "https://turbotax.intuit.com" },
      { label: "IRS — Formularios Oficiales", url: "https://www.irs.gov/forms-instructions" },
    ],
    tip: "💡 Consejo: Si trabajaste poco o tuviste pocos ingresos, puedes tener derecho a un reembolso. ¡Muchos inmigrantes reciben $500-2000 en reembolsos en su primer año!",
    done: "✅ Marcar como hecho",
    undone: "↩️ Quitar",
    back: "← Volver",
    stepId: "taxes_first",
  },
};

export default function GuideTaxes() {
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
          setIsDone((data?.completedSteps || []).includes("taxes_first"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "taxes_first") : [...steps, "taxes_first"];
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
            <div><div style={{ fontSize: 13, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>{step.title}</div><div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{step.desc}</div></div>
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
