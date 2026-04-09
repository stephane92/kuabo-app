"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  CheckCircle2, Clock, ChevronRight, LogOut, Globe,
  Undo2, Target, AlertTriangle, Home, FileText,
  User, Flame, Lightbulb, PhoneCall, MapPin,
} from "lucide-react";
import type { CSSProperties } from "react";
import ExplorerTab from "../components/ExplorerTab";

type Lang = "fr" | "en" | "es";
type Tab  = "home" | "documents" | "profile" | "explorer";
type Step = { id: string; label: string; time: number; weight: number; urgency: "critical" | "high" | "normal" };

function useScrollToTop(activeTab: Tab) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [activeTab]);
}

function useStreak(userId: string | undefined) {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const today    = new Date().toDateString();
    const key      = "kuabo_streak_" + userId;
    const dateKey  = "kuabo_streak_date_" + userId;
    const lastDate = localStorage.getItem(dateKey);
    const saved    = parseInt(localStorage.getItem(key) || "0");
    if (lastDate === today) { setStreak(saved); return; }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const next = lastDate === yesterday.toDateString() ? saved + 1 : 1;
    localStorage.setItem(key, String(next));
    localStorage.setItem(dateKey, today);
    setStreak(next);
  }, [userId]);
  return streak;
}

const STEPS_BY_LANG: Record<Lang, Step[]> = {
  fr: [
    { id: "ssn",       label: "Numéro de Sécurité Sociale (SSN)", time: 10, weight: 25, urgency: "critical" },
    { id: "phone",     label: "Carte SIM / Téléphone US",         time: 1,  weight: 10, urgency: "critical" },
    { id: "bank",      label: "Compte bancaire",                  time: 14, weight: 15, urgency: "high"     },
    { id: "greencard", label: "Green Card physique (courrier)",    time: 21, weight: 10, urgency: "high"     },
    { id: "housing",   label: "Logement permanent",               time: 30, weight: 15, urgency: "normal"   },
    { id: "job",       label: "Trouver un emploi",                time: 90, weight: 15, urgency: "normal"   },
    { id: "license",   label: "Permis de conduire",               time: 45, weight: 10, urgency: "normal"   },
  ],
  en: [
    { id: "ssn",       label: "Social Security Number (SSN)",     time: 10, weight: 25, urgency: "critical" },
    { id: "phone",     label: "SIM Card / US Phone Number",       time: 1,  weight: 10, urgency: "critical" },
    { id: "bank",      label: "Bank Account",                     time: 14, weight: 15, urgency: "high"     },
    { id: "greencard", label: "Physical Green Card (mail)",       time: 21, weight: 10, urgency: "high"     },
    { id: "housing",   label: "Permanent Housing",                time: 30, weight: 15, urgency: "normal"   },
    { id: "job",       label: "Find a Job",                       time: 90, weight: 15, urgency: "normal"   },
    { id: "license",   label: "Driver License",                   time: 45, weight: 10, urgency: "normal"   },
  ],
  es: [
    { id: "ssn",       label: "Número de Seguro Social (SSN)",    time: 10, weight: 25, urgency: "critical" },
    { id: "phone",     label: "SIM / Número de teléfono US",      time: 1,  weight: 10, urgency: "critical" },
    { id: "bank",      label: "Cuenta bancaria",                  time: 14, weight: 15, urgency: "high"     },
    { id: "greencard", label: "Green Card física (correo)",       time: 21, weight: 10, urgency: "high"     },
    { id: "housing",   label: "Vivienda permanente",              time: 30, weight: 15, urgency: "normal"   },
    { id: "job",       label: "Encontrar trabajo",                time: 90, weight: 15, urgency: "normal"   },
    { id: "license",   label: "Licencia de conducir",             time: 45, weight: 10, urgency: "normal"   },
  ],
};

const CELEB_MESSAGES: Record<string, Record<Lang, { emoji: string; title: string; sub: string }>> = {
  ssn:      { fr: { emoji: "🪪", title: "SSN complété !",       sub: "Document le plus important. Tu peux maintenant ouvrir un compte et travailler légalement." }, en: { emoji: "🪪", title: "SSN completed!",        sub: "Most important document. You can now open a bank account and work legally in the USA." }, es: { emoji: "🪪", title: "¡SSN completado!",      sub: "Documento más importante. Ahora puedes abrir cuenta y trabajar legalmente." } },
  phone:    { fr: { emoji: "📱", title: "Téléphone activé !",   sub: "Tu es maintenant connecté aux USA." },                                                         en: { emoji: "📱", title: "Phone activated!",       sub: "You're now connected in the USA." },                                                         es: { emoji: "📱", title: "¡Teléfono activado!",    sub: "Ya estás conectado en EE.UU." } },
  bank:     { fr: { emoji: "🏦", title: "Compte ouvert !",      sub: "Tu peux maintenant recevoir ton salaire aux USA." },                                           en: { emoji: "🏦", title: "Account opened!",        sub: "You can now receive your salary in the USA." },                                           es: { emoji: "🏦", title: "¡Cuenta abierta!",       sub: "Ahora puedes recibir tu salario en EE.UU." } },
  greencard:{ fr: { emoji: "💳", title: "Green Card reçue !",   sub: "Tu es officiellement résident permanent des États-Unis. 🇺🇸" },                                en: { emoji: "💳", title: "Green Card received!",   sub: "You are officially a permanent US resident. 🇺🇸" },                                es: { emoji: "💳", title: "¡Green Card recibida!",  sub: "Eres oficialmente residente permanente de EE.UU. 🇺🇸" } },
  housing:  { fr: { emoji: "🏠", title: "Logement trouvé !",    sub: "Tu as maintenant un chez-toi aux USA. Bienvenue !" },                                          en: { emoji: "🏠", title: "Housing found!",         sub: "You now have a home in the USA. Welcome!" },                                          es: { emoji: "🏠", title: "¡Vivienda encontrada!",  sub: "Ya tienes un hogar en EE.UU. ¡Bienvenido!" } },
  job:      { fr: { emoji: "💼", title: "Emploi trouvé !",      sub: "Tu contribues à l'économie américaine. Félicitations !" },                                    en: { emoji: "💼", title: "Job found!",             sub: "You're contributing to the US economy. Congratulations!" },                           es: { emoji: "💼", title: "¡Trabajo encontrado!",   sub: "Estás contribuyendo a la economía de EE.UU. ¡Felicidades!" } },
  license:  { fr: { emoji: "🚗", title: "Permis obtenu !",      sub: "Tu peux maintenant conduire légalement aux États-Unis." },                                    en: { emoji: "🚗", title: "License obtained!",      sub: "You can now drive legally in the United States." },                                   es: { emoji: "🚗", title: "¡Licencia obtenida!",    sub: "Ahora puedes conducir legalmente en los Estados Unidos." } },
};

function CelebrationOverlay({ stepId, lang, onDone }: { stepId: string | null; lang: Lang; onDone: () => void }) {
  useEffect(() => {
    if (!stepId) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [stepId, onDone]);
  if (!stepId) return null;
  const msg = CELEB_MESSAGES[stepId]?.[lang] ?? { emoji: "✅", title: lang === "fr" ? "Étape complétée !" : lang === "es" ? "¡Paso completado!" : "Step completed!", sub: "" };
  const isBig = stepId === "ssn" || stepId === "greencard";
  const particles = Array.from({ length: isBig ? 32 : 20 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 0.6,
    dur: 1.4 + Math.random() * 1.0,
    color: ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa","#f472b6","#60a5fa"][i % 7],
    size: 7 + Math.random() * 9, rot: Math.random() * 360, isCircle: Math.random() > 0.5,
  }));
  return (
    <>
      <style>{`
        @keyframes confettiFall { 0% { transform:translateY(-30px) rotate(0deg) scale(1); opacity:1; } 100% { transform:translateY(105vh) rotate(800deg) scale(0.5); opacity:0; } }
        @keyframes celebPop { 0% { transform:translate(-50%,-50%) scale(0.4); opacity:0; } 18% { transform:translate(-50%,-50%) scale(1.1); opacity:1; } 50% { transform:translate(-50%,-50%) scale(1); opacity:1; } 78% { transform:translate(-50%,-50%) scale(1); opacity:1; } 100% { transform:translate(-50%,-50%) scale(0.85); opacity:0; } }
        @keyframes bgFade { 0% { opacity:0; } 8% { opacity:1; } 78% { opacity:1; } 100% { opacity:0; } }
        @keyframes emojiBounce { 0%,100% { transform:scale(1) rotate(-3deg); } 50% { transform:scale(1.2) rotate(3deg); } }
        @keyframes ringPulse { 0% { transform:translate(-50%,-50%) scale(0.8); opacity:0.6; } 100% { transform:translate(-50%,-50%) scale(2.2); opacity:0; } }
      `}</style>
      <div onClick={onDone} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", animation:"bgFade 3s ease forwards", cursor:"pointer" }} />
      {particles.map(p => (
        <div key={p.id} style={{ position:"fixed", left:p.x+"%", top:"-30px", width:p.size, height:p.size, borderRadius:p.isCircle?"50%":"3px", background:p.color, zIndex:1001, pointerEvents:"none", animation:`confettiFall ${p.dur}s ${p.delay}s cubic-bezier(.25,.46,.45,.94) forwards`, transform:`rotate(${p.rot}deg)` }} />
      ))}
      <div style={{ position:"fixed", top:"50%", left:"50%", width:180, height:180, borderRadius:"50%", border:"3px solid "+(stepId==="ssn"?"#e8b84b":"#22c55e"), zIndex:1001, pointerEvents:"none", animation:"ringPulse 0.6s ease-out forwards" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", zIndex:1002, pointerEvents:"none", animation:"celebPop 3s cubic-bezier(.34,1.56,.64,1) forwards", width:300 }}>
        <div style={{ background:"linear-gradient(135deg,#0f1521,#1a2438)", border:"1.5px solid "+(stepId==="ssn"?"rgba(232,184,75,0.5)":"rgba(34,197,94,0.4)"), borderRadius:24, padding:"32px 28px 28px", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }}>
          <div style={{ fontSize:64, marginBottom:16, display:"inline-block", animation:"emojiBounce 0.5s ease infinite" }}>{msg.emoji}</div>
          <div style={{ fontSize:18, marginBottom:12, letterSpacing:4 }}>⭐⭐⭐</div>
          <div style={{ fontSize:22, fontWeight:800, color:stepId==="ssn"?"#e8b84b":"#22c55e", marginBottom:10, lineHeight:1.2 }}>{msg.title}</div>
          {msg.sub && <div style={{ fontSize:13, color:"rgba(244,241,236,0.65)", lineHeight:1.6, marginBottom:20 }}>{msg.sub}</div>}
          <div style={{ padding:"8px 16px", borderRadius:20, background:stepId==="ssn"?"rgba(232,184,75,0.1)":"rgba(34,197,94,0.08)", border:"1px solid "+(stepId==="ssn"?"rgba(232,184,75,0.25)":"rgba(34,197,94,0.2)"), fontSize:11, color:stepId==="ssn"?"#e8b84b":"#22c55e", fontWeight:600 }}>
            {lang==="fr"?"Tape pour continuer":lang==="es"?"Toca para continuar":"Tap to continue"}
          </div>
        </div>
      </div>
    </>
  );
}

const TIPS: Record<Lang, string[]> = {
  fr: ["Attends 10 jours après l'arrivée avant d'aller au bureau SSA pour le SSN.","Achète une SIM T-Mobile ou Mint Mobile dès l'aéroport — pas besoin de SSN.","Tu peux ouvrir un compte Chase ou Bank of America avec ton passeport seulement.","Ta Green Card physique arrivera par courrier USCIS en 2 à 3 semaines.","Zillow et Apartments.com sont les meilleurs sites pour trouver un logement.","LinkedIn et Indeed sont les meilleurs sites pour chercher un emploi aux USA.","Commence à construire ton credit score avec une secured credit card.","Garde toujours une copie numérique de tes documents importants.","Medicaid est gratuit si tes revenus sont bas — renseigne-toi dès que possible.","Pour le permis de conduire, passe d'abord l'examen théorique en ligne sur le site du DMV."],
  en: ["Wait 10 days after arrival before going to the SSA office for your SSN.","Buy a T-Mobile or Mint Mobile SIM at the airport — no SSN needed.","You can open a Chase or Bank of America account with your passport only.","Your physical Green Card will arrive by USCIS mail in 2 to 3 weeks.","Zillow and Apartments.com are the best sites to find housing.","LinkedIn and Indeed are the best job search sites in the USA.","Start building your credit score with a secured credit card.","Always keep a digital copy of your important documents.","Medicaid is free if your income is low — check your eligibility as soon as possible.","For your driver's license, take the written test online on the DMV website first."],
  es: ["Espera 10 días después de llegar antes de ir a la oficina SSA para tu SSN.","Compra una SIM de T-Mobile o Mint Mobile en el aeropuerto — no necesitas SSN.","Puedes abrir una cuenta en Chase o Bank of America solo con tu pasaporte.","Tu Green Card física llegará por correo USCIS en 2 a 3 semanas.","Zillow y Apartments.com son los mejores sitios para encontrar vivienda.","LinkedIn e Indeed son los mejores sitios de búsqueda de empleo en EE.UU.","Comienza a construir tu historial crediticio con una tarjeta de crédito asegurada.","Siempre guarda una copia digital de tus documentos importantes.","Medicaid es gratuito si tus ingresos son bajos — infórmate lo antes posible.","Para la licencia de conducir, haz primero el examen teórico en línea en el sitio del DMV."],
};

function DailyTip({ lang }: { lang: Lang }) {
  const idx = new Date().getDate() % TIPS[lang].length;
  const label = { fr:"Conseil du jour", en:"Tip of the day", es:"Consejo del día" }[lang];
  return (
    <div style={{ marginTop:16, background:"rgba(45,212,191,0.06)", border:"1px solid rgba(45,212,191,0.18)", borderRadius:14, padding:"14px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>
      <Lightbulb size={18} color="#2dd4bf" style={{ flexShrink:0, marginTop:1 }} />
      <div>
        <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"#2dd4bf", fontWeight:600, marginBottom:5 }}>{label}</div>
        <div style={{ fontSize:13, color:"#f4f1ec", lineHeight:1.6 }}>{TIPS[lang][idx]}</div>
      </div>
    </div>
  );
}

function KuaboAIButton({ lang, completedSteps }: { lang: Lang; completedSteps: string[] }) {
  const labels = {
    fr: { title: "Demande à Kuabo AI", sub: "Ton assistant immigration personnel" },
    en: { title: "Ask Kuabo AI",       sub: "Your personal immigration assistant" },
    es: { title: "Pregunta a Kuabo AI",sub: "Tu asistente de inmigración personal" },
  }[lang];
  return (
    <button
      onClick={() => {
        localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
        window.location.href = "/chat";
      }}
      style={{ width:"100%", marginTop:12, padding:"14px 16px", background:"linear-gradient(135deg, rgba(232,184,75,0.1), rgba(45,212,191,0.06))", border:"1px solid rgba(232,184,75,0.3)", borderRadius:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", fontFamily:"inherit" }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"rgba(232,184,75,0.12)", border:"1px solid rgba(232,184,75,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🤖</div>
        <div style={{ textAlign:"left" as const }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#f4f1ec" }}>{labels.title}</div>
          <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>{labels.sub}</div>
        </div>
      </div>
      <span style={{ color:"#e8b84b", fontSize:18 }}>→</span>
    </button>
  );
}

function StreakCard({ streak, lang }: { streak: number; lang: Lang }) {
  const data = { fr:{ label:"jours de suite", msg:streak>=7?"Tu es en feu 🔥":streak>=3?"Continue comme ça !":"Reviens chaque jour !" }, en:{ label:"days in a row", msg:streak>=7?"You're on fire 🔥":streak>=3?"Keep it up!":"Come back every day!" }, es:{ label:"días seguidos", msg:streak>=7?"¡Estás en llamas 🔥!":streak>=3?"¡Sigue así!":"¡Vuelve cada día!" } }[lang];
  const color = streak >= 7 ? "#ef4444" : streak >= 3 ? "#f97316" : "#e8b84b";
  return (
    <div style={{ marginTop:16, background:"#0f1521", border:"1px solid "+color+"30", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ width:48, height:48, borderRadius:12, background:color+"15", border:"1px solid "+color+"30", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Flame size={24} color={color} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
          <span style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{streak}</span>
          <span style={{ fontSize:12, color:"#aaa" }}>{data.label}</span>
        </div>
        <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{data.msg}</div>
      </div>
    </div>
  );
}

function SOSButton({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const contacts: Record<Lang, { icon:string; label:string; number:string; display:string; priority:boolean }[]> = {
    fr: [{ icon:"🚨", label:"Urgence — Police / Pompiers / Médecin",    number:"911",         display:"911",            priority:true  },{ icon:"🏠", label:"Aide sociale, logement, nourriture (24/7)", number:"211",         display:"211",            priority:true  },{ icon:"🛂", label:"USCIS — Questions immigration",           number:"18003755283", display:"1-800-375-5283", priority:false },{ icon:"🪪", label:"SSA — Sécurité sociale",                  number:"18007721213", display:"1-800-772-1213", priority:false }],
    en: [{ icon:"🚨", label:"Emergency — Police / Fire / Medical",       number:"911",         display:"911",            priority:true  },{ icon:"🏠", label:"Social help, housing, food (24/7)",        number:"211",         display:"211",            priority:true  },{ icon:"🛂", label:"USCIS — Immigration questions",           number:"18003755283", display:"1-800-375-5283", priority:false },{ icon:"🪪", label:"SSA — Social Security",                   number:"18007721213", display:"1-800-772-1213", priority:false }],
    es: [{ icon:"🚨", label:"Emergencia — Policía / Bomberos / Médico",  number:"911",         display:"911",            priority:true  },{ icon:"🏠", label:"Ayuda social, vivienda, comida (24/7)",    number:"211",         display:"211",            priority:true  },{ icon:"🛂", label:"USCIS — Preguntas de inmigración",        number:"18003755283", display:"1-800-375-5283", priority:false },{ icon:"🪪", label:"SSA — Seguro Social",                     number:"18007721213", display:"1-800-772-1213", priority:false }],
  };
  const btnLabel = { fr:"Aide urgente", en:"Emergency help", es:"Ayuda urgente" }[lang];
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ width:"100%", marginTop:16, padding:"13px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:14, color:"#ef4444", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit" }}>
        <PhoneCall size={16} color="#ef4444" /> 🆘 {btnLabel}
      </button>
      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={() => setOpen(false)}>
          <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:"20px 20px 0 0", padding:"24px 20px 48px", width:"100%", maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div style={{ width:36, height:4, background:"#2a3448", borderRadius:4, margin:"0 auto 20px" }} />
            <div style={{ fontSize:16, fontWeight:700, color:"#ef4444", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}><PhoneCall size={18} color="#ef4444" /> 🆘 {btnLabel}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {contacts[lang].map((c, i) => (
                <button key={i} onClick={() => { window.location.href = "tel:"+c.number; }} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:c.priority?"rgba(239,68,68,0.06)":"#141d2e", border:"1px solid "+(c.priority?"rgba(239,68,68,0.2)":"#1e2a3a"), borderRadius:12, cursor:"pointer", width:"100%", textAlign:"left" as const, fontFamily:"inherit" }}>
                  <span style={{ fontSize:22 }}>{c.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:"#fff", marginBottom:2 }}>{c.label}</div>
                    <div style={{ fontSize:15, color:c.priority?"#ef4444":"#e8b84b", fontWeight:700 }}>{c.display}</div>
                  </div>
                  <PhoneCall size={15} color={c.priority?"#ef4444":"#22c55e"} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CircularProgress({ value }: { value: number }) {
  const size=140, sw=10, r=(size-sw)/2, circ=2*Math.PI*r, offset=circ-(value/100)*circ;
  return (
    <div style={circleWrap}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8b84b" strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition:"stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={circleCenter}>
        <span style={circlePercent}>{value}%</span>
        <span style={circleLabel}>Score</span>
      </div>
    </div>
  );
}

function CountdownDeadline({ nextStep, lang }: { nextStep: Step | undefined; lang: Lang }) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!nextStep) return;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + nextStep.time);
    const update = () => setDaysLeft(Math.ceil((deadline.getTime() - Date.now()) / 86400000));
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [nextStep]);
  if (!nextStep || daysLeft === null) return null;
  const isCrit = daysLeft <= 3 || nextStep.urgency === "critical";
  const isUrg  = daysLeft <= 7 || nextStep.urgency === "high";
  const color  = isCrit ? "#ef4444" : isUrg ? "#f97316" : "#e8b84b";
  const bg     = isCrit ? "rgba(239,68,68,0.07)"  : isUrg ? "rgba(249,115,22,0.07)"  : "rgba(232,184,75,0.07)";
  const border = isCrit ? "rgba(239,68,68,0.25)"  : isUrg ? "rgba(249,115,22,0.25)"  : "rgba(232,184,75,0.2)";
  const L = { fr:{ title:"Deadline", dl:daysLeft<=1?"jour restant":"jours restants", crit:"🔴 Urgent", urg:"⚠️ Important", norm:"📅 À venir", cta:"Agir maintenant →" }, en:{ title:"Deadline", dl:daysLeft<=1?"day left":"days left", crit:"🔴 Urgent", urg:"⚠️ Important", norm:"📅 Upcoming", cta:"Act now →" }, es:{ title:"Fecha límite", dl:daysLeft<=1?"día restante":"días restantes", crit:"🔴 Urgente", urg:"⚠️ Importante", norm:"📅 Próximo", cta:"Actuar ahora →" } }[lang];
  const bar = Math.min(100, Math.max(0, ((nextStep.time - daysLeft) / nextStep.time) * 100));
  return (
    <div style={{ marginTop:16, background:bg, border:"1px solid "+border, borderRadius:16, padding:"16px", position:"relative", overflow:"hidden" }}>
      {isCrit && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(to right, transparent,"+color+", transparent)" }} />}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}><AlertTriangle size={14} color={color} /><span style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase" as const, color, fontWeight:600 }}>{L.title}</span></div>
        <span style={{ fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:20, background:color+"18", color }}>{isCrit?L.crit:isUrg?L.urg:L.norm}</span>
      </div>
      <div style={{ fontSize:14, fontWeight:600, color:"#fff", marginBottom:14 }}>{nextStep.label}</div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, marginBottom:14 }}>
        <span style={{ fontSize:48, fontWeight:800, color, lineHeight:1 }}>{daysLeft}</span>
        <span style={{ fontSize:14, color:"#aaa", marginBottom:6 }}>{L.dl}</span>
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:5, overflow:"hidden" }}>
          <div style={{ height:"100%", width:bar+"%", background:"linear-gradient(to right,"+color+"88,"+color+")", borderRadius:5, transition:"width 0.6s ease" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          <span style={{ fontSize:10, color:"#555" }}>Jour 0</span>
          <span style={{ fontSize:10, color:"#555" }}>Jour {nextStep.time}</span>
        </div>
      </div>
      <button style={{ width:"100%", padding:"11px", background:color, color:"#fff", border:"none", borderRadius:24, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{L.cta}</button>
    </div>
  );
}

function DocumentsTab({ lang, completedSteps }: { lang: Lang; completedSteps: string[] }) {
  const docs: Record<Lang, { id:string; icon:string; label:string; desc:string; linked:string|null; alwaysOk:boolean }[]> = {
    fr: [{ id:"passport", icon:"🛂", label:"Passeport",            desc:"Document d'identité international",    linked:null,        alwaysOk:true  },{ id:"visa",      icon:"🟩", label:"Visa immigrant (DV)",   desc:"DV Lottery approuvé",                  linked:null,        alwaysOk:true  },{ id:"ssn_card",  icon:"🪪", label:"Carte SSN",              desc:"Reçue 2 semaines après le bureau SSA",  linked:"ssn",       alwaysOk:false },{ id:"sim",       icon:"📱", label:"SIM / Numéro US",       desc:"T-Mobile ou Mint Mobile — Jour 1",     linked:"phone",     alwaysOk:false },{ id:"greencard", icon:"💳", label:"Green Card physique",    desc:"Courrier USCIS — 2 à 3 semaines",      linked:"greencard", alwaysOk:false },{ id:"bank_card", icon:"🏦", label:"Carte bancaire",        desc:"Chase ou BofA — passeport seulement",  linked:"bank",      alwaysOk:false },{ id:"license_c", icon:"🚗", label:"Permis de conduire US", desc:"Examen théorique + pratique DMV",      linked:"license",   alwaysOk:false }],
    en: [{ id:"passport", icon:"🛂", label:"Passport",             desc:"International ID document",            linked:null,        alwaysOk:true  },{ id:"visa",      icon:"🟩", label:"Immigrant Visa (DV)",   desc:"DV Lottery approved",                  linked:null,        alwaysOk:true  },{ id:"ssn_card",  icon:"🪪", label:"SSN Card",               desc:"Received 2 weeks after SSA office",     linked:"ssn",       alwaysOk:false },{ id:"sim",       icon:"📱", label:"SIM / US Phone Number", desc:"T-Mobile or Mint Mobile — Day 1",       linked:"phone",     alwaysOk:false },{ id:"greencard", icon:"💳", label:"Physical Green Card",   desc:"USCIS mail — 2 to 3 weeks",            linked:"greencard", alwaysOk:false },{ id:"bank_card", icon:"🏦", label:"Bank Card",             desc:"Chase or BofA — passport only",        linked:"bank",      alwaysOk:false },{ id:"license_c", icon:"🚗", label:"US Driver License",     desc:"Written + practical DMV test",         linked:"license",   alwaysOk:false }],
    es: [{ id:"passport", icon:"🛂", label:"Pasaporte",            desc:"Documento de identidad internacional", linked:null,        alwaysOk:true  },{ id:"visa",      icon:"🟩", label:"Visa inmigrante (DV)", desc:"DV Lottery aprobado",                  linked:null,        alwaysOk:true  },{ id:"ssn_card",  icon:"🪪", label:"Tarjeta SSN",            desc:"Recibida 2 semanas después SSA",        linked:"ssn",       alwaysOk:false },{ id:"sim",       icon:"📱", label:"SIM / Número US",       desc:"T-Mobile o Mint Mobile — Día 1",       linked:"phone",     alwaysOk:false },{ id:"greencard", icon:"💳", label:"Green Card física",     desc:"Correo USCIS — 2 a 3 semanas",         linked:"greencard", alwaysOk:false },{ id:"bank_card", icon:"🏦", label:"Tarjeta bancaria",      desc:"Chase o BofA — solo pasaporte",        linked:"bank",      alwaysOk:false },{ id:"license_c", icon:"🚗", label:"Licencia de conducir",  desc:"Examen teórico + práctico DMV",        linked:"license",   alwaysOk:false }],
  };
  const L = { fr:{ title:"Mes Documents", sub:"Mis à jour selon tes étapes", ok:"OK", pending:"En attente", missing:"Manquant" }, en:{ title:"My Documents", sub:"Updated based on your steps", ok:"OK", pending:"Pending", missing:"Missing" }, es:{ title:"Mis Documentos", sub:"Actualizado según tus pasos", ok:"OK", pending:"Pendiente", missing:"Faltante" } }[lang];
  const list = docs[lang];
  const getStatus = (d: typeof list[0]) => { if (d.alwaysOk) return "ok"; if (d.linked && completedSteps.includes(d.linked)) return "ok"; if (d.linked) return "pending"; return "missing"; };
  const sColor  = { ok:"#22c55e", pending:"#e8b84b", missing:"#ef4444" };
  const sBg     = { ok:"rgba(34,197,94,0.08)",  pending:"rgba(232,184,75,0.08)",  missing:"rgba(239,68,68,0.05)"  };
  const sBorder = { ok:"rgba(34,197,94,0.2)",   pending:"rgba(232,184,75,0.2)",   missing:"rgba(239,68,68,0.15)"  };
  const sLabel  = { ok:L.ok, pending:L.pending, missing:L.missing };
  const counts  = { ok:0, pending:0, missing:0 };
  list.forEach(d => { counts[getStatus(d) as keyof typeof counts]++; });
  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:4 }}>{L.title}</div>
        <div style={{ fontSize:12, color:"#aaa" }}>{L.sub}</div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {([["ok",L.ok,"#22c55e","rgba(34,197,94,0.08)","rgba(34,197,94,0.2)"],["pending",L.pending,"#e8b84b","rgba(232,184,75,0.08)","rgba(232,184,75,0.2)"],["missing",L.missing,"#ef4444","rgba(239,68,68,0.08)","rgba(239,68,68,0.2)"]] as const).map(([key,lbl,color,bg,border]) => (
          <div key={key} style={{ flex:1, background:bg, border:"1px solid "+border, borderRadius:12, padding:"12px 8px", textAlign:"center" as const }}>
            <div style={{ fontSize:22, fontWeight:700, color }}>{counts[key as keyof typeof counts]}</div>
            <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {list.map(d => {
          const s = getStatus(d);
          return (
            <div key={d.id} style={{ background:"#141d2e", border:"1px solid "+sBorder[s as keyof typeof sBorder], borderRadius:12, padding:"14px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:22, flexShrink:0 }}>{d.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#fff", marginBottom:2 }}>{d.label}</div>
                <div style={{ fontSize:11, color:"#aaa" }}>{d.desc}</div>
              </div>
              <div style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:600, background:sBg[s as keyof typeof sBg], color:sColor[s as keyof typeof sColor], border:"1px solid "+sBorder[s as keyof typeof sBorder], flexShrink:0, whiteSpace:"nowrap" as const }}>
                {sLabel[s as keyof typeof sLabel]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({ userName, userEmail, lang, progress, doneCount, totalSteps, changeLang, onLogout }: {
  userName:string; userEmail:string; lang:Lang; progress:number; doneCount:number; totalSteps:number; changeLang:(l:Lang)=>void; onLogout:()=>void;
}) {
  const [commVisible, setCommVisible]       = useState(false);
  const [notifEnabled, setNotifEnabled]     = useState(false);
  const [msgEnabled, setMsgEnabled]         = useState(true);
  const [savingToggle, setSavingToggle]     = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setCommVisible(data?.communityVisible || false);
          setNotifEnabled(data?.notifEnabled || false);
          setMsgEnabled(data?.msgEnabled !== false);
        }
      } catch { /* continue */ }
    };
    load();
  }, []);

  const saveToggle = async (field: string, value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    setSavingToggle(true);
    try { await updateDoc(doc(db, "users", user.uid), { [field]: value }); }
    catch { /* continue */ }
    setSavingToggle(false);
  };

  const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} disabled={savingToggle} style={{ width:48, height:26, borderRadius:13, background:value?"#e8b84b":"#2a3448", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left:value?24:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
    </button>
  );

  const L = {
    fr: { title:"Mon Profil", situation:"DV Lottery", phase:"Phase 1 — Installation", score:"Score d'intégration", steps:"étapes complétées", lang:"Langue", commVisible:"Carte communauté", commSub:"Apparaître anonymement sur la carte", notif:"Notifications", notifSub:"Rappels quotidiens", msg:"Messages", msgSub:"Recevoir des messages", privacy:"Confidentialité", help:"Aide", logout:"Déconnexion", version:"Version 1.0 · Kuabo" },
    en: { title:"My Profile", situation:"DV Lottery", phase:"Phase 1 — Installation", score:"Integration score", steps:"steps completed", lang:"Language", commVisible:"Community map", commSub:"Appear anonymously on the map", notif:"Notifications", notifSub:"Daily reminders", msg:"Messages", msgSub:"Receive messages", privacy:"Privacy", help:"Help", logout:"Logout", version:"Version 1.0 · Kuabo" },
    es: { title:"Mi Perfil", situation:"DV Lottery", phase:"Fase 1 — Instalación", score:"Puntuación integración", steps:"pasos completados", lang:"Idioma", commVisible:"Mapa comunidad", commSub:"Aparecer anónimamente en el mapa", notif:"Notificaciones", notifSub:"Recordatorios diarios", msg:"Mensajes", msgSub:"Recibir mensajes", privacy:"Privacidad", help:"Ayuda", logout:"Cerrar sesión", version:"Versión 1.0 · Kuabo" },
  }[lang];

  const size=96, sw=6, r=(size-sw)/2, circ=2*Math.PI*r, offset=circ-(progress/100)*circ;

  return (
    <div>
      <div style={{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:20 }}>{L.title}</div>

      {/* Avatar + info */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:20 }}>
        <div style={{ position:"relative", width:size, height:size, marginBottom:12 }}>
          <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8b84b" strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition:"stroke-dashoffset 0.8s ease" }} />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"#1a2438", border:"2px solid #e8b84b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>👤</div>
          </div>
        </div>
        <div style={{ fontSize:17, fontWeight:700, color:"#fff", marginBottom:2 }}>{userName}</div>
        <div style={{ fontSize:12, color:"#aaa", marginBottom:8 }}>{userEmail}</div>
        <div style={{ padding:"4px 14px", borderRadius:20, background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.25)", fontSize:11, color:"#e8b84b", fontWeight:600 }}>🎰 {L.situation} · {L.phase}</div>
      </div>

      {/* Score */}
      <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:14, padding:"16px", marginBottom:12 }}>
        <div style={{ fontSize:11, color:"#aaa", letterSpacing:"0.1em", textTransform:"uppercase" as const, marginBottom:10 }}>{L.score}</div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:34, fontWeight:800, color:"#e8b84b", lineHeight:1 }}>{progress}%</div>
          <div style={{ flex:1 }}>
            <div style={{ height:6, background:"#1e2a3a", borderRadius:6, overflow:"hidden", marginBottom:4 }}>
              <div style={{ height:"100%", width:progress+"%", background:"linear-gradient(to right,#e8b84b,#2dd4bf)", borderRadius:6, transition:"width 0.8s ease" }} />
            </div>
            <div style={{ fontSize:12, color:"#aaa" }}>{doneCount}/{totalSteps} {L.steps}</div>
          </div>
        </div>
      </div>

      {/* Langue */}
      <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:14, padding:"14px", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={settingIcon}><Globe size={16} color="#e8b84b" /></div>
            <span style={{ fontSize:14, color:"#fff" }}>{L.lang}</span>
          </div>
          <div style={{ display:"flex", gap:5 }}>
            {(["fr","en","es"] as Lang[]).map(lg => (
              <button key={lg} onClick={() => changeLang(lg)} style={{ padding:"4px 10px", borderRadius:8, border:"1px solid", borderColor:lang===lg?"#e8b84b":"#2a3448", background:lang===lg?"rgba(232,184,75,0.12)":"transparent", color:lang===lg?"#e8b84b":"#aaa", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{lg.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles confidentialité */}
      <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:14, padding:"14px", marginBottom:8 }}>
        <div style={{ fontSize:10, color:"#555", letterSpacing:"0.1em", textTransform:"uppercase" as const, marginBottom:12 }}>{L.privacy}</div>

        {/* Communauté */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:"#f4f1ec", marginBottom:2 }}>{L.commVisible}</div>
            <div style={{ fontSize:11, color:"#aaa" }}>{L.commSub}</div>
          </div>
          <Toggle value={commVisible} onToggle={() => { const v=!commVisible; setCommVisible(v); saveToggle("communityVisible", v); }} />
        </div>

        {/* Messages */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:"#f4f1ec", marginBottom:2 }}>{L.msg}</div>
            <div style={{ fontSize:11, color:"#aaa" }}>{L.msgSub}</div>
          </div>
          <Toggle value={msgEnabled} onToggle={() => { const v=!msgEnabled; setMsgEnabled(v); saveToggle("msgEnabled", v); }} />
        </div>
      </div>

      {/* Notifications */}
      <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:14, padding:"14px", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:"#f4f1ec", marginBottom:2 }}>{L.notif}</div>
            <div style={{ fontSize:11, color:"#aaa" }}>{L.notifSub}</div>
          </div>
          <Toggle value={notifEnabled} onToggle={() => { const v=!notifEnabled; setNotifEnabled(v); saveToggle("notifEnabled", v); }} />
        </div>
      </div>

      {/* Aide */}
      <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:14, padding:"14px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={settingIcon}>❓</div>
          <span style={{ fontSize:14, color:"#fff" }}>{L.help}</span>
        </div>
        <ChevronRight size={16} color="#555" />
      </div>

      {/* Déconnexion */}
      <div style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:14, padding:"14px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }} onClick={onLogout}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={settingIcon}><LogOut size={16} color="#ef4444" /></div>
          <span style={{ fontSize:14, color:"#ef4444" }}>{L.logout}</span>
        </div>
        <ChevronRight size={16} color="#ef4444" />
      </div>

      {/* Version */}
      <div style={{ textAlign:"center" as const, fontSize:11, color:"#333", paddingBottom:8 }}>{L.version}</div>
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab, lang }: { activeTab:Tab; setActiveTab:(t:Tab)=>void; lang:Lang }) {
  const L = {
    fr: { home:"Accueil", documents:"Documents", explorer:"Explorer", profile:"Profil"    },
    en: { home:"Home",    documents:"Documents", explorer:"Explorer", profile:"Profile"   },
    es: { home:"Inicio",  documents:"Documentos",explorer:"Explorar", profile:"Perfil"   },
  }[lang];
  const tabs: { id:Tab; icon:React.ReactNode; label:string }[] = [
    { id:"home",      icon:<Home size={22} />,     label:L.home      },
    { id:"documents", icon:<FileText size={22} />, label:L.documents },
    { id:"explorer",  icon:<MapPin size={22} />,   label:L.explorer  },
    { id:"profile",   icon:<User size={22} />,     label:L.profile   },
  ];
  return (
    <div style={bottomNavWrap}>
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:"10px 0 8px", background:"transparent", border:"none", cursor:"pointer", position:"relative", fontFamily:"inherit" }}>
            {active && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:32, height:2, borderRadius:"0 0 4px 4px", background:"#e8b84b" }} />}
            <div style={{ color:active?"#e8b84b":"#4a5568", transition:"color 0.2s" }}>{tab.icon}</div>
            <span style={{ fontSize:10, fontWeight:active?600:400, color:active?"#e8b84b":"#4a5568", transition:"color 0.2s" }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD MAIN
// ══════════════════════════════════════════════
export default function Dashboard() {
  const router  = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [userName, setUserName]             = useState("");
  const [userEmail, setUserEmail]           = useState("");
  const [userId, setUserId]                 = useState<string | undefined>(undefined);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [menuOpen, setMenuOpen]             = useState(false);
  const [ready, setReady]                   = useState(false);
  const [lang, setLang]                     = useState<Lang>("fr");
  const [toast, setToast]                   = useState<string | null>(null);
  const [lastAction, setLastAction]         = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<Tab>("home");
  const [celebStep, setCelebStep]           = useState<string | null>(null);

  const streak = useStreak(userId);
  useScrollToTop(activeTab);

  const T: Record<Lang, Record<string,string>> = {
    fr: { next:"Prochaine étape", guide:"Voir le guide →", mark:"Marquer comme fait", done:"FAIT", todo:"À FAIRE", logout:"Déconnexion", days:"j", completed:"Complétées", integration:"Intégration", undo:"Annuler", remaining:"Restantes", m0:"Bienvenue ! Commence par ta première étape 🚀", m1:"Tu avances bien, continue !", m2:"Tu es sur la bonne voie 🔥", m3:"Presque terminé 💪", m4:"Tout complété — félicitations 🎉" },
    en: { next:"Next step", guide:"View guide →", mark:"Mark as done", done:"DONE", todo:"TO DO", logout:"Logout", days:"d", completed:"Completed", integration:"Integration", undo:"Undo", remaining:"Remaining", m0:"Welcome! Start with your first step 🚀", m1:"You're doing great, keep going!", m2:"You're on the right track 🔥", m3:"Almost done 💪", m4:"All done — congratulations 🎉" },
    es: { next:"Próximo paso", guide:"Ver guía →", mark:"Marcar como hecho", done:"HECHO", todo:"PENDIENTE", logout:"Cerrar sesión", days:"d", completed:"Completadas", integration:"Integración", undo:"Deshacer", remaining:"Restantes", m0:"¡Bienvenido! Empieza con tu primer paso 🚀", m1:"Vas muy bien, ¡sigue así!", m2:"Vas por buen camino 🔥", m3:"Casi terminado 💪", m4:"Todo completado — ¡felicidades! 🎉" },
  };

  const text  = T[lang];
  const steps = STEPS_BY_LANG[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    const savedName = localStorage.getItem("userName") || "";
    if (savedLang && ["fr","en","es"].includes(savedLang)) setLang(savedLang);
    if (savedName) setUserName(savedName);

    const timeout = setTimeout(() => { setReady(true); }, 5000);

    const unsub = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.uid);
      setUserEmail(user.email || "");
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() as any : {};
        const name = data?.name || user.displayName || user.email?.split("@")[0] || "User";
        const userLang = (data?.lang as Lang) || savedLang || "fr";
        setUserName(name);
        setLang(userLang);
        setCompletedSteps(data?.completedSteps || []);
        localStorage.setItem("userName", name);
        localStorage.setItem("lang", userLang);
      } catch { /* continue */ }
      setReady(true);
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const changeLang = async (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
    const user = auth.currentUser;
    if (user) {
      try { await updateDoc(doc(db, "users", user.uid), { lang: l }); }
      catch { /* continue */ }
    }
    setMenuOpen(false);
  };

  const toggleStep = async (stepId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    const msgs = {
      removed: { fr:"❌ Étape retirée", en:"❌ Step removed", es:"❌ Paso eliminado" },
      done:    { fr:"✅ Étape complétée !", en:"✅ Step completed!", es:"✅ ¡Paso completado!" },
    };
    let updated: string[];
    if (completedSteps.includes(stepId)) {
      updated = completedSteps.filter(s => s !== stepId);
      setToast(msgs.removed[lang]);
    } else {
      updated = [...completedSteps, stepId];
      setToast(msgs.done[lang]);
      setCelebStep(stepId);
    }
    setCompletedSteps(updated);
    setLastAction(stepId);
    try { await updateDoc(doc(db, "users", user.uid), { completedSteps: updated }); }
    catch { /* continue */ }
    setTimeout(() => setToast(null), 3000);
  };

  const undo = async () => {
    if (!lastAction) return;
    const user = auth.currentUser;
    if (!user) return;
    const updated = completedSteps.filter(s => s !== lastAction);
    setCompletedSteps(updated);
    try { await updateDoc(doc(db, "users", user.uid), { completedSteps: updated }); }
    catch { /* continue */ }
    setToast(null);
    setLastAction(null);
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch { /* continue */ }
    window.location.href = "/login";
  };
  const handleCelebDone = useCallback(() => setCelebStep(null), []);

  const progress   = Math.round(steps.reduce((acc, s) => completedSteps.includes(s.id) ? acc + s.weight : acc, 0));
  const nextStep   = steps.find(s => !completedSteps.includes(s.id));
  const totalSteps = steps.length;
  const doneCount  = completedSteps.length;
  const motivMsg   = doneCount === 0 ? text.m0 : doneCount < 2 ? text.m1 : doneCount < 4 ? text.m2 : doneCount < totalSteps ? text.m3 : text.m4;

  const getStepColor = (step: Step, done: boolean) => {
    if (done) return "#22c55e";
    if (step.urgency === "critical") return "#ef4444";
    if (step.urgency === "high")     return "#f97316";
    return "#e8b84b";
  };

  if (!ready) return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0b0f1a", gap:16 }}>
      <div style={{ fontSize:28, fontWeight:900, fontFamily:"serif" }}>
        <span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span>
      </div>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation:"spin 1s linear infinite" }}>
        <circle cx="18" cy="18" r="14" fill="none" stroke="#1e2a3a" strokeWidth="4" />
        <circle cx="18" cy="18" r="14" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset="66" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ background:"#0b0f1a", minHeight:"100dvh", color:"#fff" }}>

      <CelebrationOverlay stepId={celebStep} lang={lang} onDone={handleCelebDone} />

      <div style={container}>

        {/* HEADER */}
        <div style={topBar}>
          <div style={logo}><span style={{ color:"#e8b84b" }}>Ku</span>abo</div>
          <div ref={menuRef} style={{ position:"relative" }}>
            <div style={userBtn} onClick={() => setMenuOpen(!menuOpen)}>
              <Globe size={13} color="#aaa" />
              <span style={{ maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{userName}</span>
              <ChevronRight size={13} color="#aaa" style={{ transform:menuOpen?"rotate(90deg)":"rotate(0deg)", transition:"transform 0.2s" }} />
            </div>
            {menuOpen && (
              <div style={menu}>
                <div style={menuItem} onClick={() => changeLang("fr")}>🇫🇷 Français</div>
                <div style={menuItem} onClick={() => changeLang("en")}>🇺🇸 English</div>
                <div style={menuItem} onClick={() => changeLang("es")}>🇪🇸 Español</div>
                <hr style={{ borderColor:"#2a3448", margin:"6px 0" }} />
                <div style={{ ...menuItem, color:"#ef4444", display:"flex", alignItems:"center", gap:6 }} onClick={handleLogout}>
                  <LogOut size={13} /> {text.logout}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <>
            <div style={{ marginTop:14 }}>
              <div style={{ color:"#aaa", fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase" as const }}>⚡ Phase 1 — Installation</div>
              <div style={{ fontSize:16, marginTop:4, fontWeight:"bold", lineHeight:1.4 }}>{motivMsg}</div>
            </div>

            <div style={statsRow}>
              <div style={statCard}><div style={statNumber}>{doneCount}</div><div style={statLabel}>{text.completed}</div></div>
              <div style={statCard}><div style={statNumber}>{progress}%</div><div style={statLabel}>{text.integration}</div></div>
              <div style={statCard}><div style={statNumber}>{totalSteps-doneCount}</div><div style={statLabel}>{text.remaining}</div></div>
            </div>

            <StreakCard streak={streak} lang={lang} />
            <DailyTip lang={lang} />
            <KuaboAIButton lang={lang} completedSteps={completedSteps} />

            {nextStep ? (
              <div style={{ ...priorityCard, border:"1px solid "+(nextStep.urgency==="critical"?"rgba(239,68,68,0.4)":nextStep.urgency==="high"?"rgba(249,115,22,0.3)":"rgba(232,184,75,0.25)"), background:nextStep.urgency==="critical"?"rgba(239,68,68,0.05)":"#1a2438" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                  {nextStep.urgency==="critical" && <span style={{ fontSize:10, fontWeight:700, color:"#ef4444", letterSpacing:"0.1em", textTransform:"uppercase" as const }}>🔴 {text.next}</span>}
                  {nextStep.urgency==="high"     && <span style={{ fontSize:10, fontWeight:700, color:"#f97316", letterSpacing:"0.1em", textTransform:"uppercase" as const }}>🟠 {text.next}</span>}
                  {nextStep.urgency==="normal"   && <span style={{ fontSize:10, color:"#aaa", letterSpacing:"0.1em", textTransform:"uppercase" as const }}>{text.next}</span>}
                </div>
                <div style={{ fontSize:17, fontWeight:600, marginBottom:6, color:"#fff" }}>{nextStep.label}</div>
                <div style={{ fontSize:12, color:"#aaa", marginBottom:14, display:"flex", alignItems:"center", gap:4 }}>
                  <Clock size={11} color="#aaa" />
                  {nextStep.time===1 ? (lang==="fr"?"Jour 1 — dès l'arrivée":lang==="es"?"Día 1 — al llegar":"Day 1 — upon arrival") : nextStep.time+" "+(lang==="fr"?"jours max":lang==="es"?"días máx":"days max")}
                </div>
                <button style={primaryBtn}>{text.guide}</button>
                <button style={secondaryBtn} onClick={() => toggleStep(nextStep.id)}>✓ {text.mark}</button>
              </div>
            ) : (
              <div style={{ ...priorityCard, textAlign:"center" as const, border:"1px solid rgba(34,197,94,0.25)", background:"rgba(34,197,94,0.05)" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#22c55e" }}>{text.m4}</div>
              </div>
            )}

            <div style={circleSection}>
              <CircularProgress value={progress} />
              <div style={circleStats}>
                <div style={circleStat}><Target size={14} color="#e8b84b" /><div><div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{doneCount}</div><div style={{ fontSize:10, color:"#aaa" }}>{text.completed}</div></div></div>
                <div style={circleStat}><Clock size={14} color="#e8b84b" /><div><div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{totalSteps-doneCount}</div><div style={{ fontSize:10, color:"#aaa" }}>{text.remaining}</div></div></div>
                <div style={circleStat}><CheckCircle2 size={14} color="#22c55e" /><div><div style={{ fontSize:16, fontWeight:700, color:"#22c55e" }}>{progress}%</div><div style={{ fontSize:10, color:"#aaa" }}>{text.integration}</div></div></div>
              </div>
            </div>

            <CountdownDeadline nextStep={nextStep} lang={lang} />

            <div style={{ marginTop:16 }}>
              {steps.map(step => {
                const done = completedSteps.includes(step.id);
                const color = getStepColor(step, done);
                const borderColor = done ? "rgba(34,197,94,0.2)" : step.urgency==="critical" ? "rgba(239,68,68,0.2)" : step.urgency==="high" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)";
                return (
                  <div key={step.id} style={{ ...taskCard, opacity:done?0.55:1, border:"1px solid "+borderColor }}>
                    <div style={{ ...check, background:done?"#22c55e":"transparent", borderColor:done?"#22c55e":color }} onClick={() => toggleStep(step.id)}>
                      {done && <CheckCircle2 size={13} color="#fff" />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:done?"#555":"#fff", textDecoration:done?"line-through":"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{step.label}</div>
                      <div style={{ fontSize:11, color:done?"#555":color, marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                        <Clock size={10} color={done?"#555":color} />
                        {step.time===1 ? (lang==="fr"?"Jour 1 — dès l'arrivée":lang==="es"?"Día 1 — al llegar":"Day 1 — upon arrival") : step.time+" "+text.days+" max"}
                      </div>
                    </div>
                    <div style={{ fontSize:10, fontWeight:700, color, display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                      {done ? <><CheckCircle2 size={11} color="#22c55e" /> {text.done}</> : <><ChevronRight size={11} color={color} /> {text.todo}</>}
                    </div>
                  </div>
                );
              })}
            </div>

            <SOSButton lang={lang} />
          </>
        )}

        {activeTab === "documents" && <div style={{ marginTop:14 }}><DocumentsTab lang={lang} completedSteps={completedSteps} /></div>}

        {/* ✅ EXPLORER TAB */}
        {activeTab === "explorer" && <ExplorerTab lang={lang} />}

        {activeTab === "profile" && (
          <div style={{ marginTop:14 }}>
            <ProfileTab userName={userName} userEmail={userEmail} lang={lang} progress={progress} doneCount={doneCount} totalSteps={totalSteps} changeLang={changeLang} onLogout={handleLogout} />
          </div>
        )}

        {toast && (
          <div style={toastStyle}>
            <span style={{ fontSize:13 }}>{toast}</span>
            {lastAction && (
              <span onClick={undo} style={{ marginLeft:10, cursor:"pointer", color:"#e8b84b", fontSize:13, display:"inline-flex", alignItems:"center", gap:4 }}>
                <Undo2 size={13} /> {text.undo}
              </span>
            )}
          </div>
        )}

      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const container: CSSProperties     = { minHeight:"100dvh", background:"#0b0f1a", color:"#fff", padding:"16px 16px 90px", maxWidth:480, margin:"0 auto" };
const topBar: CSSProperties        = { display:"flex", justifyContent:"space-between", alignItems:"center" };
const logo: CSSProperties          = { fontWeight:"bold", fontSize:20 };
const userBtn: CSSProperties       = { background:"#1a2438", padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6 };
const menu: CSSProperties          = { position:"absolute", right:0, top:"110%", background:"#1a2438", padding:"8px", borderRadius:10, minWidth:150, zIndex:100, boxShadow:"0 8px 24px rgba(0,0,0,0.4)" };
const menuItem: CSSProperties      = { padding:"8px 10px", cursor:"pointer", fontSize:13, borderRadius:6 };
const statsRow: CSSProperties      = { display:"flex", gap:8, marginTop:12 };
const statCard: CSSProperties      = { flex:1, background:"#1a2438", padding:"10px 8px", borderRadius:10, textAlign:"center" };
const statNumber: CSSProperties    = { fontSize:22, fontWeight:"bold", color:"#e8b84b", lineHeight:1 };
const statLabel: CSSProperties     = { fontSize:10, color:"#aaa", marginTop:3, letterSpacing:"0.05em" };
const priorityCard: CSSProperties  = { marginTop:16, padding:"18px 16px", borderRadius:16, background:"#1a2438", border:"1px solid rgba(232,184,75,0.25)" };
const primaryBtn: CSSProperties    = { width:"100%", padding:"13px", background:"#e8b84b", color:"#000", border:"none", borderRadius:24, marginBottom:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };
const secondaryBtn: CSSProperties  = { width:"100%", padding:"13px", background:"transparent", border:"1px solid rgba(232,184,75,0.3)", borderRadius:24, color:"#e8b84b", fontSize:14, cursor:"pointer", fontFamily:"inherit" };
const circleSection: CSSProperties = { marginTop:16, background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:16, padding:"20px 16px", display:"flex", alignItems:"center", gap:20 };
const circleWrap: CSSProperties    = { position:"relative", width:140, height:140, flexShrink:0 };
const circleCenter: CSSProperties  = { position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" };
const circlePercent: CSSProperties = { fontSize:24, fontWeight:700, color:"#e8b84b", lineHeight:1 };
const circleLabel: CSSProperties   = { fontSize:10, color:"#aaa", marginTop:3, letterSpacing:"0.08em", textTransform:"uppercase" };
const circleStats: CSSProperties   = { flex:1, display:"flex", flexDirection:"column", gap:14 };
const circleStat: CSSProperties    = { display:"flex", alignItems:"center", gap:10 };
const taskCard: CSSProperties      = { marginTop:8, background:"#141d2e", padding:"12px 14px", borderRadius:12, display:"flex", alignItems:"center", gap:10 };
const check: CSSProperties         = { width:22, height:22, borderRadius:"50%", border:"2px solid #555", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 };
const toastStyle: CSSProperties    = { position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"#1a2438", padding:"10px 18px", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 8px 24px rgba(0,0,0,0.4)", zIndex:999, display:"flex", alignItems:"center" };
const bottomNavWrap: CSSProperties = { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, height:68, background:"#0f1521", borderTop:"1px solid #1e2a3a", display:"flex", alignItems:"center", zIndex:200 };
const settingRow: CSSProperties    = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px", background:"#141d2e", borderRadius:12, cursor:"pointer", border:"1px solid #1e2a3a", marginBottom:6 };
const settingIcon: CSSProperties   = { width:32, height:32, borderRadius:8, background:"#1a2438", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 };