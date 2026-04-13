"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import type { Lang } from "./data";

type JobsSubTab = "myjobs" | "community";

type MyJob = {
  id: string; company: string; position: string;
  city: string; state: string; startDate: string;
  endDate: string; current: boolean; visaType: string; sector: string;
};

type CommunityJob = {
  id: string; company: string; city: string; state: string;
  sector: string; visaFriendly: string[]; rating: number;
  reviewCount: number; addedBy: string; verified: boolean;
  note: string; createdAt?: string; // ✅ fix
};

// ── Données ──────────────────────────────────
const SECTORS: Record<Lang, { id:string; label:string }[]> = {
  fr:[
    {id:"tech",label:"💻 Tech / IT"},{id:"health",label:"🏥 Santé"},
    {id:"construction",label:"🏗️ Construction"},{id:"food",label:"🍽️ Restauration"},
    {id:"transport",label:"🚛 Transport / Logistique"},{id:"retail",label:"🛒 Commerce / Retail"},
    {id:"finance",label:"💰 Finance / Banque"},{id:"education",label:"📚 Éducation"},
    {id:"security",label:"🔒 Sécurité"},{id:"other",label:"🔧 Autre"},
  ],
  en:[
    {id:"tech",label:"💻 Tech / IT"},{id:"health",label:"🏥 Healthcare"},
    {id:"construction",label:"🏗️ Construction"},{id:"food",label:"🍽️ Food & Restaurant"},
    {id:"transport",label:"🚛 Transport / Logistics"},{id:"retail",label:"🛒 Retail / Commerce"},
    {id:"finance",label:"💰 Finance / Banking"},{id:"education",label:"📚 Education"},
    {id:"security",label:"🔒 Security"},{id:"other",label:"🔧 Other"},
  ],
  es:[
    {id:"tech",label:"💻 Tech / IT"},{id:"health",label:"🏥 Salud"},
    {id:"construction",label:"🏗️ Construcción"},{id:"food",label:"🍽️ Restauración"},
    {id:"transport",label:"🚛 Transporte / Logística"},{id:"retail",label:"🛒 Comercio / Retail"},
    {id:"finance",label:"💰 Finanzas / Banca"},{id:"education",label:"📚 Educación"},
    {id:"security",label:"🔒 Seguridad"},{id:"other",label:"🔧 Otro"},
  ],
};

const VISA_TYPES = ["DV Lottery","Green Card","H1B","H2A","H2B","TN","OPT/CPT","Other"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// Entreprises connues pour autocomplete
const KNOWN_COMPANIES = [
  "Amazon","Walmart","McDonald's","Target","Home Depot","Kroger","Costco",
  "FedEx","UPS","DHL","USPS","Dollar General","Dollar Tree","Lowe's",
  "CVS Health","Walgreens","Starbucks","Subway","Pizza Hut","Burger King",
  "KFC","Chick-fil-A","Domino's","Chipotle","Olive Garden","Applebee's",
  "Marriott","Hilton","Hyatt","Holiday Inn","Best Western","Airbnb",
  "Tesla","Apple","Google","Microsoft","Meta","Amazon Web Services",
  "JPMorgan Chase","Bank of America","Wells Fargo","Citibank","TD Bank",
  "UnitedHealth Group","HCA Healthcare","CVS Health","Kaiser Permanente",
  "PepsiCo","Coca-Cola","Nestlé","Tyson Foods","Kraft Heinz",
  "US Army","US Navy","US Air Force","National Guard",
];

// Normalise pour recherche multilingue (retire accents, minuscule)
function normalize(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[éèêë]/g,"e").replace(/[àâä]/g,"a")
    .replace(/[ùûü]/g,"u").replace(/[îï]/g,"i")
    .replace(/[ôö]/g,"o").replace(/[ç]/g,"c");
}

function matchSearch(job: CommunityJob, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  return (
    normalize(job.company).includes(n) ||
    normalize(job.city).includes(n) ||
    normalize(job.state).includes(n) ||
    normalize(job.note || "").includes(n)
  );
}

const PAGE_SIZE = 10;

// ══════════════════════════════════════════════
// MODAL AJOUTER JOB — 3 étapes centrées
// ══════════════════════════════════════════════
function AddJobModal({ lang, userId, onClose, onSaved }: {
  lang: Lang; userId: string;
  onClose: ()=>void; onSaved: (job: MyJob)=>void;
}) {
  const [step,   setStep]   = useState<1|2|3>(1);
  const [form,   setForm]   = useState({ company:"", position:"", city:"", state:"", sector:"tech", visaType:"DV Lottery", startDate:"", endDate:"", current:false });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const T = {
    fr:{ expTitle:"À quoi sert cette section ?", expSub:"Ajouter tes jobs passés et actuels", exp1:"📋 Garde une trace de ton parcours professionnel aux USA", exp2:"🔒 Tes infos restent PRIVÉES — pas partagées avec la communauté", exp3:"💡 Utile pour remplir tes futurs formulaires USCIS", expBtn:"Ajouter mon job →", s2title:"Infos principales", s2sub:"Étape 1 sur 2", company:"Nom de l'entreprise *", position:"Poste / Titre *", city:"Ville *", state:"État US", next:"Continuer →", cancel:"Annuler", s3title:"Détails du job", s3sub:"Étape 2 sur 2", sector:"Secteur d'activité", visa:"Type de visa utilisé", startDate:"Date de début *", endDate:"Date de fin", current:"Poste actuel (toujours en cours)", save:"✅ Enregistrer", back:"← Retour", required:"Remplis les champs obligatoires *" },
    en:{ expTitle:"What is this section for?", expSub:"Add your past and current jobs", exp1:"📋 Keep track of your professional journey in the USA", exp2:"🔒 Your info stays PRIVATE — not shared with the community", exp3:"💡 Helps you fill future USCIS forms", expBtn:"Add my job →", s2title:"Main info", s2sub:"Step 1 of 2", company:"Company name *", position:"Position / Title *", city:"City *", state:"US State", next:"Continue →", cancel:"Cancel", s3title:"Job details", s3sub:"Step 2 of 2", sector:"Industry sector", visa:"Visa type used", startDate:"Start date *", endDate:"End date", current:"Current position (still ongoing)", save:"✅ Save", back:"← Back", required:"Fill in the required fields *" },
    es:{ expTitle:"¿Para qué sirve esta sección?", expSub:"Agrega tus trabajos pasados y actuales", exp1:"📋 Lleva un registro de tu trayectoria profesional en EE.UU.", exp2:"🔒 Tu info es PRIVADA — no se comparte con la comunidad", exp3:"💡 Te ayuda a completar futuros formularios USCIS", expBtn:"Agregar mi trabajo →", s2title:"Información principal", s2sub:"Paso 1 de 2", company:"Nombre de empresa *", position:"Puesto / Título *", city:"Ciudad *", state:"Estado US", next:"Continuar →", cancel:"Cancelar", s3title:"Detalles del trabajo", s3sub:"Paso 2 de 2", sector:"Sector de actividad", visa:"Tipo de visa usado", startDate:"Fecha de inicio *", endDate:"Fecha de fin", current:"Puesto actual (sigue en curso)", save:"✅ Guardar", back:"← Atrás", required:"Completa los campos obligatorios *" },
  }[lang];

  const inp = (label:string, field:keyof typeof form, type="text", plh="") => (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{label}</div>
      <input type={type} value={form[field] as string} placeholder={plh}
        onChange={e=>{ setForm(p=>({...p,[field]:e.target.value})); setError(""); }}
        style={{ width:"100%",padding:"13px 14px",background:"#0b0f1a",border:`1px solid ${(form[field] as string)?"#e8b84b":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const }}
      />
    </div>
  );

  const handleSave = async () => {
    if (!form.company.trim()||!form.startDate){ setError(T.required); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,"users",userId,"jobs"),{...form,createdAt:new Date().toISOString()});
      onSaved({id:ref.id,...form}); onClose();
    } catch { setError("Erreur — réessaie"); }
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"16px" }} onClick={onClose}>
      <div style={{ background:"#0f1521",border:"1.5px solid #1e2a3a",borderRadius:22,padding:"24px 20px",width:"100%",maxWidth:420,animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }} onClick={e=>e.stopPropagation()}>

        {/* Progress */}
        <div style={{ display:"flex",gap:6,marginBottom:20 }}>
          {[1,2,3].map(n=><div key={n} style={{ flex:1,height:3,borderRadius:3,background:step>=n?"#e8b84b":"#1e2a3a",transition:"background .3s" }}/>)}
        </div>

        {step===1&&(<>
          <div style={{ fontSize:36,textAlign:"center" as const,marginBottom:10 }}>💼</div>
          <div style={{ fontSize:17,fontWeight:800,color:"#f4f1ec",textAlign:"center" as const,marginBottom:4 }}>{T.expTitle}</div>
          <div style={{ fontSize:12,color:"#aaa",textAlign:"center" as const,marginBottom:18 }}>{T.expSub}</div>
          <div style={{ display:"flex",flexDirection:"column" as const,gap:8,marginBottom:22 }}>
            {[T.exp1,T.exp2,T.exp3].map((t,i)=><div key={i} style={{ fontSize:13,color:"#f4f1ec",lineHeight:1.6,padding:"10px 14px",background:"#141d2e",borderRadius:11,border:"1px solid #1e2a3a" }}>{t}</div>)}
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onClose} style={{ flex:1,padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>{T.cancel}</button>
            <button onClick={()=>setStep(2)} style={{ flex:2,padding:"12px",background:"#e8b84b",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{T.expBtn}</button>
          </div>
        </>)}

        {step===2&&(<>
          <div style={{ fontSize:11,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4 }}>{T.s2sub}</div>
          <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:18 }}>{T.s2title}</div>
          {inp(T.company,"company","text","ex: Amazon, Walmart...")}
          {inp(T.position,"position","text","ex: Warehouse Associate...")}
          {inp(T.city,"city","text","ex: Arlington")}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.state}</div>
            <select value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))}
              style={{ width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:form.state?"#f4f1ec":"#555",fontSize:16,fontFamily:"inherit",outline:"none" }}>
              <option value="">— {T.state} —</option>
              {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10 }}>⚠️ {error}</div>}
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onClose} style={{ flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>{T.cancel}</button>
            <button onClick={()=>{ if(!form.company.trim()||!form.position.trim()||!form.city.trim()){setError(T.required);return;} setError("");setStep(3); }}
              style={{ flex:2,padding:"13px",background:"#e8b84b",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{T.next}</button>
          </div>
        </>)}

        {step===3&&(<>
          <div style={{ fontSize:11,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4 }}>{T.s3sub}</div>
          <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:18 }}>{T.s3title}</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.sector}</div>
            <select value={form.sector} onChange={e=>setForm(p=>({...p,sector:e.target.value}))}
              style={{ width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none" }}>
              {SECTORS[lang].map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.visa}</div>
            <select value={form.visaType} onChange={e=>setForm(p=>({...p,visaType:e.target.value}))}
              style={{ width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none" }}>
              {VISA_TYPES.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {inp(T.startDate,"startDate","date")}
          {!form.current&&inp(T.endDate,"endDate","date")}
          <div onClick={()=>setForm(p=>({...p,current:!p.current}))}
            style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:form.current?"rgba(34,197,94,.06)":"#141d2e",border:`1px solid ${form.current?"rgba(34,197,94,.3)":"#1e2a3a"}`,borderRadius:12,cursor:"pointer",marginBottom:18 }}>
            <div style={{ width:22,height:22,borderRadius:6,background:form.current?"#22c55e":"transparent",border:`2px solid ${form.current?"#22c55e":"#2a3448"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              {form.current&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize:13,color:form.current?"#22c55e":"#aaa" }}>{T.current}</span>
          </div>
          {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10 }}>⚠️ {error}</div>}
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(2)} style={{ flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>{T.back}</button>
            <button onClick={handleSave} disabled={saving} style={{ flex:2,padding:"13px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?.7:1 }}>
              {saving?"⏳...":T.save}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MODAL RECOMMANDER — 3 étapes + autocomplete
// ══════════════════════════════════════════════
function RecommendModal({ lang, userId, onClose, onSaved }: {
  lang: Lang; userId: string;
  onClose: ()=>void; onSaved: (job: CommunityJob)=>void;
}) {
  const [step,        setStep]        = useState<1|2|3>(1);
  const [form,        setForm]        = useState({ company:"", city:"", state:"", sector:"tech", visaFriendly:[] as string[], rating:5, note:"" });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const T = {
    fr:{ expTitle:"Aide la communauté Kuabo !", expSub:"Recommander un employeur", exp1:"🤝 Tu as travaillé quelque part ? Partage ton expérience", exp2:"🌍 Aide d'autres immigrants à trouver un bon employeur", exp3:"✅ Ton avis est anonyme — visible par toute la communauté", expBtn:"Recommander →", s2title:"L'entreprise", s2sub:"Étape 1 sur 2", company:"Nom de l'entreprise *", city:"Ville *", state:"État US", sector:"Secteur", next:"Continuer →", cancel:"Annuler", s3title:"Ton avis", s3sub:"Étape 2 sur 2", visa:"Compatible avec quel(s) visa(s) ? *", rating:"Ta note", note:"Ton avis (optionnel)", notePlh:"Ex: Super employeur, très sympa avec les immigrants...", save:"⭐ Publier ma recommandation", back:"← Retour", required:"Champs obligatoires manquants" },
    en:{ expTitle:"Help the Kuabo community!", expSub:"Recommend an employer", exp1:"🤝 Worked somewhere? Share your experience", exp2:"🌍 Help other immigrants find a good employer", exp3:"✅ Your review is anonymous — visible to the whole community", expBtn:"Recommend →", s2title:"The company", s2sub:"Step 1 of 2", company:"Company name *", city:"City *", state:"US State", sector:"Sector", next:"Continue →", cancel:"Cancel", s3title:"Your review", s3sub:"Step 2 of 2", visa:"Compatible with which visa(s)? *", rating:"Your rating", note:"Your review (optional)", notePlh:"e.g: Great employer, very friendly with immigrants...", save:"⭐ Publish my recommendation", back:"← Back", required:"Missing required fields" },
    es:{ expTitle:"¡Ayuda a la comunidad Kuabo!", expSub:"Recomendar un empleador", exp1:"🤝 ¿Trabajaste en algún lugar? Comparte tu experiencia", exp2:"🌍 Ayuda a otros inmigrantes a encontrar un buen empleador", exp3:"✅ Tu reseña es anónima — visible para toda la comunidad", expBtn:"Recomendar →", s2title:"La empresa", s2sub:"Paso 1 de 2", company:"Nombre de empresa *", city:"Ciudad *", state:"Estado US", sector:"Sector", next:"Continuar →", cancel:"Cancelar", s3title:"Tu opinión", s3sub:"Paso 2 de 2", visa:"¿Compatible con qué visa(s)? *", rating:"Tu calificación", note:"Tu opinión (opcional)", notePlh:"Ej: Gran empleador, muy amigable con inmigrantes...", save:"⭐ Publicar mi recomendación", back:"← Atrás", required:"Campos obligatorios faltantes" },
  }[lang];

  // Autocomplete entreprise
  const handleCompanyChange = (val: string) => {
    setForm(p=>({...p,company:val}));
    setError("");
    if (val.length >= 2) {
      const n = normalize(val);
      const s = KNOWN_COMPANIES.filter(c=>normalize(c).includes(n)).slice(0,5);
      setSuggestions(s);
      setShowSuggest(s.length > 0);
    } else {
      setShowSuggest(false);
    }
  };

  const toggleVisa = (v:string) => setForm(p=>({...p,visaFriendly:p.visaFriendly.includes(v)?p.visaFriendly.filter(x=>x!==v):[...p.visaFriendly,v]}));

  const handleSave = async () => {
    if (!form.company.trim()||!form.city.trim()||form.visaFriendly.length===0){ setError(T.required); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,"community_jobs"),{...form,addedBy:userId,verified:false,reviewCount:1,createdAt:new Date().toISOString()});
      onSaved({id:ref.id,...form,addedBy:userId,verified:false,reviewCount:1,note:form.note}); onClose();
    } catch { setError("Erreur — réessaie"); }
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"16px" }} onClick={onClose}>
      <div style={{ background:"#0f1521",border:"1.5px solid #1e2a3a",borderRadius:22,padding:"24px 20px",width:"100%",maxWidth:420,animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }} onClick={e=>e.stopPropagation()}>

        {/* Progress */}
        <div style={{ display:"flex",gap:6,marginBottom:20 }}>
          {[1,2,3].map(n=><div key={n} style={{ flex:1,height:3,borderRadius:3,background:step>=n?"#22c55e":"#1e2a3a",transition:"background .3s" }}/>)}
        </div>

        {/* Étape 1 */}
        {step===1&&(<>
          <div style={{ fontSize:36,textAlign:"center" as const,marginBottom:10 }}>⭐</div>
          <div style={{ fontSize:17,fontWeight:800,color:"#f4f1ec",textAlign:"center" as const,marginBottom:4 }}>{T.expTitle}</div>
          <div style={{ fontSize:12,color:"#aaa",textAlign:"center" as const,marginBottom:18 }}>{T.expSub}</div>
          <div style={{ display:"flex",flexDirection:"column" as const,gap:8,marginBottom:22 }}>
            {[T.exp1,T.exp2,T.exp3].map((t,i)=><div key={i} style={{ fontSize:13,color:"#f4f1ec",lineHeight:1.6,padding:"10px 14px",background:"#141d2e",borderRadius:11,border:"1px solid #1e2a3a" }}>{t}</div>)}
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onClose} style={{ flex:1,padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>{T.cancel}</button>
            <button onClick={()=>setStep(2)} style={{ flex:2,padding:"12px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{T.expBtn}</button>
          </div>
        </>)}

        {/* Étape 2 */}
        {step===2&&(<>
          <div style={{ fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4 }}>{T.s2sub}</div>
          <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:18 }}>{T.s2title}</div>

          {/* Autocomplete entreprise */}
          <div style={{ marginBottom:14,position:"relative" }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.company}</div>
            <input value={form.company} placeholder="ex: Amazon, McDonald's..."
              onChange={e=>handleCompanyChange(e.target.value)}
              onBlur={()=>setTimeout(()=>setShowSuggest(false),150)}
              onFocus={()=>{ if(suggestions.length>0)setShowSuggest(true); }}
              style={{ width:"100%",padding:"13px 14px",background:"#0b0f1a",border:`1px solid ${form.company?"#22c55e":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const }}
            />
            {showSuggest&&suggestions.length>0&&(
              <div style={{ position:"absolute",top:"100%",left:0,right:0,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,zIndex:10,overflow:"hidden",marginTop:4 }}>
                {suggestions.map(s=>(
                  <div key={s} onClick={()=>{ setForm(p=>({...p,company:s})); setShowSuggest(false); }}
                    style={{ padding:"11px 14px",fontSize:14,color:"#f4f1ec",cursor:"pointer",borderBottom:"1px solid #0b0f1a" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="#1e2a3a")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    🏢 {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ville */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.city}</div>
            <input value={form.city} placeholder="ex: Dallas"
              onChange={e=>{ setForm(p=>({...p,city:e.target.value})); setError(""); }}
              style={{ width:"100%",padding:"13px 14px",background:"#0b0f1a",border:`1px solid ${form.city?"#22c55e":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const }}
            />
          </div>

          <div style={{ display:"flex",gap:10,marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.state}</div>
              <select value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))}
                style={{ width:"100%",padding:"13px 10px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:form.state?"#f4f1ec":"#555",fontSize:15,fontFamily:"inherit",outline:"none" }}>
                <option value="">—</option>
                {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.sector}</div>
              <select value={form.sector} onChange={e=>setForm(p=>({...p,sector:e.target.value}))}
                style={{ width:"100%",padding:"13px 10px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:15,fontFamily:"inherit",outline:"none" }}>
                {SECTORS[lang].map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10 }}>⚠️ {error}</div>}
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onClose} style={{ flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>{T.cancel}</button>
            <button onClick={()=>{ if(!form.company.trim()||!form.city.trim()){setError(T.required);return;} setError("");setStep(3); }}
              style={{ flex:2,padding:"13px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{T.next}</button>
          </div>
        </>)}

        {/* Étape 3 */}
        {step===3&&(<>
          <div style={{ fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4 }}>{T.s3sub}</div>
          <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:16 }}>{T.s3title}</div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:8,fontWeight:500 }}>{T.visa}</div>
            <div style={{ display:"flex",flexWrap:"wrap" as const,gap:6 }}>
              {VISA_TYPES.map(v=>{ const sel=form.visaFriendly.includes(v); return (
                <button key={v} onClick={()=>{ toggleVisa(v); setError(""); }}
                  style={{ padding:"7px 12px",borderRadius:20,background:sel?"rgba(34,197,94,.12)":"#141d2e",border:`1px solid ${sel?"rgba(34,197,94,.4)":"#1e2a3a"}`,color:sel?"#22c55e":"#aaa",fontSize:12,fontWeight:sel?700:400,cursor:"pointer",fontFamily:"inherit" }}>
                  {sel?"✓ ":""}{v}
                </button>
              ); })}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:8,fontWeight:500 }}>{T.rating}</div>
            <div style={{ display:"flex",gap:6 }}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setForm(p=>({...p,rating:n}))}
                  style={{ fontSize:30,background:"none",border:"none",cursor:"pointer",opacity:n<=form.rating?1:.25,transition:"opacity .15s",padding:0 }}>⭐</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500 }}>{T.note}</div>
            <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder={T.notePlh} rows={3}
              style={{ width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:15,fontFamily:"inherit",outline:"none",resize:"none",boxSizing:"border-box" as const }}/>
          </div>

          {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10 }}>⚠️ {error}</div>}
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(2)} style={{ flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>{T.back}</button>
            <button onClick={handleSave} disabled={saving} style={{ flex:2,padding:"13px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?.7:1 }}>
              {saving?"⏳...":T.save}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// JOBS TAB PRINCIPAL
// ══════════════════════════════════════════════
export default function JobsTab({ lang, userId }: { lang:Lang; userId:string|undefined }) {
  const [subTab,        setSubTab]        = useState<JobsSubTab>("myjobs");
  const [myJobs,        setMyJobs]        = useState<MyJob[]>([]);
  const [commJobs,      setCommJobs]      = useState<CommunityJob[]>([]);
  const [loadingMy,     setLoadingMy]     = useState(true);
  const [loadingComm,   setLoadingComm]   = useState(true);
  const [showAddJob,    setShowAddJob]    = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);

  // Recherche + filtres
  const [search,       setSearch]       = useState("");
  const [filterVisa,   setFilterVisa]   = useState("all");
  const [filterState,  setFilterState]  = useState("all");
  const [filterSector, setFilterSector] = useState("all");
  const [filterRating, setFilterRating] = useState(0); // 0 = tous
  const [sortBy,       setSortBy]       = useState<"rating"|"recent">("rating");
  const [page,         setPage]         = useState(1);
  const [showFilters,  setShowFilters]  = useState(false);

  const T = {
    fr:{ title:"Emplois & Carrière 💼", myJobs:"Mes jobs", community:"Communauté", addJob:"+ Ajouter un job", recommend:"⭐ Recommander", noMyJobs:"Aucun job ajouté pour l'instant.", noCommJobs:"Aucun employeur recommandé.", current:"Actuel", filterAll:"Tous", reviews:"avis", verified:"✅ Vérifié", confirmDelete:"Supprimer ce job ?", loadMore:"Voir plus", searchPlh:"🔍 Rechercher entreprise, ville...", filters:"Filtres", sortRating:"Mieux noté", sortRecent:"Plus récent", minRating:"Note min", results:"résultat(s)" },
    en:{ title:"Jobs & Career 💼", myJobs:"My jobs", community:"Community", addJob:"+ Add a job", recommend:"⭐ Recommend", noMyJobs:"No jobs added yet.", noCommJobs:"No employer recommendations yet.", current:"Current", filterAll:"All", reviews:"reviews", verified:"✅ Verified", confirmDelete:"Delete this job?", loadMore:"Load more", searchPlh:"🔍 Search company, city...", filters:"Filters", sortRating:"Top rated", sortRecent:"Most recent", minRating:"Min rating", results:"result(s)" },
    es:{ title:"Empleos & Carrera 💼", myJobs:"Mis trabajos", community:"Comunidad", addJob:"+ Agregar trabajo", recommend:"⭐ Recomendar", noMyJobs:"Aún no hay trabajos.", noCommJobs:"Aún no hay recomendaciones.", current:"Actual", filterAll:"Todos", reviews:"reseñas", verified:"✅ Verificado", confirmDelete:"¿Eliminar este trabajo?", loadMore:"Ver más", searchPlh:"🔍 Buscar empresa, ciudad...", filters:"Filtros", sortRating:"Mejor calificado", sortRecent:"Más reciente", minRating:"Nota mín.", results:"resultado(s)" },
  }[lang];

  useEffect(()=>{
    if(!userId){setLoadingMy(false);return;}
    getDocs(collection(db,"users",userId,"jobs")).then(snap=>{
      const jobs:MyJob[]=snap.docs.map(d=>({id:d.id,...d.data() as any}));
      jobs.sort((a,b)=>(b.current?1:0)-(a.current?1:0));
      setMyJobs(jobs);
    }).catch(()=>{}).finally(()=>setLoadingMy(false));
  },[userId]);

  useEffect(()=>{
    getDocs(collection(db,"community_jobs")).then(snap=>{
      const jobs:CommunityJob[]=snap.docs.map(d=>({id:d.id,...d.data() as any}));
      jobs.sort((a,b)=>b.rating-a.rating);
      setCommJobs(jobs);
    }).catch(()=>{}).finally(()=>setLoadingComm(false));
  },[]);

  const handleDeleteJob = async (jobId:string) => {
    if(!userId||!confirm(T.confirmDelete))return;
    try { await deleteDoc(doc(db,"users",userId,"jobs",jobId)); setMyJobs(p=>p.filter(j=>j.id!==jobId)); } catch{}
  };

  const sectorLabel = (id:string) => SECTORS[lang].find(s=>s.id===id)?.label||id;

  // ── Filtrage + recherche + tri + pagination ──
  const filtered = commJobs
    .filter(j=>{
      if(filterVisa!=="all"&&!j.visaFriendly?.includes(filterVisa))return false;
      if(filterState!=="all"&&j.state!==filterState)return false;
      if(filterSector!=="all"&&j.sector!==filterSector)return false;
      if(filterRating>0&&j.rating<filterRating)return false;
      if(search&&!matchSearch(j,search))return false;
      return true;
    })
    .sort((a,b)=>sortBy==="rating"?b.rating-a.rating:new Date(b.createdAt||0 as any).getTime()-new Date(a.createdAt||0 as any).getTime());

  const paginated  = filtered.slice(0,page*PAGE_SIZE);
  const hasMore    = paginated.length < filtered.length;
  const activeFilters = [filterVisa!=="all",filterState!=="all",filterSector!=="all",filterRating>0].filter(Boolean).length;

  // Reset page si filtres changent
  useEffect(()=>setPage(1),[search,filterVisa,filterState,filterSector,filterRating,sortBy]);

  return (
    <div style={{ paddingTop:8 }}>
      {showAddJob&&userId&&<AddJobModal lang={lang} userId={userId} onClose={()=>setShowAddJob(false)} onSaved={j=>setMyJobs(p=>[j,...p])}/>}
      {showRecommend&&userId&&<RecommendModal lang={lang} userId={userId} onClose={()=>setShowRecommend(false)} onSaved={j=>setCommJobs(p=>[j,...p])}/>}

      <h2 style={{ fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:14 }}>{T.title}</h2>

      {/* Sub tabs */}
      <div style={{ display:"flex",gap:6,marginBottom:16 }}>
        {([["myjobs",T.myJobs],["community",T.community]] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)}
            style={{ flex:1,padding:"10px",borderRadius:12,background:subTab===id?"#e8b84b":"#141d2e",border:`1px solid ${subTab===id?"#e8b84b":"#1e2a3a"}`,color:subTab===id?"#000":"#aaa",fontSize:13,fontWeight:subTab===id?700:400,cursor:"pointer",fontFamily:"inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ MES JOBS ══ */}
      {subTab==="myjobs"&&(
        <>
          <button onClick={()=>setShowAddJob(true)}
            style={{ width:"100%",padding:"13px",background:"rgba(232,184,75,.1)",border:"1px dashed rgba(232,184,75,.4)",borderRadius:14,color:"#e8b84b",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:16 }}>
            {T.addJob}
          </button>
          {loadingMy&&<div style={{ textAlign:"center",padding:"24px",color:"#555" }}>...</div>}
          {!loadingMy&&myJobs.length===0&&(
            <div style={{ textAlign:"center" as const,padding:"32px 20px" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>💼</div>
              <div style={{ fontSize:13,color:"#555" }}>{T.noMyJobs}</div>
            </div>
          )}
          <div style={{ display:"flex",flexDirection:"column" as const,gap:10 }}>
            {myJobs.map(job=>(
              <div key={job.id} style={{ background:"#141d2e",border:`1px solid ${job.current?"rgba(34,197,94,.25)":"#1e2a3a"}`,borderRadius:14,padding:"14px" }}>
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec" }}>{job.company}</div>
                      {job.current&&<span style={{ fontSize:9,color:"#22c55e",fontWeight:700,background:"rgba(34,197,94,.1)",padding:"2px 7px",borderRadius:8,border:"1px solid rgba(34,197,94,.25)" }}>{T.current}</span>}
                    </div>
                    <div style={{ fontSize:12,color:"#2dd4bf",marginBottom:4 }}>{job.position}</div>
                    <div style={{ fontSize:11,color:"#555",display:"flex",gap:8,flexWrap:"wrap" as const }}>
                      {job.city&&<span>📍 {job.city}{job.state?`, ${job.state}`:""}</span>}
                      {job.visaType&&<span>🪪 {job.visaType}</span>}
                      {job.sector&&<span>{sectorLabel(job.sector)}</span>}
                    </div>
                    {job.startDate&&<div style={{ fontSize:11,color:"#555",marginTop:4 }}>{job.startDate}{!job.current&&job.endDate?` → ${job.endDate}`:job.current?" → "+(lang==="fr"?"présent":lang==="es"?"presente":"present"):""}</div>}
                  </div>
                  <button onClick={()=>handleDeleteJob(job.id)} style={{ background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"6px 10px",color:"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0 }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══ COMMUNAUTÉ ══ */}
      {subTab==="community"&&(
        <>
          <button onClick={()=>setShowRecommend(true)}
            style={{ width:"100%",padding:"13px",background:"rgba(34,197,94,.1)",border:"1px dashed rgba(34,197,94,.4)",borderRadius:14,color:"#22c55e",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:14 }}>
            {T.recommend}
          </button>

          {/* ── Barre de recherche + bouton filtres ── */}
          <div style={{ display:"flex",gap:8,marginBottom:10 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={T.searchPlh}
              style={{ flex:1,padding:"11px 14px",background:"#141d2e",border:`1px solid ${search?"#e8b84b":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none" }}/>
            <button onClick={()=>setShowFilters(p=>!p)}
              style={{ padding:"11px 14px",background:showFilters||activeFilters>0?"rgba(232,184,75,.15)":"#141d2e",border:`1px solid ${activeFilters>0?"#e8b84b":"#1e2a3a"}`,borderRadius:12,color:activeFilters>0?"#e8b84b":"#aaa",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center",gap:6 }}>
              ⚙️ {T.filters}{activeFilters>0?` (${activeFilters})`:""}
            </button>
          </div>

          {/* ── Panneau filtres ── */}
          {showFilters&&(
            <div style={{ background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,padding:"14px",marginBottom:12,animation:"fadeIn .2s ease" }}>
              {/* Tri */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11,color:"#555",marginBottom:7,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em" }}>Tri</div>
                <div style={{ display:"flex",gap:6 }}>
                  {([["rating",T.sortRating],["recent",T.sortRecent]] as const).map(([id,label])=>(
                    <button key={id} onClick={()=>setSortBy(id)}
                      style={{ padding:"6px 12px",borderRadius:20,background:sortBy===id?"rgba(232,184,75,.15)":"#0b0f1a",border:`1px solid ${sortBy===id?"#e8b84b":"#1e2a3a"}`,color:sortBy===id?"#e8b84b":"#aaa",fontSize:11,fontWeight:sortBy===id?700:400,cursor:"pointer",fontFamily:"inherit" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre Visa */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em" }}>Visa</div>
                <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:4 }}>
                  {["all",...VISA_TYPES].map(v=>(
                    <button key={v} onClick={()=>setFilterVisa(v)}
                      style={{ padding:"5px 11px",borderRadius:20,background:filterVisa===v?"rgba(232,184,75,.15)":"#0b0f1a",border:`1px solid ${filterVisa===v?"#e8b84b":"#1e2a3a"}`,color:filterVisa===v?"#e8b84b":"#aaa",fontSize:11,fontWeight:filterVisa===v?700:400,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap" as const }}>
                      {v==="all"?T.filterAll:v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre État */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em" }}>État US</div>
                <select value={filterState} onChange={e=>setFilterState(e.target.value)}
                  style={{ width:"100%",padding:"9px 12px",background:"#0b0f1a",border:`1px solid ${filterState!=="all"?"#2dd4bf":"#1e2a3a"}`,borderRadius:10,color:filterState!=="all"?"#2dd4bf":"#aaa",fontSize:14,fontFamily:"inherit",outline:"none" }}>
                  <option value="all">🗺️ {T.filterAll}</option>
                  {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Filtre Secteur */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em" }}>Secteur</div>
                <select value={filterSector} onChange={e=>setFilterSector(e.target.value)}
                  style={{ width:"100%",padding:"9px 12px",background:"#0b0f1a",border:`1px solid ${filterSector!=="all"?"#a78bfa":"#1e2a3a"}`,borderRadius:10,color:filterSector!=="all"?"#a78bfa":"#aaa",fontSize:14,fontFamily:"inherit",outline:"none" }}>
                  <option value="all">💼 {T.filterAll}</option>
                  {SECTORS[lang].map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              {/* Note minimum */}
              <div>
                <div style={{ fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em" }}>{T.minRating}</div>
                <div style={{ display:"flex",gap:6 }}>
                  {[0,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setFilterRating(n)}
                      style={{ padding:"5px 11px",borderRadius:20,background:filterRating===n?"rgba(232,184,75,.15)":"#0b0f1a",border:`1px solid ${filterRating===n?"#e8b84b":"#1e2a3a"}`,color:filterRating===n?"#e8b84b":"#aaa",fontSize:11,fontWeight:filterRating===n?700:400,cursor:"pointer",fontFamily:"inherit" }}>
                      {n===0?T.filterAll:`${n}⭐+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {activeFilters>0&&(
                <button onClick={()=>{ setFilterVisa("all");setFilterState("all");setFilterSector("all");setFilterRating(0);setSortBy("rating"); }}
                  style={{ marginTop:12,width:"100%",padding:"8px",background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#ef4444",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>
                  {lang==="fr"?"🗑️ Réinitialiser les filtres":lang==="es"?"🗑️ Restablecer filtros":"🗑️ Reset filters"}
                </button>
              )}
            </div>
          )}

          {/* Compteur */}
          <div style={{ fontSize:11,color:"#555",marginBottom:12 }}>
            {filtered.length} {T.results}
            {search&&<span style={{ color:"#e8b84b" }}> · "{search}"</span>}
          </div>

          {loadingComm&&<div style={{ textAlign:"center",padding:"24px",color:"#555" }}>...</div>}
          {!loadingComm&&filtered.length===0&&(
            <div style={{ textAlign:"center" as const,padding:"32px 20px" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:13,color:"#555" }}>{T.noCommJobs}</div>
            </div>
          )}

          {/* Cards */}
          <div style={{ display:"flex",flexDirection:"column" as const,gap:10 }}>
            {paginated.map(job=>(
              <div key={job.id} style={{ background:"#141d2e",border:"1px solid rgba(34,197,94,.15)",borderRadius:14,padding:"14px" }}>
                <div style={{ display:"flex",alignItems:"flex-start",marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec" }}>{job.company}</div>
                      {job.verified&&<span style={{ fontSize:9,color:"#22c55e" }}>{T.verified}</span>}
                    </div>
                    <div style={{ fontSize:11,color:"#555",marginBottom:6 }}>
                      {job.city}{job.state?`, ${job.state}`:""} · {sectorLabel(job.sector)}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                      <span style={{ fontSize:13 }}>{"⭐".repeat(Math.round(job.rating))}</span>
                      <span style={{ fontSize:11,color:"#e8b84b",fontWeight:700 }}>{job.rating}/5</span>
                      <span style={{ fontSize:10,color:"#555" }}>({job.reviewCount} {T.reviews})</span>
                    </div>
                    {job.visaFriendly?.length>0&&(
                      <div style={{ display:"flex",flexWrap:"wrap" as const,gap:4 }}>
                        {job.visaFriendly.map(v=>(
                          <span key={v} style={{ fontSize:9,color:"#22c55e",background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",padding:"2px 7px",borderRadius:8,fontWeight:700 }}>✓ {v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {job.note&&(
                  <div style={{ fontSize:12,color:"#aaa",lineHeight:1.6,padding:"8px 10px",background:"rgba(255,255,255,.02)",borderRadius:9,borderLeft:"2px solid rgba(232,184,75,.3)" }}>
                    "{job.note}"
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bouton "Voir plus" */}
          {hasMore&&(
            <button onClick={()=>setPage(p=>p+1)}
              style={{ width:"100%",padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,color:"#aaa",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:12 }}>
              {T.loadMore} ({filtered.length - paginated.length} {lang==="fr"?"restants":lang==="es"?"restantes":"remaining"})
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes alertPop { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
