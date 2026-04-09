"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const UI: Record<Lang, any> = {
  fr: {
    step:       "Étape 4 sur 5",
    back:       "Retour",
    next:       "Continuer",
    skip:       "Passer cette étape",

    // Si déjà arrivé
    titleArrived:  "Quelle est ta date d'arrivée ?",
    subArrived:    "On calcule tes vraies deadlines à partir de cette date",
    labelArrived:  "Date d'arrivée aux USA",
    placeholderArrived: "Sélectionne ta date d'arrivée",

    // Si pas encore arrivé
    titleNotYet:   "Quelle est ta date d'arrivée prévue ?",
    subNotYet:     "On te prépare avant que tu arrives",
    labelNotYet:   "Date d'arrivée prévue",
    placeholderNotYet: "Sélectionne ta date prévue",

    // Si settled
    titleSettled:  "Depuis quand es-tu aux USA ?",
    subSettled:    "Ça nous aide à personnaliser tes prochaines étapes",
    labelSettled:  "Date d'installation",
    placeholderSettled: "Sélectionne une date approximative",

    // Infos
    infoArrived:  "⏱ Tes deadlines SSN, banque, et permis seront calculées à partir de cette date",
    infoNotYet:   "📋 On prépare ta checklist avant départ dès maintenant",
    infoSettled:  "✅ Tu as déjà fait le plus dur — on optimise la suite",

    // Déadlines preview
    deadlineTitle: "Tes deadlines estimées",
    deadlineSSN:   "SSN — à obtenir avant le",
    deadlineBank:  "Compte bancaire — avant le",
    deadlineGC:    "Green Card physique — avant le",
  },
  en: {
    step:       "Step 4 of 5",
    back:       "Back",
    next:       "Continue",
    skip:       "Skip this step",

    titleArrived:  "What's your arrival date?",
    subArrived:    "We calculate your real deadlines from this date",
    labelArrived:  "Arrival date in the USA",
    placeholderArrived: "Select your arrival date",

    titleNotYet:   "When do you plan to arrive?",
    subNotYet:     "We'll get you ready before you land",
    labelNotYet:   "Planned arrival date",
    placeholderNotYet: "Select your planned date",

    titleSettled:  "When did you arrive in the USA?",
    subSettled:    "This helps us personalize your next steps",
    labelSettled:  "Settlement date",
    placeholderSettled: "Select an approximate date",

    infoArrived:  "⏱ Your SSN, bank, and license deadlines will be calculated from this date",
    infoNotYet:   "📋 We're preparing your pre-departure checklist right now",
    infoSettled:  "✅ You've done the hardest part — let's optimize what's next",

    deadlineTitle: "Your estimated deadlines",
    deadlineSSN:   "SSN — get it before",
    deadlineBank:  "Bank account — before",
    deadlineGC:    "Physical Green Card — before",
  },
  es: {
    step:       "Paso 4 de 5",
    back:       "Atrás",
    next:       "Continuar",
    skip:       "Omitir este paso",

    titleArrived:  "¿Cuál es tu fecha de llegada?",
    subArrived:    "Calculamos tus fechas límite reales desde esta fecha",
    labelArrived:  "Fecha de llegada a EE.UU.",
    placeholderArrived: "Selecciona tu fecha de llegada",

    titleNotYet:   "¿Cuándo planeas llegar?",
    subNotYet:     "Te preparamos antes de que llegues",
    labelNotYet:   "Fecha de llegada prevista",
    placeholderNotYet: "Selecciona tu fecha prevista",

    titleSettled:  "¿Cuándo llegaste a EE.UU.?",
    subSettled:    "Esto nos ayuda a personalizar tus próximos pasos",
    labelSettled:  "Fecha de instalación",
    placeholderSettled: "Selecciona una fecha aproximada",

    infoArrived:  "⏱ Tus fechas límite de SSN, banco y licencia se calcularán desde esta fecha",
    infoNotYet:   "📋 Estamos preparando tu lista de verificación previa a la partida",
    infoSettled:  "✅ Ya hiciste lo más difícil — optimicemos lo que sigue",

    deadlineTitle: "Tus fechas límite estimadas",
    deadlineSSN:   "SSN — obtenerlo antes del",
    deadlineBank:  "Cuenta bancaria — antes del",
    deadlineGC:    "Green Card física — antes del",
  },
};

// ── Calcule une date à partir d'une date d'arrivée + N jours
function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"});
}

// ── Format date pour affichage
function formatDate(dateStr: string, lang: Lang): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(
    lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-US",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

export default function Step3b() {
  const [lang,setLang]           = useState<Lang>("fr");
  const [ready,setReady]         = useState(false);
  const [mounted,setMounted]     = useState(false);
  const [saving,setSaving]       = useState(false);
  const [arrival,setArrival]     = useState<string>(""); // "abroad"|"new"|"months"|"settled"
  const [dateValue,setDateValue] = useState("");
  const [showDeadlines,setShowDeadlines] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["en","fr","es"].includes(savedLang)) setLang(savedLang);
    const savedArrival = localStorage.getItem("arrival") || "";
    setArrival(savedArrival);

    const timeout = setTimeout(()=>{setReady(true);setTimeout(()=>setMounted(true),50);},5000);
    const unsub = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);
      if (!user){window.location.href="/login";return;}
      try {
        const snap = await getDoc(doc(db,"users",user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          const userLang = (data?.lang as Lang)||savedLang||"fr";
          setLang(userLang);
          localStorage.setItem("lang",userLang);
          if (!savedArrival && data?.arrival) setArrival(data.arrival);
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

  // Détermine le titre/sub/label selon le statut d'arrivée
  const isNotYet  = arrival === "abroad";
  const isSettled = arrival === "settled";
  const text = UI[lang];

  const title = isNotYet ? text.titleNotYet : isSettled ? text.titleSettled : text.titleArrived;
  const sub   = isNotYet ? text.subNotYet   : isSettled ? text.subSettled   : text.subArrived;
  const label = isNotYet ? text.labelNotYet : isSettled ? text.labelSettled : text.labelArrived;
  const info  = isNotYet ? text.infoNotYet  : isSettled ? text.infoSettled  : text.infoArrived;
  const placeholder = isNotYet ? text.placeholderNotYet : isSettled ? text.placeholderSettled : text.placeholderArrived;

  // Min/Max date selon le statut
  const today = new Date().toISOString().split("T")[0];
  const minDate = isNotYet ? today : "2020-01-01";
  const maxDate = isNotYet ? "2027-12-31" : today;

  // Deadlines calculées
  const arrivalDate = dateValue ? new Date(dateValue) : null;
  const deadlines = arrivalDate ? {
    ssn:  addDays(arrivalDate, 10),
    bank: addDays(arrivalDate, 14),
    gc:   addDays(arrivalDate, 21),
  } : null;

  const handleDateChange = (val: string) => {
    setDateValue(val);
    setShowDeadlines(!!val && !isNotYet && !isSettled);
  };

  const handleNext = async () => {
    if (!dateValue || saving) return;
    setSaving(true);
    try {
      localStorage.setItem("arrivalDate", dateValue);
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db,"users",user.uid), {
          arrivalDate: dateValue,
          // Recalcule les deadlines et les stocke
          deadlines: {
            ssn:     dateValue ? new Date(new Date(dateValue).getTime() + 10*86400000).toISOString() : null,
            bank:    dateValue ? new Date(new Date(dateValue).getTime() + 14*86400000).toISOString() : null,
            greencard: dateValue ? new Date(new Date(dateValue).getTime() + 21*86400000).toISOString() : null,
            housing: dateValue ? new Date(new Date(dateValue).getTime() + 30*86400000).toISOString() : null,
            license: dateValue ? new Date(new Date(dateValue).getTime() + 45*86400000).toISOString() : null,
            job:     dateValue ? new Date(new Date(dateValue).getTime() + 90*86400000).toISOString() : null,
          }
        });
      }
    } catch {/* continue */}
    setSaving(false);
    window.location.href = "/onboarding/step4";
  };

  const handleSkip = () => {
    window.location.href = "/onboarding/step4";
  };

  if (!ready) return <div style={{minHeight:"100dvh",background:"#0b0f1a"}} />;

  return (
    <div style={container}>
      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={()=>window.location.href="/onboarding/step3"}>
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
              <div style={{...progressFill,width:"80%"}} />
            </div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          {/* Emoji + titre */}
          <div style={{fontSize:40,marginBottom:12,textAlign:"center" as const}}>
            {isNotYet ? "✈️" : isSettled ? "🏠" : "📅"}
          </div>
          <h2 style={titleStyle}>{title}</h2>
          <p style={subStyle}>{sub}</p>

          {/* Info box */}
          <div style={{background:"rgba(232,184,75,0.06)",border:"1px solid rgba(232,184,75,0.2)",borderRadius:12,padding:"12px 14px",marginBottom:20,fontSize:12,color:"#e8b84b",lineHeight:1.6}}>
            {info}
          </div>

          {/* Date input */}
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:12,color:"#aaa",marginBottom:8,fontWeight:500}}>
              📅 {label}
            </label>
            <input
              type="date"
              value={dateValue}
              min={minDate}
              max={maxDate}
              onChange={e=>handleDateChange(e.target.value)}
              style={{
                width:"100%",
                padding:"14px 16px",
                background:"#141d2e",
                border:"1px solid "+(dateValue?"#e8b84b":"#2a3448"),
                borderRadius:12,
                color:dateValue?"#f4f1ec":"#555",
                fontSize:16,
                fontFamily:"inherit",
                outline:"none",
                boxSizing:"border-box" as const,
                cursor:"pointer",
              }}
            />
            {dateValue&&(
              <div style={{marginTop:8,fontSize:12,color:"#22c55e",fontWeight:500}}>
                ✅ {formatDate(dateValue,lang)}
              </div>
            )}
          </div>

          {/* ✅ Preview deadlines — seulement si date choisie + déjà arrivé */}
          {showDeadlines && deadlines && (
            <div style={{background:"#141d2e",border:"1px solid rgba(232,184,75,0.2)",borderRadius:14,padding:"16px",marginBottom:20,animation:"fadeIn 0.3s ease"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#e8b84b",marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase" as const}}>
                ⏱ {text.deadlineTitle}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  {label:text.deadlineSSN,  date:deadlines.ssn,  color:"#ef4444", urgency:"🔴"},
                  {label:text.deadlineBank, date:deadlines.bank, color:"#f97316", urgency:"🟠"},
                  {label:text.deadlineGC,   date:deadlines.gc,   color:"#e8b84b", urgency:"🟡"},
                ].map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10,border:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:12,color:"#aaa",flex:1}}>{d.urgency} {d.label}</div>
                    <div style={{fontSize:12,fontWeight:700,color:d.color,flexShrink:0,marginLeft:8}}>{d.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton continuer */}
          <button
            onClick={handleNext}
            disabled={!dateValue||saving}
            style={{...nextBtn,opacity:dateValue&&!saving?1:0.4,marginBottom:12}}
          >
            {saving?(
              <svg width="20" height="20" viewBox="0 0 20 20" style={{animation:"spin 1s linear infinite"}}>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#000" strokeWidth="2.5" strokeOpacity="0.3"/>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38"/>
              </svg>
            ):text.next+" →"}
          </button>

          {/* Bouton passer */}
          <button onClick={handleSkip} style={skipBtn}>
            {text.skip}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        button:active{transform:scale(0.98) !important}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.5);cursor:pointer}
      `}</style>
    </div>
  );
}

const container:CSSProperties  = {minHeight:"100dvh",background:"#0b0f1a",color:"#f4f1ec",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"};
const bgGlow:CSSProperties     = {position:"absolute",top:"-10%",left:"50%",transform:"translateX(-50%)",width:500,height:400,background:"radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)",pointerEvents:"none"};
const headerStyle:CSSProperties= {position:"fixed",top:0,left:0,right:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"rgba(11,15,26,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #1e2a3a",zIndex:100};
const backBtn:CSSProperties    = {background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:14,fontFamily:"inherit"};
const logoStyle:CSSProperties  = {fontWeight:900,fontSize:20,fontFamily:"serif"};
const progressTrack:CSSProperties = {height:3,background:"#1e2a3a",borderRadius:3,overflow:"hidden",marginBottom:8};
const progressFill:CSSProperties  = {height:"100%",background:"linear-gradient(to right,#e8b84b,#2dd4bf)",borderRadius:3,transition:"width 0.5s ease"};
const progressLabel:CSSProperties = {fontSize:11,color:"#555",letterSpacing:"0.08em",textTransform:"uppercase"};
const titleStyle:CSSProperties = {fontSize:22,fontWeight:700,margin:"0 0 8px",color:"#f4f1ec",textAlign:"center" as const};
const subStyle:CSSProperties   = {fontSize:13,color:"#aaa",margin:"0 0 20px",lineHeight:1.5,textAlign:"center" as const};
const nextBtn:CSSProperties    = {width:"100%",padding:"15px",background:"#e8b84b",color:"#000",border:"none",borderRadius:14,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity 0.2s",boxShadow:"0 8px 24px rgba(232,184,75,0.15)"};
const skipBtn:CSSProperties    = {width:"100%",padding:"13px",background:"transparent",border:"1px solid #1e2a3a",borderRadius:14,color:"#555",fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:"center" as const};