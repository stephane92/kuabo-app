"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

// ══════════════════════════════════════════════
// OPTIONS PRINCIPALES
// ══════════════════════════════════════════════
const MAIN_OPTIONS: Record<Lang, {label:string;value:string;icon:string;desc:string}[]> = {
  fr:[
    {icon:"🎰",label:"DV Lottery",      value:"dv",       desc:"Tu as gagné la loterie de visas"},
    {icon:"🏆",label:"Coupe du Monde",  value:"worldcup", desc:"USA, Canada, Mexique 2026"},
    {icon:"✈️",label:"Tourisme",        value:"tourist",  desc:"Voyage temporaire aux USA"},
    {icon:"🌍",label:"Autre situation", value:"other",    desc:"Visa travail, étudiant, famille..."},
  ],
  en:[
    {icon:"🎰",label:"DV Lottery",      value:"dv",       desc:"You won the visa lottery"},
    {icon:"🏆",label:"World Cup",       value:"worldcup", desc:"USA, Canada, Mexico 2026"},
    {icon:"✈️",label:"Tourism",         value:"tourist",  desc:"Temporary visit to the USA"},
    {icon:"🌍",label:"Other situation", value:"other",    desc:"Work visa, student, family..."},
  ],
  es:[
    {icon:"🎰",label:"Lotería DV",      value:"dv",       desc:"Ganaste la lotería de visas"},
    {icon:"🏆",label:"Copa del Mundo",  value:"worldcup", desc:"EE.UU., Canadá, México 2026"},
    {icon:"✈️",label:"Turismo",         value:"tourist",  desc:"Visita temporal a EE.UU."},
    {icon:"🌍",label:"Otra situación",  value:"other",    desc:"Visa trabajo, estudiante, familia..."},
  ],
};

// ══════════════════════════════════════════════
// SOUS-OPTIONS "AUTRE"
// ══════════════════════════════════════════════
const SUB_OPTIONS: Record<Lang, {label:string;value:string;icon:string}[]> = {
  fr:[
    {icon:"💼",label:"Visa travail",           value:"work"   },
    {icon:"🎓",label:"Étudiant",               value:"student"},
    {icon:"👨‍👩‍👧",label:"Regroupement familial", value:"family" },
    {icon:"🕊️",label:"Réfugié / Asile",        value:"refugee"},
  ],
  en:[
    {icon:"💼",label:"Work visa",              value:"work"   },
    {icon:"🎓",label:"Student",                value:"student"},
    {icon:"👨‍👩‍👧",label:"Family reunification",  value:"family" },
    {icon:"🕊️",label:"Refugee / Asylum",       value:"refugee"},
  ],
  es:[
    {icon:"💼",label:"Visa de trabajo",         value:"work"   },
    {icon:"🎓",label:"Estudiante",              value:"student"},
    {icon:"👨‍👩‍👧",label:"Reunificación familiar", value:"family" },
    {icon:"🕊️",label:"Refugiado / Asilo",       value:"refugee"},
  ],
};

// ══════════════════════════════════════════════
// OPTIONS ARMY — modal au centre
// ══════════════════════════════════════════════
const ARMY_OPTIONS: Record<Lang, {label:string;value:string;icon:string;desc:string;explain:string}[]> = {
  fr:[
    { icon:"🎖️", label:"Oui, je suis dans l'Army",   value:"army",         desc:"Soldat actif — avantages militaires",          explain:"Logement sur base, TRICARE gratuit pour ta famille, et naturalisation en 1 an de service actif." },
    { icon:"🤔", label:"Je veux m'engager",            value:"army_interest",desc:"Intéressé mais pas encore engagé",              explain:"Kuabo t'explique les étapes : recruteur, ASVAB, Boot Camp. Naturalisation accélérée en 1 an." },
    { icon:"❓", label:"Pas encore décidé",             value:"army_unsure",  desc:"Je veux en savoir plus avant de décider",      explain:"Pas de pression. Kuabo te donnera toutes les infos au bon moment. Tu peux changer dans ton profil." },
    { icon:"🎰", label:"DV Lottery classique",          value:"dv_classic",   desc:"Parcours DV standard sans l'Army",             explain:"SSN, Green Card, logement, emploi, credit score... Kuabo te guide étape par étape." },
  ],
  en:[
    { icon:"🎖️", label:"Yes, I'm in the Army",        value:"army",         desc:"Active soldier — military benefits",           explain:"On-base housing, free TRICARE for your family, and naturalization in 1 year of active duty." },
    { icon:"🤔", label:"I want to enlist",             value:"army_interest",desc:"Interested but not yet enlisted",              explain:"Kuabo explains the steps: recruiter, ASVAB, Boot Camp. Fast-track naturalization in 1 year." },
    { icon:"❓", label:"Not decided yet",               value:"army_unsure",  desc:"I want more info before deciding",            explain:"No pressure. Kuabo will give you all the info when you need it. You can change it in your profile." },
    { icon:"🎰", label:"Classic DV path",               value:"dv_classic",   desc:"Standard DV path without the Army",           explain:"SSN, Green Card, housing, job, credit score... Kuabo guides you step by step." },
  ],
  es:[
    { icon:"🎖️", label:"Sí, estoy en el Army",        value:"army",         desc:"Soldado activo — beneficios militares",        explain:"Alojamiento en base, TRICARE gratis para tu familia y naturalización en 1 año de servicio activo." },
    { icon:"🤔", label:"Quiero alistarme",              value:"army_interest",desc:"Interesado pero aún no alistado",              explain:"Kuabo te explica los pasos: reclutador, ASVAB, Boot Camp. Naturalización acelerada en 1 año." },
    { icon:"❓", label:"Aún no lo decidí",              value:"army_unsure",  desc:"Quiero más información antes de decidir",     explain:"Sin presión. Kuabo te dará toda la info cuando la necesites. Puedes cambiarlo en tu perfil." },
    { icon:"🎰", label:"Camino DV clásico",             value:"dv_classic",   desc:"Camino DV estándar sin el Army",              explain:"SSN, Green Card, vivienda, trabajo, historial crediticio... Kuabo te guía paso a paso." },
  ],
};

// ══════════════════════════════════════════════
// MESSAGES DE MOTIVATION
// ══════════════════════════════════════════════
const MOTIVATION: Record<string, Record<Lang, {emoji:string;title:string;msg:string}>> = {
  dv_classic:      { fr:{emoji:"🎰",title:"DV Lottery — Let's go !",          msg:"Tu suis le parcours DV classique. Kuabo te guide étape par étape — SSN, Green Card, emploi et bien plus."}, en:{emoji:"🎰",title:"Classic DV path — Let's go!",   msg:"You follow the classic DV path. Kuabo guides you step by step — SSN, Green Card, job and more."}, es:{emoji:"🎰",title:"Camino DV clásico — ¡Vamos!",   msg:"Sigues el camino DV clásico. Kuabo te guía paso a paso — SSN, Green Card, trabajo y más."} },
  army:            { fr:{emoji:"🎖️",title:"Soldat et résident permanent !",   msg:"Double honneur. Kuabo t'aide avec le logement sur base, TRICARE, et ta naturalisation en 1 an."},           en:{emoji:"🎖️",title:"Soldier and permanent resident!", msg:"Double honor. Kuabo helps you with housing, TRICARE, and fast-track naturalization in 1 year."}, es:{emoji:"🎖️",title:"¡Soldado y residente permanente!", msg:"Doble honor. Kuabo te ayuda con alojamiento, TRICARE y naturalización acelerada en 1 año."} },
  army_interest:   { fr:{emoji:"🤔",title:"Intéressé par l'Army !",           msg:"Bonne idée. Kuabo t'explique comment rejoindre l'Army avec une DV — avantages, étapes, naturalisation."},  en:{emoji:"🤔",title:"Interested in the Army!",         msg:"Great idea. Kuabo explains how to join the Army with DV — benefits, steps, naturalization."},    es:{emoji:"🤔",title:"¡Interesado en el Army!",         msg:"Buena idea. Kuabo te explica cómo unirte al Army con DV — beneficios, pasos, naturalización."} },
  army_unsure:     { fr:{emoji:"❓",title:"On t'informe !",                   msg:"Pas de pression. Kuabo te donnera toutes les infos au bon moment. Tu décides à ton rythme."},                 en:{emoji:"❓",title:"We'll keep you informed!",        msg:"No pressure. Kuabo will give you all the info when you need it. You decide at your pace."},       es:{emoji:"❓",title:"¡Te informaremos!",               msg:"Sin presión. Kuabo te dará toda la info cuando la necesites. Decides a tu ritmo."} },
  worldcup:        { fr:{emoji:"🏆",title:"Coupe du Monde 2026 !",            msg:"USA, Canada, Mexique — Kuabo va t'aider à préparer ton voyage et en profiter au max."},                      en:{emoji:"🏆",title:"World Cup 2026!",                  msg:"USA, Canada, Mexico — Kuabo will help you prepare your trip and make the most of it."},           es:{emoji:"🏆",title:"¡Copa del Mundo 2026!",           msg:"EE.UU., Canadá, México — Kuabo te ayudará a preparar tu viaje y disfrutarlo al máximo."} },
  tourist:         { fr:{emoji:"✈️",title:"L'aventure t'attend !",            msg:"Kuabo va t'aider à préparer ton voyage — visas, conseils et tout pour profiter de ton séjour."},             en:{emoji:"✈️",title:"Adventure awaits!",               msg:"Kuabo will help you prepare your trip — visas, tips, and everything to enjoy your stay."},         es:{emoji:"✈️",title:"¡La aventura te espera!",        msg:"Kuabo te ayudará a preparar tu viaje — visas, consejos y todo para disfrutar tu estancia."} },
  work:            { fr:{emoji:"💼",title:"Prêt à travailler !",              msg:"Kuabo va t'aider à t'installer rapidement — documents, logement, et tout ce qu'il faut."},                  en:{emoji:"💼",title:"Ready to work!",                  msg:"Kuabo will help you settle fast — documents, housing, and everything you need."},                  es:{emoji:"💼",title:"¡Listo para trabajar!",           msg:"Kuabo te ayudará a instalarte rápido — documentos, vivienda y todo lo que necesitas."} },
  student:         { fr:{emoji:"🎓",title:"La vie étudiante commence !",      msg:"Kuabo va te guider dans ton nouveau pays — logement, admin, et conseils d'autres étudiants."},               en:{emoji:"🎓",title:"Student life starts now!",         msg:"Kuabo will guide you — housing, admin, and tips from other students."},                            es:{emoji:"🎓",title:"¡La vida estudiantil comienza!",  msg:"Kuabo te guiará en tu nuevo país — vivienda, trámites y consejos de otros estudiantes."} },
  family:          { fr:{emoji:"👨‍👩‍👧",title:"La famille avant tout !",        msg:"Kuabo va aider toute ta famille à s'installer — étape par étape, sans stress."},                          en:{emoji:"👨‍👩‍👧",title:"Family first!",                  msg:"Kuabo will help your whole family settle in — step by step, stress-free."},                        es:{emoji:"👨‍👩‍👧",title:"¡La familia primero!",          msg:"Kuabo ayudará a toda tu familia a instalarse — paso a paso, sin estrés."} },
  refugee:         { fr:{emoji:"🕊️",title:"Tu es en sécurité ici.",          msg:"Kuabo est là pour toi. On va te guider à travers chaque démarche avec soin."},                              en:{emoji:"🕊️",title:"You're safe here.",               msg:"Kuabo is here for you. We'll guide you through every step with care."},                             es:{emoji:"🕊️",title:"Estás a salvo aquí.",            msg:"Kuabo está aquí para ti. Te guiaremos en cada trámite con cuidado."} },
  other:           { fr:{emoji:"🌍",title:"Bienvenue !",                      msg:"Quelle que soit ta raison, Kuabo est là pour te guider à chaque étape."},                                    en:{emoji:"🌍",title:"Welcome!",                         msg:"Whatever your reason, Kuabo is here to guide you every step of the way."},                          es:{emoji:"🌍",title:"¡Bienvenido!",                    msg:"Cualquiera que sea tu razón, Kuabo está aquí para guiarte en cada paso."} },
};

const UI: Record<Lang, any> = {
  fr:{ title:"Quelle est ta situation ?", sub:"Choisis l'option qui te correspond", next:"Continuer →", back:"Retour", step:"Étape 1 sur 5", subTitle:"Précise ta situation", armyModalTitle:"Et l'US Army ?", armyModalSub:"Avec une DV Lottery, tu peux rejoindre l'Army — naturalisation en 1 an", armyInfo:"🎖️ L'Army offre aux détenteurs de DV une naturalisation accélérée en 1 an, logement sur base et TRICARE gratuit.", armyContinue:"Continuer →", armyBack:"← Retour", armyRequired:"Choisis une option pour continuer" },
  en:{ title:"What's your situation?",   sub:"Choose the option that fits you",     next:"Continue →",  back:"Back",   step:"Step 1 of 5",    subTitle:"Tell us more",          armyModalTitle:"What about the US Army?", armyModalSub:"With a DV Lottery, you can join the Army — naturalization in 1 year", armyInfo:"🎖️ The Army offers DV holders fast-track naturalization in 1 year, on-base housing and free TRICARE.", armyContinue:"Continue →", armyBack:"← Back", armyRequired:"Choose an option to continue" },
  es:{ title:"¿Cuál es tu situación?",   sub:"Elige la opción que mejor te describa",next:"Continuar →",back:"Atrás",  step:"Paso 1 de 5",    subTitle:"Cuéntanos más",         armyModalTitle:"¿Y el US Army?",  armyModalSub:"Con una DV Lottery, puedes unirte al Army — naturalización en 1 año", armyInfo:"🎖️ El Army ofrece a los titulares de DV naturalización acelerada en 1 año, alojamiento en base y TRICARE gratis.", armyContinue:"Continuar →", armyBack:"← Atrás", armyRequired:"Elige una opción para continuar" },
};

// ══════════════════════════════════════════════
// MOTIVATION OVERLAY
// ══════════════════════════════════════════════
function MotivationOverlay({ lang, value, onDone }: { lang:Lang; value:string; onDone:()=>void }) {
  const mot = MOTIVATION[value]?.[lang] || MOTIVATION.other[lang];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 600);
    const t3 = setTimeout(() => setStep(3), 1400);
    const t4 = setTimeout(onDone, 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 0.4,
    dur: 1.2 + Math.random() * 0.8,
    color: ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa"][i % 5],
    size: 6 + Math.random() * 8,
  }));

  const isArmy      = value.startsWith("army");
  const borderColor = isArmy ? "rgba(34,197,94,0.4)" : "rgba(232,184,75,0.4)";
  const titleColor  = isArmy ? "#22c55e" : "#e8b84b";

  return (
    <>
      <style>{`
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes overlayIn    { from{opacity:0} to{opacity:1} }
        @keyframes cardPop      { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.05);opacity:1} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes emojiPop     { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes slideUp      { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes barFill      { from{width:0%} to{width:100%} }
      `}</style>
      <div onClick={onDone} style={{ position:"fixed", inset:0, background:"rgba(11,15,26,0.92)", backdropFilter:"blur(6px)", zIndex:9998, animation:"overlayIn 0.3s ease forwards", cursor:"pointer" }} />
      {step >= 1 && particles.map(p => (
        <div key={p.id} style={{ position:"fixed", left:p.x+"%", top:"-20px", width:p.size, height:p.size, borderRadius:"50%", background:p.color, zIndex:9999, pointerEvents:"none", animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards` }} />
      ))}
      <div style={{ position:"fixed", top:"50%", left:"50%", zIndex:10000, width:300, animation:"cardPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards", pointerEvents:"none" }}>
        <div style={{ background:"linear-gradient(135deg,#0f1521,#1a2438)", border:`1.5px solid ${borderColor}`, borderRadius:24, padding:"32px 24px 28px", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }}>
          {step >= 1 && <div style={{ fontSize:64, marginBottom:16, display:"inline-block", animation:"emojiPop 0.4s cubic-bezier(.34,1.56,.64,1) forwards" }}>{mot.emoji}</div>}
          {step >= 2 && <div style={{ fontSize:20, fontWeight:800, color:titleColor, marginBottom:10, animation:"slideUp 0.4s ease forwards" }}>{mot.title}</div>}
          {step >= 3 && <div style={{ fontSize:13, color:"rgba(244,241,236,0.7)", lineHeight:1.6, marginBottom:20, animation:"slideUp 0.4s ease forwards" }}>{mot.msg}</div>}
          <div style={{ height:3, background:"#1e2a3a", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"linear-gradient(to right,#e8b84b,#2dd4bf)", borderRadius:3, animation:"barFill 2.9s linear forwards" }} />
          </div>
          <div style={{ fontSize:10, color:"#333", marginTop:8 }}>
            {lang==="fr"?"Tap pour continuer":lang==="es"?"Toca para continuar":"Tap to continue"}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// MODAL ARMY — au centre
// ══════════════════════════════════════════════
function ArmyModal({ lang, onConfirm, onBack }: {
  lang: Lang;
  onConfirm: (value: string) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [showError, setShowError] = useState(false);
  const text = UI[lang];

  const handleConfirm = () => {
    if (!selected) { setShowError(true); return; }
    onConfirm(selected);
  };

  return (
    <>
      <style>{`
        @keyframes alertPop { 0%{transform:translate(-50%,-50%) scale(0.85);opacity:0} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes explainSlide { from{opacity:0;max-height:0;transform:translateY(-6px)} to{opacity:1;max-height:200px;transform:translateY(0)} }
      `}</style>

      {/* Overlay */}
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:800, backdropFilter:"blur(6px)" }} onClick={onBack} />

      {/* Modal au centre */}
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        zIndex:801,
        width:"calc(100% - 32px)", maxWidth:440,
        background:"#0f1521",
        border:"1px solid #1e2a3a",
        borderRadius:20,
        padding:"24px 18px",
        maxHeight:"85vh",
        overflowY:"auto",
        animation:"alertPop 0.35s cubic-bezier(.34,1.56,.64,1) forwards",
      }}>

        {/* Header modal */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:17, fontWeight:800, color:"#f4f1ec", marginBottom:4 }}>
            {text.armyModalTitle}
          </div>
          <div style={{ fontSize:12, color:"#aaa", lineHeight:1.5 }}>
            {text.armyModalSub}
          </div>
        </div>

        {/* Info Army */}
        <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.18)", borderRadius:10, padding:"10px 12px", marginBottom:14 }}>
          <div style={{ fontSize:11, color:"#22c55e", lineHeight:1.6 }}>{text.armyInfo}</div>
        </div>

        {/* Erreur */}
        {showError && (
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 12px", marginBottom:12, fontSize:12, color:"#ef4444" }}>
            ⚠️ {text.armyRequired}
          </div>
        )}

        {/* 4 options Army */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
          {ARMY_OPTIONS[lang].map(opt => {
            const active      = selected === opt.value;
            const isArmyOpt   = opt.value.startsWith("army");
            const activeColor = isArmyOpt ? "#22c55e" : "#e8b84b";

            return (
              <button
                key={opt.value}
                onClick={() => { setSelected(opt.value); setShowError(false); }}
                style={{
                  display:"flex", alignItems:"flex-start", gap:12,
                  padding:"14px", borderRadius:12,
                  background: active ? `${activeColor}10` : "#141d2e",
                  border: `1.5px solid ${active ? activeColor : "#1e2a3a"}`,
                  cursor:"pointer", fontFamily:"inherit",
                  width:"100%", textAlign:"left" as const,
                  transition:"all 0.2s",
                }}
              >
                <span style={{ fontSize:22, flexShrink:0, marginTop:1 }}>{opt.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  {/* Label + radio */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                    <div style={{ fontSize:14, fontWeight:active?700:500, color:active?activeColor:"#f4f1ec" }}>
                      {opt.label}
                    </div>
                    <div style={{
                      width:18, height:18, borderRadius:"50%",
                      border:`2px solid ${active ? activeColor : "#2a3448"}`,
                      background: active ? activeColor : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, marginLeft:8, transition:"all 0.2s",
                    }}>
                      {active && <span style={{ fontSize:10, color:"#000", fontWeight:800 }}>✓</span>}
                    </div>
                  </div>
                  {/* Description courte */}
                  <div style={{ fontSize:11, color:"#666", marginBottom: active ? 6 : 0 }}>
                    {opt.desc}
                  </div>
                  {/* Explication — visible quand sélectionné */}
                  {active && (
                    <div style={{
                      fontSize:12,
                      color: isArmyOpt ? "rgba(34,197,94,0.9)" : "rgba(232,184,75,0.9)",
                      lineHeight:1.6,
                      background: isArmyOpt ? "rgba(34,197,94,0.06)" : "rgba(232,184,75,0.06)",
                      borderRadius:8, padding:"8px 10px",
                      animation:"explainSlide 0.3s ease",
                    }}>
                      💡 {opt.explain}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Note profil */}
        {selected && (
          <div style={{ padding:"10px 12px", background:"rgba(45,212,191,0.05)", border:"1px solid rgba(45,212,191,0.15)", borderRadius:10, fontSize:11, color:"#2dd4bf", lineHeight:1.6, marginBottom:14 }}>
            💡 {lang==="fr"?"Tu pourras changer ton statut Army à tout moment dans ton Profil.":lang==="es"?"Podrás cambiar tu estado Army en cualquier momento en tu Perfil.":"You can change your Army status anytime in your Profile."}
          </div>
        )}

        {/* Boutons Retour + Continuer */}
        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={onBack}
            style={{
              flex:1, padding:"13px",
              background:"#141d2e", border:"1px solid #1e2a3a",
              borderRadius:12, color:"#aaa", fontSize:14,
              cursor:"pointer", fontFamily:"inherit",
            }}
          >
            {text.armyBack}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex:2, padding:"13px",
              background: selected ? "#e8b84b" : "#1a2438",
              border: selected ? "none" : "1px solid #2a3448",
              borderRadius:12,
              color: selected ? "#000" : "#555",
              fontSize:14, fontWeight:700,
              cursor: selected ? "pointer" : "default",
              fontFamily:"inherit",
              transition:"all 0.2s",
            }}
          >
            {text.armyContinue}
          </button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// STEP 1
// ══════════════════════════════════════════════
export default function Step1() {
  const [selected,        setSelected]        = useState("");
  const [subSelected,     setSubSelected]     = useState("");
  const [armySelected,    setArmySelected]    = useState("");
  const [lang,            setLang]            = useState<Lang>("fr");
  const [ready,           setReady]           = useState(false);
  const [mounted,         setMounted]         = useState(false);
  const [showSub,         setShowSub]         = useState(false);
  const [showArmyModal,   setShowArmyModal]   = useState(false);
  const [showMotivation,  setShowMotivation]  = useState(false);
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["en","fr","es"].includes(savedLang)) setLang(savedLang);
    const timeout = setTimeout(() => { setReady(true); setTimeout(() => setMounted(true), 50); }, 5000);
    const unsub = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data     = snap.data() as any;
          const userLang = (data?.lang as Lang) || savedLang || "fr";
          setLang(userLang);
          localStorage.setItem("lang", userLang);
        }
      } catch {}
      setReady(true);
      setTimeout(() => setMounted(true), 50);
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const changeLang = async (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
    const user = auth.currentUser;
    if (user) try { await updateDoc(doc(db, "users", user.uid), { lang: l }); } catch {}
  };

  const handleMainSelect = (value: string) => {
    setSelected(value);
    setSubSelected("");
    setArmySelected("");

    if (value === "dv") {
      // ✅ Ouvrir directement la modal Army
      setShowArmyModal(true);
      setShowSub(false);
    } else if (value === "other") {
      setShowSub(true);
      setShowArmyModal(false);
    } else {
      setShowSub(false);
      setShowArmyModal(false);
    }
  };

  const handleArmyConfirm = (armyValue: string) => {
    setArmySelected(armyValue);
    setShowArmyModal(false);
  };

  const handleArmyBack = () => {
    setShowArmyModal(false);
    setSelected(""); // Déselectionne DV pour que l'user recommence
    setArmySelected("");
  };

  const getFinalValue = () => {
    if (selected === "dv")    return armySelected || "";
    if (selected === "other") return subSelected  || "";
    return selected;
  };

  const finalValue = getFinalValue();

  const canContinue = () => {
    if (selected === "dv")    return !!armySelected;
    if (selected === "other") return !!subSelected;
    return !!selected;
  };

  const handleNext = async () => {
    if (!canContinue() || saving) return;
    setSaving(true);
    try {
      const isDvClassic = armySelected === "dv_classic";
      const isArmy      = armySelected.startsWith("army");
      const reasonToSave = isDvClassic ? "dv" : finalValue;

      localStorage.setItem("reason", reasonToSave);
      localStorage.setItem("isArmy", isArmy ? "true" : "false");

      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          reason:     reasonToSave,
          isArmy:     isArmy,
          armyStatus: isArmy ? armySelected : null,
        });
      }
    } catch {}
    setShowMotivation(true);
  };

  const text = UI[lang];

  if (!ready) return <div style={{ minHeight:"100dvh", background:"#0b0f1a" }} />;

  return (
    <div style={container}>

      {showMotivation && (
        <MotivationOverlay
          lang={lang}
          value={finalValue}
          onDone={() => { setShowMotivation(false); window.location.href = "/onboarding/step2"; }}
        />
      )}

      {/* ✅ Modal Army au centre */}
      {showArmyModal && (
        <ArmyModal
          lang={lang}
          onConfirm={handleArmyConfirm}
          onBack={handleArmyBack}
        />
      )}

      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={() => window.location.href="/welcome"}>← {text.back}</button>
        <div style={logoStyle}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span></div>
        <div style={{ display:"flex", gap:10, fontSize:20, cursor:"pointer" }}>
          <span onClick={() => changeLang("fr")}>🇫🇷</span>
          <span onClick={() => changeLang("en")}>🇺🇸</span>
          <span onClick={() => changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", padding:"88px 20px 40px" }}>
        <div style={{ width:"100%", maxWidth:420, opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(20px)", transition:"all 0.5s ease" }}>

          {/* Progress */}
          <div style={{ marginBottom:24 }}>
            <div style={progressTrack}><div style={{ ...progressFill, width:"20%" }} /></div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          <h2 style={titleStyle}>{text.title}</h2>
          <p style={subStyle}>{text.sub}</p>

          {/* Options principales */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {MAIN_OPTIONS[lang].map(opt => {
              // Pour DV : "active" si sélectionné ET armySelected défini
              const active = selected === opt.value && (opt.value !== "dv" || !!armySelected);
              const pendingDV = selected === "dv" && !armySelected && opt.value === "dv";

              return (
                <div key={opt.value}>
                  <button
                    onClick={() => handleMainSelect(opt.value)}
                    style={{
                      ...optionBtn,
                      background: active ? "rgba(232,184,75,0.1)" : pendingDV ? "rgba(232,184,75,0.04)" : "#0f1521",
                      border:`1.5px solid ${active ? "#e8b84b" : pendingDV ? "rgba(232,184,75,0.3)" : "#1e2a3a"}`,
                      transform: active ? "scale(1.01)" : "scale(1)",
                    }}
                  >
                    <div style={optionIcon}>{opt.icon}</div>
                    <div style={{ flex:1, textAlign:"left" as const }}>
                      <div style={{ fontSize:15, fontWeight:active?600:400, color:active?"#e8b84b":"#f4f1ec", transition:"color 0.2s" }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{opt.desc}</div>
                      {/* Badge statut Army sélectionné */}
                      {opt.value === "dv" && armySelected && (
                        <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:6, padding:"3px 8px", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:8 }}>
                          <span style={{ fontSize:12 }}>{ARMY_OPTIONS[lang].find(a => a.value === armySelected)?.icon}</span>
                          <span style={{ fontSize:11, color:"#22c55e", fontWeight:600 }}>{ARMY_OPTIONS[lang].find(a => a.value === armySelected)?.label}</span>
                          <button
                            onClick={e => { e.stopPropagation(); setShowArmyModal(true); }}
                            style={{ background:"none", border:"none", color:"#aaa", fontSize:10, cursor:"pointer", fontFamily:"inherit", marginLeft:2 }}
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${active?"#e8b84b":"#2a3448"}`, background:active?"#e8b84b":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                      {active && <span style={{ fontSize:11, color:"#000", fontWeight:800 }}>✓</span>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* ✅ Sous-options "Autre" — inline car peu d'options */}
          {showSub && selected === "other" && (
            <div style={{ marginTop:12, padding:"16px", background:"rgba(232,184,75,0.04)", border:"1px solid rgba(232,184,75,0.15)", borderRadius:16, animation:"fadeSlideDown 0.3s ease" }}>
              <div style={{ fontSize:12, color:"#e8b84b", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:12 }}>
                {text.subTitle}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {SUB_OPTIONS[lang].map(opt => {
                  const active = subSelected === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setSubSelected(opt.value)}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, background:active?"rgba(232,184,75,0.1)":"#141d2e", border:`1.5px solid ${active?"#e8b84b":"#1e2a3a"}`, cursor:"pointer", fontFamily:"inherit", width:"100%", textAlign:"left" as const, transition:"all 0.2s" }}
                    >
                      <span style={{ fontSize:18 }}>{opt.icon}</span>
                      <span style={{ fontSize:14, fontWeight:active?600:400, color:active?"#e8b84b":"#f4f1ec", flex:1 }}>{opt.label}</span>
                      <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${active?"#e8b84b":"#2a3448"}`, background:active?"#e8b84b":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                        {active && <span style={{ fontSize:10, color:"#000", fontWeight:800 }}>✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bouton continuer */}
          <button
            onClick={handleNext}
            disabled={!canContinue() || saving}
            style={{ ...nextBtn, opacity: canContinue() && !saving ? 1 : 0.4, marginTop:24 }}
          >
            {saving && !showMotivation ? (
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation:"spin 1s linear infinite" }}>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#000" strokeWidth="2.5" strokeOpacity="0.3"/>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38"/>
              </svg>
            ) : text.next}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes spin          { to { transform:rotate(360deg) } }
        @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        button:active            { transform:scale(0.98) !important }
      `}</style>
    </div>
  );
}

const container:CSSProperties     = { minHeight:"100dvh", background:"#0b0f1a", color:"#f4f1ec", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" };
const bgGlow:CSSProperties        = { position:"absolute", top:"-10%", left:"50%", transform:"translateX(-50%)", width:500, height:400, background:"radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)", pointerEvents:"none" };
const headerStyle:CSSProperties   = { position:"fixed", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const backBtn:CSSProperties       = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:14, fontFamily:"inherit" };
const logoStyle:CSSProperties     = { fontWeight:900, fontSize:20, fontFamily:"serif" };
const progressTrack:CSSProperties = { height:3, background:"#1e2a3a", borderRadius:3, overflow:"hidden", marginBottom:8 };
const progressFill:CSSProperties  = { height:"100%", background:"linear-gradient(to right,#e8b84b,#2dd4bf)", borderRadius:3, transition:"width 0.5s ease" };
const progressLabel:CSSProperties = { fontSize:11, color:"#555", letterSpacing:"0.08em", textTransform:"uppercase" };
const titleStyle:CSSProperties    = { fontSize:22, fontWeight:700, margin:"0 0 8px", color:"#f4f1ec" };
const subStyle:CSSProperties      = { fontSize:13, color:"#aaa", margin:"0 0 20px", lineHeight:1.5 };
const optionBtn:CSSProperties     = { display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:14, cursor:"pointer", fontFamily:"inherit", textAlign:"left", width:"100%", transition:"all 0.2s ease" };
const optionIcon:CSSProperties    = { width:40, height:40, borderRadius:12, background:"#141d2e", border:"1px solid #1e2a3a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 };
const nextBtn:CSSProperties       = { width:"100%", padding:"15px", background:"#e8b84b", color:"#000", border:"none", borderRadius:14, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", transition:"opacity 0.2s", boxShadow:"0 8px 24px rgba(232,184,75,0.15)" };
