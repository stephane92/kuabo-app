"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronRight, Search, X, PhoneCall } from "lucide-react";
import { STEP_GUIDES, ARMY_GUIDE, PHASES_META, PHASE_STEPS, SEARCH_INDEX } from "./data";
import type { Lang, PhaseId } from "./data";

// ══════════════════════════════════════════════
// SEARCH MODAL
// ══════════════════════════════════════════════
export function SearchModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_\s]/g, "");

  const results = query.trim().length === 0 ? [] : SEARCH_INDEX.filter(item => {
    const q = normalize(query);
    return (
      item.keywords.some(k => normalize(k).includes(q) || q.includes(normalize(k))) ||
      normalize(item.label[lang]).includes(q) ||
      normalize(item.label.fr).includes(q) ||
      normalize(item.label.en).includes(q)
    );
  }).slice(0, 8);

  const suggestions = query.trim().length === 0 ? SEARCH_INDEX.slice(0, 6) : [];
  const phaseColor: Record<number, string> = { 1: "#e8b84b", 2: "#2dd4bf", 3: "#22c55e", 4: "#a78bfa", 5: "#f97316" };
  const placeholder = { fr: "Chercher un guide... (SSN, Green Card, taxes...)", en: "Search a guide... (SSN, Green Card, taxes...)", es: "Buscar una guía... (SSN, Green Card, impuestos...)" }[lang];
  const recentLabel = { fr: "Guides populaires", en: "Popular guides", es: "Guías populares" }[lang];
  const noResultLabel = { fr: "Aucun résultat pour", en: "No results for", es: "Sin resultados para" }[lang];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 900, display: "flex", flexDirection: "column", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{ background: "#0f1521", borderBottom: "1px solid #1e2a3a", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }} onClick={e => e.stopPropagation()}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#141d2e", border: "1px solid #e8b84b40", borderRadius: 12, padding: "10px 14px" }}>
          <Search size={16} color="#e8b84b" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#f4f1ec", fontSize: 15, fontFamily: "inherit" }} />
          {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", display: "flex" }}><X size={14} /></button>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          {lang === "fr" ? "Fermer" : lang === "es" ? "Cerrar" : "Close"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
        {suggestions.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 600 }}>⭐ {recentLabel}</div>
            {suggestions.map(item => (
              <div key={item.id} onClick={() => { window.location.href = item.url; }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, marginBottom: 8, cursor: "pointer" }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f1ec" }}>{item.label[lang]}</div>
                  <div style={{ fontSize: 11, color: phaseColor[item.phase], marginTop: 2 }}>Phase {item.phase}</div>
                </div>
                <ChevronRight size={14} color="#555" />
              </div>
            ))}
          </>
        )}

        {query.trim().length > 0 && results.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 600 }}>🔍 {results.length} résultat{results.length > 1 ? "s" : ""}</div>
            {results.map(item => (
              <div key={item.id} onClick={() => { window.location.href = item.url; }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: "#141d2e", border: `1px solid ${phaseColor[item.phase]}30`, borderRadius: 12, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${phaseColor[item.phase]}12`, border: `1px solid ${phaseColor[item.phase]}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ec" }}>{item.label[lang]}</div>
                  <div style={{ fontSize: 11, color: phaseColor[item.phase], marginTop: 2 }}>Phase {item.phase}</div>
                </div>
                <div style={{ fontSize: 12, color: "#e8b84b", fontWeight: 600, flexShrink: 0 }}>→ Guide</div>
              </div>
            ))}
          </>
        )}

        {query.trim().length > 0 && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, color: "#aaa" }}>{noResultLabel} "{query}"</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
              {lang === "fr" ? "Essaie : SSN, Green Card, taxes, permis..." : lang === "es" ? "Prueba: SSN, Green Card, impuestos, licencia..." : "Try: SSN, Green Card, taxes, license..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// STEP MODAL
// ══════════════════════════════════════════════
export function StepModal({ stepId, lang, completedSteps, onToggle, onClose }: {
  stepId: string | null; lang: Lang; completedSteps: string[]; onToggle: (id: string) => void; onClose: () => void;
}) {
  if (!stepId) return null;
  const guide = STEP_GUIDES[stepId];
  const allSteps = [...PHASE_STEPS[1], ...PHASE_STEPS[2], ...PHASE_STEPS[3], ...PHASE_STEPS[4], ...PHASE_STEPS[5]];
  const stepData = allSteps.find(s => s.id === stepId);
  if (!stepData || !guide) return null;

  const isDone    = completedSteps.includes(stepId);
  const urgColor  = stepData.urgency === "critical" ? "#ef4444" : stepData.urgency === "high" ? "#f97316" : "#e8b84b";
  const L = {
    fr: { why: "Pourquoi c'est important", done: "✅ Marquer comme fait", undone: "↩️ Retirer",    guide: "📖 Voir le guide →",    explorer: "🗺️ Trouver un bureau",    close: "← Retour" },
    en: { why: "Why it's important",       done: "✅ Mark as done",       undone: "↩️ Remove",     guide: "📖 View guide →",       explorer: "🗺️ Find an office",        close: "← Back" },
    es: { why: "Por qué es importante",    done: "✅ Marcar como hecho",  undone: "↩️ Quitar",     guide: "📖 Ver guía →",         explorer: "🗺️ Encontrar oficina",    close: "← Volver" },
  }[lang];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }} onClick={onClose}>
      <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: urgColor, flexShrink: 0 }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: "#f4f1ec" }}>{stepData.label[lang]}</div>
        </div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16, paddingLeft: 20 }}>{stepData.desc[lang]}</div>
        <div style={{ background: "rgba(232,184,75,0.06)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 12, padding: "14px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#e8b84b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>💡 {L.why}</div>
          <div style={{ fontSize: 14, color: "#f4f1ec", lineHeight: 1.8 }}>{guide.why[lang]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button onClick={() => { onToggle(stepId); onClose(); }} style={{ width: "100%", padding: "14px", background: isDone ? "#141d2e" : "#22c55e", border: isDone ? "1px solid #1e2a3a" : "none", borderRadius: 12, color: isDone ? "#aaa" : "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {isDone ? L.undone : L.done}
          </button>
          {guide.guideUrl && (
            <button onClick={() => { onClose(); window.location.href = guide.guideUrl!; }} style={{ width: "100%", padding: "14px", background: "#e8b84b", border: "none", borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{L.guide}</button>
          )}
          {guide.explorerType && (
            <button onClick={() => { onClose(); window.location.href = `/near/${guide.explorerType}`; }} style={{ width: "100%", padding: "13px", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 12, color: "#2dd4bf", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🗺️ {L.explorer}</button>
          )}
          <button onClick={onClose} style={{ width: "100%", padding: "13px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{L.close}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ARMY GUIDE MODAL
// ══════════════════════════════════════════════
export function ArmyGuideModal({ armyStatus, lang, onClose }: { armyStatus: string | null; lang: Lang; onClose: () => void }) {
  if (!armyStatus) return null;
  const guide = ARMY_GUIDE[armyStatus];
  if (!guide) return null;
  const g     = guide[lang];
  const color = armyStatus === "army" ? "#22c55e" : "#2dd4bf";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }} onClick={onClose}>
      <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f1ec", marginBottom: 6 }}>{g.title}</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 18, lineHeight: 1.6 }}>{g.desc}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
          {g.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#141d2e", border: `1px solid ${color}20`, borderRadius: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${color}15`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: "#f4f1ec", lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}
        </div>
        <div style={{ background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 12, padding: "13px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4 }}>💡 TIP</div>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{g.tip}</div>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "14px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          {lang === "fr" ? "Fermer" : lang === "es" ? "Cerrar" : "Close"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PHASE UNLOCK OVERLAY
// ══════════════════════════════════════════════
export function PhaseUnlockOverlay({ phaseId, lang, onDone }: { phaseId: PhaseId | null; lang: Lang; onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!phaseId) return;
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(onDone, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [phaseId, onDone]);

  if (!phaseId) return null;

  const meta     = PHASES_META[phaseId];
  const nextId   = (phaseId + 1) as PhaseId;
  const nextMeta = phaseId < 5 ? PHASES_META[nextId] : null;
  const msg      = meta.unlockMsg[lang];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 0.8,
    dur: 1.5 + Math.random() * 1.2,
    color: ["#e8b84b", "#22c55e", "#2dd4bf", "#f97316", "#a78bfa", "#f472b6", "#60a5fa"][i % 7],
    size: 8 + Math.random() * 10, rot: Math.random() * 360,
  }));

  return (
    <>
      <style>{`
        @keyframes phaseConfetti { 0%{transform:translateY(-30px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(900deg);opacity:0} }
        @keyframes phasePop      { 0%{transform:translate(-50%,-50%) scale(0.3);opacity:0} 20%{transform:translate(-50%,-50%) scale(1.1);opacity:1} 50%{transform:translate(-50%,-50%) scale(1)} 80%{transform:translate(-50%,-50%) scale(1)} 100%{transform:translate(-50%,-50%) scale(0.9);opacity:0} }
        @keyframes phaseBg       { 0%{opacity:0} 10%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
        @keyframes phaseEmoji    { 0%{transform:scale(0) rotate(-20deg)} 50%{transform:scale(1.3) rotate(5deg)} 100%{transform:scale(1) rotate(0deg)} }
        @keyframes phaseSlide    { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes phaseRing     { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(3);opacity:0} }
        @keyframes phaseBar      { from{width:0%} to{width:100%} }
      `}</style>
      <div onClick={onDone} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", animation: "phaseBg 4.2s ease forwards", cursor: "pointer" }} />
      {step >= 1 && particles.map(p => (
        <div key={p.id} style={{ position: "fixed", left: p.x + "%", top: "-30px", width: p.size, height: p.size, borderRadius: "50%", background: p.color, zIndex: 2001, pointerEvents: "none", animation: `phaseConfetti ${p.dur}s ${p.delay}s ease-in forwards`, transform: `rotate(${p.rot}deg)` }} />
      ))}
      <div style={{ position: "fixed", top: "50%", left: "50%", width: 200, height: 200, borderRadius: "50%", border: `4px solid ${meta.color}`, zIndex: 2001, pointerEvents: "none", animation: "phaseRing 1s ease-out forwards" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", zIndex: 2002, pointerEvents: "none", animation: "phasePop 4.2s cubic-bezier(.34,1.56,.64,1) forwards", width: 320 }}>
        <div style={{ background: "linear-gradient(135deg,#0a0e1a,#141d2e)", border: `2px solid ${meta.color}60`, borderRadius: 28, padding: "32px 24px 24px", textAlign: "center", boxShadow: `0 32px 80px rgba(0,0,0,0.8),0 0 60px ${meta.color}20` }}>
          {step >= 1 && <div style={{ fontSize: 68, marginBottom: 8, display: "inline-block", animation: "phaseEmoji 0.6s cubic-bezier(.34,1.56,.64,1)" }}>{meta.emoji}</div>}
          {step >= 1 && <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: meta.color, fontWeight: 700, marginBottom: 8 }}>✅ {lang === "fr" ? "COMPLÉTÉE" : lang === "es" ? "COMPLETADA" : "COMPLETED"}</div>}
          {step >= 2 && <div style={{ fontSize: 22, fontWeight: 900, color: "#f4f1ec", marginBottom: 8, lineHeight: 1.2, animation: "phaseSlide 0.4s ease" }}>{msg.title}</div>}
          {step >= 3 && <div style={{ fontSize: 13, color: "rgba(244,241,236,0.7)", lineHeight: 1.7, marginBottom: 18, animation: "phaseSlide 0.4s ease" }}>{msg.msg}</div>}
          {step >= 3 && nextMeta && (
            <div style={{ background: `${nextMeta.color}15`, border: `1px solid ${nextMeta.color}40`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, animation: "phaseSlide 0.5s ease" }}>
              <div style={{ fontSize: 10, color: nextMeta.color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 3 }}>🔓 {lang === "fr" ? "DÉBLOQUÉ" : lang === "es" ? "DESBLOQUEADO" : "UNLOCKED"}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f1ec" }}>{nextMeta.emoji} Phase {nextId} — {nextMeta.name[lang]}</div>
            </div>
          )}
          <div style={{ height: 3, background: "#1e2a3a", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(to right,${meta.color},${nextMeta?.color || meta.color})`, borderRadius: 3, animation: "phaseBar 4.2s linear forwards" }} />
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// SOS BUTTON
// ══════════════════════════════════════════════
export function SOSButton({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);

  const contacts: Record<Lang, { icon: string; label: string; number: string; display: string; priority: boolean }[]> = {
    fr: [
      { icon: "🚨", label: "Urgence — Police / Pompiers / Médecin", number: "911",          display: "911",              priority: true },
      { icon: "🏠", label: "Aide sociale, logement, nourriture (24/7)", number: "211",      display: "211",              priority: true },
      { icon: "🛂", label: "USCIS — Questions immigration",           number: "18003755283", display: "1-800-375-5283",  priority: false },
      { icon: "🪪", label: "SSA — Sécurité sociale",                  number: "18007721213", display: "1-800-772-1213",  priority: false },
    ],
    en: [
      { icon: "🚨", label: "Emergency — Police / Fire / Medical",     number: "911",          display: "911",             priority: true },
      { icon: "🏠", label: "Social help, housing, food (24/7)",        number: "211",          display: "211",             priority: true },
      { icon: "🛂", label: "USCIS — Immigration",                      number: "18003755283",  display: "1-800-375-5283", priority: false },
      { icon: "🪪", label: "SSA — Social Security",                    number: "18007721213",  display: "1-800-772-1213", priority: false },
    ],
    es: [
      { icon: "🚨", label: "Emergencia — Policía / Bomberos / Médico", number: "911",          display: "911",             priority: true },
      { icon: "🏠", label: "Ayuda social, vivienda, comida (24/7)",    number: "211",          display: "211",             priority: true },
      { icon: "🛂", label: "USCIS — Inmigración",                      number: "18003755283",  display: "1-800-375-5283", priority: false },
      { icon: "🪪", label: "SSA — Seguro Social",                      number: "18007721213",  display: "1-800-772-1213", priority: false },
    ],
  };

  const btnLabel = { fr: "Aide urgente", en: "Emergency help", es: "Ayuda urgente" }[lang];

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ width: "100%", padding: "14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", marginTop: 4 }}>
        <PhoneCall size={16} color="#ef4444" /> 🆘 {btnLabel}
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }} onClick={() => setOpen(false)}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <PhoneCall size={18} color="#ef4444" /> 🆘 {btnLabel}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {contacts[lang].map((c, i) => (
                <button key={i} onClick={() => { window.location.href = "tel:" + c.number; }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: c.priority ? "rgba(239,68,68,0.05)" : "#141d2e", border: "1px solid " + (c.priority ? "rgba(239,68,68,0.18)" : "#1e2a3a"), borderRadius: 12, cursor: "pointer", width: "100%", textAlign: "left" as const, fontFamily: "inherit" }}>
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 16, color: c.priority ? "#ef4444" : "#e8b84b", fontWeight: 700 }}>{c.display}</div>
                  </div>
                  <PhoneCall size={15} color={c.priority ? "#ef4444" : "#22c55e"} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
