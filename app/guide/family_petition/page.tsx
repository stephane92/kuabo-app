"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideFamilyPetition() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "Faire Venir sa Famille (I-130)", emoji: "👨‍👩‍👧‍👦", phase: "Phase 3 — Croissance",
      why: "En tant que résident permanent (Green Card), tu peux pétitionner pour faire venir ton conjoint et tes enfants non mariés de moins de 21 ans. C'est un droit fondamental que tu as gagné.",
      steps: [{"title": "Remplis le formulaire I-130", "desc": "Le formulaire I-130 'Petition for Alien Relative' est disponible sur uscis.gov. Tu le remplis pour chaque membre de ta famille séparément."}, {"title": "Rassemble les documents justificatifs", "desc": "Preuve de ta relation (acte de mariage, actes de naissance), ta Green Card, les photos des membres de ta famille."}, {"title": "Envoie ta pétition à l'USCIS", "desc": "Envoie le formulaire I-130 avec les frais ($535 par pétition) au bureau USCIS approprié selon ton état."}, {"title": "Attends l'approbation et le numéro de visa", "desc": "L'USCIS envoie un Notice of Action. Pour les conjoints et enfants de résidents permanents, il y a une liste d'attente (préférence F2A). Cela peut prendre 1-3 ans."}, {"title": "Ambassade américaine dans le pays d'origine", "desc": "Une fois le visa disponible, ta famille passe un entretien à l'ambassade US de leur pays. Si approuvé, ils reçoivent leur visa immigrant."}],
      docs: ["Formulaire I-130 complété", "Ta Green Card (copie recto-verso)", "Acte de mariage ou actes de naissance", "Photos passeport de chaque membre", "Frais de $535 par pétition"],
      cost: "$535 par formulaire I-130. Frais médicaux et d'ambassade à venir (~$200-500 par personne).", delay: "Approbation I-130 : 6-12 mois. Visa disponible (F2A) : 1-3 ans selon le pays.",
      links: [{"label": "USCIS — Formulaire I-130", "url": "https://www.uscis.gov/i-130"}, {"label": "USCIS — Visa Bulletin", "url": "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html"}, {"label": "USCIS Case Status", "url": "https://egov.uscis.gov/casestatus/landing.do"}],
      tip: "💡 Astuce : Soumets ta pétition I-130 le plus tôt possible car les délais sont longs. La date de priorité est la date à laquelle l'USCIS reçoit ta pétition — plus tôt tu l'envoies, plus tôt ta famille pourra venir.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "Bring Family (Form I-130)", emoji: "👨‍👩‍👧‍👦", phase: "Phase 3 — Growth",
      why: "As a permanent resident (Green Card), you can petition to bring your spouse and unmarried children under 21. This is a fundamental right you've earned.",
      steps: [{"title": "Fill out Form I-130", "desc": "Form I-130 'Petition for Alien Relative' is available on uscis.gov. You fill it out for each family member separately."}, {"title": "Gather supporting documents", "desc": "Proof of your relationship (marriage certificate, birth certificates), your Green Card, photos of family members."}, {"title": "Send your petition to USCIS", "desc": "Send Form I-130 with the fees ($535 per petition) to the appropriate USCIS office based on your state."}, {"title": "Wait for approval and visa number", "desc": "USCIS sends a Notice of Action. For spouses and children of permanent residents, there's a waiting list (preference F2A). This can take 1-3 years."}, {"title": "US Embassy in the home country", "desc": "Once the visa is available, your family attends an interview at the US Embassy in their country. If approved, they receive their immigrant visa."}],
      docs: ["Completed Form I-130", "Your Green Card (front and back copy)", "Marriage certificate or birth certificates", "Passport photos of each member", "Fee of $535 per petition"],
      cost: "$535 per Form I-130. Medical and embassy fees to come (~$200-500 per person).", delay: "I-130 approval: 6-12 months. Visa available (F2A): 1-3 years depending on country.",
      links: [{"label": "USCIS — Formulaire I-130", "url": "https://www.uscis.gov/i-130"}, {"label": "USCIS — Visa Bulletin", "url": "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html"}, {"label": "USCIS Case Status", "url": "https://egov.uscis.gov/casestatus/landing.do"}],
      tip: "💡 Tip: Submit your I-130 petition as early as possible because the delays are long. The priority date is the date USCIS receives your petition — the earlier you send it, the sooner your family can come.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "Traer a la Familia (Formulario I-130)", emoji: "👨‍👩‍👧‍👦", phase: "Fase 3 — Crecimiento",
      why: "Como residente permanente (Green Card), puedes peticionar para traer a tu cónyuge e hijos solteros menores de 21 años. Este es un derecho fundamental que has ganado.",
      steps: [{"title": "Completa el Formulario I-130", "desc": "El Formulario I-130 'Petición para Pariente Extranjero' está disponible en uscis.gov. Lo completas para cada miembro de tu familia por separado."}, {"title": "Reúne los documentos de respaldo", "desc": "Prueba de tu relación (acta de matrimonio, actas de nacimiento), tu Green Card, fotos de los miembros de la familia."}, {"title": "Envía tu petición a USCIS", "desc": "Envía el Formulario I-130 con las tarifas ($535 por petición) a la oficina USCIS apropiada según tu estado."}, {"title": "Espera la aprobación y el número de visa", "desc": "USCIS envía un Aviso de Acción. Para cónyuges e hijos de residentes permanentes, hay una lista de espera (preferencia F2A). Esto puede tomar 1-3 años."}, {"title": "Embajada de EE.UU. en el país de origen", "desc": "Una vez disponible la visa, tu familia asiste a una entrevista en la Embajada de EE.UU. en su país. Si se aprueba, reciben su visa de inmigrante."}],
      docs: ["Formulario I-130 completado", "Tu Green Card (copia frontal y trasera)", "Acta de matrimonio o actas de nacimiento", "Fotos de pasaporte de cada miembro", "Tarifa de $535 por petición"],
      cost: "$535 por Formulario I-130. Tarifas médicas y de embajada a pagar (~$200-500 por persona).", delay: "Aprobación I-130: 6-12 meses. Visa disponible (F2A): 1-3 años según el país.",
      links: [{"label": "USCIS — Formulaire I-130", "url": "https://www.uscis.gov/i-130"}, {"label": "USCIS — Visa Bulletin", "url": "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html"}, {"label": "USCIS Case Status", "url": "https://egov.uscis.gov/casestatus/landing.do"}],
      tip: "💡 Consejo: Presenta tu petición I-130 lo antes posible porque los plazos son largos. La fecha de prioridad es la fecha en que USCIS recibe tu petición — cuanto antes la envíes, antes podrá venir tu familia.",
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
          setIsDone((data?.completedSteps || []).includes("family_petition"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "family_petition") : [...steps, "family_petition"];
      await updateDoc(doc(db, "users", user.uid), { completedSteps: updated });
      setIsDone(!isDone);
    } catch {} 
    setSaving(false);
  };

  const color = "#f97316";

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
