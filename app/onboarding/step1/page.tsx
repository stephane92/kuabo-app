"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const MAIN_OPTIONS: Record<Lang, {label:string;value:string;icon:string;desc:string}[]> = {
  fr:[
    {icon:"🎰",label:"DV Lottery",        value:"dv",       desc:"Tu as gagné la loterie de visas"},
    {icon:"🏆",label:"Coupe du Monde",    value:"worldcup", desc:"USA, Canada, Mexique 2026"},
    {icon:"✈️",label:"Tourisme",          value:"tourist",  desc:"Voyage temporaire aux USA"},
    {icon:"🌍",label:"Autre situation",   value:"other",    desc:"Visa travail, étudiant, famille..."},
  ],
  en:[
    {icon:"🎰",label:"DV Lottery",        value:"dv",       desc:"You won the visa lottery"},
    {icon:"🏆",label:"World Cup",         value:"worldcup", desc:"USA, Canada, Mexico 2026"},
    {icon:"✈️",label:"Tourism",           value:"tourist",  desc:"Temporary visit to the USA"},
    {icon:"🌍",label:"Other situation",   value:"other",    desc:"Work visa, student, family..."},
  ],
  es:[
    {icon:"🎰",label:"Lotería DV",        value:"dv",       desc:"Ganaste la lotería de visas"},
    {icon:"🏆",label:"Copa del Mundo",    value:"worldcup", desc:"EE.UU., Canadá, México 2026"},
    {icon:"✈️",label:"Turismo",           value:"tourist",  desc:"Visita temporal a EE.UU."},
    {icon:"🌍",label:"Otra situación",    value:"other",    desc:"Visa trabajo, estudiante, familia..."},
  ],
};

const SUB_OPTIONS: Record<Lang, {label:string;value:string;icon:string}[]> = {
  fr:[
    {icon:"💼",label:"Visa travail",          value:"work"   },
    {icon:"🎓",label:"Étudiant",              value:"student"},
    {icon:"👨‍👩‍👧",label:"Regroupement familial",value:"family" },
    {icon:"🕊️",label:"Réfugié / Asile",       value:"refugee"},
  ],
  en:[
    {icon:"💼",label:"Work visa",             value:"work"   },
    {icon:"🎓",label:"Student",               value:"student"},
    {icon:"👨‍👩‍👧",label:"Family reunification", value:"family" },
    {icon:"🕊️",label:"Refugee / Asylum",      value:"refugee"},
  ],
  es:[
    {icon:"💼",label:"Visa de trabajo",       value:"work"   },
    {icon:"🎓",label:"Estudiante",            value:"student"},
    {icon:"👨‍👩‍👧",label:"Reunificación familiar",value:"family"},
    {icon:"🕊️",label:"Refugiado / Asilo",     value:"refugee"},
  ],
};

const MOTIVATION: Record<string, Record<Lang, {emoji:string;title:string;msg:string}>> = {
  dv:{
    fr:{emoji:"🎰",title:"DV Lottery — Tu l'as eu !",      msg:"Tu fais partie des chanceux. Kuabo va te guider étape par étape — SSN, Green Card, logement et bien plus."},
    en:{emoji:"🎰",title:"DV Lottery — You made it!",       msg:"You're one of the lucky few. Kuabo will guide you through every step — SSN, Green Card, housing and more."},
    es:{emoji:"🎰",title:"¡Lotería DV — Lo lograste!",      msg:"Eres uno de los afortunados. Kuabo te guiará en cada paso — SSN, Green Card, vivienda y más."},
  },
  worldcup:{
    fr:{emoji:"🏆",title:"Coupe du Monde 2026 !",           msg:"USA, Canada, Mexique — Kuabo va t'aider à préparer ton voyage et en profiter au max."},
    en:{emoji:"🏆",title:"World Cup 2026!",                  msg:"USA, Canada, Mexico — Kuabo will help you prepare your trip and make the most of it."},
    es:{emoji:"🏆",title:"¡Copa del Mundo 2026!",            msg:"EE.UU., Canadá, México — Kuabo te ayudará a preparar tu viaje y disfrutarlo al máximo."},
  },
  tourist:{
    fr:{emoji:"✈️",title:"L'aventure t'attend !",           msg:"Kuabo va t'aider à préparer ton voyage — visas, conseils et tout pour profiter de ton séjour."},
    en:{emoji:"✈️",title:"Adventure awaits!",                msg:"Kuabo will help you prepare your trip — visas, tips, and everything to enjoy your stay."},
    es:{emoji:"✈️",title:"¡La aventura te espera!",          msg:"Kuabo te ayudará a preparar tu viaje — visas, consejos y todo para disfrutar tu estancia."},
  },
  work:{
    fr:{emoji:"💼",title:"Prêt à travailler !",             msg:"Kuabo va t'aider à t'installer rapidement — documents, logement, et tout ce qu'il faut."},
    en:{emoji:"💼",title:"Ready to work!",                   msg:"Kuabo will help you settle fast — documents, housing, and everything you need to start strong."},
    es:{emoji:"💼",title:"¡Listo para trabajar!",            msg:"Kuabo te ayudará a instalarte rápido — documentos, vivienda y todo lo que necesitas."},
  },
  student:{
    fr:{emoji:"🎓",title:"La vie étudiante commence !",     msg:"Kuabo va te guider dans ton nouveau pays — logement, admin, et conseils d'autres étudiants."},
    en:{emoji:"🎓",title:"Student life starts now!",         msg:"Kuabo will guide you through your new country — housing, admin, and tips from other students."},
    es:{emoji:"🎓",title:"¡La vida estudiantil comienza!",   msg:"Kuabo te guiará en tu nuevo país — vivienda, trámites y consejos de otros estudiantes."},
  },
  family:{
    fr:{emoji:"👨‍👩‍👧",title:"La famille avant tout !",        msg:"Kuabo va aider toute ta famille à s'installer — étape par étape, sans stress."},
    en:{emoji:"👨‍👩‍👧",title:"Family first!",                   msg:"Kuabo will help your whole family settle in — step by step, stress-free."},
    es:{emoji:"👨‍👩‍👧",title:"¡La familia primero!",             msg:"Kuabo ayudará a toda tu familia a instalarse — paso a paso, sin estrés."},
  },
  refugee:{
    fr:{emoji:"🕊️",title:"Tu es en sécurité ici.",          msg:"Kuabo est là pour toi. On va te guider à travers chaque démarche administrative avec soin."},
    en:{emoji:"🕊️",title:"You're safe here.",                msg:"Kuabo is here for you. We'll guide you through every administrative step with care."},
    es:{emoji:"🕊️",title:"Estás a salvo aquí.",              msg:"Kuabo está aquí para ti. Te guiaremos en cada trámite administrativo con cuidado."},
  },
  other:{
    fr:{emoji:"🌍",title:"Bienvenue !",                      msg:"Quelle que soit ta raison, Kuabo est là pour te guider à chaque étape."},
    en:{emoji:"🌍",title:"Welcome!",                          msg:"Whatever your reason, Kuabo is here to guide you every step of the way."},
    es:{emoji:"🌍",title:"¡Bienvenido!",                      msg:"Cualquiera que sea tu razón, Kuabo está aquí para guiarte en cada paso."},
  },
};

const UI: Record<Lang, any> = {
  fr:{title:"Quelle est ta situation ?",sub:"Choisis l'option qui te correspond",next:"Continuer",back:"Retour",step:"Étape 1 sur 5",subTitle:"Précise ta situation",subBack:"← Retour"},
  en:{title:"What's your situation?",  sub:"Choose the option that fits you best",next:"Continue",back:"Back",step:"Step 1 of 5",subTitle:"Tell us more",subBack:"← Back"},
  es:{title:"¿Cuál es tu situación?",  sub:"Elige la opción que mejor te describa",next:"Continuar",back:"Atrás",step:"Paso 1 de 5",subTitle:"Cuéntanos más",subBack:"← Atrás"},
};

// ══════════════════════════════════════════════
// MOTIVATION OVERLAY
// ══════════════════════════════════════════════
function MotivationOverlay({lang,value,onDone}:{lang:Lang;value:string;onDone:()=>void}) {
  const mot = MOTIVATION[value]?.[lang] || MOTIVATION.other[lang];
  const [step,setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(()=>setStep(1),100);
    const t2 = setTimeout(()=>setStep(2),600);
    const t3 = setTimeout(()=>setStep(3),1400);
    const t4 = setTimeout(onDone,2800);
    return ()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4);};
  },[onDone]);

  const particles = Array.from({length:20},(_,i)=>({
    id:i, x:Math.random()*100, delay:Math.random()*0.4,
    dur:1.2+Math.random()*0.8,
    color:["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa"][i%5],
    size:6+Math.random()*8,
  }));

  return (
    <>
      <style>{`
        @keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        @keyframes overlayFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes cardPop{0%{transform:translate(-50%,-50%) scale(0.5);opacity:0}60%{transform:translate(-50%,-50%) scale(1.05);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
        @keyframes emojiPop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
        @keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes barFill{from{width:0%}to{width:100%}}
      `}</style>
      <div onClick={onDone} style={{position:"fixed",inset:0,background:"rgba(11,15,26,0.92)",backdropFilter:"blur(6px)",zIndex:9998,animation:"overlayFadeIn 0.3s ease forwards",cursor:"pointer"}} />
      {step>=1&&particles.map(p=>(
        <div key={p.id} style={{position:"fixed",left:p.x+"%",top:"-20px",width:p.size,height:p.size,borderRadius:"50%",background:p.color,zIndex:9999,pointerEvents:"none",animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards`}} />
      ))}
      <div style={{position:"fixed",top:"50%",left:"50%",zIndex:10000,width:300,animation:"cardPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards",pointerEvents:"none"}}>
        <div style={{background:"linear-gradient(135deg,#0f1521,#1a2438)",border:"1.5px solid rgba(232,184,75,0.4)",borderRadius:24,padding:"32px 24px 28px",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
          {step>=1&&<div style={{fontSize:64,marginBottom:16,display:"inline-block",animation:"emojiPop 0.4s cubic-bezier(.34,1.56,.64,1) forwards"}}>{mot.emoji}</div>}
          {step>=2&&<div style={{fontSize:20,fontWeight:800,color:"#e8b84b",marginBottom:10,animation:"slideUp 0.4s ease forwards"}}>{mot.title}</div>}
          {step>=3&&<div style={{fontSize:13,color:"rgba(244,241,236,0.7)",lineHeight:1.6,marginBottom:20,animation:"slideUp 0.4s ease forwards"}}>{mot.msg}</div>}
          <div style={{height:3,background:"#1e2a3a",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",background:"linear-gradient(to right,#e8b84b,#2dd4bf)",borderRadius:3,animation:"barFill 2.8s linear forwards"}} />
          </div>
          <div style={{fontSize:10,color:"#333",marginTop:8}}>
            {lang==="fr"?"Tap pour continuer":lang==="es"?"Toca para continuar":"Tap to continue"}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// STEP 1
// ══════════════════════════════════════════════
export default function Step1() {
  const [selected,setSelected]           = useState("");
  const [subSelected,setSubSelected]     = useState("");
  const [lang,setLang]                   = useState<Lang>("fr");
  const [ready,setReady]                 = useState(false);
  const [mounted,setMounted]             = useState(false);
  const [showSub,setShowSub]             = useState(false);
  const [showMotivation,setShowMotivation] = useState(false);
  const [saving,setSaving]               = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang&&["en","fr","es"].includes(savedLang)) setLang(savedLang);
    const timeout = setTimeout(()=>{setReady(true);setTimeout(()=>setMounted(true),50);},5000);
    const unsub = onAuthStateChanged(auth,async user=>{
      clearTimeout(timeout);
      if (!user){window.location.href="/login";return;}
      try {
        const snap = await getDoc(doc(db,"users",user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          const userLang = (data?.lang as Lang)||savedLang||"fr";
          setLang(userLang);
          localStorage.setItem("lang",userLang);
        }
      } catch {/* continue */}
      setReady(true);
      setTimeout(()=>setMounted(true),50);
    });
    return ()=>{clearTimeout(timeout);unsub();};
  },[]);

  const changeLang = async (l:Lang) => {
    setLang(l);
    localStorage.setItem("lang",l);
    const user = auth.currentUser;
    if (user){try{await updateDoc(doc(db,"users",user.uid),{lang:l});}catch{/**/}}
  };

  // Quand on choisit une option principale
  const handleMainSelect = (value:string) => {
    setSelected(value);
    setSubSelected("");
    if (value==="other") {
      // Ouvre les sous-options avec animation
      setShowSub(true);
    } else {
      setShowSub(false);
    }
  };

  // Valeur finale = sub si "other" sinon main
  const finalValue = selected==="other" ? subSelected : selected;

  const handleNext = async () => {
    if (!finalValue||saving) return;
    setSaving(true);
    try {
      localStorage.setItem("reason",finalValue);
      const user = auth.currentUser;
      if (user) await updateDoc(doc(db,"users",user.uid),{reason:finalValue});
    } catch {/* continue */}
    setShowMotivation(true);
  };

  const handleMotivationDone = () => {
    setShowMotivation(false);
    window.location.href="/onboarding/step2";
  };

  const text = UI[lang];
  const canContinue = selected==="other" ? !!subSelected : !!selected;

  if (!ready) return <div style={{minHeight:"100dvh",background:"#0b0f1a"}} />;

  return (
    <div style={container}>

      {showMotivation&&(
        <MotivationOverlay lang={lang} value={finalValue} onDone={handleMotivationDone} />
      )}

      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={()=>window.location.href="/welcome"}>
          ← {text.back}
        </button>
        <div style={logoStyle}>
          <span style={{color:"#e8b84b"}}>Ku</span>
          <span style={{color:"#f4f1ec"}}>abo</span>
        </div>
        <div style={{display:"flex",gap:10,fontSize:20,cursor:"pointer"}}>
          <span onClick={()=>changeLang("fr")}>🇫🇷</span>
          <span onClick={()=>changeLang("en")}>🇺🇸</span>
          <span onClick={()=>changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,display:"flex",justifyContent:"center",alignItems:"center",padding:"88px 20px 40px"}}>
        <div style={{width:"100%",maxWidth:420,opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(20px)",transition:"all 0.5s ease"}}>

          {/* Progress */}
          <div style={{marginBottom:24}}>
            <div style={progressTrack}>
              <div style={{...progressFill,width:"20%"}} />
            </div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          {/* Title */}
          <h2 style={titleStyle}>{text.title}</h2>
          <p style={subStyle}>{text.sub}</p>

          {/* ✅ 4 options principales */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {MAIN_OPTIONS[lang].map(opt=>{
              const active = selected===opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={()=>handleMainSelect(opt.value)}
                  style={{
                    ...optionBtn,
                    background:active?"rgba(232,184,75,0.1)":"#0f1521",
                    border:"1.5px solid "+(active?"#e8b84b":"#1e2a3a"),
                    transform:active?"scale(1.01)":"scale(1)",
                  }}
                >
                  <div style={optionIcon}>{opt.icon}</div>
                  <div style={{flex:1,textAlign:"left" as const}}>
                    <div style={{fontSize:15,fontWeight:active?600:400,color:active?"#e8b84b":"#f4f1ec",transition:"color 0.2s"}}>
                      {opt.label}
                    </div>
                    <div style={{fontSize:11,color:"#555",marginTop:2}}>
                      {opt.desc}
                    </div>
                  </div>
                  <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid "+(active?"#e8b84b":"#2a3448"),background:active?"#e8b84b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
                    {active&&<span style={{fontSize:11,color:"#000",fontWeight:800}}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ✅ Sous-options — visibles si "Autre" sélectionné */}
          {showSub&&(
            <div style={{marginTop:16,padding:"16px",background:"rgba(232,184,75,0.04)",border:"1px solid rgba(232,184,75,0.15)",borderRadius:16,animation:"fadeSlideDown 0.3s ease"}}>
              <div style={{fontSize:12,color:"#e8b84b",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase" as const,marginBottom:12}}>
                {text.subTitle}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {SUB_OPTIONS[lang].map(opt=>{
                  const active = subSelected===opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={()=>setSubSelected(opt.value)}
                      style={{
                        display:"flex",alignItems:"center",gap:12,
                        padding:"12px 14px",borderRadius:12,
                        background:active?"rgba(232,184,75,0.1)":"#141d2e",
                        border:"1.5px solid "+(active?"#e8b84b":"#1e2a3a"),
                        cursor:"pointer",fontFamily:"inherit",
                        width:"100%",textAlign:"left" as const,
                        transition:"all 0.2s",
                      }}
                    >
                      <span style={{fontSize:18}}>{opt.icon}</span>
                      <span style={{fontSize:14,fontWeight:active?600:400,color:active?"#e8b84b":"#f4f1ec",flex:1}}>
                        {opt.label}
                      </span>
                      <div style={{width:18,height:18,borderRadius:"50%",border:"2px solid "+(active?"#e8b84b":"#2a3448"),background:active?"#e8b84b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
                        {active&&<span style={{fontSize:10,color:"#000",fontWeight:800}}>✓</span>}
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
            disabled={!canContinue||saving}
            style={{...nextBtn,opacity:canContinue&&!saving?1:0.4,marginTop:24}}
          >
            {saving&&!showMotivation?(
              <svg width="20" height="20" viewBox="0 0 20 20" style={{animation:"spin 1s linear infinite"}}>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#000" strokeWidth="2.5" strokeOpacity="0.3"/>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38"/>
              </svg>
            ):text.next+" →"}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        button:active{transform:scale(0.98) !important}
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const container:CSSProperties  = {minHeight:"100dvh",background:"#0b0f1a",color:"#f4f1ec",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"};
const bgGlow:CSSProperties     = {position:"absolute",top:"-10%",left:"50%",transform:"translateX(-50%)",width:500,height:400,background:"radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)",pointerEvents:"none"};
const headerStyle:CSSProperties= {position:"fixed",top:0,left:0,right:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"rgba(11,15,26,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #1e2a3a",zIndex:100};
const backBtn:CSSProperties    = {background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:14,fontFamily:"inherit"};
const logoStyle:CSSProperties  = {fontWeight:900,fontSize:20,fontFamily:"serif"};
const progressTrack:CSSProperties = {height:3,background:"#1e2a3a",borderRadius:3,overflow:"hidden",marginBottom:8};
const progressFill:CSSProperties  = {height:"100%",background:"linear-gradient(to right,#e8b84b,#2dd4bf)",borderRadius:3,transition:"width 0.5s ease"};
const progressLabel:CSSProperties = {fontSize:11,color:"#555",letterSpacing:"0.08em",textTransform:"uppercase"};
const titleStyle:CSSProperties = {fontSize:22,fontWeight:700,margin:"0 0 8px",color:"#f4f1ec"};
const subStyle:CSSProperties   = {fontSize:13,color:"#aaa",margin:"0 0 20px",lineHeight:1.5};
const optionBtn:CSSProperties  = {display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"100%",transition:"all 0.2s ease"};
const optionIcon:CSSProperties = {width:40,height:40,borderRadius:12,background:"#141d2e",border:"1px solid #1e2a3a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0};
const nextBtn:CSSProperties    = {width:"100%",padding:"15px",background:"#e8b84b",color:"#000",border:"none",borderRadius:14,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity 0.2s",boxShadow:"0 8px 24px rgba(232,184,75,0.15)"};