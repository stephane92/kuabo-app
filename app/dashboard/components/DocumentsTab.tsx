"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

type Lang = "fr" | "en" | "es";

// ══════════════════════════════════════════════
// DOCUMENTS TAB
// ══════════════════════════════════════════════
export default function DocumentsTab({ lang, completedSteps }: {
  lang: Lang;
  completedSteps: string[];
}) {
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [lostModal, setLostModal] = useState<string | null>(null);
  const [conservation, setConservation] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("doc_conservation") || "{}"); } catch { return {}; }
  });

  type DocItem = {
    id: string;
    icon: string;
    label: string;
    desc: string;
    linked: string | null;
    alwaysOk: boolean;
    guideId: string | null;
    info: string;
    lostSteps: string[];
  };

  const docs: Record<Lang, DocItem[]> = {
    fr: [
      { id: "passport",  icon: "🛂", label: "Passeport",              desc: "Document d'identité international",      linked: null,        alwaysOk: true,  guideId: null,        info: "Ton passeport est valide 6 mois minimum. Garde-le toujours en lieu sûr.",                                                       lostSteps: ["Contacte l'ambassade de ton pays aux USA", "Prends rendez-vous pour un passeport d'urgence", "Apporte 2 photos + preuve de citoyenneté", "Délai : 24-72h pour un passeport d'urgence"] },
      { id: "visa",      icon: "🟩", label: "Visa immigrant (DV)",     desc: "DV Lottery — tampon dans ton passeport",  linked: null,        alwaysOk: true,  guideId: null,        info: "Le tampon DV prouve ton entrée légale. Il sert de preuve de statut pendant 1 an.",                                              lostSteps: ["Le visa est dans ton passeport", "Si passeport perdu → contacte l'ambassade", "Contacte USCIS au 1-800-375-5283"] },
      { id: "ssn_card",  icon: "🪪", label: "Carte SSN",               desc: "Reçue 2 semaines après le bureau SSA",   linked: "ssn",       alwaysOk: false, guideId: "ssn",       info: "Ton SSN est permanent et ne change jamais. Ne le partage qu'avec ton employeur ou ta banque.",                                  lostSteps: ["Va sur ssa.gov/ssnumber", "Clique sur 'Replace a Social Security Card'", "Apporte passeport + Green Card au bureau SSA", "Gratuit — 3 remplacements max par an"] },
      { id: "sim",       icon: "📱", label: "SIM / Numéro US",          desc: "T-Mobile ou Mint Mobile — Jour 1",       linked: "phone",     alwaysOk: false, guideId: "phone",     info: "Ton numéro US est essentiel pour les vérifications bancaires et les employeurs.",                                                 lostSteps: ["Va dans une boutique T-Mobile ou Mint Mobile", "Montre une pièce d'identité", "Nouveau SIM : gratuit ou $5-10", "Tu gardes le même numéro"] },
      { id: "greencard", icon: "💳", label: "Green Card physique",      desc: "Courrier USCIS — 2 à 3 semaines",        linked: "greencard", alwaysOk: false, guideId: "greencard", info: "Ta Green Card est valide 10 ans. C'est la preuve officielle de ta résidence permanente.",                                        lostSteps: ["Va sur uscis.gov/i90", "Remplis le formulaire I-90 en ligne", "Paye les frais de remplacement", "Délai : 3-6 mois pour la nouvelle carte"] },
      { id: "bank_card", icon: "🏦", label: "Carte bancaire",           desc: "Chase ou BofA — passeport seulement",    linked: "bank",      alwaysOk: false, guideId: "bank",      info: "Ta carte bancaire US te permet de payer partout et de recevoir ton salaire.",                                                    lostSteps: ["Bloque immédiatement via l'app bancaire", "Appelle le numéro au dos de ta carte", "Nouvelle carte : 3-5 jours par courrier", "Vérifie les transactions pour fraude"] },
      { id: "license_c", icon: "🚗", label: "Permis de conduire",       desc: "Examen théorique + pratique DMV",        linked: "license",   alwaysOk: false, guideId: "license",   info: "Ton permis US est aussi une pièce d'identité valable. Avec le REAL ID tu peux prendre l'avion.",                                lostSteps: ["Va sur le site du DMV de ton état", "Prends rendez-vous pour un remplacement", "Apporte passeport + preuve d'adresse", "Frais : $20-$40 selon l'état"] },
    ],
    en: [
      { id: "passport",  icon: "🛂", label: "Passport",                desc: "International ID document",              linked: null,        alwaysOk: true,  guideId: null,        info: "Your passport is valid for 6 months minimum. Make a digital copy on Google Drive.",                                              lostSteps: ["Contact your country's embassy in the USA", "Schedule an emergency passport appointment", "Bring 2 photos + proof of citizenship", "Delay: 24-72h for emergency passport"] },
      { id: "visa",      icon: "🟩", label: "Immigrant Visa (DV)",      desc: "DV Lottery — stamp in your passport",     linked: null,        alwaysOk: true,  guideId: null,        info: "The DV stamp proves your legal entry. Serves as proof of status for 1 year.",                                                    lostSteps: ["The visa is in your passport", "If passport lost → contact the embassy", "Contact USCIS at 1-800-375-5283"] },
      { id: "ssn_card",  icon: "🪪", label: "SSN Card",                 desc: "Received 2 weeks after SSA office",      linked: "ssn",       alwaysOk: false, guideId: "ssn",       info: "Your SSN is permanent and never changes. Only share it with your employer or bank.",                                             lostSteps: ["Go to ssa.gov/ssnumber", "Click 'Replace a Social Security Card'", "Bring passport + Green Card to SSA", "Free — max 3 replacements per year"] },
      { id: "sim",       icon: "📱", label: "SIM / US Phone",            desc: "T-Mobile or Mint Mobile — Day 1",        linked: "phone",     alwaysOk: false, guideId: "phone",     info: "Your US number is essential for bank verifications and employers.",                                                              lostSteps: ["Go to T-Mobile or Mint Mobile store", "Show an ID", "New SIM: free or $5-10", "You keep the same number"] },
      { id: "greencard", icon: "💳", label: "Physical Green Card",       desc: "USCIS mail — 2 to 3 weeks",             linked: "greencard", alwaysOk: false, guideId: "greencard", info: "Your Green Card is valid for 10 years. Official proof of permanent residency.",                                                  lostSteps: ["Go to uscis.gov/i90", "Fill out Form I-90 online", "Pay the replacement fee", "Delay: 3-6 months for new card"] },
      { id: "bank_card", icon: "🏦", label: "Bank Card",                 desc: "Chase or BofA — passport only",          linked: "bank",      alwaysOk: false, guideId: "bank",      info: "Your US bank card lets you pay everywhere and receive your salary.",                                                             lostSteps: ["Immediately block via banking app", "Call number on back of card", "New card: 3-5 days by mail", "Check recent transactions for fraud"] },
      { id: "license_c", icon: "🚗", label: "Driver's License",          desc: "Written + practical DMV test",           linked: "license",   alwaysOk: false, guideId: "license",   info: "Your US license is valid ID. With REAL ID you can fly domestically without a passport.",                                        lostSteps: ["Go to your state's DMV website", "Schedule a replacement appointment", "Bring passport + proof of address", "Fee: $20-$40 depending on state"] },
    ],
    es: [
      { id: "passport",  icon: "🛂", label: "Pasaporte",                desc: "Documento de identidad internacional",   linked: null,        alwaysOk: true,  guideId: null,        info: "Tu pasaporte es válido por 6 meses mínimo. Haz una copia digital en Google Drive.",                                             lostSteps: ["Contacta la embajada de tu país en EE.UU.", "Programa cita para pasaporte de emergencia", "Lleva 2 fotos + prueba de ciudadanía", "Plazo: 24-72h para pasaporte de emergencia"] },
      { id: "visa",      icon: "🟩", label: "Visa inmigrante (DV)",      desc: "DV Lottery — sello en tu pasaporte",     linked: null,        alwaysOk: true,  guideId: null,        info: "El sello DV prueba tu entrada legal. Sirve como prueba de estatus durante 1 año.",                                              lostSteps: ["La visa está en tu pasaporte", "Si pierdes el pasaporte → contacta la embajada", "Contacta USCIS al 1-800-375-5283"] },
      { id: "ssn_card",  icon: "🪪", label: "Tarjeta SSN",               desc: "Recibida 2 semanas después SSA",         linked: "ssn",       alwaysOk: false, guideId: "ssn",       info: "Tu SSN es permanente y nunca cambia. Solo compártelo con tu empleador o banco.",                                               lostSteps: ["Ve a ssa.gov/ssnumber", "Haz clic en 'Replace a Social Security Card'", "Lleva pasaporte + Green Card a SSA", "Gratis — máximo 3 reemplazos por año"] },
      { id: "sim",       icon: "📱", label: "SIM / Número US",            desc: "T-Mobile o Mint Mobile — Día 1",         linked: "phone",     alwaysOk: false, guideId: "phone",     info: "Tu número de EE.UU. es esencial para verificaciones bancarias y empleadores.",                                                  lostSteps: ["Ve a tienda T-Mobile o Mint Mobile", "Muestra una identificación", "Nuevo SIM: gratis o $5-10", "Conservas el mismo número"] },
      { id: "greencard", icon: "💳", label: "Green Card física",          desc: "Correo USCIS — 2 a 3 semanas",          linked: "greencard", alwaysOk: false, guideId: "greencard", info: "Tu Green Card es válida por 10 años. Prueba oficial de tu residencia permanente.",                                               lostSteps: ["Ve a uscis.gov/i90", "Completa el Formulario I-90 en línea", "Paga la tarifa de reemplazo", "Plazo: 3-6 meses para la nueva tarjeta"] },
      { id: "bank_card", icon: "🏦", label: "Tarjeta bancaria",           desc: "Chase o BofA — solo pasaporte",          linked: "bank",      alwaysOk: false, guideId: "bank",      info: "Tu tarjeta bancaria de EE.UU. te permite pagar en todas partes y recibir tu salario.",                                         lostSteps: ["Bloquea inmediatamente a través de la app", "Llama al número al dorso de tu tarjeta", "Nueva tarjeta: 3-5 días por correo", "Verifica transacciones recientes por fraude"] },
      { id: "license_c", icon: "🚗", label: "Licencia de conducir",       desc: "Examen teórico + práctico DMV",          linked: "license",   alwaysOk: false, guideId: "license",   info: "Tu licencia de EE.UU. también es identificación válida. Con REAL ID puedes volar sin pasaporte.",                              lostSteps: ["Ve al sitio web del DMV de tu estado", "Programa cita de reemplazo", "Lleva pasaporte + prueba de domicilio", "Tarifa: $20-$40 según el estado"] },
    ],
  };

  const CONS: Record<Lang, { id: string; label: string }[]> = {
    fr: [
      { id: "originals",    label: "Originaux dans un endroit sûr (pas le portefeuille)" },
      { id: "google_drive", label: "Copies numériques sur Google Drive ou iCloud" },
      { id: "family_copy",  label: "Copies physiques chez un proche de confiance" },
      { id: "ssn_memorize", label: "SSN mémorisé — carte rangée en lieu sûr" },
      { id: "gc_safe",      label: "Green Card rangée — pas dans le portefeuille" },
    ],
    en: [
      { id: "originals",    label: "Originals in a safe place (not your wallet)" },
      { id: "google_drive", label: "Digital copies on Google Drive or iCloud" },
      { id: "family_copy",  label: "Physical copies with a trusted person" },
      { id: "ssn_memorize", label: "SSN memorized — card stored safely" },
      { id: "gc_safe",      label: "Green Card stored safely — not in wallet" },
    ],
    es: [
      { id: "originals",    label: "Originales en un lugar seguro (no la billetera)" },
      { id: "google_drive", label: "Copias digitales en Google Drive o iCloud" },
      { id: "family_copy",  label: "Copias físicas con una persona de confianza" },
      { id: "ssn_memorize", label: "SSN memorizado — tarjeta guardada en lugar seguro" },
      { id: "gc_safe",      label: "Green Card guardada — no en la billetera" },
    ],
  };

  const L = {
    fr: { title: "Mes Documents", sub: "Coche ce que tu as — on t'aide pour le reste", ok: "OK", pending: "En attente", missing: "Manquant", score: "Score documentaire", infoTitle: "À savoir", lostTitle: "Si tu perds ce document", lostBtn: "J'ai perdu ce document", guideBtn: "Voir le guide →", explorerBtn: "Trouver un bureau", conservTitle: "📦 Check-list de conservation", conservSub: "Coche pour confirmer que tu as bien rangé tes documents" },
    en: { title: "My Documents",  sub: "Check what you have — we'll help with the rest",  ok: "OK", pending: "Pending",    missing: "Missing",  score: "Document score",    infoTitle: "Good to know",  lostTitle: "If you lose this document",  lostBtn: "I lost this document",    guideBtn: "View guide →",    explorerBtn: "Find an office",    conservTitle: "📦 Storage checklist",       conservSub: "Check to confirm you've safely stored your documents" },
    es: { title: "Mis Documentos", sub: "Marca lo que tienes — te ayudamos con el resto", ok: "OK", pending: "Pendiente",  missing: "Faltante", score: "Puntuación documentos", infoTitle: "Bueno saber", lostTitle: "Si pierdes este documento", lostBtn: "Perdí este documento",    guideBtn: "Ver guía →",      explorerBtn: "Encontrar oficina", conservTitle: "📦 Lista de conservación",    conservSub: "Marca para confirmar que guardaste bien tus documentos" },
  }[lang];

  const list = docs[lang];

  const getStatus = (d: DocItem) => {
    if (d.alwaysOk) return "ok";
    if (d.linked && completedSteps.includes(d.linked)) return "ok";
    if (d.linked) return "pending";
    return "missing";
  };

  const sColor  = { ok: "#22c55e",                  pending: "#e8b84b",                  missing: "#ef4444" };
  const sBg     = { ok: "rgba(34,197,94,0.07)",      pending: "rgba(232,184,75,0.07)",     missing: "rgba(239,68,68,0.05)" };
  const sBorder = { ok: "rgba(34,197,94,0.18)",      pending: "rgba(232,184,75,0.18)",     missing: "rgba(239,68,68,0.15)" };

  const counts = { ok: 0, pending: 0, missing: 0 };
  list.forEach(d => { counts[getStatus(d) as keyof typeof counts]++; });
  const docScore = Math.round((counts.ok / list.length) * 100);

  const toggleCons = (id: string) => {
    const u = { ...conservation, [id]: !conservation[id] };
    setConservation(u);
    localStorage.setItem("doc_conservation", JSON.stringify(u));
  };

  const selDoc  = list.find(d => d.id === activeDoc);
  const lostDoc = list.find(d => d.id === lostModal);
  const EXP: Record<string, string> = { ssn_card: "ssn", greencard: "uscis", bank_card: "bank", license_c: "dmv", sim: "", passport: "", visa: "" };

  return (
    <div>
      {/* Modal info document */}
      {activeDoc && selDoc && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }}
          onClick={() => setActiveDoc(null)}
        >
          <div
            style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>{selDoc.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f1ec" }}>{selDoc.label}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{selDoc.desc}</div>
              </div>
            </div>
            <div style={{ background: "rgba(232,184,75,0.05)", border: "1px solid rgba(232,184,75,0.18)", borderRadius: 12, padding: "13px 15px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#e8b84b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>💡 {L.infoTitle}</div>
              <div style={{ fontSize: 13, color: "#f4f1ec", lineHeight: 1.7 }}>{selDoc.info}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selDoc.guideId && (
                <button onClick={() => { setActiveDoc(null); window.location.href = `/guide/${selDoc.guideId}`; }} style={{ width: "100%", padding: "13px", background: "#e8b84b", color: "#000", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{L.guideBtn}</button>
              )}
              {EXP[selDoc.id] && (
                <button onClick={() => { setActiveDoc(null); window.location.href = `/near/${EXP[selDoc.id]}`; }} style={{ width: "100%", padding: "12px", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 12, color: "#2dd4bf", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🗺️ {L.explorerBtn}</button>
              )}
              <button onClick={() => { setActiveDoc(null); setLostModal(selDoc.id); }} style={{ width: "100%", padding: "12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 12, color: "#ef4444", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>🆘 {L.lostBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "J'ai perdu ce document" */}
      {lostModal && lostDoc && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }}
          onClick={() => setLostModal(null)}
        >
          <div
            style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>🆘 {L.lostTitle}</div>
            <div style={{ fontSize: 14, color: "#f4f1ec", marginBottom: 16 }}>{lostDoc.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lostDoc.lostSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#ef4444", flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: "#f4f1ec", lineHeight: 1.6 }}>{step}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setLostModal(null)} style={{ width: "100%", marginTop: 16, padding: "13px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              {lang === "fr" ? "Fermer" : lang === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 21, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{L.title}</div>
        <div style={{ fontSize: 13, color: "#aaa" }}>{L.sub}</div>
      </div>

      {/* Score documentaire */}
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>{L.score}</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: docScore >= 80 ? "#22c55e" : docScore >= 50 ? "#e8b84b" : "#ef4444" }}>{docScore}%</div>
        </div>
        <div style={{ height: 5, background: "#1e2a3a", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", width: docScore + "%", background: docScore >= 80 ? "linear-gradient(to right,#22c55e,#2dd4bf)" : docScore >= 50 ? "linear-gradient(to right,#e8b84b,#f97316)" : "linear-gradient(to right,#ef4444,#f97316)", borderRadius: 5, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {([ ["ok", L.ok, "#22c55e", "rgba(34,197,94,0.07)", "rgba(34,197,94,0.18)"], ["pending", L.pending, "#e8b84b", "rgba(232,184,75,0.07)", "rgba(232,184,75,0.18)"], ["missing", L.missing, "#ef4444", "rgba(239,68,68,0.07)", "rgba(239,68,68,0.18)"] ] as const).map(([key, lbl, color, bg, border]) => (
            <div key={key} style={{ flex: 1, background: bg, border: "1px solid " + border, borderRadius: 10, padding: "8px 5px", textAlign: "center" as const }}>
              <div style={{ fontSize: 19, fontWeight: 700, color }}>{counts[key as keyof typeof counts]}</div>
              <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Liste des documents */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {list.map(d => {
          const s = getStatus(d);
          return (
            <div
              key={d.id}
              onClick={() => setActiveDoc(d.id)}
              style={{ background: "#141d2e", border: "1px solid " + sBorder[s as keyof typeof sBorder], borderRadius: 12, padding: "14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "opacity 0.15s", WebkitTapHighlightColor: "transparent" }}
              onPointerDown={e => (e.currentTarget.style.opacity = "0.7")}
              onPointerUp={e => (e.currentTarget.style.opacity = "1")}
              onPointerLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <div style={{ fontSize: 22, flexShrink: 0 }}>{d.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>{d.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div style={{ padding: "3px 8px", borderRadius: 18, fontSize: 10, fontWeight: 600, background: sBg[s as keyof typeof sBg], color: sColor[s as keyof typeof sColor], border: "1px solid " + sBorder[s as keyof typeof sBorder], whiteSpace: "nowrap" as const }}>
                  {({ ok: L.ok, pending: L.pending, missing: L.missing })[s as keyof typeof sColor]}
                </div>
                <ChevronRight size={15} color="#555" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Check-list de conservation */}
      <div style={{ background: "rgba(45,212,191,0.04)", border: "1px solid rgba(45,212,191,0.13)", borderRadius: 12, padding: "16px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#2dd4bf", marginBottom: 4 }}>{L.conservTitle}</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 14 }}>{L.conservSub}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CONS[lang].map(item => {
            const checked = !!conservation[item.id];
            return (
              <div key={item.id} onClick={() => toggleCons(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: "2px solid " + (checked ? "#2dd4bf" : "#2a3448"), background: checked ? "#2dd4bf" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                  {checked && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="#0f1521" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ fontSize: 13, color: checked ? "#aaa" : "#f4f1ec", textDecoration: checked ? "line-through" : "none", transition: "all 0.2s", lineHeight: 1.5 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, height: 3, background: "#1e2a3a", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (Object.values(conservation).filter(Boolean).length / CONS[lang].length * 100) + "%", background: "linear-gradient(to right,#2dd4bf,#22c55e)", borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 4, textAlign: "right" as const }}>
          {Object.values(conservation).filter(Boolean).length}/{CONS[lang].length}
        </div>
      </div>
    </div>
  );
}
