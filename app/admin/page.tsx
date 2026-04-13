"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, getDoc, setDoc,
} from "firebase/firestore";

const ADMIN_UID = "fptoylpRLza7V9m5nyNkouC3Qf32";
const CLOUD_NAME   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   || "dccg6dl6b";
const UPLOAD_PRESET= process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET|| "kuabo_admin";

const hashPassword = (pwd: string) =>
  btoa(pwd + "kuabo_salt_2026").split("").reverse().join("");

type AdminTab = "messages"|"pubs"|"events"|"stats";
type Lang     = "fr"|"en"|"es";

// ✅ Upload vers Cloudinary
async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", "kuabo");
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:"POST", body:fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload failed");
  return data.secure_url as string;
}

// ✅ Traduction via API Route Next.js (évite CORS)
async function translateContent(text: string, fromLang: Lang): Promise<{ fr: string; en: string; es: string }> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, fromLang }),
  });
  if (!res.ok) throw new Error("Traduction échouée");
  return await res.json();
}

// ✅ Traduction multiple (titre + desc + cta en 1 seul appel)
async function translateMultiple(
  fields: Record<string, string>,
  fromLang: Lang
): Promise<Record<string, { fr: string; en: string; es: string }>> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, fromLang }),
  });
  if (!res.ok) throw new Error("Traduction échouée");
  return await res.json();
}

// ✅ Bouton traduction
function TranslateButton({ sourceLang, sourceText, onTranslated, disabled }: {
  sourceLang: Lang;
  sourceText: string;
  onTranslated: () => Promise<void>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!sourceText.trim()) { alert("Écris d'abord le texte à traduire"); return; }
    setLoading(true);
    try { await onTranslated(); }
    catch { alert("Erreur traduction — réessaie"); }
    setLoading(false);
  };

  return (
    <button onClick={handle} disabled={disabled||loading||!sourceText.trim()}
      style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:loading?"#141d2e":"rgba(45,212,191,.1)",border:"1px solid rgba(45,212,191,.3)",borderRadius:10,color:loading?"#555":"#2dd4bf",fontSize:12,fontWeight:600,cursor:(disabled||loading||!sourceText.trim())?"default":"pointer",fontFamily:"inherit",marginBottom:12,transition:"all .2s" }}>
      <span style={{ fontSize:14 }}>{loading?"⏳":"🤖"}</span>
      {loading?"Traduction en cours...":"🌐 Traduire automatiquement (FR + EN + ES)"}
    </button>
  );
}
function ImageUpload({ value, onChange, accentColor = "#e8b84b" }: {
  value: string; onChange: (url: string) => void; accentColor?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch {
      alert("Erreur upload — réessaie");
    }
    setUploading(false);
    e.target.value = "";
  };

  if (value) return (
    <div style={{ position:"relative", marginBottom:8 }}>
      <img src={value} alt="preview" style={{ width:"100%", height:140, objectFit:"cover", borderRadius:10 }}/>
      <button onClick={()=>onChange("")}
        style={{ position:"absolute", top:6, right:6, width:28, height:28, borderRadius:"50%", background:"rgba(239,68,68,.9)", border:"none", color:"#fff", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>
        ✕
      </button>
      <div style={{ position:"absolute", bottom:6, left:8, fontSize:10, color:"#fff", background:"rgba(0,0,0,.5)", padding:"2px 8px", borderRadius:6 }}>
        ✅ Image uploadée
      </div>
    </div>
  );

  return (
    <label style={{ display:"flex", alignItems:"center", gap:12, padding:"14px", background:"#0f1521", border:`1.5px dashed ${accentColor}40`, borderRadius:10, cursor: uploading?"default":"pointer", marginBottom:8 }}>
      <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile} disabled={uploading}/>
      <span style={{ fontSize:24 }}>🖼️</span>
      <div>
        <div style={{ fontSize:13, color: uploading?accentColor:"#aaa", fontWeight: uploading?600:400 }}>
          {uploading ? "⏳ Upload en cours..." : "📁 Choisir une image (ordi ou téléphone)"}
        </div>
        <div style={{ fontSize:11, color:"#555", marginTop:2 }}>
          JPG, PNG, WEBP — max 10MB
        </div>
      </div>
    </label>
  );
}

// ══════════════════════════════════════════════
// ÉCRAN DE CONNEXION ADMIN
// ══════════════════════════════════════════════
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [step,       setStep]       = useState<"password"|"setup"|"verify">("password");
  const [pwd,        setPwd]        = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [q1,         setQ1]         = useState("");
  const [q2,         setQ2]         = useState("");
  const [a1,         setA1]         = useState("");
  const [a2,         setA2]         = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [attempts,   setAttempts]   = useState(0);
  const [blocked,    setBlocked]    = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotA1,   setForgotA1]   = useState("");
  const [forgotA2,   setForgotA2]   = useState("");
  const [forgotPwd,  setForgotPwd]  = useState("");
  const [verifyA1,   setVerifyA1]   = useState(""); // ✅ NOUVEAU
  const [verifyA2,   setVerifyA2]   = useState(""); // ✅ NOUVEAU
  const [hasConfig,  setHasConfig]  = useState<boolean|null>(null);
  const [configData, setConfigData] = useState<any>(null);

  useEffect(() => {
    const blockedUntil = localStorage.getItem("admin_blocked_until");
    if (blockedUntil && Date.now() < parseInt(blockedUntil)) {
      setBlocked(true);
      setTimeout(() => setBlocked(false), parseInt(blockedUntil) - Date.now());
    }
    const check = async () => {
      try {
        const snap = await getDoc(doc(db, "admin_config", ADMIN_UID));
        if (snap.exists()) { setHasConfig(true); setConfigData(snap.data()); }
        else { setHasConfig(false); setStep("setup"); }
      } catch { setHasConfig(false); setStep("setup"); }
    };
    check();
  }, []);

  const handleLogin = async () => {
    if (blocked || !pwd) { if (!pwd) setError("Entre ton mot de passe"); return; }
    setLoading(true);
    try {
      if (configData?.passwordHash === hashPassword(pwd)) {
        // ✅ Mot de passe OK → étape questions de sécurité
        setError("");
        setStep("verify");
      } else {
        const na = attempts + 1; setAttempts(na);
        if (na >= 3) {
          localStorage.setItem("admin_blocked_until", String(Date.now() + 60*60*1000));
          setBlocked(true); setError("❌ 3 tentatives — bloqué 1 heure");
        } else { setError(`❌ Mot de passe incorrect (${3-na} restantes)`); }
      }
    } catch { setError("Erreur — réessaie"); }
    setLoading(false);
  };

  // ✅ NOUVEAU — vérification questions de sécurité
  const handleVerify = async () => {
    if (!verifyA1 || !verifyA2) { setError("Réponds aux 2 questions"); return; }
    setLoading(true);
    try {
      if (
        hashPassword(verifyA1.toLowerCase().trim()) === configData?.a1Hash &&
        hashPassword(verifyA2.toLowerCase().trim()) === configData?.a2Hash
      ) {
        localStorage.setItem("admin_session", "valid");
        localStorage.setItem("admin_session_expiry", String(Date.now() + 24*60*60*1000));
        onSuccess();
      } else {
        setError("❌ Réponses incorrectes — réessaie");
      }
    } catch { setError("Erreur — réessaie"); }
    setLoading(false);
  };

  const handleSetup = async () => {
    if (newPwd.length < 8) { setError("Minimum 8 caractères"); return; }
    if (newPwd !== confirmPwd) { setError("Mots de passe différents"); return; }
    if (!q1||!a1||!q2||!a2) { setError("Remplis toutes les questions"); return; }
    setLoading(true);
    try {
      await setDoc(doc(db,"admin_config",ADMIN_UID), {
        passwordHash: hashPassword(newPwd),
        q1, a1Hash: hashPassword(a1.toLowerCase().trim()),
        q2, a2Hash: hashPassword(a2.toLowerCase().trim()),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("admin_session","valid");
      localStorage.setItem("admin_session_expiry", String(Date.now()+24*60*60*1000));
      onSuccess();
    } catch { setError("Erreur — réessaie"); }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!forgotA1||!forgotA2) { setError("Réponds aux 2 questions"); return; }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db,"admin_config",ADMIN_UID));
      if (!snap.exists()) { setError("Config introuvable"); setLoading(false); return; }
      const d = snap.data();
      if (hashPassword(forgotA1.toLowerCase().trim())!==d.a1Hash || hashPassword(forgotA2.toLowerCase().trim())!==d.a2Hash) {
        setError("❌ Réponses incorrectes"); setLoading(false); return;
      }
      if (forgotPwd.length < 8) { setError("Min 8 caractères"); setLoading(false); return; }
      await updateDoc(doc(db,"admin_config",ADMIN_UID),{ passwordHash:hashPassword(forgotPwd) });
      localStorage.setItem("admin_session","valid");
      localStorage.setItem("admin_session_expiry",String(Date.now()+24*60*60*1000));
      onSuccess();
    } catch { setError("Erreur — réessaie"); }
    setLoading(false);
  };

  const inp = { width:"100%",padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:11,color:"#f4f1ec",fontSize:16 as const,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const,marginBottom:10 };

  if (hasConfig===null) return (
    <div style={{ minHeight:"100dvh",background:"#0b0f1a",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ color:"#555",fontSize:13 }}>Chargement...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh",background:"#0b0f1a",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 20px" }}>
      <div style={{ width:"100%",maxWidth:400 }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ fontSize:30,fontWeight:900 }}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span></div>
          <div style={{ fontSize:12,color:"#555",marginTop:4 }}>🔐 Administration</div>
        </div>
        <div style={{ background:"#0f1521",border:"1px solid #1e2a3a",borderRadius:20,padding:"28px 22px" }}>

          {/* SETUP */}
          {step==="setup"&&(<>
            <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:4 }}>🛡️ Configuration initiale</div>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:20,lineHeight:1.6 }}>Première connexion — crée ton accès admin.</div>
            <div style={{ fontSize:11,color:"#555",marginBottom:6 }}>MOT DE PASSE (min 8 car.)</div>
            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="••••••••" style={inp}/>
            <input type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder="Confirmer ••••••••" style={inp}/>
            <div style={{ fontSize:11,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,marginTop:4 }}>Questions de sécurité</div>
            <input value={q1} onChange={e=>setQ1(e.target.value)} placeholder="Question 1 (ex: Nom de ton premier ami ?)" style={{ ...inp,fontSize:14 as const }}/>
            <input value={a1} onChange={e=>setA1(e.target.value)} placeholder="Réponse 1" style={{ ...inp,fontSize:14 as const,borderColor:"rgba(232,184,75,.3)" }}/>
            <input value={q2} onChange={e=>setQ2(e.target.value)} placeholder="Question 2 (ex: Ville où tu es né ?)" style={{ ...inp,fontSize:14 as const }}/>
            <input value={a2} onChange={e=>setA2(e.target.value)} placeholder="Réponse 2" style={{ ...inp,fontSize:14 as const,borderColor:"rgba(232,184,75,.3)" }}/>
            {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10,textAlign:"center" as const }}>{error}</div>}
            <button onClick={handleSetup} disabled={loading} style={{ width:"100%",padding:"14px",background:"#e8b84b",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:loading?.7:1 }}>
              {loading?"⏳...":"🔐 Créer mon accès"}
            </button>
          </>)}

          {/* LOGIN */}
          {step==="password"&&!showForgot&&(<>
            <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:16 }}>🔐 Connexion Admin</div>
            {blocked?(
              <div style={{ background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",borderRadius:12,padding:"16px",textAlign:"center" as const }}>
                <div style={{ fontSize:13,color:"#ef4444" }}>❌ Trop de tentatives.<br/>Bloqué 1 heure.</div>
              </div>
            ):(<>
              <input type="password" value={pwd} onChange={e=>{ setPwd(e.target.value); setError(""); }} placeholder="Mot de passe admin" onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus style={inp}/>
              {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10,textAlign:"center" as const }}>{error}</div>}
              <button onClick={handleLogin} disabled={loading} style={{ width:"100%",padding:"14px",background:"#e8b84b",border:"none",borderRadius:12,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:10,opacity:loading?.7:1 }}>
                {loading?"⏳...":"Continuer →"}
              </button>
              <button onClick={()=>{ setShowForgot(true); setError(""); }} style={{ width:"100%",padding:"10px",background:"transparent",border:"none",color:"#555",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>
                Mot de passe oublié ?
              </button>
            </>)}
          </>)}

          {/* ✅ VERIFY — Questions de sécurité */}
          {step==="verify"&&configData&&(<>
            <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:4 }}>🛡️ Vérification</div>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:20,lineHeight:1.6 }}>
              Réponds à tes questions de sécurité pour confirmer ton identité.
            </div>
            <div style={{ background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:"10px 12px",marginBottom:16 }}>
              <div style={{ fontSize:11,color:"#22c55e",marginBottom:2 }}>✅ Mot de passe correct</div>
              <div style={{ fontSize:11,color:"#555" }}>Plus qu'une étape...</div>
            </div>
            <div style={{ fontSize:12,color:"#e8b84b",fontWeight:600,marginBottom:6 }}>{configData.q1}</div>
            <input value={verifyA1} onChange={e=>{ setVerifyA1(e.target.value); setError(""); }} placeholder="Ta réponse" onKeyDown={e=>e.key==="Enter"&&handleVerify()} style={{ ...inp,fontSize:14 as const }}/>
            <div style={{ fontSize:12,color:"#e8b84b",fontWeight:600,marginBottom:6,marginTop:4 }}>{configData.q2}</div>
            <input value={verifyA2} onChange={e=>{ setVerifyA2(e.target.value); setError(""); }} placeholder="Ta réponse" onKeyDown={e=>e.key==="Enter"&&handleVerify()} style={{ ...inp,fontSize:14 as const }}/>
            {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10,textAlign:"center" as const }}>{error}</div>}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>{ setStep("password"); setVerifyA1(""); setVerifyA2(""); setError(""); }}
                style={{ flex:1,padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:11,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
                ← Retour
              </button>
              <button onClick={handleVerify} disabled={loading}
                style={{ flex:2,padding:"12px",background:"#e8b84b",border:"none",borderRadius:11,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:loading?.7:1 }}>
                {loading?"⏳...":"🔓 Accéder →"}
              </button>
            </div>
          </>)}

          {/* FORGOT */}
          {step==="password"&&showForgot&&configData&&(<>
            <div style={{ fontSize:16,fontWeight:800,color:"#f4f1ec",marginBottom:6 }}>🔑 Récupération</div>
            <div style={{ fontSize:12,color:"#aaa",marginBottom:16 }}>Réponds à tes questions de sécurité</div>
            <div style={{ fontSize:12,color:"#e8b84b",marginBottom:6 }}>{configData.q1}</div>
            <input value={forgotA1} onChange={e=>setForgotA1(e.target.value)} placeholder="Ta réponse" style={{ ...inp,fontSize:14 as const }}/>
            <div style={{ fontSize:12,color:"#e8b84b",marginBottom:6 }}>{configData.q2}</div>
            <input value={forgotA2} onChange={e=>setForgotA2(e.target.value)} placeholder="Ta réponse" style={{ ...inp,fontSize:14 as const }}/>
            <div style={{ fontSize:11,color:"#555",marginBottom:6 }}>NOUVEAU MOT DE PASSE</div>
            <input type="password" value={forgotPwd} onChange={e=>setForgotPwd(e.target.value)} placeholder="••••••••" style={inp}/>
            {error&&<div style={{ fontSize:12,color:"#ef4444",marginBottom:10,textAlign:"center" as const }}>{error}</div>}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>{ setShowForgot(false); setError(""); }} style={{ flex:1,padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:11,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>← Retour</button>
              <button onClick={handleForgot} disabled={loading} style={{ flex:2,padding:"12px",background:"#e8b84b",border:"none",borderRadius:11,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{loading?"⏳...":"Réinitialiser →"}</button>
            </div>
          </>)}
        </div>
        <div style={{ textAlign:"center" as const,fontSize:11,color:"#333",marginTop:14 }}>Kuabo Admin · Accès restreint</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD ADMIN
// ══════════════════════════════════════════════
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("messages");
  const [stats,     setStats]     = useState({ users:0, newThisWeek:0, topState:"", confirmed:0 });

  // Messages
  const [messages,   setMessages]   = useState<any[]>([]);
  const [msgTitle,   setMsgTitle]   = useState({ fr:"",en:"",es:"" });
  const [msgContent, setMsgContent] = useState({ fr:"",en:"",es:"" });
  const [msgType,    setMsgType]    = useState<"info"|"urgent">("info");
  const [msgTarget,  setMsgTarget]  = useState("all");
  const [msgLang,    setMsgLang]    = useState<Lang>("fr");
  const [savingMsg,  setSavingMsg]  = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);

  // Pubs
  const [pubs,       setPubs]       = useState<any[]>([]);
  const [pubTitle,   setPubTitle]   = useState({ fr:"",en:"",es:"" });
  const [pubDesc,    setPubDesc]    = useState({ fr:"",en:"",es:"" });
  const [pubCta,     setPubCta]     = useState({ fr:"",en:"",es:"" });
  const [pubUrl,     setPubUrl]     = useState("");
  const [pubImg,     setPubImg]     = useState("");
  const [pubImgUp,   setPubImgUp]   = useState(false);
  const [pubTarget,  setPubTarget]  = useState("all");
  const [pubLang,    setPubLang]    = useState<Lang>("fr");
  const [savingPub,  setSavingPub]  = useState(false);
  const [pubSuccess, setPubSuccess] = useState(false);

  // Events
  const [events,     setEvents]     = useState<any[]>([]);
  const [evtTitle,   setEvtTitle]   = useState({ fr:"",en:"",es:"" });
  const [evtDesc,    setEvtDesc]    = useState({ fr:"",en:"",es:"" });
  const [evtDate,    setEvtDate]    = useState("");
  const [evtTime,    setEvtTime]    = useState("");
  const [evtLoc,     setEvtLoc]     = useState("");
  const [evtImg,     setEvtImg]     = useState("");
  const [evtImgUp,   setEvtImgUp]   = useState(false);
  const [evtTarget,  setEvtTarget]  = useState("all");
  const [evtLang,    setEvtLang]    = useState<Lang>("fr");
  const [savingEvt,  setSavingEvt]  = useState(false);
  const [evtSuccess, setEvtSuccess] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      // Stats
      const usersSnap = await getDocs(collection(db,"users"));
      let confirmed=0, newCount=0;
      const stateCounts: Record<string,number> = {};
      const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate()-7);
      usersSnap.forEach(d=>{
        const data=d.data() as any;
        if(data.deleted) return;
        if(data.arrivalConfirmed) confirmed++;
        if(data.createdAt&&new Date(data.createdAt)>oneWeekAgo) newCount++;
        if(data.state) stateCounts[data.state]=(stateCounts[data.state]||0)+1;
      });
      setStats({ users:usersSnap.size, newThisWeek:newCount, topState:Object.entries(stateCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"", confirmed });

      // Admin messages
      const snap = await getDocs(collection(db,"admin_messages"));
      const msgs:any[]=[],pubs:any[]=[],evts:any[]=[];
      snap.forEach(d=>{
        const data=d.data() as any;
        const item={ id:d.id,...data };
        if(data.type==="pub") pubs.push(item);
        else if(data.type==="event") evts.push(item);
        else msgs.push(item);
      });
      msgs.sort((a,b)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime());
      evts.sort((a,b)=>new Date(a.eventDate||0).getTime()-new Date(b.eventDate||0).getTime());
      setMessages(msgs); setPubs(pubs); setEvents(evts);
    } catch {}
  };

  const publishMessage = async () => {
    if (!msgTitle.fr) return;
    setSavingMsg(true);
    try {
      await addDoc(collection(db,"admin_messages"),{
        type:msgType, target:msgTarget, active:true,
        title_fr:msgTitle.fr, title_en:msgTitle.en, title_es:msgTitle.es,
        content_fr:msgContent.fr, content_en:msgContent.en, content_es:msgContent.es,
        publishedAt:new Date().toISOString(),
      });
      setMsgTitle({fr:"",en:"",es:""}); setMsgContent({fr:"",en:"",es:""});
      setMsgSuccess(true); setTimeout(()=>setMsgSuccess(false),3000); loadAll();
    } catch {} setSavingMsg(false);
  };

  const publishPub = async () => {
    if (!pubTitle.fr) return;
    setSavingPub(true);
    try {
      await addDoc(collection(db,"admin_messages"),{
        type:"pub", target:pubTarget, active:true, isAd:true,
        title_fr:pubTitle.fr, title_en:pubTitle.en, title_es:pubTitle.es,
        desc_fr:pubDesc.fr, desc_en:pubDesc.en, desc_es:pubDesc.es,
        cta_fr:pubCta.fr, cta_en:pubCta.en, cta_es:pubCta.es,
        linkUrl:pubUrl, imageUrl:pubImg||null,
        publishedAt:new Date().toISOString(),
      });
      setPubTitle({fr:"",en:"",es:""}); setPubDesc({fr:"",en:"",es:""}); setPubCta({fr:"",en:"",es:""});
      setPubUrl(""); setPubImg("");
      setPubSuccess(true); setTimeout(()=>setPubSuccess(false),3000); loadAll();
    } catch {} setSavingPub(false);
  };

  const publishEvent = async () => {
    if (!evtTitle.fr||!evtDate) return;
    setSavingEvt(true);
    try {
      await addDoc(collection(db,"admin_messages"),{
        type:"event", target:evtTarget, active:true,
        title_fr:evtTitle.fr, title_en:evtTitle.en, title_es:evtTitle.es,
        desc_fr:evtDesc.fr, desc_en:evtDesc.en, desc_es:evtDesc.es,
        eventDate:evtDate, eventTime:evtTime, eventLocation:evtLoc,
        imageUrl:evtImg||null, participants:[],
        publishedAt:new Date().toISOString(),
      });
      setEvtTitle({fr:"",en:"",es:""}); setEvtDesc({fr:"",en:"",es:""});
      setEvtDate(""); setEvtTime(""); setEvtLoc(""); setEvtImg("");
      setEvtSuccess(true); setTimeout(()=>setEvtSuccess(false),3000); loadAll();
    } catch {} setSavingEvt(false);
  };

  const toggleActive = async (id:string, current:boolean) => {
    try { await updateDoc(doc(db,"admin_messages",id),{ active:!current }); loadAll(); } catch {}
  };

  const deleteItem = async (id:string) => {
    if (!confirm("Supprimer définitivement ?")) return;
    try { await deleteDoc(doc(db,"admin_messages",id)); loadAll(); } catch {}
  };

  const TARGET_OPTS = [
    { value:"all",      label:"🌍 Tout le monde" },
    { value:"dv",       label:"🎰 DV Lottery"    },
    { value:"army",     label:"🎖️ Army"          },
    { value:"state:MD", label:"📍 Maryland"       },
    { value:"state:TX", label:"📍 Texas"          },
    { value:"state:NY", label:"📍 New York"       },
    { value:"state:CA", label:"📍 California"     },
    { value:"state:FL", label:"📍 Florida"        },
    { value:"state:VA", label:"📍 Virginia"       },
    { value:"state:GA", label:"📍 Georgia"        },
  ];

  const inp: React.CSSProperties = {
    width:"100%", padding:"11px 12px", background:"#141d2e",
    border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec",
    fontSize:14, fontFamily:"inherit", outline:"none",
    boxSizing:"border-box", marginBottom:8,
  };
  const ta: React.CSSProperties = { ...inp, minHeight:80, resize:"vertical" };
  const Sec = ({ t }:{t:string}) => <div style={{ fontSize:10,color:"#555",letterSpacing:".12em",textTransform:"uppercase",marginBottom:8,marginTop:16,fontWeight:600 }}>{t}</div>;
  const LangTabs = ({ lang, setLang }:{ lang:Lang; setLang:(l:Lang)=>void }) => (
    <div style={{ display:"flex",gap:6,marginBottom:12 }}>
      {(["fr","en","es"] as Lang[]).map(l=>(
        <button key={l} onClick={()=>setLang(l)} style={{ padding:"5px 12px",borderRadius:8,background:lang===l?"#e8b84b":"#141d2e",border:"1px solid "+(lang===l?"#e8b84b":"#1e2a3a"),color:lang===l?"#000":"#aaa",fontSize:11,fontWeight:lang===l?700:400,cursor:"pointer",fontFamily:"inherit" }}>
          {l==="fr"?"🇫🇷 FR":l==="en"?"🇺🇸 EN":"🇪🇸 ES"}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ background:"#0b0f1a",minHeight:"100dvh",color:"#f4f1ec",fontFamily:"system-ui,-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ background:"#0f1521",borderBottom:"1px solid #1e2a3a",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ fontWeight:900,fontSize:18 }}>
          <span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span>
          <span style={{ fontSize:11,color:"#555",marginLeft:8 }}>Admin</span>
        </div>
        <button onClick={onLogout} style={{ padding:"6px 12px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:8,color:"#ef4444",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>
          Déconnexion
        </button>
      </div>

      <div style={{ maxWidth:680,margin:"0 auto",padding:"20px 16px" }}>

        {/* ── STATS ── */}
        {activeTab==="stats"&&(<>
          <div style={{ fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:16 }}>📊 Statistiques</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
            {[
              { label:"Total users",        value:stats.users,          color:"#e8b84b",icon:"👥" },
              { label:"Arrivés confirmés",  value:stats.confirmed,      color:"#22c55e",icon:"✈️" },
              { label:"Nouveaux ce semaine",value:stats.newThisWeek,    color:"#2dd4bf",icon:"🆕" },
              { label:"État le + actif",    value:stats.topState||"—",  color:"#a78bfa",icon:"📍" },
            ].map((s,i)=>(
              <div key={i} style={{ background:"#141d2e",border:`1px solid ${s.color}25`,borderRadius:14,padding:"16px" }}>
                <div style={{ fontSize:24,marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:26,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:11,color:"#555",marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={loadAll} style={{ width:"100%",padding:"12px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
            🔄 Actualiser
          </button>
        </>)}

        {/* ── MESSAGES ── */}
        {activeTab==="messages"&&(<>
          <div style={{ fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:4 }}>📢 Messages</div>
          <div style={{ fontSize:12,color:"#aaa",marginBottom:16 }}>Info ou urgent — envoyés aux users</div>

          <div style={{ background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,padding:"18px",marginBottom:20 }}>
            <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec",marginBottom:14 }}>✏️ Nouveau message</div>
            <LangTabs lang={msgLang} setLang={setMsgLang}/>
            <input value={msgTitle[msgLang]} onChange={e=>setMsgTitle(p=>({...p,[msgLang]:e.target.value}))} placeholder={`Titre (${msgLang})`} style={inp}/>
            <textarea value={msgContent[msgLang]} onChange={e=>setMsgContent(p=>({...p,[msgLang]:e.target.value}))} placeholder={`Contenu (${msgLang})`} style={ta}/>

            {/* ✅ Bouton traduction message */}
            <TranslateButton
              sourceLang={msgLang}
              sourceText={msgTitle[msgLang]}
              onTranslated={async ()=>{
                const fields: Record<string,string> = {};
                if(msgTitle[msgLang].trim())   fields.title   = msgTitle[msgLang];
                if(msgContent[msgLang].trim())  fields.content = msgContent[msgLang];
                if(!Object.keys(fields).length){ alert("Écris d'abord le texte à traduire"); return; }
                try {
                  const result = await translateMultiple(fields, msgLang);
                  if(result.title)   setMsgTitle(result.title);
                  if(result.content) setMsgContent(result.content);
                } catch { alert("Erreur traduction — réessaie"); }
              }}
            />
            <Sec t="Type"/>
            <div style={{ display:"flex",gap:8,marginBottom:12 }}>
              {([["info","💡 Info","#e8b84b"],["urgent","⚠️ Urgent","#ef4444"]] as const).map(([val,lbl,color])=>(
                <button key={val} onClick={()=>setMsgType(val)} style={{ flex:1,padding:"10px",background:msgType===val?`${color}15`:"#0f1521",border:`1.5px solid ${msgType===val?color:"#1e2a3a"}`,borderRadius:10,color:msgType===val?color:"#555",fontSize:13,fontWeight:msgType===val?700:400,cursor:"pointer",fontFamily:"inherit" }}>
                  {lbl}
                </button>
              ))}
            </div>
            <Sec t="Cibler"/>
            <select value={msgTarget} onChange={e=>setMsgTarget(e.target.value)} style={{ ...inp,color:"#f4f1ec" }}>
              {TARGET_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {msgSuccess&&<div style={{ fontSize:13,color:"#22c55e",textAlign:"center" as const,marginBottom:8 }}>✅ Publié !</div>}
            <button onClick={publishMessage} disabled={savingMsg||!msgTitle.fr} style={{ width:"100%",padding:"13px",background:msgTitle.fr?"#e8b84b":"#1e2a3a",border:"none",borderRadius:11,color:msgTitle.fr?"#000":"#555",fontSize:14,fontWeight:700,cursor:msgTitle.fr?"pointer":"default",fontFamily:"inherit",opacity:savingMsg?.7:1 }}>
              {savingMsg?"⏳...":"📢 Publier"}
            </button>
          </div>

          <div style={{ fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,fontWeight:600 }}>Publiés ({messages.length})</div>
          <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
            {messages.map(msg=>(
              <div key={msg.id} style={{ background:"#141d2e",border:`1px solid ${msg.type==="urgent"?"rgba(239,68,68,.25)":"rgba(232,184,75,.2)"}`,borderRadius:12,padding:"14px" }}>
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:10,color:msg.type==="urgent"?"#ef4444":"#e8b84b",fontWeight:700,marginBottom:4 }}>{msg.type==="urgent"?"⚠️ URGENT":"💡 INFO"} · {msg.target}</div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec" }}>{msg.title_fr}</div>
                    {msg.content_fr&&<div style={{ fontSize:11,color:"#555",marginTop:4,lineHeight:1.5 }}>{msg.content_fr.slice(0,80)}...</div>}
                  </div>
                  <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                    <button onClick={()=>toggleActive(msg.id,msg.active)} style={{ padding:"6px 10px",background:msg.active?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",border:`1px solid ${msg.active?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`,borderRadius:8,color:msg.active?"#22c55e":"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>
                      {msg.active?"ON":"OFF"}
                    </button>
                    <button onClick={()=>deleteItem(msg.id)} style={{ padding:"6px 10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,color:"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            {messages.length===0&&<div style={{ textAlign:"center" as const,padding:"24px",color:"#555",fontSize:13 }}>Aucun message</div>}
          </div>
        </>)}

        {/* ── PUBS ── */}
        {activeTab==="pubs"&&(<>
          <div style={{ fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:4 }}>📣 Pubs Partenaires</div>
          <div style={{ fontSize:12,color:"#aaa",marginBottom:16 }}>Badge "Partenaire Kuabo" auto (FTC)</div>

          <div style={{ background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,padding:"18px",marginBottom:20 }}>
            <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec",marginBottom:14 }}>✏️ Nouvelle pub</div>
            <LangTabs lang={pubLang} setLang={setPubLang}/>
            <input value={pubTitle[pubLang]} onChange={e=>setPubTitle(p=>({...p,[pubLang]:e.target.value}))} placeholder={`Titre partenaire (${pubLang})`} style={inp}/>
            <input value={pubDesc[pubLang]} onChange={e=>setPubDesc(p=>({...p,[pubLang]:e.target.value}))} placeholder={`Description (${pubLang})`} style={inp}/>
            <input value={pubCta[pubLang]} onChange={e=>setPubCta(p=>({...p,[pubLang]:e.target.value}))} placeholder={`CTA ex: "Ouvrir un compte" (${pubLang})`} style={inp}/>

            {/* ✅ Bouton traduction pub */}
            <TranslateButton
              sourceLang={pubLang}
              sourceText={pubTitle[pubLang]}
              onTranslated={async ()=>{
                const fields: Record<string,string> = {};
                if(pubTitle[pubLang].trim()) fields.title = pubTitle[pubLang];
                if(pubDesc[pubLang].trim())  fields.desc  = pubDesc[pubLang];
                if(pubCta[pubLang].trim())   fields.cta   = pubCta[pubLang];
                if(!Object.keys(fields).length){ alert("Écris d'abord le texte à traduire"); return; }
                try {
                  const result = await translateMultiple(fields, pubLang);
                  if(result.title) setPubTitle(result.title);
                  if(result.desc)  setPubDesc(result.desc);
                  if(result.cta)   setPubCta(result.cta);
                } catch { alert("Erreur traduction — réessaie"); }
              }}
            />
            <input value={pubUrl} onChange={e=>setPubUrl(e.target.value)} placeholder="URL de redirection (https://...)" style={inp}/>

            {/* ✅ UPLOAD IMAGE PUB */}
            <Sec t="Image (optionnel)"/>
            {pubImg ? (
              <div style={{ position:"relative",marginBottom:8 }}>
                <img src={pubImg} alt="pub" style={{ width:"100%",height:140,objectFit:"cover",borderRadius:10 }}/>
                <button onClick={()=>setPubImg("")} style={{ position:"absolute",top:6,right:6,width:28,height:28,borderRadius:"50%",background:"rgba(239,68,68,.9)",border:"none",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                <div style={{ position:"absolute",bottom:6,left:8,fontSize:10,color:"#fff",background:"rgba(0,0,0,.5)",padding:"2px 8px",borderRadius:6 }}>✅ Image uploadée</div>
              </div>
            ):(
              <label style={{ display:"flex",alignItems:"center",gap:12,padding:"14px",background:"#0f1521",border:"1.5px dashed rgba(232,184,75,.4)",borderRadius:10,cursor:pubImgUp?"default":"pointer",marginBottom:8 }}>
                <input type="file" accept="image/*" style={{ display:"none" }} disabled={pubImgUp} onChange={async e=>{
                  const file=e.target.files?.[0]; if(!file) return;
                  setPubImgUp(true);
                  try{ const url=await uploadToCloudinary(file); setPubImg(url); }
                  catch{ alert("Erreur upload — réessaie"); }
                  setPubImgUp(false); e.target.value="";
                }}/>
                <span style={{ fontSize:24 }}>🖼️</span>
                <div>
                  <div style={{ fontSize:13,color:pubImgUp?"#e8b84b":"#aaa",fontWeight:pubImgUp?600:400 }}>{pubImgUp?"⏳ Upload en cours...":"📁 Choisir une image (ordi ou téléphone)"}</div>
                  <div style={{ fontSize:11,color:"#555",marginTop:2 }}>JPG, PNG, WEBP — max 10MB</div>
                </div>
              </label>
            )}

            <Sec t="Cibler"/>
            <select value={pubTarget} onChange={e=>setPubTarget(e.target.value)} style={{ ...inp,color:"#f4f1ec" }}>
              {TARGET_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 12px",marginBottom:12 }}>
              <div style={{ fontSize:11,color:"#ef4444" }}>⚠️ FTC : Badge "Partenaire Kuabo" ajouté automatiquement</div>
            </div>
            {pubSuccess&&<div style={{ fontSize:13,color:"#22c55e",textAlign:"center" as const,marginBottom:8 }}>✅ Pub publiée !</div>}
            <button onClick={publishPub} disabled={savingPub||!pubTitle.fr} style={{ width:"100%",padding:"13px",background:pubTitle.fr?"#e8b84b":"#1e2a3a",border:"none",borderRadius:11,color:pubTitle.fr?"#000":"#555",fontSize:14,fontWeight:700,cursor:pubTitle.fr?"pointer":"default",fontFamily:"inherit",opacity:savingPub?.7:1 }}>
              {savingPub?"⏳...":"📣 Publier la pub"}
            </button>
          </div>

          <div style={{ fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,fontWeight:600 }}>Pubs ({pubs.length})</div>
          <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
            {pubs.map(pub=>(
              <div key={pub.id} style={{ background:"#141d2e",border:"1px solid rgba(232,184,75,.2)",borderRadius:12,overflow:"hidden" }}>
                {pub.imageUrl&&<img src={pub.imageUrl} alt="" style={{ width:"100%",height:80,objectFit:"cover" }}/>}
                <div style={{ padding:"12px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10,color:"#e8b84b",fontWeight:700,marginBottom:4 }}>📣 PUB · {pub.target}</div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec" }}>{pub.title_fr}</div>
                    {pub.desc_fr&&<div style={{ fontSize:11,color:"#555",marginTop:2 }}>{pub.desc_fr}</div>}
                  </div>
                  <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                    <button onClick={()=>toggleActive(pub.id,pub.active)} style={{ padding:"6px 10px",background:pub.active?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",border:`1px solid ${pub.active?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`,borderRadius:8,color:pub.active?"#22c55e":"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>
                      {pub.active?"ON":"OFF"}
                    </button>
                    <button onClick={()=>deleteItem(pub.id)} style={{ padding:"6px 10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,color:"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            {pubs.length===0&&<div style={{ textAlign:"center" as const,padding:"24px",color:"#555",fontSize:13 }}>Aucune pub</div>}
          </div>
        </>)}

        {/* ── EVENTS ── */}
        {activeTab==="events"&&(<>
          <div style={{ fontSize:20,fontWeight:800,color:"#f4f1ec",marginBottom:4 }}>📅 Événements</div>
          <div style={{ fontSize:12,color:"#aaa",marginBottom:16 }}>Avec bouton "Participer"</div>

          <div style={{ background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,padding:"18px",marginBottom:20 }}>
            <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec",marginBottom:14 }}>✏️ Nouvel événement</div>
            <LangTabs lang={evtLang} setLang={setEvtLang}/>
            <input value={evtTitle[evtLang]} onChange={e=>setEvtTitle(p=>({...p,[evtLang]:e.target.value}))} placeholder={`Titre (${evtLang})`} style={inp}/>
            <textarea value={evtDesc[evtLang]} onChange={e=>setEvtDesc(p=>({...p,[evtLang]:e.target.value}))} placeholder={`Description (${evtLang})`} style={ta}/>

            {/* ✅ Bouton traduction event */}
            <TranslateButton
              sourceLang={evtLang}
              sourceText={evtTitle[evtLang]}
              onTranslated={async ()=>{
                const fields: Record<string,string> = {};
                if(evtTitle[evtLang].trim()) fields.title = evtTitle[evtLang];
                if(evtDesc[evtLang].trim())  fields.desc  = evtDesc[evtLang];
                if(!Object.keys(fields).length){ alert("Écris d'abord le texte à traduire"); return; }
                try {
                  const result = await translateMultiple(fields, evtLang);
                  if(result.title) setEvtTitle(result.title);
                  if(result.desc)  setEvtDesc(result.desc);
                } catch { alert("Erreur traduction — réessaie"); }
              }}
            />
            <div style={{ display:"flex",gap:8,marginBottom:8 }}>
              <input type="date" value={evtDate} onChange={e=>setEvtDate(e.target.value)} style={{ ...inp,flex:1,marginBottom:0 }}/>
              <input type="time" value={evtTime} onChange={e=>setEvtTime(e.target.value)} style={{ ...inp,flex:1,marginBottom:0 }}/>
            </div>
            <input value={evtLoc} onChange={e=>setEvtLoc(e.target.value)} placeholder="Lieu (ex: Silver Spring, MD)" style={{ ...inp,marginTop:8 }}/>

            {/* ✅ UPLOAD IMAGE EVENT */}
            <Sec t="Image (optionnel)"/>
            {evtImg ? (
              <div style={{ position:"relative",marginBottom:8 }}>
                <img src={evtImg} alt="event" style={{ width:"100%",height:140,objectFit:"cover",borderRadius:10 }}/>
                <button onClick={()=>setEvtImg("")} style={{ position:"absolute",top:6,right:6,width:28,height:28,borderRadius:"50%",background:"rgba(239,68,68,.9)",border:"none",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                <div style={{ position:"absolute",bottom:6,left:8,fontSize:10,color:"#fff",background:"rgba(0,0,0,.5)",padding:"2px 8px",borderRadius:6 }}>✅ Image uploadée</div>
              </div>
            ):(
              <label style={{ display:"flex",alignItems:"center",gap:12,padding:"14px",background:"#0f1521",border:"1.5px dashed rgba(45,212,191,.4)",borderRadius:10,cursor:evtImgUp?"default":"pointer",marginBottom:8 }}>
                <input type="file" accept="image/*" style={{ display:"none" }} disabled={evtImgUp} onChange={async e=>{
                  const file=e.target.files?.[0]; if(!file) return;
                  setEvtImgUp(true);
                  try{ const url=await uploadToCloudinary(file); setEvtImg(url); }
                  catch{ alert("Erreur upload — réessaie"); }
                  setEvtImgUp(false); e.target.value="";
                }}/>
                <span style={{ fontSize:24 }}>🖼️</span>
                <div>
                  <div style={{ fontSize:13,color:evtImgUp?"#2dd4bf":"#aaa",fontWeight:evtImgUp?600:400 }}>{evtImgUp?"⏳ Upload en cours...":"📁 Choisir une image (ordi ou téléphone)"}</div>
                  <div style={{ fontSize:11,color:"#555",marginTop:2 }}>JPG, PNG, WEBP — max 10MB</div>
                </div>
              </label>
            )}

            <Sec t="Cibler"/>
            <select value={evtTarget} onChange={e=>setEvtTarget(e.target.value)} style={{ ...inp,color:"#f4f1ec" }}>
              {TARGET_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {evtSuccess&&<div style={{ fontSize:13,color:"#22c55e",textAlign:"center" as const,marginBottom:8 }}>✅ Événement publié !</div>}
            <button onClick={publishEvent} disabled={savingEvt||!evtTitle.fr||!evtDate} style={{ width:"100%",padding:"13px",background:(evtTitle.fr&&evtDate)?"#e8b84b":"#1e2a3a",border:"none",borderRadius:11,color:(evtTitle.fr&&evtDate)?"#000":"#555",fontSize:14,fontWeight:700,cursor:(evtTitle.fr&&evtDate)?"pointer":"default",fontFamily:"inherit",opacity:savingEvt?.7:1 }}>
              {savingEvt?"⏳...":"📅 Publier l'événement"}
            </button>
          </div>

          <div style={{ fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,fontWeight:600 }}>Événements ({events.length})</div>
          <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
            {events.map(evt=>(
              <div key={evt.id} style={{ background:"#141d2e",border:"1px solid rgba(45,212,191,.2)",borderRadius:12,overflow:"hidden" }}>
                {evt.imageUrl&&<img src={evt.imageUrl} alt="" style={{ width:"100%",height:80,objectFit:"cover" }}/>}
                <div style={{ padding:"12px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10,color:"#2dd4bf",fontWeight:700,marginBottom:4 }}>📅 {evt.eventDate}{evt.eventTime?` · ${evt.eventTime}`:""} · {evt.target}</div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec" }}>{evt.title_fr}</div>
                    {evt.eventLocation&&<div style={{ fontSize:11,color:"#555",marginTop:2 }}>📍 {evt.eventLocation}</div>}
                    <div onClick={async()=>{
                      if(!(evt.participants?.length>0)){ alert("Aucun participant pour l'instant."); return; }
                      try{
                        const names:string[]=[];
                        for(const uid of evt.participants.slice(0,20)){
                          const usnap=await getDoc(doc(db,"users",uid)).catch(()=>null);
                          if(usnap?.exists()){ const d=usnap.data() as any; names.push(`• ${d.name||"User"} — ${d.email||uid}`); }
                        }
                        alert(`👥 Participants (${evt.participants.length}) :\n\n${names.join("\n")}${evt.participants.length>20?"\n...":""}`);
                      }catch{ alert("Erreur"); }
                    }} style={{ fontSize:11,color:evt.participants?.length>0?"#2dd4bf":"#555",marginTop:4,cursor:evt.participants?.length>0?"pointer":"default",textDecoration:evt.participants?.length>0?"underline":"none" }}>
                      👥 {(evt.participants||[]).length} participant{(evt.participants||[]).length!==1?"s":""} {evt.participants?.length>0?"— voir →":""}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                    <button onClick={()=>toggleActive(evt.id,evt.active)} style={{ padding:"6px 10px",background:evt.active?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",border:`1px solid ${evt.active?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`,borderRadius:8,color:evt.active?"#22c55e":"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>
                      {evt.active?"ON":"OFF"}
                    </button>
                    <button onClick={()=>deleteItem(evt.id)} style={{ padding:"6px 10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,color:"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            {events.length===0&&<div style={{ textAlign:"center" as const,padding:"24px",color:"#555",fontSize:13 }}>Aucun événement</div>}
          </div>
        </>)}

        <div style={{ height:80 }}/>
      </div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:680,background:"#0f1521",borderTop:"1px solid #1e2a3a",display:"flex",zIndex:200 }}>
        {([{id:"messages",icon:"📢",label:"Messages"},{id:"pubs",icon:"📣",label:"Pubs"},{id:"events",icon:"📅",label:"Events"},{id:"stats",icon:"📊",label:"Stats"}] as const).map(({id,icon,label})=>{
          const active=activeTab===id;
          return (
            <button key={id} onClick={()=>setActiveTab(id)} style={{ flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",gap:3,padding:"10px 0",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",position:"relative" }}>
              {active&&<div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:30,height:2,borderRadius:"0 0 3px 3px",background:"#e8b84b" }}/>}
              <span style={{ fontSize:20,filter:active?"none":"grayscale(1) opacity(.4)" }}>{icon}</span>
              <span style={{ fontSize:10,fontWeight:active?600:400,color:active?"#e8b84b":"#4a5568" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PAGE /admin PRINCIPALE
// ══════════════════════════════════════════════
export default function AdminPage() {
  const [authChecked,  setAuthChecked]  = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user || user.uid !== ADMIN_UID) { window.location.href = "/login"; return; }
      setIsAuthorized(true);
      const session = localStorage.getItem("admin_session");
      const expiry  = localStorage.getItem("admin_session_expiry");
      if (session==="valid" && expiry && Date.now()<parseInt(expiry)) setIsLoggedIn(true);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    localStorage.removeItem("admin_session_expiry");
    setIsLoggedIn(false);
  };

  if (!authChecked) return (
    <div style={{ minHeight:"100dvh",background:"#0b0f1a",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation:"spin 1s linear infinite" }}>
        <circle cx="18" cy="18" r="13" fill="none" stroke="#1e2a3a" strokeWidth="4"/>
        <circle cx="18" cy="18" r="13" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="82" strokeDashoffset="62"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!isAuthorized) return null;
  if (!isLoggedIn) return <AdminLogin onSuccess={()=>setIsLoggedIn(true)}/>;
  return <AdminDashboard onLogout={handleLogout}/>;
}
