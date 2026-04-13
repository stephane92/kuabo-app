"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc, getDoc, updateDoc, increment } from "firebase/firestore";
import type { Lang } from "./data";

type JobsSubTab = "myjobs" | "community";
type CommView   = "home" | "search";

type MyJob = {
  id: string; company: string; position: string;
  city: string; state: string; startDate: string;
  endDate: string; current: boolean; visaType: string; sector: string;
};

type CommunityJob = {
  id: string; company: string; city: string; state: string;
  sector: string; visaFriendly: string[]; rating: number;
  reviewCount: number; addedBy: string; verified: boolean;
  note: string; noteLang?: string; createdAt?: string;
  likes?: number;
};

// ── Constantes ─────────────────────────────────────────────
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
const US_STATES  = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const KNOWN_COMPANIES = ["Amazon","Walmart","McDonald's","Target","Home Depot","Kroger","Costco","FedEx","UPS","DHL","USPS","Dollar General","Dollar Tree","Lowe's","CVS Health","Walgreens","Starbucks","Subway","Pizza Hut","Burger King","KFC","Chick-fil-A","Domino's","Chipotle","Marriott","Hilton","Hyatt","Tesla","Apple","Google","Microsoft","Meta","JPMorgan Chase","Bank of America","Wells Fargo","TD Bank","HCA Healthcare","Kaiser Permanente","Tyson Foods","US Army","US Navy","US Air Force","National Guard"];
const PAGE_SIZE = 10;

function normalize(s:string){ return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function matchSearch(j:CommunityJob,q:string){ const n=normalize(q); return normalize(j.company).includes(n)||normalize(j.city||"").includes(n)||normalize(j.state||"").includes(n)||normalize(j.note||"").includes(n); }
function detectLang(text:string): string {
  if(!text) return "en";
  const fr=/\b(le|la|les|un|une|des|et|de|du|je|tu|il|nous|vous|ils|très|avec|pour|dans|sur|qui|que|quoi|super|bien|bon|sympa|employeur)\b/i;
  const es=/\b(el|la|los|las|un|una|y|de|del|en|por|que|muy|con|para|bueno|gran|empleador|trabajo)\b/i;
  if(fr.test(text)) return "fr";
  if(es.test(text)) return "es";
  return "en";
}
const LANG_FLAGS: Record<string,string> = { fr:"🇫🇷", en:"🇬🇧", es:"🇪🇸" };

// ══════════════════════════════════════════════
// CONFETTI LIKE
// ══════════════════════════════════════════════
function LikeConfetti({ onDone }: { onDone:()=>void }) {
  const colors = ["#e8b84b","#22c55e","#ef4444","#a78bfa","#2dd4bf","#f97316"];
  const pieces = Array.from({length:18},(_,i)=>({ id:i, x:30+Math.random()*40, delay:Math.random()*.3, dur:.8+Math.random()*.5, color:colors[i%6], size:5+Math.random()*7 }));
  useEffect(()=>{ const t=setTimeout(onDone,2000); return()=>clearTimeout(t); },[onDone]);
  return (
    <>
      {pieces.map(p=>(
        <div key={p.id} style={{ position:"fixed",left:p.x+"%",top:"50%",width:p.size,height:p.size,borderRadius:"50%",background:p.color,zIndex:9999,pointerEvents:"none",animation:`likeFall ${p.dur}s ${p.delay}s ease-out forwards` }}/>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════
// MODAL DÉTAIL JOB
// ══════════════════════════════════════════════
function JobDetailModal({ job, lang, userId, onClose, onLiked }: {
  job: CommunityJob; lang: Lang; userId?: string;
  onClose:()=>void; onLiked:(id:string,likes:number,liked:boolean)=>void;
}) {
  const [liked,      setLiked]      = useState(false);
  const [likes,      setLikes]      = useState(job.likes||0);
  const [liking,     setLiking]     = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [toast,      setToast]      = useState("");
  const [checkDone,  setCheckDone]  = useState(false);

  const sectorLabel = (id:string) => SECTORS[lang].find(s=>s.id===id)?.label||id;
  const noteLang    = job.noteLang || detectLang(job.note||"");

  const T = {
    fr:{ like:"❤️ J'aime cette recommandation", liked:"❤️ Recommandation aimée", likeToast:"Merci ! Tu aides la communauté Kuabo 🙏", close:"Fermer", visa:"Compatible avec", sector:"Secteur", note:"Avis de la communauté", reviews:"avis", verified:"✅ Vérifié par Kuabo", addedBy:"Partagé par un membre Kuabo" },
    en:{ like:"❤️ Like this recommendation", liked:"❤️ Recommendation liked", likeToast:"Thanks! You're helping the Kuabo community 🙏", close:"Close", visa:"Compatible with", sector:"Sector", note:"Community review", reviews:"reviews", verified:"✅ Verified by Kuabo", addedBy:"Shared by a Kuabo member" },
    es:{ like:"❤️ Me gusta esta recomendación", liked:"❤️ Recomendación gustada", likeToast:"¡Gracias! Estás ayudando a la comunidad Kuabo 🙏", close:"Cerrar", visa:"Compatible con", sector:"Sector", note:"Reseña de la comunidad", reviews:"reseñas", verified:"✅ Verificado por Kuabo", addedBy:"Compartido por un miembro Kuabo" },
  }[lang];

  // Vérifier si déjà liké
  useEffect(()=>{
    if(!userId){ setCheckDone(true); return; }
    getDoc(doc(db,"community_jobs",job.id,"likes",userId)).then(snap=>{ if(snap.exists())setLiked(true); }).catch(()=>{}).finally(()=>setCheckDone(true));
  },[job.id,userId]);

  const handleLike = async () => {
    if(!userId||liking||!checkDone) return;
    setLiking(true);
    try {
      if(liked){
        await deleteDoc(doc(db,"community_jobs",job.id,"likes",userId));
        const newLikes = Math.max(0,likes-1);
        await updateDoc(doc(db,"community_jobs",job.id),{ likes:newLikes });
        setLikes(newLikes); setLiked(false);
        onLiked(job.id,newLikes,false);
      } else {
        await setDoc(doc(db,"community_jobs",job.id,"likes",userId),{ at:new Date().toISOString() });
        const newLikes = likes+1;
        await updateDoc(doc(db,"community_jobs",job.id),{ likes:newLikes });
        setLikes(newLikes); setLiked(true);
        setShowConf(true);
        setToast(T.likeToast);
        setTimeout(()=>setToast(""),3000);
        onLiked(job.id,newLikes,true);
      }
    } catch {}
    setLiking(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"16px" }} onClick={onClose}>
      {showConf&&<LikeConfetti onDone={()=>setShowConf(false)}/>}

      {/* Toast */}
      {toast&&(
        <div style={{ position:"fixed",top:"20%",left:"50%",transform:"translateX(-50%)",background:"#22c55e",color:"#000",padding:"12px 20px",borderRadius:16,fontSize:13,fontWeight:700,zIndex:9998,boxShadow:"0 8px 24px rgba(0,0,0,.4)",whiteSpace:"nowrap" as const,animation:"alertPop .4s ease" }}>
          {toast}
        </div>
      )}

      <div style={{ background:"#0f1521",border:"1.5px solid rgba(232,184,75,.2)",borderRadius:24,padding:"24px 20px",width:"100%",maxWidth:440,maxHeight:"88vh",overflowY:"auto",animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16 }}>
          <div>
            <div style={{ fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:2 }}>{job.company}</div>
            <div style={{ fontSize:12,color:"#aaa" }}>
              📍 {job.city}{job.state?`, ${job.state}`:""} · {sectorLabel(job.sector)}
            </div>
          </div>
          {job.verified&&<span style={{ fontSize:10,color:"#22c55e",background:"rgba(34,197,94,.1)",padding:"4px 8px",borderRadius:8,border:"1px solid rgba(34,197,94,.25)",flexShrink:0,marginLeft:8 }}>{T.verified}</span>}
        </div>

        {/* Rating */}
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:"rgba(232,184,75,.06)",border:"1px solid rgba(232,184,75,.15)",borderRadius:12 }}>
          <div style={{ fontSize:28 }}>{"⭐".repeat(Math.round(job.rating))}</div>
          <div>
            <div style={{ fontSize:20,fontWeight:800,color:"#e8b84b" }}>{job.rating}/5</div>
            <div style={{ fontSize:11,color:"#555" }}>{job.reviewCount} {T.reviews}</div>
          </div>
          <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:18 }}>❤️</span>
            <span style={{ fontSize:14,fontWeight:700,color:"#ef4444" }}>{likes}</span>
          </div>
        </div>

        {/* Visa */}
        {job.visaFriendly?.length>0&&(
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11,color:"#aaa",marginBottom:8,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em" }}>{T.visa}</div>
            <div style={{ display:"flex",flexWrap:"wrap" as const,gap:6 }}>
              {job.visaFriendly.map(v=>(
                <span key={v} style={{ fontSize:11,color:"#22c55e",background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",padding:"4px 10px",borderRadius:10,fontWeight:700 }}>✓ {v}</span>
              ))}
            </div>
          </div>
        )}

        {/* Avis */}
        {job.note&&(
          <div style={{ marginBottom:20,padding:"14px",background:"rgba(255,255,255,.02)",border:"1px solid #1e2a3a",borderRadius:14 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
              <div style={{ fontSize:11,color:"#aaa",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em" }}>{T.note}</div>
              <span style={{ fontSize:12 }}>{LANG_FLAGS[noteLang]||"🌍"} {noteLang.toUpperCase()}</span>
            </div>
            <div style={{ fontSize:13,color:"#f4f1ec",lineHeight:1.7,fontStyle:"italic" }}>"{job.note}"</div>
            <div style={{ fontSize:10,color:"#555",marginTop:8 }}>{T.addedBy}</div>
          </div>
        )}

        {/* Bouton Like */}
        <button onClick={handleLike} disabled={liking||!checkDone}
          style={{ width:"100%",padding:"14px",background:liked?"rgba(239,68,68,.12)":"rgba(239,68,68,.08)",border:`1.5px solid ${liked?"#ef4444":"rgba(239,68,68,.25)"}`,borderRadius:14,color:liked?"#ef4444":"#f4f1ec",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10,opacity:liking?.7:1 }}>
          <span style={{ fontSize:20,animation:liked?"heartBeat .4s ease":""  }}>❤️</span>
          {liked?T.liked:T.like}
          {likes>0&&<span style={{ background:"rgba(239,68,68,.15)",padding:"2px 8px",borderRadius:20,fontSize:12 }}>{likes}</span>}
        </button>

        <button onClick={onClose}
          style={{ width:"100%",padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
          {T.close}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MODAL AJOUTER JOB — 3 étapes
// ══════════════════════════════════════════════
function AddJobModal({ lang, userId, onClose, onSaved }: { lang:Lang; userId:string; onClose:()=>void; onSaved:(job:MyJob)=>void }) {
  const [step,setStep]=useState<1|2|3>(1);
  const [form,setForm]=useState({ company:"",position:"",city:"",state:"",sector:"tech",visaType:"DV Lottery",startDate:"",endDate:"",current:false });
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  const T={
    fr:{ expTitle:"À quoi sert cette section ?",expSub:"Tes jobs restent PRIVÉS — non partagés",exp1:"📋 Trace ton parcours professionnel aux USA",exp2:"🔒 Tes infos ne sont PAS visibles par la communauté",exp3:"💡 Utile pour remplir tes futurs formulaires USCIS",expBtn:"Ajouter mon job →",s2t:"Infos principales",s2s:"Étape 1 sur 2",company:"Entreprise *",position:"Poste *",city:"Ville *",state:"État US",next:"Continuer →",cancel:"Annuler",s3t:"Détails",s3s:"Étape 2 sur 2",sector:"Secteur",visa:"Visa utilisé",startDate:"Date début *",endDate:"Date fin",current:"Poste actuel (en cours)",save:"✅ Enregistrer",back:"← Retour",req:"Champs * obligatoires" },
    en:{ expTitle:"What is this for?",expSub:"Your jobs stay PRIVATE — not shared",exp1:"📋 Track your professional journey in the USA",exp2:"🔒 Your info is NOT visible to the community",exp3:"💡 Helps fill future USCIS forms",expBtn:"Add my job →",s2t:"Main info",s2s:"Step 1 of 2",company:"Company *",position:"Position *",city:"City *",state:"US State",next:"Continue →",cancel:"Cancel",s3t:"Details",s3s:"Step 2 of 2",sector:"Sector",visa:"Visa used",startDate:"Start date *",endDate:"End date",current:"Current position (ongoing)",save:"✅ Save",back:"← Back",req:"Required * fields" },
    es:{ expTitle:"¿Para qué sirve esto?",expSub:"Tus trabajos son PRIVADOS — no compartidos",exp1:"📋 Registra tu trayectoria profesional en EE.UU.",exp2:"🔒 Tu info NO es visible para la comunidad",exp3:"💡 Útil para completar formularios USCIS",expBtn:"Agregar mi trabajo →",s2t:"Info principal",s2s:"Paso 1 de 2",company:"Empresa *",position:"Puesto *",city:"Ciudad *",state:"Estado US",next:"Continuar →",cancel:"Cancelar",s3t:"Detalles",s3s:"Paso 2 de 2",sector:"Sector",visa:"Visa usado",startDate:"Fecha inicio *",endDate:"Fecha fin",current:"Puesto actual (en curso)",save:"✅ Guardar",back:"← Atrás",req:"Campos * obligatorios" },
  }[lang];

  const inp=(label:string,field:keyof typeof form,type="text",plh="")=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{label}</div>
      <input type={type} value={form[field] as string} placeholder={plh}
        onChange={e=>{setForm(p=>({...p,[field]:e.target.value}));setError("");}}
        style={{width:"100%",padding:"13px 14px",background:"#0b0f1a",border:`1px solid ${(form[field] as string)?"#e8b84b":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const}}/>
    </div>
  );

  const save=async()=>{
    if(!form.company.trim()||!form.startDate){setError(T.req);return;}
    setSaving(true);
    try{ const ref=await addDoc(collection(db,"users",userId,"jobs"),{...form,createdAt:new Date().toISOString()}); onSaved({id:ref.id,...form}); onClose(); }
    catch{setError("Erreur — réessaie");}
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"16px"}} onClick={onClose}>
      <div style={{background:"#0f1521",border:"1.5px solid #1e2a3a",borderRadius:22,padding:"24px 20px",width:"100%",maxWidth:420,animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",gap:6,marginBottom:20}}>{[1,2,3].map(n=><div key={n} style={{flex:1,height:3,borderRadius:3,background:step>=n?"#e8b84b":"#1e2a3a",transition:"background .3s"}}/>)}</div>

        {step===1&&(<>
          <div style={{fontSize:36,textAlign:"center" as const,marginBottom:10}}>💼</div>
          <div style={{fontSize:17,fontWeight:800,color:"#f4f1ec",textAlign:"center" as const,marginBottom:4}}>{T.expTitle}</div>
          <div style={{fontSize:12,color:"#22c55e",textAlign:"center" as const,fontWeight:600,marginBottom:16}}>{T.expSub}</div>
          <div style={{display:"flex",flexDirection:"column" as const,gap:8,marginBottom:22}}>
            {[T.exp1,T.exp2,T.exp3].map((t,i)=><div key={i} style={{fontSize:13,color:"#f4f1ec",lineHeight:1.6,padding:"10px 14px",background:"#141d2e",borderRadius:11,border:"1px solid #1e2a3a"}}>{t}</div>)}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{T.cancel}</button>
            <button onClick={()=>setStep(2)} style={{flex:2,padding:"12px",background:"#e8b84b",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{T.expBtn}</button>
          </div>
        </>)}

        {step===2&&(<>
          <div style={{fontSize:11,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{T.s2s}</div>
          <div style={{fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:18}}>{T.s2t}</div>
          {inp(T.company,"company","text","ex: Amazon...")}
          {inp(T.position,"position","text","ex: Warehouse Associate...")}
          {inp(T.city,"city","text","ex: Arlington")}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.state}</div>
            <select value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} style={{width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:form.state?"#f4f1ec":"#555",fontSize:16,fontFamily:"inherit",outline:"none"}}>
              <option value="">—</option>{US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10}}>⚠️ {error}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{T.cancel}</button>
            <button onClick={()=>{if(!form.company.trim()||!form.position.trim()||!form.city.trim()){setError(T.req);return;}setError("");setStep(3);}} style={{flex:2,padding:"13px",background:"#e8b84b",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{T.next}</button>
          </div>
        </>)}

        {step===3&&(<>
          <div style={{fontSize:11,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{T.s3s}</div>
          <div style={{fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:18}}>{T.s3t}</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.sector}</div>
            <select value={form.sector} onChange={e=>setForm(p=>({...p,sector:e.target.value}))} style={{width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none"}}>
              {SECTORS[lang].map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.visa}</div>
            <select value={form.visaType} onChange={e=>setForm(p=>({...p,visaType:e.target.value}))} style={{width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none"}}>
              {VISA_TYPES.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {inp(T.startDate,"startDate","date")}
          {!form.current&&inp(T.endDate,"endDate","date")}
          <div onClick={()=>setForm(p=>({...p,current:!p.current}))} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:form.current?"rgba(34,197,94,.06)":"#141d2e",border:`1px solid ${form.current?"rgba(34,197,94,.3)":"#1e2a3a"}`,borderRadius:12,cursor:"pointer",marginBottom:18}}>
            <div style={{width:22,height:22,borderRadius:6,background:form.current?"#22c55e":"transparent",border:`2px solid ${form.current?"#22c55e":"#2a3448"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {form.current&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{fontSize:13,color:form.current?"#22c55e":"#aaa"}}>{T.current}</span>
          </div>
          {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10}}>⚠️ {error}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(2)} style={{flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{T.back}</button>
            <button onClick={save} disabled={saving} style={{flex:2,padding:"13px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?.7:1}}>{saving?"⏳...":T.save}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MODAL RECOMMANDER — 3 étapes + autocomplete
// ══════════════════════════════════════════════
function RecommendModal({ lang, userId, onClose, onSaved }: { lang:Lang; userId:string; onClose:()=>void; onSaved:(job:CommunityJob)=>void }) {
  const [step,setStep]=useState<1|2|3>(1);
  const [form,setForm]=useState({ company:"",city:"",state:"",sector:"tech",visaFriendly:[] as string[],rating:5,note:"" });
  const [suggestions,setSuggestions]=useState<string[]>([]);
  const [showSuggest,setShowSuggest]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  const T={
    fr:{ expTitle:"Aide la communauté Kuabo !", expSub:"Recommande un employeur immigrant-friendly", exp1:"🤝 Tu as travaillé quelque part aux USA ? Partage !", exp2:"🌍 Aide les autres immigrants à trouver un bon patron", exp3:"✅ Ton avis est anonyme et visible par tous", expBtn:"Recommander un employeur →", s2t:"L'entreprise", s2s:"Étape 1 sur 2", company:"Nom de l'entreprise *", city:"Ville *", state:"État US", sector:"Secteur", next:"Continuer →", cancel:"Annuler", s3t:"Ton avis", s3s:"Étape 2 sur 2", visa:"Visa(s) accepté(s) *", rating:"Ta note globale", note:"Ton avis (optionnel)", notePlh:"Ex: Très sympa avec les immigrants, pas de problème de visa...", save:"⭐ Publier ma recommandation", back:"← Retour", req:"Champs obligatoires manquants" },
    en:{ expTitle:"Help the Kuabo community!", expSub:"Recommend an immigrant-friendly employer", exp1:"🤝 Worked somewhere in the USA? Share your experience!", exp2:"🌍 Help other immigrants find a good employer", exp3:"✅ Your review is anonymous and visible to all", expBtn:"Recommend an employer →", s2t:"The company", s2s:"Step 1 of 2", company:"Company name *", city:"City *", state:"US State", sector:"Sector", next:"Continue →", cancel:"Cancel", s3t:"Your review", s3s:"Step 2 of 2", visa:"Accepted visa(s) *", rating:"Your overall rating", note:"Your review (optional)", notePlh:"e.g: Very friendly with immigrants, no visa issues...", save:"⭐ Publish my recommendation", back:"← Back", req:"Missing required fields" },
    es:{ expTitle:"¡Ayuda a la comunidad Kuabo!", expSub:"Recomienda un empleador amigable con inmigrantes", exp1:"🤝 ¿Trabajaste en EE.UU.? ¡Comparte tu experiencia!", exp2:"🌍 Ayuda a otros inmigrantes a encontrar un buen empleador", exp3:"✅ Tu reseña es anónima y visible para todos", expBtn:"Recomendar un empleador →", s2t:"La empresa", s2s:"Paso 1 de 2", company:"Nombre de empresa *", city:"Ciudad *", state:"Estado US", sector:"Sector", next:"Continuar →", cancel:"Cancelar", s3t:"Tu opinión", s3s:"Paso 2 de 2", visa:"Visa(s) aceptados *", rating:"Tu calificación global", note:"Tu opinión (opcional)", notePlh:"Ej: Muy amigable con inmigrantes, sin problema de visa...", save:"⭐ Publicar mi recomendación", back:"← Atrás", req:"Campos obligatorios faltantes" },
  }[lang];

  const handleCompany=(val:string)=>{ setForm(p=>({...p,company:val})); setError(""); if(val.length>=2){ const n=normalize(val); const s=KNOWN_COMPANIES.filter(c=>normalize(c).includes(n)).slice(0,5); setSuggestions(s); setShowSuggest(s.length>0); } else setShowSuggest(false); };
  const toggleVisa=(v:string)=>setForm(p=>({...p,visaFriendly:p.visaFriendly.includes(v)?p.visaFriendly.filter(x=>x!==v):[...p.visaFriendly,v]}));

  const save=async()=>{
    if(!form.company.trim()||!form.city.trim()||form.visaFriendly.length===0){setError(T.req);return;}
    setSaving(true);
    const noteLang=detectLang(form.note);
    try{
      const ref=await addDoc(collection(db,"community_jobs"),{...form,noteLang,addedBy:userId,verified:false,reviewCount:1,likes:0,createdAt:new Date().toISOString()});
      onSaved({id:ref.id,...form,noteLang,addedBy:userId,verified:false,reviewCount:1,likes:0});
      onClose();
    }catch{setError("Erreur — réessaie");}
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"16px"}} onClick={onClose}>
      <div style={{background:"#0f1521",border:"1.5px solid #1e2a3a",borderRadius:22,padding:"24px 20px",width:"100%",maxWidth:420,animation:"alertPop .4s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",gap:6,marginBottom:20}}>{[1,2,3].map(n=><div key={n} style={{flex:1,height:3,borderRadius:3,background:step>=n?"#22c55e":"#1e2a3a",transition:"background .3s"}}/>)}</div>

        {step===1&&(<>
          <div style={{fontSize:36,textAlign:"center" as const,marginBottom:10}}>⭐</div>
          <div style={{fontSize:17,fontWeight:800,color:"#f4f1ec",textAlign:"center" as const,marginBottom:4}}>{T.expTitle}</div>
          <div style={{fontSize:12,color:"#22c55e",textAlign:"center" as const,fontWeight:600,marginBottom:16}}>{T.expSub}</div>
          <div style={{display:"flex",flexDirection:"column" as const,gap:8,marginBottom:22}}>
            {[T.exp1,T.exp2,T.exp3].map((t,i)=><div key={i} style={{fontSize:13,color:"#f4f1ec",lineHeight:1.6,padding:"10px 14px",background:"#141d2e",borderRadius:11,border:"1px solid #1e2a3a"}}>{t}</div>)}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{T.cancel}</button>
            <button onClick={()=>setStep(2)} style={{flex:2,padding:"12px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{T.expBtn}</button>
          </div>
        </>)}

        {step===2&&(<>
          <div style={{fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{T.s2s}</div>
          <div style={{fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:18}}>{T.s2t}</div>

          {/* Autocomplete */}
          <div style={{marginBottom:14,position:"relative"}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.company}</div>
            <input value={form.company} placeholder="ex: Amazon, McDonald's..." onChange={e=>handleCompany(e.target.value)} onBlur={()=>setTimeout(()=>setShowSuggest(false),150)} onFocus={()=>{if(suggestions.length>0)setShowSuggest(true);}}
              style={{width:"100%",padding:"13px 14px",background:"#0b0f1a",border:`1px solid ${form.company?"#22c55e":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const}}/>
            {showSuggest&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,zIndex:10,overflow:"hidden",marginTop:4}}>
                {suggestions.map(s=>(
                  <div key={s} onClick={()=>{setForm(p=>({...p,company:s}));setShowSuggest(false);}}
                    style={{padding:"11px 14px",fontSize:14,color:"#f4f1ec",cursor:"pointer",borderBottom:"1px solid #0b0f1a"}}
                    onMouseEnter={e=>(e.currentTarget.style.background="#1e2a3a")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    🏢 {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.city}</div>
            <input value={form.city} placeholder="ex: Dallas" onChange={e=>{setForm(p=>({...p,city:e.target.value}));setError("");}}
              style={{width:"100%",padding:"13px 14px",background:"#0b0f1a",border:`1px solid ${form.city?"#22c55e":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const}}/>
          </div>

          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.state}</div>
              <select value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} style={{width:"100%",padding:"13px 10px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:form.state?"#f4f1ec":"#555",fontSize:15,fontFamily:"inherit",outline:"none"}}>
                <option value="">—</option>{US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.sector}</div>
              <select value={form.sector} onChange={e=>setForm(p=>({...p,sector:e.target.value}))} style={{width:"100%",padding:"13px 10px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:15,fontFamily:"inherit",outline:"none"}}>
                {SECTORS[lang].map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10}}>⚠️ {error}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{T.cancel}</button>
            <button onClick={()=>{if(!form.company.trim()||!form.city.trim()){setError(T.req);return;}setError("");setStep(3);}} style={{flex:2,padding:"13px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{T.next}</button>
          </div>
        </>)}

        {step===3&&(<>
          <div style={{fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4}}>{T.s3s}</div>
          <div style={{fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:16}}>{T.s3t}</div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:8,fontWeight:500}}>{T.visa}</div>
            <div style={{display:"flex",flexWrap:"wrap" as const,gap:6}}>
              {VISA_TYPES.map(v=>{const sel=form.visaFriendly.includes(v);return(
                <button key={v} onClick={()=>{toggleVisa(v);setError("");}} style={{padding:"7px 12px",borderRadius:20,background:sel?"rgba(34,197,94,.12)":"#141d2e",border:`1px solid ${sel?"rgba(34,197,94,.4)":"#1e2a3a"}`,color:sel?"#22c55e":"#aaa",fontSize:12,fontWeight:sel?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                  {sel?"✓ ":""}{v}
                </button>
              );})}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:8,fontWeight:500}}>{T.rating}</div>
            <div style={{display:"flex",gap:6}}>
              {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setForm(p=>({...p,rating:n}))} style={{fontSize:30,background:"none",border:"none",cursor:"pointer",opacity:n<=form.rating?1:.25,transition:"opacity .15s",padding:0}}>⭐</button>)}
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>{T.note}</div>
            <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder={T.notePlh} rows={3}
              style={{width:"100%",padding:"13px 14px",background:"#0b0f1a",border:"1px solid #1e2a3a",borderRadius:12,color:"#f4f1ec",fontSize:15,fontFamily:"inherit",outline:"none",resize:"none",boxSizing:"border-box" as const}}/>
          </div>
          {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10}}>⚠️ {error}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(2)} style={{flex:1,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{T.back}</button>
            <button onClick={save} disabled={saving} style={{flex:2,padding:"13px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?.7:1}}>{saving?"⏳...":T.save}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// JOB CARD — réutilisable
// ══════════════════════════════════════════════
function JobCard({ job, lang, onClick }: { job:CommunityJob; lang:Lang; onClick:()=>void }) {
  const sectorLabel=(id:string)=>SECTORS[lang].find(s=>s.id===id)?.label||id;
  return (
    <div onClick={onClick} style={{background:"#141d2e",border:"1px solid rgba(34,197,94,.12)",borderRadius:16,padding:"14px 16px",cursor:"pointer",transition:"border-color .2s"}}
      onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(34,197,94,.3)")} onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(34,197,94,.12)")}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <div style={{fontSize:15,fontWeight:700,color:"#f4f1ec"}}>{job.company}</div>
            {job.verified&&<span style={{fontSize:9,color:"#22c55e"}}>✅</span>}
          </div>
          <div style={{fontSize:11,color:"#555",marginBottom:6}}>📍 {job.city}{job.state?`, ${job.state}`:""} · {sectorLabel(job.sector)}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13}}>{"⭐".repeat(Math.round(job.rating))}</span>
            <span style={{fontSize:11,color:"#e8b84b",fontWeight:700}}>{job.rating}/5</span>
            {(job.likes||0)>0&&<span style={{fontSize:11,color:"#ef4444"}}>❤️ {job.likes}</span>}
          </div>
        </div>
        <div style={{color:"#555",fontSize:18,flexShrink:0,marginLeft:8}}>›</div>
      </div>
      {job.visaFriendly?.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap" as const,gap:4}}>
          {job.visaFriendly.slice(0,3).map(v=><span key={v} style={{fontSize:9,color:"#22c55e",background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.18)",padding:"2px 7px",borderRadius:8,fontWeight:700}}>✓ {v}</span>)}
          {job.visaFriendly.length>3&&<span style={{fontSize:9,color:"#555"}}>+{job.visaFriendly.length-3}</span>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// JOBS TAB PRINCIPAL
// ══════════════════════════════════════════════
export default function JobsTab({ lang, userId, userState: propState }: {
  lang:Lang; userId:string|undefined; userState?:string;
}) {
  const [subTab,        setSubTab]        = useState<JobsSubTab>("myjobs");
  const [commView,      setCommView]      = useState<CommView>("home");
  const [myJobs,        setMyJobs]        = useState<MyJob[]>([]);
  const [commJobs,      setCommJobs]      = useState<CommunityJob[]>([]);
  const [loadingMy,     setLoadingMy]     = useState(true);
  const [loadingComm,   setLoadingComm]   = useState(true);
  const [showAddJob,    setShowAddJob]    = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
  const [selectedJob,   setSelectedJob]   = useState<CommunityJob|null>(null);

  // Search
  const [search,       setSearch]       = useState("");
  const [filterVisa,   setFilterVisa]   = useState("all");
  const [filterState,  setFilterState]  = useState("all");
  const [filterSector, setFilterSector] = useState("all");
  const [filterRating, setFilterRating] = useState(0);
  const [sortBy,       setSortBy]       = useState<"likes"|"rating"|"recent">("likes");
  const [page,         setPage]         = useState(1);
  const [showFilters,  setShowFilters]  = useState(false);

  const T = {
    fr:{ title:"Emplois & Carrière 💼", myJobs:"Mes jobs", community:"Communauté", addJob:"+ Ajouter un job", noMyJobs:"Aucun job ajouté.", current:"Actuel", confirmDelete:"Supprimer ce job ?",
      commHomeTitle:"Employeurs recommandés", top5:"🏆 Top recommandations", seeAll:"Voir tous les employeurs →", recommend:"⭐ Recommander un employeur", recommendSub:"Tu as travaillé quelque part ? Aide la communauté !",
      searchTitle:"Rechercher un employeur", searchPlh:"🔍 Entreprise, ville, état...", filters:"Filtres", filterAll:"Tous", sortLikes:"Plus aimés", sortRating:"Mieux notés", sortRecent:"Plus récents", minRating:"Note min", results:"résultat(s)", loadMore:"Voir plus", back:"← Retour",
      categories:["🏗️ Construction","🍽️ Restauration","🚛 Transport","🛒 Commerce","🏥 Santé","💻 Tech"],
    },
    en:{ title:"Jobs & Career 💼", myJobs:"My jobs", community:"Community", addJob:"+ Add a job", noMyJobs:"No jobs added yet.", current:"Current", confirmDelete:"Delete this job?",
      commHomeTitle:"Recommended employers", top5:"🏆 Top recommendations", seeAll:"See all employers →", recommend:"⭐ Recommend an employer", recommendSub:"Worked somewhere? Help the community!",
      searchTitle:"Search an employer", searchPlh:"🔍 Company, city, state...", filters:"Filters", filterAll:"All", sortLikes:"Most liked", sortRating:"Top rated", sortRecent:"Most recent", minRating:"Min rating", results:"result(s)", loadMore:"Load more", back:"← Back",
      categories:["🏗️ Construction","🍽️ Food","🚛 Transport","🛒 Retail","🏥 Healthcare","💻 Tech"],
    },
    es:{ title:"Empleos & Carrera 💼", myJobs:"Mis trabajos", community:"Comunidad", addJob:"+ Agregar trabajo", noMyJobs:"Aún no hay trabajos.", current:"Actual", confirmDelete:"¿Eliminar este trabajo?",
      commHomeTitle:"Empleadores recomendados", top5:"🏆 Top recomendaciones", seeAll:"Ver todos los empleadores →", recommend:"⭐ Recomendar un empleador", recommendSub:"¿Trabajaste en algún lugar? ¡Ayuda a la comunidad!",
      searchTitle:"Buscar un empleador", searchPlh:"🔍 Empresa, ciudad, estado...", filters:"Filtros", filterAll:"Todos", sortLikes:"Más gustados", sortRating:"Mejor calificados", sortRecent:"Más recientes", minRating:"Nota mín.", results:"resultado(s)", loadMore:"Ver más", back:"← Atrás",
      categories:["🏗️ Construcción","🍽️ Restauración","🚛 Transporte","🛒 Comercio","🏥 Salud","💻 Tech"],
    },
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
      setCommJobs(jobs);
    }).catch(()=>{}).finally(()=>setLoadingComm(false));
  },[]);

  const sectorLabel=(id:string)=>SECTORS[lang].find(s=>s.id===id)?.label||id;

  const handleDeleteJob=async(jobId:string)=>{
    if(!userId||!confirm(T.confirmDelete))return;
    try{ await deleteDoc(doc(db,"users",userId,"jobs",jobId)); setMyJobs(p=>p.filter(j=>j.id!==jobId)); }catch{}
  };

  const handleLiked=(id:string,likes:number,liked:boolean)=>{
    setCommJobs(p=>p.map(j=>j.id===id?{...j,likes}:j));
    if(selectedJob?.id===id)setSelectedJob(p=>p?{...p,likes}:p);
  };

  // Top 5 pour la vue home
  const top5 = [...commJobs].sort((a,b)=>(b.likes||0)-(a.likes||0)||(b.rating-a.rating)).slice(0,5);

  // Recherche filtrée
  const filtered = commJobs
    .filter(j=>{
      if(filterVisa!=="all"&&!j.visaFriendly?.includes(filterVisa))return false;
      if(filterState!=="all"&&j.state!==filterState)return false;
      if(filterSector!=="all"&&j.sector!==filterSector)return false;
      if(filterRating>0&&j.rating<filterRating)return false;
      if(search&&!matchSearch(j,search))return false;
      return true;
    })
    .sort((a,b)=>{
      if(sortBy==="likes") return (b.likes||0)-(a.likes||0);
      if(sortBy==="rating") return b.rating-a.rating;
      return new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime();
    });

  const paginated=filtered.slice(0,page*PAGE_SIZE);
  const hasMore=paginated.length<filtered.length;
  const activeFilters=[filterVisa!=="all",filterState!=="all",filterSector!=="all",filterRating>0].filter(Boolean).length;

  useEffect(()=>setPage(1),[search,filterVisa,filterState,filterSector,filterRating,sortBy]);

  return (
    <div style={{paddingTop:8}}>
      {showAddJob&&userId&&<AddJobModal lang={lang} userId={userId} onClose={()=>setShowAddJob(false)} onSaved={j=>setMyJobs(p=>[j,...p])}/>}
      {showRecommend&&userId&&<RecommendModal lang={lang} userId={userId} onClose={()=>setShowRecommend(false)} onSaved={j=>setCommJobs(p=>[j,...p])}/>}
      {selectedJob&&<JobDetailModal job={selectedJob} lang={lang} userId={userId} onClose={()=>setSelectedJob(null)} onLiked={handleLiked}/>}

      <h2 style={{fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:14}}>{T.title}</h2>

      {/* Sub tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {([["myjobs",T.myJobs],["community",T.community]] as const).map(([id,label])=>(
          <button key={id} onClick={()=>{ setSubTab(id); if(id==="community")setCommView("home"); }}
            style={{flex:1,padding:"10px",borderRadius:12,background:subTab===id?"#e8b84b":"#141d2e",border:`1px solid ${subTab===id?"#e8b84b":"#1e2a3a"}`,color:subTab===id?"#000":"#aaa",fontSize:13,fontWeight:subTab===id?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ MES JOBS ══ */}
      {subTab==="myjobs"&&(<>
        <button onClick={()=>setShowAddJob(true)} style={{width:"100%",padding:"13px",background:"rgba(232,184,75,.1)",border:"1px dashed rgba(232,184,75,.4)",borderRadius:14,color:"#e8b84b",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:16}}>
          {T.addJob}
        </button>
        {loadingMy&&<div style={{textAlign:"center",padding:"24px",color:"#555"}}>...</div>}
        {!loadingMy&&myJobs.length===0&&(
          <div style={{textAlign:"center" as const,padding:"32px 20px"}}>
            <div style={{fontSize:40,marginBottom:12}}>💼</div>
            <div style={{fontSize:13,color:"#555"}}>{T.noMyJobs}</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
          {myJobs.map(job=>(
            <div key={job.id} style={{background:"#141d2e",border:`1px solid ${job.current?"rgba(34,197,94,.25)":"#1e2a3a"}`,borderRadius:14,padding:"14px"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#f4f1ec"}}>{job.company}</div>
                    {job.current&&<span style={{fontSize:9,color:"#22c55e",fontWeight:700,background:"rgba(34,197,94,.1)",padding:"2px 7px",borderRadius:8,border:"1px solid rgba(34,197,94,.25)"}}>{T.current}</span>}
                  </div>
                  <div style={{fontSize:12,color:"#2dd4bf",marginBottom:4}}>{job.position}</div>
                  <div style={{fontSize:11,color:"#555",display:"flex",gap:8,flexWrap:"wrap" as const}}>
                    {job.city&&<span>📍 {job.city}{job.state?`, ${job.state}`:""}</span>}
                    {job.visaType&&<span>🪪 {job.visaType}</span>}
                    {job.sector&&<span>{sectorLabel(job.sector)}</span>}
                  </div>
                  {job.startDate&&<div style={{fontSize:11,color:"#555",marginTop:4}}>{job.startDate}{!job.current&&job.endDate?` → ${job.endDate}`:job.current?" → "+(lang==="fr"?"présent":lang==="es"?"presente":"present"):""}</div>}
                </div>
                <button onClick={()=>handleDeleteJob(job.id)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"6px 10px",color:"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {/* ══ COMMUNAUTÉ — HOME ══ */}
      {subTab==="community"&&commView==="home"&&(<>

        {/* Bouton recommander — bien visible */}
        <div style={{background:"linear-gradient(135deg,rgba(34,197,94,.08),rgba(34,197,94,.04))",border:"1px solid rgba(34,197,94,.25)",borderRadius:16,padding:"16px",marginBottom:16}}>
          <button onClick={()=>setShowRecommend(true)} style={{width:"100%",padding:"13px",background:"#22c55e",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
            {T.recommend}
          </button>
          <div style={{fontSize:12,color:"#aaa",textAlign:"center" as const}}>{T.recommendSub}</div>
        </div>

        {/* Bouton recherche — style Indeed */}
        <button onClick={()=>setCommView("search")} style={{width:"100%",padding:"14px 16px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer",fontFamily:"inherit",marginBottom:20}}>
          <span style={{fontSize:20}}>🔍</span>
          <div style={{textAlign:"left" as const,flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:"#f4f1ec"}}>{T.searchTitle}</div>
            <div style={{fontSize:11,color:"#555"}}>{commJobs.length} {lang==="fr"?"employeurs disponibles":lang==="es"?"empleadores disponibles":"employers available"}</div>
          </div>
          <span style={{color:"#e8b84b",fontSize:16}}>›</span>
        </button>

        {/* Catégories rapides */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,color:"#555",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em",marginBottom:10}}>
            {lang==="fr"?"Parcourir par secteur":lang==="es"?"Explorar por sector":"Browse by sector"}
          </div>
          <div style={{display:"flex",flexWrap:"wrap" as const,gap:8}}>
            {T.categories.map((cat,i)=>{
              const sectorIds=["construction","food","transport","retail","health","tech"];
              return (
                <button key={i} onClick={()=>{ setFilterSector(sectorIds[i]); setCommView("search"); }}
                  style={{padding:"9px 14px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:24,color:"#f4f1ec",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top 5 */}
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"#f4f1ec"}}>{T.top5}</div>
            <button onClick={()=>setCommView("search")} style={{fontSize:12,color:"#e8b84b",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
              {T.seeAll}
            </button>
          </div>
          {loadingComm&&<div style={{textAlign:"center",padding:"24px",color:"#555"}}>...</div>}
          <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
            {top5.map((job,i)=>(
              <div key={job.id} style={{position:"relative"}}>
                {i===0&&<div style={{position:"absolute",top:-6,left:12,fontSize:10,color:"#e8b84b",fontWeight:700,background:"rgba(232,184,75,.1)",padding:"2px 8px",borderRadius:8,border:"1px solid rgba(232,184,75,.25)",zIndex:1}}>🏆 #1</div>}
                <JobCard job={job} lang={lang} onClick={()=>setSelectedJob(job)}/>
              </div>
            ))}
          </div>
          {top5.length===0&&!loadingComm&&(
            <div style={{textAlign:"center" as const,padding:"24px",color:"#555",fontSize:13}}>
              {lang==="fr"?"Sois le premier à recommander un employeur ! ⭐":lang==="es"?"¡Sé el primero en recomendar un empleador! ⭐":"Be the first to recommend an employer! ⭐"}
            </div>
          )}
        </div>
      </>)}

      {/* ══ COMMUNAUTÉ — SEARCH ══ */}
      {subTab==="community"&&commView==="search"&&(<>
        <button onClick={()=>{ setCommView("home"); setSearch(""); setFilterVisa("all"); setFilterState("all"); setFilterSector("all"); setFilterRating(0); }}
          style={{background:"none",border:"none",color:"#e8b84b",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:14,padding:0}}>
          {T.back}
        </button>

        {/* Barre recherche + filtres */}
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={T.searchPlh}
            style={{flex:1,padding:"12px 14px",background:"#141d2e",border:`1px solid ${search?"#e8b84b":"#1e2a3a"}`,borderRadius:12,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none"}}/>
          <button onClick={()=>setShowFilters(p=>!p)}
            style={{padding:"12px 14px",background:showFilters||activeFilters>0?"rgba(232,184,75,.15)":"#141d2e",border:`1px solid ${activeFilters>0?"#e8b84b":"#1e2a3a"}`,borderRadius:12,color:activeFilters>0?"#e8b84b":"#aaa",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            ⚙️{activeFilters>0?` (${activeFilters})`:""}
          </button>
        </div>

        {/* Panneau filtres */}
        {showFilters&&(
          <div style={{background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,padding:"14px",marginBottom:12,animation:"fadeIn .2s ease"}}>
            {/* Tri */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#555",marginBottom:7,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em"}}>Tri</div>
              <div style={{display:"flex",gap:6}}>
                {([["likes",T.sortLikes],["rating",T.sortRating],["recent",T.sortRecent]] as const).map(([id,label])=>(
                  <button key={id} onClick={()=>setSortBy(id)}
                    style={{padding:"6px 10px",borderRadius:20,background:sortBy===id?"rgba(232,184,75,.15)":"#0b0f1a",border:`1px solid ${sortBy===id?"#e8b84b":"#1e2a3a"}`,color:sortBy===id?"#e8b84b":"#aaa",fontSize:11,fontWeight:sortBy===id?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visa */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em"}}>Visa</div>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                {["all",...VISA_TYPES].map(v=>(
                  <button key={v} onClick={()=>setFilterVisa(v)}
                    style={{padding:"5px 11px",borderRadius:20,background:filterVisa===v?"rgba(232,184,75,.15)":"#0b0f1a",border:`1px solid ${filterVisa===v?"#e8b84b":"#1e2a3a"}`,color:filterVisa===v?"#e8b84b":"#aaa",fontSize:11,fontWeight:filterVisa===v?700:400,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap" as const}}>
                    {v==="all"?T.filterAll:v}
                  </button>
                ))}
              </div>
            </div>

            {/* État */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em"}}>État US</div>
              <select value={filterState} onChange={e=>setFilterState(e.target.value)}
                style={{width:"100%",padding:"9px 12px",background:"#0b0f1a",border:`1px solid ${filterState!=="all"?"#2dd4bf":"#1e2a3a"}`,borderRadius:10,color:filterState!=="all"?"#2dd4bf":"#aaa",fontSize:14,fontFamily:"inherit",outline:"none"}}>
                <option value="all">🗺️ {T.filterAll}</option>
                {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Secteur */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em"}}>Secteur</div>
              <select value={filterSector} onChange={e=>setFilterSector(e.target.value)}
                style={{width:"100%",padding:"9px 12px",background:"#0b0f1a",border:`1px solid ${filterSector!=="all"?"#a78bfa":"#1e2a3a"}`,borderRadius:10,color:filterSector!=="all"?"#a78bfa":"#aaa",fontSize:14,fontFamily:"inherit",outline:"none"}}>
                <option value="all">💼 {T.filterAll}</option>
                {SECTORS[lang].map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            {/* Note min */}
            <div>
              <div style={{fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em"}}>{T.minRating}</div>
              <div style={{display:"flex",gap:6}}>
                {[0,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setFilterRating(n)}
                    style={{padding:"5px 11px",borderRadius:20,background:filterRating===n?"rgba(232,184,75,.15)":"#0b0f1a",border:`1px solid ${filterRating===n?"#e8b84b":"#1e2a3a"}`,color:filterRating===n?"#e8b84b":"#aaa",fontSize:11,fontWeight:filterRating===n?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {n===0?T.filterAll:`${n}⭐+`}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters>0&&(
              <button onClick={()=>{setFilterVisa("all");setFilterState("all");setFilterSector("all");setFilterRating(0);setSortBy("likes");}}
                style={{marginTop:12,width:"100%",padding:"8px",background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#ef4444",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                {lang==="fr"?"🗑️ Réinitialiser les filtres":lang==="es"?"🗑️ Restablecer filtros":"🗑️ Reset filters"}
              </button>
            )}
          </div>
        )}

        {/* Compteur */}
        <div style={{fontSize:11,color:"#555",marginBottom:12}}>
          {filtered.length} {T.results}
          {search&&<span style={{color:"#e8b84b"}}> · "{search}"</span>}
        </div>

        {loadingComm&&<div style={{textAlign:"center",padding:"24px",color:"#555"}}>...</div>}
        {!loadingComm&&filtered.length===0&&(
          <div style={{textAlign:"center" as const,padding:"32px 20px"}}>
            <div style={{fontSize:40,marginBottom:12}}>🔍</div>
            <div style={{fontSize:13,color:"#555"}}>{lang==="fr"?"Aucun résultat":lang==="es"?"Sin resultados":"No results"}</div>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
          {paginated.map(job=><JobCard key={job.id} job={job} lang={lang} onClick={()=>setSelectedJob(job)}/>)}
        </div>

        {hasMore&&(
          <button onClick={()=>setPage(p=>p+1)}
            style={{width:"100%",padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,color:"#aaa",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:12}}>
            {T.loadMore} ({filtered.length-paginated.length} {lang==="fr"?"restants":lang==="es"?"restantes":"remaining"})
          </button>
        )}
      </>)}

      <style>{`
        @keyframes alertPop { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes likeFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(-120px) rotate(360deg);opacity:0} }
        @keyframes heartBeat{ 0%{transform:scale(1)} 30%{transform:scale(1.3)} 60%{transform:scale(.9)} 100%{transform:scale(1)} }
      `}</style>
    </div>
  );
}
