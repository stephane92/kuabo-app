"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft } from "lucide-react";

type Lang = "fr" | "en" | "es";

export default function GuideRealId() {
  const [lang, setLang] = useState<Lang>("fr");
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const CONTENT: Record<Lang, any> = {
    fr: {
      title: "REAL ID", emoji: "🪪", phase: "Phase 2 — Fondations",
      why: "Le REAL ID est obligatoire depuis mai 2025 pour prendre l'avion aux USA sur les vols domestiques. C'est une version améliorée de ton permis de conduire avec une étoile en haut à droite.",
      steps: [{"title": "Vérifie si ton permis actuel est REAL ID", "desc": "Regarde si ton permis a une étoile ★ en haut à droite. Si oui, tu as déjà un REAL ID. Sinon, il faut le mettre à jour."}, {"title": "Rassemble les documents requis", "desc": "Tu as besoin de : preuve d'identité (passeport ou Green Card), preuve de SSN, preuve de résidence (2 documents : bail, facture). Varie selon l'état."}, {"title": "Prends rendez-vous au DMV", "desc": "Va sur le site de ton DMV d'état pour prendre rendez-vous. Certains états acceptent les walk-ins mais les rendez-vous sont plus rapides."}, {"title": "Va au bureau DMV avec tous tes documents", "desc": "Présente tous tes documents originaux. Pas de photocopies. Paie les frais et fais ta photo."}, {"title": "Reçois ta nouvelle carte", "desc": "Certains états donnent une carte temporaire sur place. La carte définitive arrive par courrier en 2-4 semaines."}],
      docs: ["Passeport ou Green Card (preuve d'identité)", "Carte SSN ou document SSN", "2 preuves de résidence (bail, facture eau/électricité/banque)"],
      cost: "$10-40 selon l'état (Maryland : ~$20)", delay: "Carte temporaire : immédiate. Carte définitive : 2-4 semaines par courrier.",
      links: [{"label": "Maryland DMV — REAL ID", "url": "https://mva.maryland.gov/Pages/real-id.aspx"}, {"label": "DHS — REAL ID Info", "url": "https://www.dhs.gov/real-id"}, {"label": "Find your DMV", "url": "https://www.dmv.org/"}],
      tip: "💡 Astuce : En Maryland, tu peux mettre à jour ton permis en REAL ID lors de ton prochain renouvellement (tous les 8 ans) ou à tout moment en payant les frais de remplacement.",
      done: "✅ Marquer comme fait", undone: "↩️ Retirer", back: "← Retour",
      docsLabel: "Documents nécessaires", stepsLabel: "Étapes", whyLabel: "Pourquoi c'est important",
      costLabel: "Coût", delayLabel: "Délai", linksLabel: "Liens utiles",
    },
    en: {
      title: "REAL ID", emoji: "🪪", phase: "Phase 2 — Foundations",
      why: "REAL ID has been required since May 2025 for domestic flights in the USA. It's an enhanced version of your driver's license with a star in the top right corner.",
      steps: [{"title": "Check if your current license is REAL ID", "desc": "Look for a star ★ in the top right corner of your license. If yes, you already have a REAL ID. If not, you need to update it."}, {"title": "Gather required documents", "desc": "You need: proof of identity (passport or Green Card), proof of SSN, proof of residence (2 documents: lease, bill). Varies by state."}, {"title": "Make an appointment at the DMV", "desc": "Go to your state's DMV website to make an appointment. Some states accept walk-ins but appointments are faster."}, {"title": "Go to the DMV office with all your documents", "desc": "Present all your original documents. No photocopies. Pay the fees and take your photo."}, {"title": "Receive your new card", "desc": "Some states give a temporary card on the spot. The final card arrives by mail in 2-4 weeks."}],
      docs: ["Passport or Green Card (proof of identity)", "SSN card or SSN document", "2 proofs of residence (lease, utility bill/bank statement)"],
      cost: "$10-40 depending on state (Maryland: ~$20)", delay: "Temporary card: immediate. Final card: 2-4 weeks by mail.",
      links: [{"label": "Maryland DMV — REAL ID", "url": "https://mva.maryland.gov/Pages/real-id.aspx"}, {"label": "DHS — REAL ID Info", "url": "https://www.dhs.gov/real-id"}, {"label": "Find your DMV", "url": "https://www.dmv.org/"}],
      tip: "💡 Tip: In Maryland, you can upgrade your license to REAL ID at your next renewal (every 8 years) or at any time by paying the replacement fee.",
      done: "✅ Mark as done", undone: "↩️ Remove", back: "← Back",
      docsLabel: "Required documents", stepsLabel: "Steps", whyLabel: "Why it matters",
      costLabel: "Cost", delayLabel: "Timeline", linksLabel: "Useful links",
    },
    es: {
      title: "REAL ID", emoji: "🪪", phase: "Fase 2 — Cimientos",
      why: "El REAL ID es obligatorio desde mayo de 2025 para vuelos domésticos en EE.UU. Es una versión mejorada de tu licencia de conducir con una estrella en la esquina superior derecha.",
      steps: [{"title": "Verifica si tu licencia actual es REAL ID", "desc": "Busca una estrella ★ en la esquina superior derecha de tu licencia. Si la tiene, ya tienes un REAL ID. Si no, necesitas actualizarla."}, {"title": "Reúne los documentos requeridos", "desc": "Necesitas: prueba de identidad (pasaporte o Green Card), prueba de SSN, prueba de residencia (2 documentos: contrato de arrendamiento, factura). Varía según el estado."}, {"title": "Haz una cita en el DMV", "desc": "Ve al sitio web del DMV de tu estado para hacer una cita. Algunos estados aceptan sin cita pero las citas son más rápidas."}, {"title": "Ve a la oficina del DMV con todos tus documentos", "desc": "Presenta todos tus documentos originales. Sin fotocopias. Paga las tarifas y tómate la foto."}, {"title": "Recibe tu nueva tarjeta", "desc": "Algunos estados dan una tarjeta temporal en el acto. La tarjeta definitiva llega por correo en 2-4 semanas."}],
      docs: ["Pasaporte o Green Card (prueba de identidad)", "Tarjeta SSN o documento SSN", "2 pruebas de residencia (contrato, factura de servicios/banco)"],
      cost: "$10-40 según el estado (Maryland: ~$20)", delay: "Tarjeta temporal: inmediata. Tarjeta definitiva: 2-4 semanas por correo.",
      links: [{"label": "Maryland DMV — REAL ID", "url": "https://mva.maryland.gov/Pages/real-id.aspx"}, {"label": "DHS — REAL ID Info", "url": "https://www.dhs.gov/real-id"}, {"label": "Find your DMV", "url": "https://www.dmv.org/"}],
      tip: "💡 Consejo: En Maryland, puedes actualizar tu licencia a REAL ID en tu próxima renovación (cada 8 años) o en cualquier momento pagando la tarifa de reemplazo.",
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
          setIsDone((data?.completedSteps || []).includes("real_id"));
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
      const updated = isDone ? steps.filter((s: string) => s !== "real_id") : [...steps, "real_id"];
      await updateDoc(doc(db, "users", user.uid), { completedSteps: updated });
      setIsDone(!isDone);
    } catch {} 
    setSaving(false);
  };

  const color = "#e8b84b";

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
