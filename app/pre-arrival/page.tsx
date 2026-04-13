"use client";

import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { computeDaysInUSA, isArrivalDatePassed } from "@/lib/statusSystem";

type Lang = "fr" | "en" | "es";

// ── Textes ─────────────────────────────────────────────
const T: Record<Lang, any> = {
  fr: {
    title:         "Prépare ton arrivée 🇺🇸",
    sub:           "Coche tout avant de partir — Kuabo s'assure que tu es prêt",
    score:         "Prêt à",
    countdown:     "Jours avant ton départ",
    arrived:       "déjà arrivé !",
    btnContinue:   "Tout est prêt — Voir mon dashboard ✅",
    btnArrived:    "Je suis arrivé ! 🛬",
    btnUpdateDate: "Mettre à jour ma date",
    datePassedMsg: "Ta date d'arrivée est passée — es-tu arrivé ?",
    // Double confirmation étape 1
    confirm1Title: "Tu es arrivé aux USA ? 🛬",
    confirm1Sub:   "Cette action va déverrouiller ton dashboard et changer ton statut.",
    confirm1Yes:   "Oui, je suis aux USA ! ✅",
    confirm1No:    "Pas encore ⏳",
    // Double confirmation étape 2
    confirm2Title: "Tu confirmes ? 🇺🇸",
    confirm2Sub:   "Tu es bien physiquement aux États-Unis en ce moment ?",
    confirm2Warn:  "⚠️ Cette action est irréversible",
    confirm2Yes:   "✅ Oui, je confirme !",
    confirm2No:    "← Non, erreur",
    // Succès
    successTitle:  "Bienvenue aux USA ! 🎉",
    successSub:    "Ton dashboard Kuabo t'attend. Allons-y !",
    successBtn:    "Voir mon dashboard →",
    // Items checklist
    items: [
      { id: "passport", emoji: "🛂", label: "Passeport valide",         desc: "Valide au moins 6 mois après ton arrivée" },
      { id: "visa",     emoji: "💳", label: "Visa en main",              desc: "Visa immigrant approuvé et signé" },
      { id: "budget",   emoji: "💰", label: "Budget minimum",            desc: "Au moins 500$ en liquide ou carte" },
      { id: "contact",  emoji: "📞", label: "Contact sur place",         desc: "Un ami, famille ou contact aux USA" },
      { id: "address",  emoji: "🏠", label: "Adresse temporaire",        desc: "Hôtel, Airbnb ou chez quelqu'un" },
    ],
    retard: "Tu as du retard ?",
    retardSub: "Mets à jour ta date d'arrivée",
  },
  en: {
    title:         "Prepare your arrival 🇺🇸",
    sub:           "Check everything before you leave — Kuabo makes sure you're ready",
    score:         "Ready at",
    countdown:     "Days before your departure",
    arrived:       "already there!",
    btnContinue:   "All set — See my dashboard ✅",
    btnArrived:    "I've arrived! 🛬",
    btnUpdateDate: "Update my date",
    datePassedMsg: "Your arrival date has passed — did you arrive?",
    confirm1Title: "Have you arrived in the USA? 🛬",
    confirm1Sub:   "This action will unlock your dashboard and change your status.",
    confirm1Yes:   "Yes, I'm in the USA! ✅",
    confirm1No:    "Not yet ⏳",
    confirm2Title: "Can you confirm? 🇺🇸",
    confirm2Sub:   "Are you physically in the United States right now?",
    confirm2Warn:  "⚠️ This action is irreversible",
    confirm2Yes:   "✅ Yes, I confirm!",
    confirm2No:    "← No, mistake",
    successTitle:  "Welcome to the USA! 🎉",
    successSub:    "Your Kuabo dashboard is waiting. Let's go!",
    successBtn:    "See my dashboard →",
    items: [
      { id: "passport", emoji: "🛂", label: "Valid passport",           desc: "Valid at least 6 months after arrival" },
      { id: "visa",     emoji: "💳", label: "Visa in hand",             desc: "Approved and signed immigrant visa" },
      { id: "budget",   emoji: "💰", label: "Minimum budget",           desc: "At least $500 in cash or card" },
      { id: "contact",  emoji: "📞", label: "Contact in the USA",       desc: "A friend, family member or contact" },
      { id: "address",  emoji: "🏠", label: "Temporary address",        desc: "Hotel, Airbnb or staying with someone" },
    ],
    retard: "Running late?",
    retardSub: "Update your arrival date",
  },
  es: {
    title:         "Prepara tu llegada 🇺🇸",
    sub:           "Marca todo antes de salir — Kuabo se asegura de que estés listo",
    score:         "Listo al",
    countdown:     "Días antes de tu partida",
    arrived:       "¡ya llegaste!",
    btnContinue:   "Todo listo — Ver mi dashboard ✅",
    btnArrived:    "¡He llegado! 🛬",
    btnUpdateDate: "Actualizar mi fecha",
    datePassedMsg: "Tu fecha de llegada ya pasó — ¿llegaste?",
    confirm1Title: "¿Has llegado a EE.UU.? 🛬",
    confirm1Sub:   "Esta acción desbloqueará tu dashboard y cambiará tu estado.",
    confirm1Yes:   "¡Sí, estoy en EE.UU.! ✅",
    confirm1No:    "Todavía no ⏳",
    confirm2Title: "¿Puedes confirmarlo? 🇺🇸",
    confirm2Sub:   "¿Estás físicamente en los Estados Unidos ahora mismo?",
    confirm2Warn:  "⚠️ Esta acción es irreversible",
    confirm2Yes:   "✅ ¡Sí, confirmo!",
    confirm2No:    "← No, error",
    successTitle:  "¡Bienvenido a EE.UU.! 🎉",
    successSub:    "Tu dashboard de Kuabo te espera. ¡Vamos!",
    successBtn:    "Ver mi dashboard →",
    items: [
      { id: "passport", emoji: "🛂", label: "Pasaporte válido",         desc: "Válido al menos 6 meses después de llegar" },
      { id: "visa",     emoji: "💳", label: "Visa en mano",             desc: "Visa de inmigrante aprobada y firmada" },
      { id: "budget",   emoji: "💰", label: "Presupuesto mínimo",       desc: "Al menos $500 en efectivo o tarjeta" },
      { id: "contact",  emoji: "📞", label: "Contacto en EE.UU.",       desc: "Un amigo, familiar o contacto allá" },
      { id: "address",  emoji: "🏠", label: "Dirección temporal",       desc: "Hotel, Airbnb o en casa de alguien" },
    ],
    retard: "¿Llegas tarde?",
    retardSub: "Actualiza tu fecha de llegada",
  },
};

// ══════════════════════════════════════════════
// CONFETTI
// ══════════════════════════════════════════════
function Confetti() {
  const colors = ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa","#f472b6"];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random()*100, delay: Math.random()*.6,
    dur: 1.4 + Math.random()*.8,
    color: colors[i % colors.length],
    size: 6 + Math.random()*10,
    shape: Math.random() > .5,
  }));
  return (
    <>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:"fixed", left:p.x+"%", top:-20,
          width:p.size, height:p.size,
          borderRadius: p.shape ? "50%" : 2,
          background: p.color,
          zIndex: 9999, pointerEvents:"none",
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════
// PRE-ARRIVAL PAGE
// ══════════════════════════════════════════════
export default function PreArrivalPage() {
  const [lang,        setLang]        = useState<Lang>("fr");
  const [ready,       setReady]       = useState(false);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [checked,     setChecked]     = useState<string[]>([]);
  const [arrivalDate, setArrivalDate] = useState<string | null>(null);
  const [userName,    setUserName]    = useState("toi");

  // Modals
  const [showConfirm1,   setShowConfirm1]   = useState(false);
  const [showConfirm2,   setShowConfirm2]   = useState(false);
  const [showSuccess,    setShowSuccess]    = useState(false);
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [showDateUpdate, setShowDateUpdate] = useState(false);
  const [newDate,        setNewDate]        = useState("");
  const [saving,         setSaving]         = useState(false);

  const t       = T[lang];
  const items   = t.items as { id:string; emoji:string; label:string; desc:string }[];
  const score   = Math.round((checked.length / items.length) * 100);
  const allDone = score === 100;

  // Countdown
  const daysLeft = arrivalDate
    ? Math.ceil((new Date(arrivalDate).getTime() - Date.now()) / 86400000)
    : null;
  const datePassed = arrivalDate ? isArrivalDatePassed(arrivalDate) : false;

  // ── Init ──────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    if (["fr","en","es"].includes(saved)) setLang(saved);

    const timeout = setTimeout(() => setReady(true), 4000);
    const unsub   = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.uid);

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() as any : {};
        const l    = (data.lang as Lang) || saved || "fr";
        setLang(l);
        setArrivalDate(data.arrivalDate || null);
        setUserName(data.name?.split(" ")[0] || "toi");
        // Si déjà confirmé → rediriger vers dashboard
        if (data.arrivalConfirmed) {
          window.location.href = "/dashboard";
          return;
        }
      } catch {}
      setReady(true);
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  // ── Toggle checklist ──────────────────────────────────
  const toggle = (id: string) => {
    setChecked(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Confirmation arrivée ──────────────────────────────
  // Étape 1 : "Tu es arrivé ?" → ouvre étape 2
  const handleArrivedStep1Yes = () => {
    setShowConfirm1(false);
    setTimeout(() => setShowConfirm2(true), 200);
  };

  // Étape 2 : confirmation finale → mise à jour Firebase
  const handleArrivedConfirm = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await updateDoc(doc(db, "users", userId), {
        arrivalConfirmed: true,
        arrivalDate:      today,
        status:           "new",
        daysInUSA:        0,
        preArrivalCompleted: true,
      });
      setShowConfirm2(false);
      setShowConfetti(true);
      setTimeout(() => setShowSuccess(true), 400);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  // ── Mettre à jour la date ─────────────────────────────
  const handleUpdateDate = async () => {
    if (!userId || !newDate) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), { arrivalDate: newDate });
      setArrivalDate(newDate);
      setShowDateUpdate(false);
    } catch {}
    setSaving(false);
  };

  // ── Loading ───────────────────────────────────────────
  if (!ready) return (
    <div style={{ minHeight:"100dvh", background:"#0b0f1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
      <div style={{ fontSize:28, fontWeight:900 }}>
        <span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span>
      </div>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation:"spin 1s linear infinite" }}>
        <circle cx="18" cy="18" r="13" fill="none" stroke="#1e2a3a" strokeWidth="4"/>
        <circle cx="18" cy="18" r="13" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="82" strokeDashoffset="62"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"#0b0f1a", color:"#f4f1ec", fontFamily:"system-ui,-apple-system,sans-serif" }}>

      {/* Confetti */}
      {showConfetti && <Confetti/>}

      {/* Header */}
      <div style={{ position:"fixed", top:0, left:0, right:0, background:"rgba(11,15,26,.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight:900, fontSize:20 }}>
          <span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span>
        </div>
        <div style={{ display:"flex", gap:10, fontSize:18, cursor:"pointer" }}>
          {(["fr","en","es"] as Lang[]).map(l => (
            <span key={l} onClick={()=>{
              setLang(l);
              localStorage.setItem("lang", l);
            }} style={{ opacity:lang===l?1:.4 }}>
              {l==="fr"?"🇫🇷":l==="en"?"🇺🇸":"🇪🇸"}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:480, margin:"0 auto", padding:"80px 16px 40px" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🛫</div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:8, color:"#f4f1ec" }}>{t.title}</h1>
          <p style={{ fontSize:13, color:"#aaa", lineHeight:1.6 }}>{t.sub}</p>
        </div>

        {/* Compte à rebours */}
        {arrivalDate && (
          <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:14, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ textAlign:"center", background: datePassed?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)", borderRadius:10, padding:"8px 14px", flexShrink:0 }}>
              {datePassed ? (
                <div style={{ fontSize:11, fontWeight:700, color:"#22c55e" }}>✅ {t.arrived}</div>
              ) : (
                <>
                  <div style={{ fontSize:28, fontWeight:900, color:"#ef4444", lineHeight:1 }}>{Math.max(0, daysLeft || 0)}</div>
                  <div style={{ fontSize:9, color:"#aaa", marginTop:2 }}>{t.countdown}</div>
                </>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, color:"#aaa" }}>
                {new Date(arrivalDate).toLocaleDateString(lang==="fr"?"fr-FR":lang==="es"?"es-ES":"en-US", { day:"numeric", month:"long", year:"numeric" })}
              </div>
              {datePassed && (
                <div style={{ fontSize:11, color:"#e8b84b", marginTop:4, fontWeight:600 }}>{t.datePassedMsg}</div>
              )}
            </div>
          </div>
        )}

        {/* Score animé */}
        <div style={{ background:"linear-gradient(135deg,rgba(232,184,75,.08),rgba(232,184,75,.04))", border:"1px solid rgba(232,184,75,.2)", borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontSize:12, color:"#e8b84b", fontWeight:700, textTransform:"uppercase" as const, letterSpacing:".08em" }}>
              {t.score} {score}%
            </div>
            <div style={{ fontSize:12, color:"#aaa" }}>{checked.length}/{items.length}</div>
          </div>
          <div style={{ height:8, background:"#1e2a3a", borderRadius:4, overflow:"hidden" }}>
            <div style={{
              height:"100%",
              width: score+"%",
              background: score===100 ? "linear-gradient(to right,#22c55e,#2dd4bf)" : "linear-gradient(to right,#e8b84b,#f97316)",
              borderRadius:4,
              transition:"width .4s ease",
            }}/>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
          {items.map(item => {
            const done = checked.includes(item.id);
            return (
              <div key={item.id} onClick={()=>toggle(item.id)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"14px", background:done?"rgba(34,197,94,.06)":"#141d2e", border:`1px solid ${done?"rgba(34,197,94,.3)":"#1e2a3a"}`, borderRadius:13, cursor:"pointer", transition:"all .2s" }}>
                <div style={{ width:24, height:24, borderRadius:7, background:done?"#22c55e":"transparent", border:`2px solid ${done?"#22c55e":"#2a3448"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .2s" }}>
                  {done && <span style={{ fontSize:12, color:"#000", fontWeight:800 }}>✓</span>}
                </div>
                <span style={{ fontSize:20, flexShrink:0 }}>{item.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:done?600:400, color:done?"#22c55e":"#f4f1ec", transition:"color .2s" }}>{item.label}</div>
                  <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bouton continuer — apparaît en animation quand 100% */}
        <div style={{
          overflow:"hidden",
          maxHeight: allDone ? 80 : 0,
          opacity: allDone ? 1 : 0,
          transition:"all .5s cubic-bezier(.34,1.56,.64,1)",
          marginBottom: allDone ? 12 : 0,
        }}>
          <button onClick={async () => {
            // ✅ Sauvegarder preArrivalCompleted dans Firebase avant de rediriger
            if (userId) {
              try {
                await updateDoc(doc(db, "users", userId), {
                  preArrivalCompleted: true,
                });
              } catch {}
            }
            window.location.href = "/dashboard";
          }}
            style={{ width:"100%", padding:"15px", background:"#22c55e", border:"none", borderRadius:13, color:"#000", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {t.btnContinue}
          </button>
        </div>

        {/* Bouton Je suis arrivé — TOUJOURS visible */}
        <button onClick={()=>setShowConfirm1(true)}
          style={{ width:"100%", padding:"14px", background:"rgba(232,184,75,.1)", border:"1.5px solid rgba(232,184,75,.35)", borderRadius:13, color:"#e8b84b", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
          {t.btnArrived}
        </button>

        {/* Mettre à jour la date */}
        <button onClick={()=>setShowDateUpdate(true)}
          style={{ width:"100%", padding:"11px", background:"transparent", border:"1px solid #1e2a3a", borderRadius:12, color:"#555", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          {t.retard} → {t.retardSub}
        </button>
      </div>

      {/* ══ MODAL CONFIRM 1 ══ */}
      {showConfirm1 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.93)", backdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setShowConfirm1(false)}>
          <div style={{ background:"#0f1521", border:"1.5px solid rgba(232,184,75,.3)", borderRadius:22, padding:"28px 22px", maxWidth:380, width:"100%", animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:52, textAlign:"center", marginBottom:14 }}>🛬</div>
            <h3 style={{ fontSize:20, fontWeight:800, textAlign:"center", marginBottom:8, color:"#f4f1ec" }}>{t.confirm1Title}</h3>
            <p style={{ fontSize:13, color:"#aaa", textAlign:"center", lineHeight:1.65, marginBottom:22 }}>{t.confirm1Sub}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={handleArrivedStep1Yes}
                style={{ width:"100%", padding:"13px", background:"#e8b84b", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {t.confirm1Yes}
              </button>
              <button onClick={()=>setShowConfirm1(false)}
                style={{ width:"100%", padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
                {t.confirm1No}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL CONFIRM 2 ══ */}
      {showConfirm2 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.93)", backdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setShowConfirm2(false)}>
          <div style={{ background:"#0f1521", border:"1.5px solid rgba(239,68,68,.35)", borderRadius:22, padding:"28px 22px", maxWidth:380, width:"100%", animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:52, textAlign:"center", marginBottom:14 }}>🇺🇸</div>
            <h3 style={{ fontSize:20, fontWeight:800, textAlign:"center", marginBottom:8, color:"#f4f1ec" }}>{t.confirm2Title}</h3>
            <p style={{ fontSize:13, color:"#aaa", textAlign:"center", lineHeight:1.65, marginBottom:8 }}>{t.confirm2Sub}</p>
            <div style={{ fontSize:12, color:"#ef4444", textAlign:"center", marginBottom:22, fontWeight:600 }}>{t.confirm2Warn}</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setShowConfirm2(false); }}
                style={{ flex:1, padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                {t.confirm2No}
              </button>
              <button onClick={handleArrivedConfirm} disabled={saving}
                style={{ flex:2, padding:"13px", background:saving?"#555":"#22c55e", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:saving?"default":"pointer", fontFamily:"inherit", opacity:saving?.7:1 }}>
                {saving ? "⏳..." : t.confirm2Yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL SUCCÈS ══ */}
      {showSuccess && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.95)", backdropFilter:"blur(10px)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"linear-gradient(135deg,#0f1521,#1a2438)", border:"1.5px solid rgba(34,197,94,.4)", borderRadius:24, padding:"40px 28px", maxWidth:380, width:"100%", textAlign:"center", animation:"alertPop .5s cubic-bezier(.34,1.56,.64,1)" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
            <h2 style={{ fontSize:24, fontWeight:900, color:"#22c55e", marginBottom:10 }}>{t.successTitle}</h2>
            <p style={{ fontSize:14, color:"#aaa", lineHeight:1.7, marginBottom:28 }}>{t.successSub}</p>
            <button onClick={()=>window.location.href="/dashboard"}
              style={{ width:"100%", padding:"15px", background:"#22c55e", border:"none", borderRadius:13, color:"#000", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {t.successBtn}
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL MISE À JOUR DATE ══ */}
      {showDateUpdate && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.93)", backdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setShowDateUpdate(false)}>
          <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:22, padding:"28px 22px", maxWidth:380, width:"100%", animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:"#f4f1ec" }}>
              📅 {t.btnUpdateDate}
            </h3>
            <p style={{ fontSize:13, color:"#aaa", marginBottom:16, lineHeight:1.6 }}>
              {lang==="fr"?"Quelle est ta nouvelle date d'arrivée ?":lang==="es"?"¿Cuál es tu nueva fecha de llegada?":"What is your new arrival date?"}
            </p>
            <input
              type="date"
              value={newDate}
              onChange={e=>setNewDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{ width:"100%", padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:11, color:"#f4f1ec", fontSize:16, fontFamily:"inherit", outline:"none", boxSizing:"border-box" as const, marginBottom:14 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowDateUpdate(false)}
                style={{ flex:1, padding:"12px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:11, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                {lang==="fr"?"Annuler":lang==="es"?"Cancelar":"Cancel"}
              </button>
              <button onClick={handleUpdateDate} disabled={!newDate || saving}
                style={{ flex:2, padding:"12px", background:newDate?"#e8b84b":"#1e2a3a", border:"none", borderRadius:11, color:newDate?"#000":"#555", fontSize:13, fontWeight:700, cursor:newDate?"pointer":"default", fontFamily:"inherit" }}>
                {saving?"⏳...":lang==="fr"?"Mettre à jour":lang==="es"?"Actualizar":"Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin       { to { transform:rotate(360deg) } }
        @keyframes alertPop   { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
      `}</style>
    </div>
  );
}
