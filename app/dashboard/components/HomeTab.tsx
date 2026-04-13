"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { ChevronRight, Flame, Lock } from "lucide-react";
import { PHASES_META, PHASE_STEPS, STEP_GUIDES, BADGES } from "./data";
import { isPhaseUnlocked, addDays, getDaysLeft } from "./utils";
import type { Lang, PhaseId } from "./data";
import type { UserStatus } from "@/lib/statusSystem";

// ══════════════════════════════════════════════
// CIRCULAR HERO
// ══════════════════════════════════════════════
function CircularHero({ currentPhase, phaseProgress, lang }: {
  currentPhase: PhaseId;
  phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }>;
  lang: Lang;
}) {
  const meta      = PHASES_META[currentPhase];
  const prog      = phaseProgress[currentPhase];
  const size = 96, sw = 8, r = (size - sw) / 2;
  const circ      = 2 * Math.PI * r;
  const offset    = circ - (prog.pct / 100) * circ;
  const nextPhase = (currentPhase + 1) as PhaseId;
  const nextMeta  = currentPhase < 5 ? PHASES_META[nextPhase] : null;
  const leftCount = prog.total - prog.done;
  const L = {
    fr: { done:`${prog.done} étape${prog.done!==1?"s":""} complétée${prog.done!==1?"s":""}`, left:leftCount===0?"Toutes complétées ! 🎉":`${leftCount} restante${leftCount!==1?"s":""} pour débloquer` },
    en: { done:`${prog.done} step${prog.done!==1?"s":""} completed`,                         left:leftCount===0?"All completed! 🎉":`${leftCount} left to unlock` },
    es: { done:`${prog.done} paso${prog.done!==1?"s":""} completado${prog.done!==1?"s":""}`, left:leftCount===0?"¡Todos completados! 🎉":`${leftCount} restante${leftCount!==1?"s":""} para desbloquear` },
  }[lang];

  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, background:"linear-gradient(135deg,#141d2e,#0f1521)", border:`1px solid ${meta.color}30`, borderRadius:18, padding:"18px", marginBottom:14, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"-20px", right:"-20px", width:100, height:100, background:`radial-gradient(circle,${meta.color}08,transparent 70%)`, pointerEvents:"none" }}/>
      <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
        <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={meta.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition:"stroke-dashoffset 0.8s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontSize:22, fontWeight:900, color:meta.color, lineHeight:1 }}>{prog.pct}%</div>
          <div style={{ fontSize:9, color:"#aaa", marginTop:2, letterSpacing:"0.04em" }}>Phase {currentPhase}</div>
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:meta.color, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" as const, marginBottom:4 }}>{meta.emoji} Phase {currentPhase} — {meta.name[lang]}</div>
        <div style={{ fontSize:16, fontWeight:800, color:"#f4f1ec", marginBottom:4 }}>{L.done}</div>
        <div style={{ fontSize:12, color:"#aaa", lineHeight:1.5 }}>{nextMeta?`${L.left} ${nextMeta.emoji} ${nextMeta.name[lang]}`:L.left}</div>
        <div style={{ height:4, background:"#1e2a3a", borderRadius:4, overflow:"hidden", marginTop:12 }}>
          <div style={{ height:"100%", width:prog.pct+"%", background:`linear-gradient(to right,${meta.color},${nextMeta?.color||meta.color})`, borderRadius:4, transition:"width 0.8s ease" }}/>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// COUNTDOWN SECTION
// ══════════════════════════════════════════════
function CountdownSection({ arrivalDate, lang, completedSteps, onOpenStep }: {
  arrivalDate: string|null; lang: Lang; completedSteps: string[]; onOpenStep:(id:string)=>void;
}) {
  if (!arrivalDate) return null;

  const allDeadlines = [
    { id:"ssn",days:10,priority:1 },{ id:"phone",days:1,priority:2 },{ id:"bank",days:14,priority:3 },
    { id:"greencard",days:21,priority:4 },{ id:"housing",days:30,priority:5 },{ id:"license",days:45,priority:6 },{ id:"job",days:90,priority:7 },
    { id:"taxes_first",days:90,priority:8 },{ id:"real_id",days:60,priority:9 },{ id:"credit_score",days:60,priority:10 },
    { id:"taxes_annual",days:365,priority:11 },{ id:"taxes_annual_4",days:365,priority:12 },{ id:"taxes_lifetime",days:365,priority:13 },
    { id:"renew_greencard",days:3650,priority:14 },
  ];
  const allPhaseSteps = [...PHASE_STEPS[1],...PHASE_STEPS[2],...PHASE_STEPS[3],...PHASE_STEPS[4],...PHASE_STEPS[5]];
  const ssnPending = !completedSteps.includes("ssn");
  const pending = allDeadlines
    .filter(d=>!completedSteps.includes(d.id))
    .map(d=>({ ...d, daysLeft:getDaysLeft(arrivalDate,d.days), dateStr:addDays(arrivalDate,d.days) }))
    .filter(d=>d.id==="ssn"||d.daysLeft<=45)
    .sort((a,b)=>{ if(ssnPending&&a.id==="ssn")return -1; if(ssnPending&&b.id==="ssn")return 1; return a.daysLeft-b.daysLeft; });

  if (pending.length===0) return null;
  const urgent    = pending[0];
  const others    = pending.slice(1,4);
  const isOverdue = urgent.daysLeft<0;
  const urgColor  = isOverdue||urgent.daysLeft<=3?"#ef4444":urgent.daysLeft<=10?"#f97316":"#e8b84b";
  const urgentStep= allPhaseSteps.find(s=>s.id===urgent.id);
  if (!urgentStep) return null;

  const stepEmoji: Record<string,string> = { ssn:"🪪",bank:"🏦",greencard:"💳",housing:"🏠",phone:"📱",job:"💼",license:"🚗",taxes_first:"📊",real_id:"🪪",credit_score:"📈",taxes_annual:"📊",taxes_annual_4:"📊",taxes_lifetime:"📊",renew_greencard:"💳" };
  const L = {
    fr:{ urgentTitle:"Étape urgente à régler",  overdue:"En retard !", days:"jours restants", deadline:"Deadline", next:"Prochaines deadlines", done:"Fait", guide:"Guide" },
    en:{ urgentTitle:"Urgent step to complete", overdue:"Overdue!",    days:"days left",      deadline:"Deadline", next:"Upcoming deadlines",   done:"Done", guide:"Guide" },
    es:{ urgentTitle:"Paso urgente a completar",overdue:"¡Atrasado!",  days:"días restantes", deadline:"Fecha límite",next:"Próximas fechas",   done:"Hecho",guide:"Guía" },
  }[lang];

  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ background:`${urgColor}08`, border:`1px solid ${urgColor}35`, borderRadius:14, padding:"16px", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:10, color:urgColor, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" as const }}>⏱ {L.urgentTitle}</div>
          <div style={{ fontSize:10, color:"#555" }}>{L.deadline} : {urgent.dateStr}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
          <div style={{ fontSize:36, flexShrink:0 }}>{stepEmoji[urgent.id]||"📋"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#f4f1ec", marginBottom:4 }}>{urgentStep.label[lang]}</div>
            <div style={{ fontSize:28, fontWeight:900, color:urgColor, lineHeight:1 }}>{isOverdue?L.overdue:`${Math.abs(urgent.daysLeft)}`}</div>
            <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{!isOverdue&&L.days}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:9 }}>
          <button onClick={()=>onOpenStep(urgent.id)} style={{ flex:1, padding:"11px 8px", background:"#22c55e", border:"none", borderRadius:10, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>✅ {L.done}</button>
          <button onClick={()=>onOpenStep(urgent.id)} style={{ flex:1, padding:"11px 8px", background:"#e8b84b", border:"none", borderRadius:10, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>📖 {L.guide}</button>
          {STEP_GUIDES[urgent.id]?.explorerType&&(
            <button onClick={()=>window.location.href=`/near/${STEP_GUIDES[urgent.id].explorerType}`} style={{ padding:"11px 12px", background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.3)", borderRadius:10, color:"#2dd4bf", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>🗺️</button>
          )}
        </div>
      </div>
      {others.length>0&&(
        <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, padding:"12px 14px" }}>
          <div style={{ fontSize:10, color:"#555", letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:10, fontWeight:600 }}>📅 {L.next}</div>
          {others.map((d,i)=>{
            const s=allPhaseSteps.find(st=>st.id===d.id);
            const dc=d.daysLeft<=7?"#ef4444":d.daysLeft<=14?"#f97316":"#e8b84b";
            return (
              <div key={d.id} onClick={()=>onOpenStep(d.id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:i<others.length-1?"1px solid #1a2438":"none", cursor:"pointer" }}>
                <div style={{ fontSize:13, color:"#aaa" }}>{d.daysLeft<=7?"🔴":d.daysLeft<=14?"🟠":"🟡"} {s?.label[lang]||d.id}</div>
                <div style={{ fontSize:13, fontWeight:700, color:dc }}>{d.daysLeft}j →</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// DAILY TIP
// ══════════════════════════════════════════════
function DailyTip({ lang, userState, userCountry }: { lang:Lang; userState:string; userCountry:string }) {
  const TIPS: Record<Lang,string[]> = {
    fr:["Attends 10 jours après l'arrivée avant d'aller au bureau SSA pour le SSN.","Achète une SIM T-Mobile dès l'aéroport — pas besoin de SSN.","Tu peux ouvrir un compte Chase avec ton passeport seulement.","Ta Green Card physique arrivera par courrier USCIS en 2-3 semaines.","Zillow et Apartments.com sont les meilleurs sites pour trouver un logement.","LinkedIn et Indeed sont les meilleurs sites pour chercher un emploi aux USA.","Commence à construire ton credit score avec une secured credit card.","Garde toujours une copie numérique de tes documents importants.","Medicaid est gratuit si tes revenus sont bas — renseigne-toi dès que possible.","Pour le permis, passe d'abord l'examen théorique en ligne sur le site DMV.","📊 Rappel : la deadline pour les taxes IRS est le 15 avril de chaque année !","La REAL ID est obligatoire pour prendre l'avion aux USA depuis mai 2025."],
    en:["Wait 10 days after arrival before going to the SSA office for your SSN.","Buy a T-Mobile SIM at the airport — no SSN needed.","You can open a Chase account with your passport only.","Your physical Green Card will arrive by USCIS mail in 2-3 weeks.","Zillow and Apartments.com are the best sites to find housing.","LinkedIn and Indeed are the best job search sites in the USA.","Start building your credit score with a secured credit card.","Always keep a digital copy of your important documents.","Medicaid is free if your income is low — check eligibility as soon as possible.","For your license, take the written test online on the DMV website first.","📊 Reminder: the IRS tax deadline is April 15 every year!","REAL ID is required for domestic flights in the USA since May 2025."],
    es:["Espera 10 días después de llegar antes de ir a la oficina SSA para tu SSN.","Compra una SIM de T-Mobile en el aeropuerto — no necesitas SSN.","Puedes abrir una cuenta en Chase solo con tu pasaporte.","Tu Green Card física llegará por correo USCIS en 2-3 semanas.","Zillow y Apartments.com son los mejores sitios para encontrar vivienda.","LinkedIn e Indeed son los mejores sitios de búsqueda de empleo en EE.UU.","Comienza a construir tu historial crediticio con una tarjeta de crédito asegurada.","Siempre guarda una copia digital de tus documentos importantes.","Medicaid es gratuito si tus ingresos son bajos — infórmate lo antes posible.","Para la licencia, haz primero el examen teórico en línea en el sitio del DMV.","📊 Recordatorio: ¡la fecha límite del IRS es el 15 de abril de cada año!","REAL ID es obligatorio para vuelos domésticos en EE.UU. desde mayo 2025."],
  };
  const [tip, setTip]     = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  useEffect(()=>{
    const f=async()=>{
      try{
        const snap=await getDocs(collection(db,"admin_messages"));
        let found:string|null=null;
        snap.forEach(d=>{
          const data=d.data() as any;
          if(!data.active||data.type!=="conseil")return;
          if((data.state==="ALL"||data.state===userState)&&(data.country==="ALL"||data.country===userCountry))
            found=data["text_"+lang]||data.text_fr||null;
        });
        if(found){ setTip(found); setIsAdmin(true); }
        else setTip(TIPS[lang][new Date().getDate()%TIPS[lang].length]);
      }catch{ setTip(TIPS[lang][new Date().getDate()%TIPS[lang].length]); }
      setLoaded(true);
    };
    f();
  },[lang,userState,userCountry]);

  return (
    <div style={{ background:isAdmin?"rgba(232,184,75,0.05)":"rgba(45,212,191,0.05)", border:"1px solid "+(isAdmin?"rgba(232,184,75,0.2)":"rgba(45,212,191,0.15)"), borderRadius:12, padding:"14px 16px", display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
      <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{isAdmin?"📢":"💡"}</span>
      <div>
        <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:isAdmin?"#e8b84b":"#2dd4bf", fontWeight:600, marginBottom:5 }}>
          {isAdmin?(lang==="fr"?"Message Kuabo":"Kuabo Message"):(lang==="fr"?"Conseil du jour":lang==="es"?"Consejo del día":"Tip of the day")}
        </div>
        <div style={{ fontSize:13, color:"#f4f1ec", lineHeight:1.7 }}>{loaded?tip:"..."}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADMIN MESSAGE CARD — message urgent non lu
// ══════════════════════════════════════════════
function AdminMessageCard({ lang, userId, userState }: { lang:Lang; userId:string|undefined; userState:string }) {
  const [msg, setMsg]         = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(()=>{
    if(!userId) return;
    const f=async()=>{
      try{
        const snap=await getDocs(collection(db,"admin_messages"));
        let found:any=null;
        snap.forEach(d=>{
          const data=d.data() as any;
          if(!data.active||data.type==="conseil"||data.type==="pub"||data.type==="event") return;
          if((data.target==="all"||(data.target==="state:"+userState))) {
            found={ id:d.id,...data };
          }
        });
        if(found){
          // Vérifier si déjà vu
          const userMsg=await getDoc(doc(db,"users",userId,"messages",found.id)).catch(()=>null);
          if(!userMsg?.exists()||!userMsg.data()?.seen) setMsg(found);
        }
      }catch{}
    };
    f();
  },[userId,userState]);

  const handleSeen = async() => {
    if(!userId||!msg) return;
    try{
      await updateDoc(doc(db,"users",userId,"messages",msg.id),{ seen:true, seenAt:new Date().toISOString() }).catch(()=>{});
    }catch{}
    setDismissed(true);
  };

  if(!msg||dismissed) return null;

  const title   = msg["title_"+lang]||msg.title_fr||msg.title||"";
  const content = msg["content_"+lang]||msg.content_fr||msg.content||"";
  const isUrgent= msg.type==="urgent";
  const color   = isUrgent?"#ef4444":"#e8b84b";

  return (
    <div style={{ background:`${color}08`, border:`1.5px solid ${color}30`, borderRadius:14, padding:"14px 16px", marginBottom:14, position:"relative" }}>
      <button onClick={handleSeen} style={{ position:"absolute", top:8, right:10, background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16 }}>×</button>
      <div style={{ fontSize:10, color, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" as const, marginBottom:6 }}>
        {isUrgent?"⚠️ ":"📢 "}{lang==="fr"?"Information Kuabo":lang==="es"?"Información Kuabo":"Kuabo Information"}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:"#f4f1ec", marginBottom:expanded?8:0, paddingRight:20 }}>{title}</div>
      {expanded&&<div style={{ fontSize:13, color:"#aaa", lineHeight:1.7, marginBottom:12 }}>{content}</div>}
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button onClick={()=>setExpanded(!expanded)}
          style={{ flex:2, padding:"10px", background:color, border:"none", borderRadius:10, color:"#000", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          {expanded?(lang==="fr"?"Réduire":lang==="es"?"Reducir":"Collapse"):(lang==="fr"?"👁️ Voir l'info":lang==="es"?"👁️ Ver info":"👁️ See info")}
        </button>
        <button onClick={handleSeen}
          style={{ flex:1, padding:"10px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:10, color:"#aaa", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          {lang==="fr"?"Plus tard":lang==="es"?"Más tarde":"Later"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// KUABO AI BUTTON
// ══════════════════════════════════════════════
function KuaboAIButton({ lang, completedSteps, userState, userCity }: { lang:Lang; completedSteps:string[]; userState:string; userCity:string }) {
  const location = userCity||userState||(lang==="fr"?"ta zone":lang==="es"?"tu zona":"your area");
  const L = { fr:{ title:"Demande à Kuabo AI", sub:`Ton assistant — ${location}` }, en:{ title:"Ask Kuabo AI", sub:`Your assistant — ${location}` }, es:{ title:"Pregunta a Kuabo AI", sub:`Tu asistente — ${location}` } }[lang];
  return (
    <button onClick={()=>{ localStorage.setItem("completedSteps",JSON.stringify(completedSteps)); window.location.href="/chat"; }}
      style={{ width:"100%", background:"linear-gradient(135deg,rgba(232,184,75,0.08),rgba(45,212,191,0.05))", border:"1px solid rgba(232,184,75,0.25)", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, cursor:"pointer", fontFamily:"inherit" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🤖</div>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:"#f4f1ec" }}>{L.title}</div>
          <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{L.sub}</div>
        </div>
      </div>
      <span style={{ color:"#e8b84b", fontSize:18 }}>→</span>
    </button>
  );
}

// ══════════════════════════════════════════════
// ARMY BANNER
// ══════════════════════════════════════════════
function ArmyBanner({ armyStatus, lang, onViewGuide }: { armyStatus:string; lang:Lang; onViewGuide:()=>void }) {
  const { ARMY_GUIDE: AG } = require("./data");
  const guide = AG[armyStatus];
  if (!guide) return null;
  const g     = guide[lang];
  const color = armyStatus==="army"?"#22c55e":"#2dd4bf";
  const badge = { fr:{ army:"🎖️ Soldat actif",army_interest:"🤔 J'y pense",army_unsure:"❓ Pas encore décidé" }, en:{ army:"🎖️ Active soldier",army_interest:"🤔 Thinking about it",army_unsure:"❓ Not decided yet" }, es:{ army:"🎖️ Soldado activo",army_interest:"🤔 Lo estoy pensando",army_unsure:"❓ Aún no decidido" } }[lang][armyStatus as "army"|"army_interest"|"army_unsure"]||"🎖️ Army";
  const btnL  = { fr:"Voir mon guide Army →",en:"View my Army guide →",es:"Ver mi guía Army →" }[lang];
  return (
    <div style={{ background:`${color}06`,border:`1px solid ${color}25`,borderRadius:14,padding:"14px 16px",marginBottom:14 }}>
      <div style={{ fontSize:11,color,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase" as const,marginBottom:6 }}>{badge}</div>
      <div style={{ fontSize:13,color:"#aaa",lineHeight:1.6,marginBottom:10 }}>{g.desc}</div>
      <button onClick={onViewGuide} style={{ width:"100%",padding:"11px",background:`${color}12`,border:`1px solid ${color}30`,borderRadius:10,color,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>{btnL}</button>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADMIN EVENTS + PUB — avec modals détail + images
// ══════════════════════════════════════════════
function AdminEventsAndPub({ lang, userState, userCountry, userId }: { lang:Lang; userState:string; userCountry:string; userId:string }) {
  const [events,       setEvents]       = useState<any[]>([]);
  const [pub,          setPub]          = useState<any>(null);
  const [pubClosed,    setPubClosed]    = useState(false);
  const [participating,setParticipating]= useState<Record<string,boolean>>({});
  const [selectedPub,  setSelectedPub]  = useState<any>(null);  // ✅ modal pub
  const [selectedEvt,  setSelectedEvt]  = useState<any>(null);  // ✅ modal event

  useEffect(()=>{
    const f=async()=>{
      try{
        const snap=await getDocs(collection(db,"admin_messages"));
        const evts:any[]=[];
        let foundPub:any=null;
        snap.forEach(d=>{
          const data=d.data() as any;
          if(!data.active) return;
          const targeted=data.target==="all"||(data.target===`state:${userState}`)||(data.target==="dv")||(data.target==="army");
          if(!targeted) return;
          if(data.type==="event") evts.push({ id:d.id,...data });
          if(data.type==="pub"&&!foundPub) foundPub={ id:d.id,...data };
        });
        evts.sort((a,b)=>new Date(a.eventDate||0).getTime()-new Date(b.eventDate||0).getTime());
        setEvents(evts);
        setPub(foundPub);
        const part:Record<string,boolean>={};
        evts.forEach(e=>{ part[e.id]=(e.participants||[]).includes(userId); });
        setParticipating(part);
      }catch{}
    };
    f();
  },[userState,userId]);

  const handleParticipate=async(eventId:string)=>{
    if(!userId)return;
    const isIn=participating[eventId];
    setParticipating(prev=>({...prev,[eventId]:!isIn}));
    try{
      const ref=doc(db,"admin_messages",eventId);
      const snap=await getDoc(ref);
      if(!snap.exists())return;
      const data=snap.data() as any;
      const parts:string[]=data.participants||[];
      await updateDoc(ref,{ participants:isIn?parts.filter((id:string)=>id!==userId):[...parts,userId] });
    }catch{}
  };

  // ✅ Emoji auto selon contenu pub
  const getPubEmoji=(title:string):string=>{
    const t=(title||"").toLowerCase();
    if(t.includes("bank")||t.includes("banque")||t.includes("chase")||t.includes("compte")) return "🏦";
    if(t.includes("phone")||t.includes("sim")||t.includes("mobile")) return "📱";
    if(t.includes("job")||t.includes("emploi")||t.includes("work")) return "💼";
    if(t.includes("housing")||t.includes("logement")||t.includes("apartment")) return "🏠";
    if(t.includes("insurance")||t.includes("assurance")) return "🛡️";
    if(t.includes("credit")||t.includes("card")||t.includes("carte")) return "💳";
    if(t.includes("car")||t.includes("voiture")||t.includes("auto")) return "🚗";
    if(t.includes("health")||t.includes("santé")||t.includes("medical")) return "🏥";
    return "📢";
  };

  // ✅ Lecture correcte des champs Firebase
  const getPubFields=(p:any, l:Lang)=>({
    title: p?.[`title_${l}`]||p?.title_fr||p?.title||"",
    desc:  p?.[`desc_${l}`] ||p?.desc_fr ||p?.desc ||"",
    cta:   p?.[`cta_${l}`]  ||p?.cta_fr  ||p?.cta  ||"",
    url:   p?.linkUrl||p?.link_url||p?.url||"",
    image: p?.imageUrl||p?.image_url||"",
  });

  const getEvtFields=(e:any, l:Lang)=>({
    title: e?.[`title_${l}`]||e?.title_fr||e?.title||"",
    desc:  e?.[`desc_${l}`] ||e?.desc_fr ||e?.desc ||"",
    image: e?.imageUrl||e?.image_url||"",
  });

  if(!pub&&events.length===0) return null;

  const pubF = pub ? getPubFields(pub, lang) : null;
  const pubEmoji = pubF ? getPubEmoji(pubF.title) : "📢";

  return (
    <>
      {/* ── MODAL DÉTAIL PUB ── */}
      {selectedPub&&(()=>{
        const f=getPubFields(selectedPub,lang);
        const emoji=getPubEmoji(f.title);
        return (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(8px)" }}
            onClick={()=>setSelectedPub(null)}>
            <div style={{ background:"#0f1521",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",animation:"slideUp .35s ease" }}
              onClick={e=>e.stopPropagation()}>
              {/* Image */}
              {f.image?(
                <div style={{ width:"100%",height:200,overflow:"hidden",borderRadius:"22px 22px 0 0",position:"relative" }}>
                  <img src={f.image} alt={f.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>(e.currentTarget.style.display="none")}/>
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(15,21,33,.9))" }}/>
                  <button onClick={()=>setSelectedPub(null)} style={{ position:"absolute",top:14,right:14,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,.5)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                  <div style={{ position:"absolute",bottom:12,left:16 }}>
                    <div style={{ fontSize:9,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",background:"rgba(0,0,0,.6)",padding:"3px 8px",borderRadius:6 }}>PARTENAIRE KUABO</div>
                  </div>
                </div>
              ):(
                <div style={{ padding:"20px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ fontSize:9,color:"#e8b84b",fontWeight:700,letterSpacing:".08em" }}>PARTENAIRE KUABO</div>
                  <button onClick={()=>setSelectedPub(null)} style={{ background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer" }}>✕</button>
                </div>
              )}
              <div style={{ padding:"20px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                  <div style={{ width:52,height:52,borderRadius:14,background:"rgba(232,184,75,.12)",border:"1px solid rgba(232,184,75,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>{emoji}</div>
                  <div>
                    <div style={{ fontSize:18,fontWeight:800,color:"#f4f1ec" }}>{f.title}</div>
                    {f.desc&&<div style={{ fontSize:13,color:"#aaa",marginTop:3,lineHeight:1.6 }}>{f.desc}</div>}
                  </div>
                </div>
                {f.url&&(
                  <button onClick={()=>window.open(f.url,"_blank")}
                    style={{ width:"100%",padding:"15px",background:"#e8b84b",border:"none",borderRadius:14,color:"#000",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}>
                    {f.cta||"Voir l'offre →"}
                  </button>
                )}
                <button onClick={()=>setSelectedPub(null)}
                  style={{ width:"100%",padding:"12px",background:"transparent",border:"1px solid #1e2a3a",borderRadius:12,color:"#555",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
                  {lang==="fr"?"Fermer":lang==="es"?"Cerrar":"Close"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL DÉTAIL EVENT ── */}
      {selectedEvt&&(()=>{
        const f=getEvtFields(selectedEvt,lang);
        const isIn=participating[selectedEvt.id];
        const dateStr=selectedEvt.eventDate?new Date(selectedEvt.eventDate).toLocaleDateString(lang==="fr"?"fr-FR":lang==="es"?"es-ES":"en-US",{ weekday:"long",day:"numeric",month:"long",year:"numeric" }):"";
        return (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(8px)" }}
            onClick={()=>setSelectedEvt(null)}>
            <div style={{ background:"#0f1521",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",animation:"slideUp .35s ease" }}
              onClick={e=>e.stopPropagation()}>
              {/* Image */}
              {f.image?(
                <div style={{ width:"100%",height:200,overflow:"hidden",borderRadius:"22px 22px 0 0",position:"relative" }}>
                  <img src={f.image} alt={f.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>(e.currentTarget.style.display="none")}/>
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(15,21,33,.9))" }}/>
                  <button onClick={()=>setSelectedEvt(null)} style={{ position:"absolute",top:14,right:14,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,.5)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                </div>
              ):(
                <div style={{ padding:"20px 20px 0",display:"flex",justifyContent:"flex-end" }}>
                  <button onClick={()=>setSelectedEvt(null)} style={{ background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer" }}>✕</button>
                </div>
              )}
              <div style={{ padding:"20px" }}>
                <div style={{ fontSize:9,color:"#2dd4bf",fontWeight:700,letterSpacing:".08em",marginBottom:8 }}>📅 ÉVÉNEMENT KUABO</div>
                <div style={{ fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:14 }}>{f.title}</div>
                {/* Infos */}
                <div style={{ display:"flex",flexDirection:"column" as const,gap:8,marginBottom:16 }}>
                  {dateStr&&(
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(45,212,191,.06)",border:"1px solid rgba(45,212,191,.2)",borderRadius:10 }}>
                      <span style={{ fontSize:18 }}>📅</span>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:"#2dd4bf" }}>{dateStr}</div>
                        {selectedEvt.eventTime&&<div style={{ fontSize:11,color:"#aaa" }}>{selectedEvt.eventTime}</div>}
                      </div>
                    </div>
                  )}
                  {selectedEvt.eventLocation&&(
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(167,139,250,.06)",border:"1px solid rgba(167,139,250,.2)",borderRadius:10 }}>
                      <span style={{ fontSize:18 }}>📍</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:"#a78bfa" }}>{selectedEvt.eventLocation}</div>
                      </div>
                      <button onClick={()=>window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvt.eventLocation)}`,"_blank")}
                        style={{ padding:"5px 10px",background:"rgba(167,139,250,.1)",border:"1px solid rgba(167,139,250,.3)",borderRadius:8,color:"#a78bfa",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                        Maps →
                      </button>
                    </div>
                  )}
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:10 }}>
                    <span style={{ fontSize:18 }}>👥</span>
                    <span style={{ fontSize:13,color:"#aaa" }}>{(selectedEvt.participants||[]).length} {lang==="fr"?"participants":lang==="es"?"participantes":"participants"}</span>
                  </div>
                </div>
                {f.desc&&<div style={{ fontSize:13,color:"#aaa",lineHeight:1.7,marginBottom:16 }}>{f.desc}</div>}
                <button onClick={()=>{ handleParticipate(selectedEvt.id); setSelectedEvt(null); }}
                  style={{ width:"100%",padding:"15px",background:isIn?"rgba(239,68,68,.1)":"#2dd4bf",border:isIn?"1px solid rgba(239,68,68,.3)":"none",borderRadius:14,color:isIn?"#ef4444":"#000",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}>
                  {isIn?(lang==="fr"?"❌ Se désinscrire":lang==="es"?"❌ Cancelar":"❌ Cancel"):(lang==="fr"?"✅ Je participe !":lang==="es"?"✅ ¡Participo!":"✅ I'm in!")}
                </button>
                <button onClick={()=>setSelectedEvt(null)}
                  style={{ width:"100%",padding:"12px",background:"transparent",border:"1px solid #1e2a3a",borderRadius:12,color:"#555",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
                  {lang==="fr"?"Fermer":lang==="es"?"Cerrar":"Close"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PUB CARD */}
      {pub&&pubF&&!pubClosed&&(
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9,color:"#333",textTransform:"uppercase" as const,letterSpacing:".08em",marginBottom:3,textAlign:"right" as const }}>
            {lang==="fr"?"Publicité · Partenaire Kuabo":lang==="es"?"Publicidad · Socio Kuabo":"Ad · Kuabo Partner"}
          </div>
          <div style={{ position:"relative",background:"linear-gradient(135deg,#141d2e,#0f1521)",border:"1px solid rgba(232,184,75,0.2)",borderRadius:14,overflow:"hidden",cursor:"pointer" }}
            onClick={()=>setSelectedPub(pub)}>
            {/* Barre dorée */}
            <div style={{ height:2,background:"linear-gradient(to right,#e8b84b,#f97316)" }}/>
            {/* Image si disponible */}
            {pubF.image&&(
              <div style={{ width:"100%",height:120,overflow:"hidden",position:"relative" }}>
                <img src={pubF.image} alt={pubF.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>(e.currentTarget.style.display="none")}/>
                <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(20,29,46,.95))" }}/>
              </div>
            )}
            <div style={{ padding:"12px 14px",display:"flex",alignItems:"center",gap:12 }}>
              <button onClick={e=>{ e.stopPropagation(); setPubClosed(true); }} style={{ position:"absolute",top:8,right:10,background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,zIndex:10 }}>✕</button>
              <div style={{ width:46,height:46,borderRadius:13,background:"rgba(232,184,75,.12)",border:"1px solid rgba(232,184,75,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>
                {pubEmoji}
              </div>
              <div style={{ flex:1,minWidth:0,paddingRight:20 }}>
                <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec",marginBottom:2 }}>{pubF.title||"..."}</div>
                {pubF.desc&&<div style={{ fontSize:11,color:"#aaa",marginBottom:4,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const }}>{pubF.desc}</div>}
                {pubF.cta&&(
                  <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",background:"rgba(232,184,75,.1)",border:"1px solid rgba(232,184,75,.3)",borderRadius:18 }}>
                    <span style={{ fontSize:11,color:"#e8b84b",fontWeight:700 }}>{pubF.cta} →</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENTS */}
      {events.length>0&&(
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,fontWeight:600 }}>
            📅 {lang==="fr"?"Événements Kuabo":lang==="es"?"Eventos Kuabo":"Kuabo Events"}
          </div>
          {events.map(event=>{
            const ef=getEvtFields(event,lang);
            const isIn=participating[event.id];
            const dateStr=event.eventDate?new Date(event.eventDate).toLocaleDateString(lang==="fr"?"fr-FR":lang==="es"?"es-ES":"en-US",{ day:"numeric",month:"long" }):"";
            return (
              <div key={event.id} style={{ background:"#141d2e",border:"1px solid rgba(45,212,191,0.2)",borderRadius:14,overflow:"hidden",position:"relative",marginBottom:8,cursor:"pointer" }}
                onClick={()=>setSelectedEvt(event)}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(to right,#2dd4bf,#e8b84b)" }}/>
                {/* Image event si disponible */}
                {ef.image&&(
                  <div style={{ width:"100%",height:100,overflow:"hidden",position:"relative" }}>
                    <img src={ef.image} alt={ef.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>(e.currentTarget.style.display="none")}/>
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(20,29,46,.9))" }}/>
                  </div>
                )}
                <div style={{ padding:"12px 14px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec",marginBottom:3 }}>{ef.title}</div>
                    <div style={{ fontSize:11,color:"#2dd4bf" }}>📅 {dateStr}{event.eventTime?` · ${event.eventTime}`:""}</div>
                    {event.eventLocation&&<div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>📍 {event.eventLocation}</div>}
                    <div style={{ fontSize:10,color:"#555",marginTop:3 }}>👥 {(event.participants||[]).length} {lang==="fr"?"participants":"participants"}</div>
                  </div>
                  <button onClick={e=>{ e.stopPropagation(); handleParticipate(event.id); }}
                    style={{ padding:"8px 12px",borderRadius:16,border:"1px solid "+(isIn?"rgba(34,197,94,0.4)":"rgba(45,212,191,0.4)"),background:isIn?"rgba(34,197,94,0.1)":"rgba(45,212,191,0.1)",color:isIn?"#22c55e":"#2dd4bf",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap" as const }}>
                    {isIn?(lang==="fr"?"✓ Inscrit":"✓ Going"):(lang==="fr"?"Participer":"Join")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// PHASE CARD — phase active ouverte, autres fermées
// ══════════════════════════════════════════════
function PhaseCard({ phaseId, lang, completedSteps, onOpenStep, isActive, isUnlocked }: {
  phaseId:PhaseId; lang:Lang; completedSteps:string[]; onOpenStep:(id:string)=>void; isActive:boolean; isUnlocked:boolean;
}) {
  const [expanded, setExpanded] = useState(isActive);
  const meta      = PHASES_META[phaseId];
  const steps     = PHASE_STEPS[phaseId];
  const done      = steps.filter(s=>completedSteps.includes(s.id)).length;
  const total     = steps.length;
  const pct       = Math.round((done/total)*100);
  const isComplete= pct===100;
  const L = { fr:{ locked:"🔒 Termine la phase précédente d'abord",steps:"étapes",inProgress:"En cours" }, en:{ locked:"🔒 Complete previous phase first",steps:"steps",inProgress:"In progress" }, es:{ locked:"🔒 Completa la fase anterior primero",steps:"pasos",inProgress:"En curso" } }[lang];

  return (
    <div style={{ marginBottom:10, background:isActive?"#141d2e":isComplete?"rgba(34,197,94,0.05)":"#0f1521", border:`1px solid ${isActive?meta.color+"50":isComplete?"rgba(34,197,94,0.2)":"#1e2a3a"}`, borderRadius:14, overflow:"hidden", opacity:isUnlocked?1:0.55 }}>
      <div onClick={()=>isUnlocked&&setExpanded(!expanded)} style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:isUnlocked?"pointer":"default" }}>
        <div style={{ width:46, height:46, borderRadius:13, background:isUnlocked?`${meta.color}12`:"#1a2438", border:`1.5px solid ${isUnlocked?meta.color+"35":"#2a3448"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
          {isUnlocked?meta.emoji:<Lock size={18} color="#555"/>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
            <span style={{ fontSize:10, color:meta.color, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" as const }}>Phase {phaseId}</span>
            {isComplete&&<span style={{ fontSize:10, color:"#22c55e" }}>✅</span>}
            {isActive&&!isComplete&&<span style={{ fontSize:10, color:meta.color, background:`${meta.color}15`, padding:"1px 6px", borderRadius:8 }}>{L.inProgress}</span>}
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:isUnlocked?"#f4f1ec":"#555" }}>{meta.emoji} {meta.name[lang]}</div>
          {isUnlocked&&<div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{meta.desc[lang]}</div>}
          {!isUnlocked&&<div style={{ fontSize:11, color:"#444", marginTop:2 }}>{L.locked}</div>}
        </div>
        {isUnlocked&&(
          <div style={{ textAlign:"right" as const, flexShrink:0 }}>
            <div style={{ fontSize:17, fontWeight:800, color:isComplete?"#22c55e":meta.color }}>{pct}%</div>
            <div style={{ fontSize:10, color:"#555" }}>{done}/{total} {L.steps}</div>
          </div>
        )}
        {isUnlocked&&<ChevronRight size={16} color="#555" style={{ transform:expanded?"rotate(90deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}/>}
      </div>
      {isUnlocked&&(
        <div style={{ height:3, background:"#1e2a3a", margin:"0 16px 12px" }}>
          <div style={{ height:"100%", width:pct+"%", background:isComplete?"#22c55e":meta.color, borderRadius:3, transition:"width 0.6s ease" }}/>
        </div>
      )}
      {expanded&&isUnlocked&&(
        <div style={{ padding:"0 12px 12px", display:"flex", flexDirection:"column", gap:7 }}>
          {steps.map(step=>{
            const isDone   = completedSteps.includes(step.id);
            const urgColor = step.urgency==="critical"?"#ef4444":step.urgency==="high"?"#f97316":meta.color;
            const guide    = STEP_GUIDES[step.id];
            return (
              <div key={step.id} style={{ borderRadius:11, background:isDone?"rgba(34,197,94,0.04)":"#141d2e", border:`1px solid ${isDone?"rgba(34,197,94,0.15)":"#1e2a3a"}`, overflow:"hidden" }}>
                <div onClick={()=>onOpenStep(step.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", cursor:"pointer", opacity:isDone?.65:1 }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", background:isDone?"#22c55e":"transparent", border:`2px solid ${isDone?"#22c55e":urgColor}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {isDone&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:isDone?"#555":"#f4f1ec", textDecoration:isDone?"line-through":"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{step.label[lang]}</div>
                    <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{step.desc[lang]}</div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:isDone?"#22c55e":urgColor, flexShrink:0 }}>{isDone?"✅":step.urgency==="critical"?"🔴":step.urgency==="high"?"🟠":"📋"}</div>
                </div>
                {!isDone&&guide&&(
                  <div style={{ display:"flex", gap:6, padding:"0 12px 10px" }}>
                    <button onClick={e=>{ e.stopPropagation(); onOpenStep(step.id); }} style={{ flex:1, padding:"6px", background:"rgba(232,184,75,0.08)", border:"1px solid rgba(232,184,75,0.2)", borderRadius:8, color:"#e8b84b", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>💡 {lang==="fr"?"Pourquoi ?":lang==="es"?"¿Por qué?":"Why?"}</button>
                    {guide.guideUrl&&<button onClick={e=>{ e.stopPropagation(); window.location.href=guide.guideUrl!; }} style={{ flex:1, padding:"6px", background:"rgba(45,212,191,0.08)", border:"1px solid rgba(45,212,191,0.2)", borderRadius:8, color:"#2dd4bf", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>📖 Guide</button>}
                    {guide.explorerType&&<button onClick={e=>{ e.stopPropagation(); window.location.href=`/near/${guide.explorerType}`; }} style={{ padding:"6px 8px", background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:8, color:"#a78bfa", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>🗺️</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// BOTTOM NAV — 4 ONGLETS FIXES
// ══════════════════════════════════════════════
export function BottomNav({ activeTab, setActiveTab, lang, onHomePress }: {
  activeTab: string; setActiveTab:(t:string)=>void; lang:Lang; onHomePress:()=>void;
}) {
  const L = {
    fr:{ home:"Accueil", explorer:"Explorer", jobs:"Emplois", profile:"Profil" },
    en:{ home:"Home",    explorer:"Explore",  jobs:"Jobs",    profile:"Profile" },
    es:{ home:"Inicio",  explorer:"Explorar", jobs:"Empleo",  profile:"Perfil" },
  }[lang];
  const tabs = [
    { id:"home",     icon:"🏠", label:L.home     },
    { id:"explorer", icon:"🌍", label:L.explorer  },
    { id:"jobs",     icon:"💼", label:L.jobs      },
    { id:"profile",  icon:"👤", label:L.profile   },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, height:68, background:"#0f1521", borderTop:"1px solid #1e2a3a", display:"flex", alignItems:"center", zIndex:200 }}>
      {tabs.map(({ id, icon, label })=>{
        const active=activeTab===id;
        return (
          <button key={id} onClick={()=>id==="home"&&activeTab==="home"?onHomePress():setActiveTab(id)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"8px 0", background:"transparent", border:"none", cursor:"pointer", position:"relative", fontFamily:"inherit", WebkitTapHighlightColor:"transparent" }}>
            {active&&<div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:30, height:2, borderRadius:"0 0 3px 3px", background:"#e8b84b" }}/>}
            <span style={{ fontSize:22, filter:active?"none":"grayscale(1) opacity(.45)" }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight:active?600:400, color:active?"#e8b84b":"#4a5568" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
// HOME TAB — export principal
// Ordre : AdminMsg → Hero → Countdown → Army
//       → AI → Conseil → Pub → Events
//       → Parcours → Streak
// ══════════════════════════════════════════════
export default function HomeTab({ lang, userId, completedSteps, currentPhase, phaseProgress, arrivalDate, armyStatus, userState, userCity, userCountry, streak, userStatus, onOpenStep, onViewArmyGuide }: {
  lang: Lang; userId: string|undefined; completedSteps: string[]; currentPhase: PhaseId;
  phaseProgress: Record<PhaseId,{ done:number; total:number; pct:number }>;
  arrivalDate: string|null; armyStatus: string; userState: string; userCity: string; userCountry: string;
  streak: number; userStatus: UserStatus;
  onOpenStep:(id:string)=>void; onViewArmyGuide:()=>void;
}) {
  const streakColor = streak>=7?"#ef4444":streak>=3?"#f97316":"#e8b84b";

  return (
    <>
      {/* 1. Message Admin urgent */}
      {userId&&<AdminMessageCard lang={lang} userId={userId} userState={userState}/>}

      {/* 2. CircularHero */}
      <CircularHero currentPhase={currentPhase} phaseProgress={phaseProgress} lang={lang}/>

      {/* 3. Countdown étape urgente */}
      <CountdownSection arrivalDate={arrivalDate} lang={lang} completedSteps={completedSteps} onOpenStep={onOpenStep}/>

      {/* 4. Army banner */}
      {armyStatus&&<ArmyBanner armyStatus={armyStatus} lang={lang} onViewGuide={onViewArmyGuide}/>}

      {/* 5. Kuabo AI */}
      <KuaboAIButton lang={lang} completedSteps={completedSteps} userState={userState} userCity={userCity}/>

      {/* 6. Conseil du jour */}
      <DailyTip lang={lang} userState={userState} userCountry={userCountry}/>

      {/* 7. Pub + Événements Admin */}
      {userId&&<AdminEventsAndPub lang={lang} userState={userState} userCountry={userCountry} userId={userId}/>}

      {/* 8. Parcours — phase active ouverte, autres fermées */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:"#555", letterSpacing:".1em", textTransform:"uppercase" as const, marginBottom:12, fontWeight:600 }}>
          🗺️ {lang==="fr"?"Ton parcours Kuabo":lang==="es"?"Tu camino Kuabo":"Your Kuabo Journey"}
        </div>
        {([1,2,3,4,5] as PhaseId[]).map(pid=>(
          <PhaseCard key={pid} phaseId={pid} lang={lang} completedSteps={completedSteps} onOpenStep={onOpenStep} isActive={pid===currentPhase} isUnlocked={isPhaseUnlocked(pid,completedSteps)}/>
        ))}
      </div>

      {/* 9. Streak — discret en bas */}
      {streak>0&&(
        <div style={{ background:"#0f1521", border:`1px solid ${streakColor}20`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <Flame size={20} color={streakColor}/>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:20, fontWeight:800, color:streakColor }}>{streak}</span>
            <span style={{ fontSize:12, color:"#aaa", marginLeft:6 }}>{lang==="fr"?"jours de suite":lang==="es"?"días seguidos":"days in a row"}</span>
          </div>
          <span style={{ fontSize:12, color:"#555" }}>{streak>=7?"🔥":streak>=3?"💪":"⭐"}</span>
        </div>
      )}
    </>
  );
}
