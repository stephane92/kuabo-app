"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { ChevronRight, Globe, LogOut, Search } from "lucide-react";

import ExplorerTab   from "../components/ExplorerTab";
import ProfileTab    from "./components/ProfileTab";
import HomeTab, { BottomNav } from "./components/HomeTab";
import JobsTab       from "./components/JobsTab";
import { SearchModal, StepModal, ArmyGuideModal, PhaseUnlockOverlay } from "./components/Modals";
import DemoGuide     from "./components/DemoGuide";
import { PHASE_STEPS } from "./components/data";
import { getPhaseStats, useStreak } from "./components/utils";
import { computeStatus, computeDaysInUSA, type UserStatus } from "@/lib/statusSystem";
import type { Lang, PhaseId } from "./components/data";

// ══════════════════════════════════════════════
// BANNIÈRE "JE SUIS ARRIVÉ"
// Visible quand preArrivalCompleted=true mais arrivalConfirmed=false
// ══════════════════════════════════════════════
function ArrivalBanner({ lang, userName, arrivalDate, userId, onConfirmed }: {
  lang: Lang; userName: string; arrivalDate: string | null;
  userId: string; onConfirmed: () => void;
}) {
  const [showConfirm1,   setShowConfirm1]   = useState(false);
  const [showConfirm2,   setShowConfirm2]   = useState(false);
  const [showDateUpdate, setShowDateUpdate] = useState(false);
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [newDate,        setNewDate]        = useState("");
  const [saving,         setSaving]         = useState(false);
  const [dismissed,      setDismissed]      = useState(false);

  const T = {
    fr: {
      banner:   "Tu es arrivé aux USA ?",
      bannerSub:"Confirme ton arrivée pour débloquer toutes les fonctionnalités",
      btnArrive:"Je suis arrivé ! 🛬",
      btnDate:  "Changer ma date",
      c1Title:  "Tu es arrivé aux USA ? 🛬",
      c1Sub:    "Cette action va mettre à jour ton statut et débloquer toutes les fonctionnalités.",
      c1Yes:    "Oui, je suis aux USA ! ✅",
      c1No:     "Pas encore ⏳",
      c2Title:  "Tu confirmes ? 🇺🇸",
      c2Sub:    "Tu es bien physiquement aux États-Unis en ce moment ?",
      c2Warn:   "⚠️ Cette action est irréversible",
      c2Yes:    "✅ Oui, je confirme !",
      c2No:     "← Non, erreur",
      dateTitle:"Changer ma date d'arrivée",
      dateSub:  "Quelle est ta nouvelle date d'arrivée prévue ?",
      dateBtn:  "Mettre à jour",
      dateCancel:"Annuler",
    },
    en: {
      banner:   "Have you arrived in the USA?",
      bannerSub:"Confirm your arrival to unlock all features",
      btnArrive:"I've arrived! 🛬",
      btnDate:  "Change my date",
      c1Title:  "Have you arrived in the USA? 🛬",
      c1Sub:    "This action will update your status and unlock all features.",
      c1Yes:    "Yes, I'm in the USA! ✅",
      c1No:     "Not yet ⏳",
      c2Title:  "Can you confirm? 🇺🇸",
      c2Sub:    "Are you physically in the United States right now?",
      c2Warn:   "⚠️ This action is irreversible",
      c2Yes:    "✅ Yes, I confirm!",
      c2No:     "← No, mistake",
      dateTitle:"Change my arrival date",
      dateSub:  "What is your new expected arrival date?",
      dateBtn:  "Update",
      dateCancel:"Cancel",
    },
    es: {
      banner:   "¿Has llegado a EE.UU.?",
      bannerSub:"Confirma tu llegada para desbloquear todas las funciones",
      btnArrive:"¡He llegado! 🛬",
      btnDate:  "Cambiar mi fecha",
      c1Title:  "¿Has llegado a EE.UU.? 🛬",
      c1Sub:    "Esta acción actualizará tu estado y desbloqueará todas las funciones.",
      c1Yes:    "¡Sí, estoy en EE.UU.! ✅",
      c1No:     "Todavía no ⏳",
      c2Title:  "¿Puedes confirmarlo? 🇺🇸",
      c2Sub:    "¿Estás físicamente en los Estados Unidos ahora mismo?",
      c2Warn:   "⚠️ Esta acción es irreversible",
      c2Yes:    "✅ ¡Sí, confirmo!",
      c2No:     "← No, error",
      dateTitle:"Cambiar mi fecha de llegada",
      dateSub:  "¿Cuál es tu nueva fecha de llegada prevista?",
      dateBtn:  "Actualizar",
      dateCancel:"Cancelar",
    },
  }[lang];

  const handleConfirm = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await updateDoc(doc(db, "users", userId), {
        arrivalConfirmed: true,
        arrivalDate:      today,
        status:           "new",
        daysInUSA:        0,
      });
      setShowConfirm2(false);
      setShowConfetti(true);
      setTimeout(() => { setShowConfetti(false); onConfirmed(); }, 2000);
    } catch {}
    setSaving(false);
  };

  const handleUpdateDate = async () => {
    if (!userId || !newDate) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), { arrivalDate: newDate });
      setShowDateUpdate(false);
      setNewDate("");
    } catch {}
    setSaving(false);
  };

  if (dismissed) return null;

  const confettiColors = ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa"];
  const pieces = Array.from({length:25},(_,i)=>({ id:i, x:Math.random()*100, delay:Math.random()*.5, dur:1.3+Math.random()*.8, color:confettiColors[i%5], size:5+Math.random()*8 }));

  return (
    <>
      {/* Confetti */}
      {showConfetti && pieces.map(p=>(
        <div key={p.id} style={{ position:"fixed", left:p.x+"%", top:-20, width:p.size, height:p.size, borderRadius:"50%", background:p.color, zIndex:9999, pointerEvents:"none", animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards` }}/>
      ))}

      {/* Bannière */}
      <div style={{ background:"linear-gradient(135deg,rgba(232,184,75,.1),rgba(232,184,75,.05))", border:"1px solid rgba(232,184,75,.25)", borderRadius:14, padding:"14px 16px", marginBottom:14, position:"relative" }}>
        <button onClick={()=>setDismissed(true)} style={{ position:"absolute", top:8, right:10, background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
        <div style={{ fontSize:11, color:"#e8b84b", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" as const, marginBottom:4 }}>
          🛬 {T.banner}
        </div>
        <div style={{ fontSize:12, color:"#aaa", marginBottom:12, lineHeight:1.5 }}>{T.bannerSub}</div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowConfirm1(true)}
            style={{ flex:2, padding:"11px", background:"#e8b84b", border:"none", borderRadius:10, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {T.btnArrive}
          </button>
          <button onClick={()=>setShowDateUpdate(true)}
            style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid #1e2a3a", borderRadius:10, color:"#aaa", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
            📅 {T.btnDate}
          </button>
        </div>
      </div>

      {/* Modal Confirm 1 */}
      {showConfirm1 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.93)", backdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setShowConfirm1(false)}>
          <div style={{ background:"#0f1521", border:"1.5px solid rgba(232,184,75,.3)", borderRadius:22, padding:"28px 22px", maxWidth:380, width:"100%", animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:52, textAlign:"center" as const, marginBottom:14 }}>🛬</div>
            <h3 style={{ fontSize:20, fontWeight:800, textAlign:"center" as const, marginBottom:8, color:"#f4f1ec" }}>{T.c1Title}</h3>
            <p style={{ fontSize:13, color:"#aaa", textAlign:"center" as const, lineHeight:1.65, marginBottom:22 }}>{T.c1Sub}</p>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
              <button onClick={()=>{ setShowConfirm1(false); setTimeout(()=>setShowConfirm2(true),200); }}
                style={{ width:"100%", padding:"13px", background:"#e8b84b", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {T.c1Yes}
              </button>
              <button onClick={()=>setShowConfirm1(false)}
                style={{ width:"100%", padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
                {T.c1No}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm 2 */}
      {showConfirm2 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.93)", backdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setShowConfirm2(false)}>
          <div style={{ background:"#0f1521", border:"1.5px solid rgba(239,68,68,.35)", borderRadius:22, padding:"28px 22px", maxWidth:380, width:"100%", animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:52, textAlign:"center" as const, marginBottom:14 }}>🇺🇸</div>
            <h3 style={{ fontSize:20, fontWeight:800, textAlign:"center" as const, marginBottom:8, color:"#f4f1ec" }}>{T.c2Title}</h3>
            <p style={{ fontSize:13, color:"#aaa", textAlign:"center" as const, lineHeight:1.65, marginBottom:8 }}>{T.c2Sub}</p>
            <div style={{ fontSize:12, color:"#ef4444", textAlign:"center" as const, marginBottom:22, fontWeight:600 }}>{T.c2Warn}</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowConfirm2(false)}
                style={{ flex:1, padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                {T.c2No}
              </button>
              <button onClick={handleConfirm} disabled={saving}
                style={{ flex:2, padding:"13px", background:saving?"#555":"#22c55e", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:saving?"default":"pointer", fontFamily:"inherit", opacity:saving?.7:1 }}>
                {saving?"⏳...":T.c2Yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Changer Date */}
      {showDateUpdate && (
        <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.93)", backdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={()=>setShowDateUpdate(false)}>
          <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:22, padding:"28px 22px", maxWidth:380, width:"100%", animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:36, textAlign:"center" as const, marginBottom:14 }}>📅</div>
            <h3 style={{ fontSize:18, fontWeight:700, textAlign:"center" as const, marginBottom:8, color:"#f4f1ec" }}>{T.dateTitle}</h3>
            <p style={{ fontSize:13, color:"#aaa", textAlign:"center" as const, marginBottom:18, lineHeight:1.6 }}>{T.dateSub}</p>
            <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{ width:"100%", padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:11, color:"#f4f1ec", fontSize:16, fontFamily:"inherit", outline:"none", boxSizing:"border-box" as const, marginBottom:14 }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowDateUpdate(false)}
                style={{ flex:1, padding:"12px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:11, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                {T.dateCancel}
              </button>
              <button onClick={handleUpdateDate} disabled={!newDate||saving}
                style={{ flex:2, padding:"12px", background:newDate?"#e8b84b":"#1e2a3a", border:"none", borderRadius:11, color:newDate?"#000":"#555", fontSize:13, fontWeight:700, cursor:newDate?"pointer":"default", fontFamily:"inherit" }}>
                {saving?"⏳...":T.dateBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ══════════════════════════════════════════════
function WelcomeAnimation({ lang, userName, userStatus, arrival, onDone }: {
  lang: Lang; userName: string; userStatus: UserStatus;
  arrival?: string; onDone: () => void;
}) {
  const [step, setStep] = useState(0);

  // Contenu selon la situation
  const content = {
    // Pas encore arrivé mais a complété la checklist
    not_arrived: {
      fr: { emoji:"🛫", title:`${userName}, tu es presque prêt !`, msg:"Ta checklist est complète. Kuabo va t'accompagner jusqu'à ton arrivée et après.", color:"#e8b84b" },
      en: { emoji:"🛫", title:`${userName}, you're almost ready!`, msg:"Your checklist is complete. Kuabo will guide you until your arrival and beyond.", color:"#e8b84b" },
      es: { emoji:"🛫", title:`${userName}, ¡ya casi estás listo!`, msg:"Tu lista está completa. Kuabo te acompañará hasta tu llegada y más allá.", color:"#e8b84b" },
    },
    // Vient d'arriver
    new: {
      fr: { emoji:"🇺🇸", title:`Bienvenue aux USA, ${userName} !`, msg:"Tu viens d'arriver. Kuabo va t'aider à poser les bases essentielles dès maintenant.", color:"#22c55e" },
      en: { emoji:"🇺🇸", title:`Welcome to the USA, ${userName}!`, msg:"You just arrived. Kuabo will help you set up the essentials right now.", color:"#22c55e" },
      es: { emoji:"🇺🇸", title:`¡Bienvenido a EE.UU., ${userName}!`, msg:"Acabas de llegar. Kuabo te ayudará a establecer lo esencial ahora mismo.", color:"#22c55e" },
    },
    // Depuis quelques mois
    settling: {
      fr: { emoji:"💪", title:`Tu avances bien, ${userName} !`, msg:"Tu es en train de t'installer. Kuabo va t'aider à ne rien oublier d'important.", color:"#2dd4bf" },
      en: { emoji:"💪", title:`You're making progress, ${userName}!`, msg:"You're settling in. Kuabo will help you make sure nothing important is missed.", color:"#2dd4bf" },
      es: { emoji:"💪", title:`¡Estás progresando, ${userName}!`, msg:"Te estás instalando. Kuabo te ayudará a no olvidar nada importante.", color:"#2dd4bf" },
    },
    // Bien installé
    established: {
      fr: { emoji:"🚀", title:`Impressionnant, ${userName} !`, msg:"Tu es bien installé. Kuabo va t'aider à passer au niveau supérieur.", color:"#a78bfa" },
      en: { emoji:"🚀", title:`Impressive, ${userName}!`, msg:"You're well established. Kuabo will help you level up.", color:"#a78bfa" },
      es: { emoji:"🚀", title:`¡Impresionante, ${userName}!`, msg:"Estás bien establecido. Kuabo te ayudará a subir de nivel.", color:"#a78bfa" },
    },
  };

  // Choisir selon arrival (ancien champ) ou userStatus
  let key: keyof typeof content = "new";
  if (userStatus === "settling")    key = "settling";
  else if (userStatus === "established") key = "established";
  else if (arrival === "abroad")    key = "not_arrived";
  else if (arrival === "months")    key = "settling";
  else if (arrival === "settled")   key = "established";

  const c = content[key][lang];
  const particles = Array.from({length:20},(_,i)=>({
    id:i, x:Math.random()*100, delay:Math.random()*.5,
    dur:1.2+Math.random()*.8, color:["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa"][i%5],
    size:5+Math.random()*8,
  }));

  useEffect(() => {
    const t1 = setTimeout(()=>setStep(1), 100);
    const t2 = setTimeout(()=>setStep(2), 600);
    const t3 = setTimeout(()=>setStep(3), 1300);
    const t4 = setTimeout(onDone, 3000);
    return ()=>{ clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4); };
  }, [onDone]);

  return (
    <>
      {/* Confetti */}
      {step>=1 && particles.map(p=>(
        <div key={p.id} style={{ position:"fixed", left:p.x+"%", top:-20, width:p.size, height:p.size, borderRadius:"50%", background:p.color, zIndex:9999, pointerEvents:"none", animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards` }}/>
      ))}

      {/* Overlay */}
      <div onClick={onDone} style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.93)", backdropFilter:"blur(8px)", zIndex:998, animation:"fadeIn .3s ease" }}/>

      {/* Card centrale */}
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:999, width:300, animation:"popIn .5s cubic-bezier(.34,1.56,.64,1)", pointerEvents:"none" }}>
        <div style={{ background:"linear-gradient(135deg,#0f1521,#1a2438)", border:`1.5px solid ${c.color}50`, borderRadius:24, padding:"36px 24px", textAlign:"center", boxShadow:`0 24px 64px rgba(0,0,0,.7), 0 0 40px ${c.color}15` }}>
          {step>=1 && <div style={{ fontSize:64, marginBottom:16, display:"inline-block", animation:"emojiPop .4s cubic-bezier(.34,1.56,.64,1)" }}>{c.emoji}</div>}
          {step>=2 && <div style={{ fontSize:19, fontWeight:800, color:c.color, marginBottom:10, animation:"slideUp .4s ease" }}>{c.title}</div>}
          {step>=3 && <div style={{ fontSize:13, color:"rgba(244,241,236,.7)", lineHeight:1.65, marginBottom:20, animation:"slideUp .4s ease" }}>{c.msg}</div>}
          <div style={{ height:3, background:"#1e2a3a", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", background:`linear-gradient(to right,${c.color},#2dd4bf)`, borderRadius:3, animation:"barFill 3s linear forwards" }}/>
          </div>
          <div style={{ fontSize:10, color:"#333", marginTop:8 }}>
            {lang==="fr"?"Tape pour continuer":lang==="es"?"Toca para continuar":"Tap to continue"}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// POPUP LÉGÈRE — NEW USER (lightCheck)
// Message personnalisé selon la situation
// ══════════════════════════════════════════════
function LightCheckPopup({ lang, userStatus, arrival, onClose }: {
  lang: Lang; userStatus: UserStatus; arrival?: string; onClose: () => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);

  // Titre + sous-titre selon la situation
  const headers = {
    not_arrived: {
      fr:{ title:"Presque prêt 🛫",      sub:"Avant ton départ, vérifions les essentiels." },
      en:{ title:"Almost ready 🛫",       sub:"Before you leave, let's check the essentials." },
      es:{ title:"Casi listo 🛫",         sub:"Antes de partir, verifiquemos lo esencial." },
    },
    new: {
      fr:{ title:"Bienvenue aux USA 🇺🇸", sub:"Tu viens d'arriver — vérifions que tu as les essentiels pour ta première semaine." },
      en:{ title:"Welcome to the USA 🇺🇸",sub:"You just arrived — let's make sure you have the essentials for your first week." },
      es:{ title:"Bienvenido a EE.UU. 🇺🇸",sub:"Acabas de llegar — asegurémonos de que tienes lo esencial para tu primera semana." },
    },
    settling: {
      fr:{ title:"Tu t'installes bien 💪", sub:"Quelques mois déjà — vérifions que tu as tout en place." },
      en:{ title:"Settling in well 💪",    sub:"A few months in — let's make sure everything is in place." },
      es:{ title:"Te instalas bien 💪",    sub:"Unos meses ya — asegurémonos de que todo está en su lugar." },
    },
    established: {
      fr:{ title:"Bien établi 🚀",         sub:"Optimisons ta situation — quelques vérifications rapides." },
      en:{ title:"Well established 🚀",    sub:"Let's optimize your situation — a few quick checks." },
      es:{ title:"Bien establecido 🚀",    sub:"Optimicemos tu situación — algunas comprobaciones rápidas." },
    },
  };

  // Choisir la bonne clé
  let hKey: keyof typeof headers = "new";
  if (userStatus === "settling")         hKey = "settling";
  else if (userStatus === "established") hKey = "established";
  else if (arrival === "abroad")         hKey = "not_arrived";
  else if (arrival === "months")         hKey = "settling";
  else if (arrival === "settled")        hKey = "established";

  const h = headers[hKey][lang];

  const items = {
    fr:[
      { id:"address",  emoji:"📍", label:"Adresse actuelle",    desc:"Tu sais où tu dors ce soir ?" },
      { id:"phone",    emoji:"📱", label:"Numéro actif",         desc:"Une SIM américaine fonctionnelle" },
      { id:"payment",  emoji:"💳", label:"Moyen de paiement",    desc:"Carte ou cash disponible" },
      { id:"id",       emoji:"🪪", label:"Pièce d'identité",     desc:"Passeport ou autre doc" },
      { id:"internet", emoji:"🌐", label:"Accès internet",       desc:"WiFi ou données mobiles" },
    ],
    en:[
      { id:"address",  emoji:"📍", label:"Current address",      desc:"Do you know where you're sleeping tonight?" },
      { id:"phone",    emoji:"📱", label:"Active number",         desc:"A working US SIM card" },
      { id:"payment",  emoji:"💳", label:"Payment method",        desc:"Card or cash available" },
      { id:"id",       emoji:"🪪", label:"ID document",           desc:"Passport or other document" },
      { id:"internet", emoji:"🌐", label:"Internet access",       desc:"WiFi or mobile data" },
    ],
    es:[
      { id:"address",  emoji:"📍", label:"Dirección actual",      desc:"¿Sabes dónde dormirás esta noche?" },
      { id:"phone",    emoji:"📱", label:"Número activo",          desc:"Una SIM americana funcionando" },
      { id:"payment",  emoji:"💳", label:"Medio de pago",          desc:"Tarjeta o efectivo disponible" },
      { id:"id",       emoji:"🪪", label:"Documento de identidad", desc:"Pasaporte u otro documento" },
      { id:"internet", emoji:"🌐", label:"Acceso a internet",      desc:"WiFi o datos móviles" },
    ],
  }[lang];

  const btnLabel = { fr:"Continuer →", en:"Continue →", es:"Continuar →" }[lang];
  const note     = { fr:"Tu peux compléter ça plus tard dans ton profil.", en:"You can complete this later in your profile.", es:"Puedes completar esto más tarde en tu perfil." }[lang];

  const toggle = (id: string) =>
    setChecked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.92)", backdropFilter:"blur(8px)", zIndex:400, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 12px 20px" }}>
      <div style={{ background:"#0f1521", border:"1.5px solid rgba(232,184,75,.25)", borderRadius:22, padding:"24px 18px", width:"100%", maxWidth:480, animation:"slideUp .4s ease" }}>
        <h3 style={{ fontSize:18, fontWeight:800, textAlign:"center" as const, color:"#f4f1ec", marginBottom:6 }}>{h.title}</h3>
        <p style={{ fontSize:12, color:"#aaa", textAlign:"center" as const, marginBottom:18, lineHeight:1.6 }}>{h.sub}</p>

        <div style={{ display:"flex", flexDirection:"column" as const, gap:8, marginBottom:18 }}>
          {items.map(item => {
            const done = checked.includes(item.id);
            return (
              <div key={item.id} onClick={()=>toggle(item.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", background:done?"rgba(34,197,94,.06)":"#141d2e", border:`1px solid ${done?"rgba(34,197,94,.25)":"#1e2a3a"}`, borderRadius:11, cursor:"pointer", transition:"all .2s" }}>
                <div style={{ width:20, height:20, borderRadius:6, background:done?"#22c55e":"transparent", border:`2px solid ${done?"#22c55e":"#2a3448"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {done && <span style={{ fontSize:10, color:"#000", fontWeight:800 }}>✓</span>}
                </div>
                <span style={{ fontSize:18 }}>{item.emoji}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:done?"#22c55e":"#f4f1ec" }}>{item.label}</div>
                  <div style={{ fontSize:10, color:"#555" }}>{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose}
          style={{ width:"100%", padding:"13px", background:"#e8b84b", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          {btnLabel}
        </button>
        <div style={{ fontSize:11, color:"#555", textAlign:"center" as const, marginTop:10 }}>{note}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════
export default function Dashboard() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── State utilisateur ──────────────────────────────────
  const [ready,            setReady]            = useState(false);
  const [lang,             setLang]             = useState<Lang>("fr");
  const [activeTab,        setActiveTab]        = useState<string>("home");
  const [userName,         setUserName]         = useState("");
  const [userEmail,        setUserEmail]        = useState("");
  const [userCountry,      setUserCountry]      = useState("us");
  const [userState,        setUserState]        = useState("");
  const [userCity,         setUserCity]         = useState("");
  const [userId,           setUserId]           = useState<string | undefined>(undefined);
  const [completedSteps,   setCompletedSteps]   = useState<string[]>([]);
  const [arrivalDate,      setArrivalDate]      = useState<string | null>(null);
  const [armyStatus,       setArmyStatus]       = useState("");
  const [menuOpen,         setMenuOpen]         = useState(false);

  // ── Status system ──────────────────────────────────────
  const [userStatus,       setUserStatus]       = useState<UserStatus>("not_arrived");
  const [lightCheckSeen,   setLightCheckSeen]   = useState(false);
  const [showWelcome,      setShowWelcome]      = useState(false);
  const [showLightCheck,   setShowLightCheck]   = useState(false);
  const [userArrival,      setUserArrival]      = useState<string>("");
  const [arrivalConfirmed, setArrivalConfirmed] = useState(false);
  const [preArrivalDone,   setPreArrivalDone]   = useState(false);

  // ── State démo ─────────────────────────────────────────
  const [showDemo,         setShowDemo]         = useState(false);
  const [demoHighlight,    setDemoHighlight]    = useState<string | null>(null);
  const [toast,            setToast]            = useState<string | null>(null);
  const [lastAction,       setLastAction]       = useState<string | null>(null);
  const [preChecklist,     setPreChecklist]     = useState<Record<string, boolean>>({});

  // ── State modals ───────────────────────────────────────
  const [showSearch,       setShowSearch]       = useState(false);
  const [activeStepModal,  setActiveStepModal]  = useState<string | null>(null);
  const [showArmyGuide,    setShowArmyGuide]    = useState(false);
  const [phaseUnlockAnim,  setPhaseUnlockAnim]  = useState<PhaseId | null>(null);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [deleteStep,       setDeleteStep]       = useState(1);
  const [deleteInput,      setDeleteInput]      = useState("");
  const [deleting,         setDeleting]         = useState(false);
  const [deleteError,      setDeleteError]      = useState("");

  const streak                        = useStreak(userId);
  const { currentPhase, phaseProgress } = getPhaseStats(completedSteps);

  useEffect(() => { pageRef.current?.scrollTo({ top: 0, behavior: "auto" }); }, [activeTab]);

  // ── Auth + Firebase ────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("preChecklist");
    if (saved) try { setPreChecklist(JSON.parse(saved)); } catch {}

    const timeout = setTimeout(() => setReady(true), 5000);
    const unsub   = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.uid);
      setUserEmail(user.email || "");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? (snap.data() as any) : {};
        const savedLang = localStorage.getItem("lang") as Lang;

        const rawName = data?.name;
        const name = (!rawName || rawName === "***" || rawName === "")
          ? (user.displayName || user.email?.split("@")[0] || "User")
          : rawName;
        if (rawName === "***" || rawName === "") {
          try { await updateDoc(doc(db, "users", user.uid), { name, deleted: false }); } catch {}
        }

        const userLang = (data?.lang as Lang) || savedLang || "fr";
        setUserName(name);
        setLang(userLang);
        setCompletedSteps(data?.completedSteps || []);
        setUserCountry(data?.country || "us");
        setUserState(data?.location?.state || "");
        setUserCity(data?.location?.city || "");
        setArrivalDate(data?.arrivalDate || null);
        setArmyStatus(data?.armyStatus || "");
        setUserArrival(data?.arrival || "");
        setArrivalConfirmed(!!data?.arrivalConfirmed);
        setPreArrivalDone(!!data?.preArrivalCompleted);
        localStorage.setItem("userName", name);
        localStorage.setItem("lang", userLang);

        // ✅ STATUS SYSTEM
        const status = computeStatus({
          arrivalConfirmed:    data?.arrivalConfirmed,
          arrivalDate:         data?.arrivalDate,
          arrival:             data?.arrival,
          preArrivalCompleted: data?.preArrivalCompleted, // ✅ manquait !
        });
        setUserStatus(status);

        // ✅ Rediriger si not_arrived
        if (status === "not_arrived") {
          window.location.href = "/pre-arrival";
          return;
        }

        // ✅ Popup légère pour new — une seule fois
        // Animation bienvenue D'ABORD, puis popup après
        const lcs = data?.lightCheckSeen || localStorage.getItem("kuabo_lightcheck_seen") === "true";
        setLightCheckSeen(lcs);
        if (!lcs) {
          // Animation bienvenue → puis popup après 3.2s
          setTimeout(() => setShowWelcome(true), 800);
        }

        // ✅ Démo — afficher si jamais vue
        const demoSeenLocal = localStorage.getItem("kuabo_demo_seen");
        if (!data?.demoSeen && !demoSeenLocal) {
          setTimeout(() => setShowDemo(true), 800);
        }

        // Mettre à jour daysInUSA en background
        if (data?.arrivalDate && data?.arrivalConfirmed) {
          const days = computeDaysInUSA(data.arrivalDate);
          updateDoc(doc(db, "users", user.uid), { daysInUSA: days, status }).catch(() => {});
        }

      } catch {}
      setReady(true);
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  // ── Fermer lightCheck ──────────────────────────────────
  const handleLightCheckClose = useCallback(async () => {
    setShowLightCheck(false);
    setLightCheckSeen(true);
    localStorage.setItem("kuabo_lightcheck_seen", "true");
    const user = auth.currentUser;
    if (user) {
      try { await updateDoc(doc(db, "users", user.uid), { lightCheckSeen: true }); } catch {}
    }
  }, []);

  // ── Actions ────────────────────────────────────────────
  const changeLang = useCallback(async (l: Lang) => {
    setLang(l); localStorage.setItem("lang", l); setMenuOpen(false);
    const user = auth.currentUser;
    if (user) try { await updateDoc(doc(db, "users", user.uid), { lang: l }); } catch {}
  }, []);

  const toggleStep = useCallback(async (stepId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    const msgs = {
      removed: { fr:"❌ Étape retirée",    en:"❌ Step removed",    es:"❌ Paso eliminado" },
      done:    { fr:"✅ Étape complétée !", en:"✅ Step completed!", es:"✅ ¡Paso completado!" },
    };
    setCompletedSteps(prev => {
      const isDone  = prev.includes(stepId);
      const updated = isDone ? prev.filter(s => s !== stepId) : [...prev, stepId];
      if (!isDone) {
        const phaseIds: PhaseId[] = [1, 2, 3, 4, 5];
        for (const pid of phaseIds) {
          const ids        = PHASE_STEPS[pid].map(s => s.id);
          const wasComplete = ids.every(id => prev.includes(id));
          const nowComplete = ids.every(id => updated.includes(id));
          if (!wasComplete && nowComplete) { setTimeout(() => setPhaseUnlockAnim(pid), 500); break; }
        }
      }
      setToast(isDone ? msgs.removed[lang] : msgs.done[lang]);
      setLastAction(stepId);
      setTimeout(() => setToast(null), 3000);
      updateDoc(doc(db, "users", user.uid), { completedSteps: updated }).catch(() => {});
      return updated;
    });
  }, [lang]);

  const undo = useCallback(async () => {
    if (!lastAction) return;
    const user = auth.currentUser;
    if (!user) return;
    setCompletedSteps(prev => {
      const updated = prev.filter(s => s !== lastAction);
      updateDoc(doc(db, "users", user.uid), { completedSteps: updated }).catch(() => {});
      return updated;
    });
    setToast(null); setLastAction(null);
  }, [lastAction]);

  const handleLogout = useCallback(async () => {
    try { await signOut(auth); } catch {}
    window.location.href = "/login";
  }, []);

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (deleteInput !== "DELETE") {
      setDeleteError(lang === "fr" ? "Tape DELETE pour confirmer" : "Type DELETE to confirm");
      return;
    }
    setDeleting(true);
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      await setDoc(doc(db, "deleted_users", user.uid), { ...data, deletedAt: new Date().toISOString(), originalUid: user.uid, originalEmail: user.email });
      await updateDoc(doc(db, "users", user.uid), { deleted: true, deletedAt: new Date().toISOString(), name: "***", email: "***", location: null, communityVisible: false });
      await deleteUser(user);
      localStorage.clear();
      window.location.href = "/home";
    } catch (err: any) {
      setDeleteError(err.code === "auth/requires-recent-login"
        ? (lang === "fr" ? "Reconnecte-toi d'abord" : "Please sign in again first")
        : (lang === "fr" ? "Erreur — réessaie" : "Error — try again"));
      setDeleting(false);
    }
  };

  const handleHomePress = useCallback(() => {
    if (activeTab === "home") pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    else setActiveTab("home");
  }, [activeTab]);

  // ── Loading ────────────────────────────────────────────
  if (!ready) return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0b0f1a", gap:14 }}>
      <div style={{ fontSize:28, fontWeight:900, fontFamily:"serif" }}>
        <span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span>
      </div>
      <svg width="36" height="36" viewBox="0 0 34 34" style={{ animation:"spin 1s linear infinite" }}>
        <circle cx="17" cy="17" r="13" fill="none" stroke="#1e2a3a" strokeWidth="4"/>
        <circle cx="17" cy="17" r="13" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="82" strokeDashoffset="62"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background:"#0b0f1a", height:"100dvh", overflow:"hidden", color:"#f4f1ec" }}>

      {/* Démo */}
      {showDemo && ready && (
        <DemoGuide lang={lang} userName={userName} onTabChange={tab=>setActiveTab(tab)} onHighlight={target=>setDemoHighlight(target)}/>
      )}

      {/* Animation bienvenue — avant lightCheck */}
      {showWelcome && (
        <WelcomeAnimation
          lang={lang}
          userName={userName}
          userStatus={userStatus}
          arrival={userArrival}
          onDone={() => { setShowWelcome(false); setShowLightCheck(true); }}
        />
      )}

      {/* LightCheck popup — personnalisée selon situation */}
      {showLightCheck && (
        <LightCheckPopup
          lang={lang}
          userStatus={userStatus}
          arrival={userArrival}
          onClose={handleLightCheckClose}
        />
      )}

      {/* Modals globaux */}
      {showSearch && <SearchModal lang={lang} onClose={()=>setShowSearch(false)}/>}
      <PhaseUnlockOverlay phaseId={phaseUnlockAnim} lang={lang} onDone={()=>setPhaseUnlockAnim(null)}/>
      <ArmyGuideModal armyStatus={showArmyGuide?armyStatus:null} lang={lang} onClose={()=>setShowArmyGuide(false)}/>
      <StepModal stepId={activeStepModal} lang={lang} completedSteps={completedSteps} onToggle={toggleStep} onClose={()=>setActiveStepModal(null)}/>

      {/* Modal suppression */}
      {showDeleteModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)", padding:"0 16px" }}
          onClick={()=>{ setShowDeleteModal(false); setDeleteStep(1); setDeleteInput(""); setDeleteError(""); }}>
          <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:20, padding:"24px 18px", width:"100%", maxWidth:480, animation:"alertPop .3s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e=>e.stopPropagation()}>
            {deleteStep===1 && (<>
              <div style={{ fontSize:40, textAlign:"center", marginBottom:14 }}>⚠️</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#ef4444", textAlign:"center", marginBottom:10 }}>{lang==="fr"?"Supprimer ton compte ?":"Delete your account?"}</div>
              <div style={{ fontSize:13, color:"#aaa", textAlign:"center", lineHeight:1.7, marginBottom:22 }}>{lang==="fr"?"Cette action est irréversible.":"This action is irreversible."}</div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>{setShowDeleteModal(false);setDeleteStep(1);}} style={{ flex:1, padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#f4f1ec", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>{lang==="fr"?"Annuler":"Cancel"}</button>
                <button onClick={()=>setDeleteStep(2)} style={{ flex:1, padding:"13px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:12, color:"#ef4444", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{lang==="fr"?"Continuer":"Continue"}</button>
              </div>
            </>)}
            {deleteStep===2 && (<>
              <div style={{ fontSize:40, textAlign:"center", marginBottom:14 }}>🗑️</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#ef4444", textAlign:"center", marginBottom:8 }}>{lang==="fr"?"Confirmation finale":"Final confirmation"}</div>
              <div style={{ fontSize:13, color:"#aaa", textAlign:"center", lineHeight:1.7, marginBottom:18 }}>{lang==="fr"?`Tape "DELETE" pour confirmer.`:`Type "DELETE" to confirm.`}</div>
              <input value={deleteInput} onChange={e=>{setDeleteInput(e.target.value);setDeleteError("");}} placeholder="DELETE"
                style={{ width:"100%", padding:"13px", background:"#141d2e", border:"1px solid "+(deleteInput==="DELETE"?"#ef4444":"#1e2a3a"), borderRadius:12, color:"#f4f1ec", fontSize:16, fontFamily:"inherit", outline:"none", marginBottom:10, boxSizing:"border-box" as const, textAlign:"center" as const, letterSpacing:".1em" }}/>
              {deleteError && <div style={{ fontSize:12, color:"#ef4444", textAlign:"center", marginBottom:10 }}>⚠️ {deleteError}</div>}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>{setDeleteStep(1);setDeleteInput("");setDeleteError("");}} style={{ flex:1, padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#f4f1ec", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>{lang==="fr"?"Retour":"Back"}</button>
                <button onClick={handleDeleteAccount} disabled={deleting||deleteInput!=="DELETE"}
                  style={{ flex:1, padding:"13px", background:deleteInput==="DELETE"?"#ef4444":"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:12, color:deleteInput==="DELETE"?"#fff":"#ef4444", fontSize:14, fontWeight:600, cursor:deleteInput==="DELETE"?"pointer":"default", fontFamily:"inherit", opacity:deleting?.7:1 }}>
                  {deleting?(lang==="fr"?"Suppression...":"Deleting..."):(lang==="fr"?"Supprimer définitivement":"Delete permanently")}
                </button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Zone scrollable */}
      <div ref={pageRef} style={{ height:"calc(100dvh - 68px)", overflowY:"auto", WebkitOverflowScrolling:"touch" as any }}>
        <div style={{ padding:"16px 16px 20px", maxWidth:480, margin:"0 auto" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontWeight:"bold", fontSize:22, letterSpacing:"-.02em" }}>
              <span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span>
            </div>
            <div ref={menuRef} style={{ position:"relative" }}>
              <div style={{ background:"#1a2438", padding:"7px 12px", borderRadius:10, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6, color:"#aaa" }} onClick={()=>setMenuOpen(!menuOpen)}>
                <Globe size={13} color="#aaa"/>
                <span style={{ maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{userName}</span>
                <ChevronRight size={13} color="#aaa" style={{ transform:menuOpen?"rotate(90deg)":"rotate(0deg)", transition:"transform .2s" }}/>
              </div>
              {menuOpen && (
                <div style={{ position:"absolute", right:0, top:"110%", background:"#1a2438", padding:"8px", borderRadius:12, minWidth:150, zIndex:100, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
                  <div style={{ padding:"8px 10px", cursor:"pointer", fontSize:13, borderRadius:7, color:"#f4f1ec" }} onClick={()=>changeLang("fr")}>🇫🇷 Français</div>
                  <div style={{ padding:"8px 10px", cursor:"pointer", fontSize:13, borderRadius:7, color:"#f4f1ec" }} onClick={()=>changeLang("en")}>🇺🇸 English</div>
                  <div style={{ padding:"8px 10px", cursor:"pointer", fontSize:13, borderRadius:7, color:"#f4f1ec" }} onClick={()=>changeLang("es")}>🇪🇸 Español</div>
                  <hr style={{ borderColor:"#2a3448", margin:"5px 0" }}/>
                  <div style={{ padding:"8px 10px", cursor:"pointer", fontSize:13, borderRadius:7, color:"#ef4444", display:"flex", alignItems:"center", gap:6 }} onClick={handleLogout}>
                    <LogOut size={13}/> {lang==="fr"?"Déconnexion":lang==="es"?"Cerrar sesión":"Logout"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barre de recherche */}
          <button onClick={()=>setShowSearch(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, padding:"12px 14px", marginBottom:16, cursor:"pointer", fontFamily:"inherit", textAlign:"left" as const }}>
            <Search size={16} color="#555"/>
            <span style={{ fontSize:14, color:"#555", flex:1 }}>{{ fr:"🔍 Chercher un guide...", en:"🔍 Search a guide...", es:"🔍 Buscar una guía..." }[lang]}</span>
          </button>

          {/* ── Onglets ── */}
          {activeTab==="home" && (
            <>
              {/* Bannière "Je suis arrivé" si checklist faite mais pas encore confirmé */}
              {preArrivalDone && !arrivalConfirmed && userId && (
                <ArrivalBanner
                  lang={lang}
                  userName={userName}
                  arrivalDate={arrivalDate}
                  userId={userId}
                  onConfirmed={() => {
                    setArrivalConfirmed(true);
                    setUserStatus("new");
                    // Déclencher animation bienvenue après confirmation
                    setTimeout(() => setShowWelcome(true), 500);
                  }}
                />
              )}
              <HomeTab
                lang={lang} userId={userId} completedSteps={completedSteps}
                currentPhase={currentPhase} phaseProgress={phaseProgress}
                arrivalDate={arrivalDate} armyStatus={armyStatus}
                userState={userState} userCity={userCity} userCountry={userCountry}
                streak={streak} userStatus={userStatus}
                onOpenStep={setActiveStepModal}
                onViewArmyGuide={()=>setShowArmyGuide(true)}
              />
            </>
          )}
          {activeTab==="explorer" && <ExplorerTab lang={lang} completedSteps={completedSteps} userId={userId}/>}
          {activeTab==="jobs"     && <JobsTab lang={lang} userId={userId}/>}
          {activeTab==="profile"  && (
            <div style={{ marginTop:4 }}>
              <ProfileTab userName={userName} userEmail={userEmail} userCountry={userCountry} userState={userState} userCity={userCity} lang={lang} completedSteps={completedSteps} armyStatus={armyStatus} onArmyChange={setArmyStatus} changeLang={changeLang} onLogout={handleLogout} onDeleteAccount={()=>setShowDeleteModal(true)}/>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"#1a2438", padding:"10px 18px", borderRadius:12, border:"1px solid rgba(255,255,255,.07)", boxShadow:"0 8px 24px rgba(0,0,0,.4)", zIndex:999, display:"flex", alignItems:"center" }}>
          <span style={{ fontSize:13 }}>{toast}</span>
          {lastAction && <span onClick={undo} style={{ marginLeft:10, cursor:"pointer", color:"#e8b84b", fontSize:13, display:"inline-flex", alignItems:"center", gap:4 }}>↩ {lang==="fr"?"Annuler":lang==="es"?"Deshacer":"Undo"}</span>}
        </div>
      )}

      {/* Bottom Nav — 4 onglets */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} onHomePress={handleHomePress}/>

      <style>{`
        @keyframes spin         { to { transform:rotate(360deg) } }
        @keyframes alertPop     { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes slideUp      { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes popIn        { 0%{transform:translate(-50%,-50%) scale(.85);opacity:0} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes emojiPop     { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes barFill      { from{width:0%} to{width:100%} }
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
      `}</style>
    </div>
  );
}
