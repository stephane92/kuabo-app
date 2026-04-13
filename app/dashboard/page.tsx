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
// POPUP LÉGÈRE — NEW USER (lightCheck)
// Affichée une seule fois quand status = "new"
// ⚠️ PAS de SSN / Job / Permis ici
// ══════════════════════════════════════════════
function LightCheckPopup({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [checked, setChecked] = useState<string[]>([]);

  const T = {
    fr: {
      title:"Bienvenue aux USA 🇺🇸",
      sub:"Vérifions que tu as les essentiels pour ta première semaine.",
      items:[
        { id:"address",  emoji:"📍", label:"Adresse actuelle",    desc:"Tu sais où tu dors ce soir ?" },
        { id:"phone",    emoji:"📱", label:"Numéro actif",         desc:"Une SIM américaine fonctionnelle" },
        { id:"payment",  emoji:"💳", label:"Moyen de paiement",    desc:"Carte ou cash disponible" },
        { id:"id",       emoji:"🪪", label:"Pièce d'identité",     desc:"Passeport ou autre doc" },
        { id:"internet", emoji:"🌐", label:"Accès internet",       desc:"WiFi ou données mobiles" },
      ],
      btn:"Continuer →", note:"Tu peux compléter ça plus tard dans ton profil.",
    },
    en: {
      title:"Welcome to the USA 🇺🇸",
      sub:"Let's make sure you have the essentials for your first week.",
      items:[
        { id:"address",  emoji:"📍", label:"Current address",      desc:"Do you know where you're sleeping tonight?" },
        { id:"phone",    emoji:"📱", label:"Active number",         desc:"A working US SIM card" },
        { id:"payment",  emoji:"💳", label:"Payment method",        desc:"Card or cash available" },
        { id:"id",       emoji:"🪪", label:"ID document",           desc:"Passport or other document" },
        { id:"internet", emoji:"🌐", label:"Internet access",       desc:"WiFi or mobile data" },
      ],
      btn:"Continue →", note:"You can complete this later in your profile.",
    },
    es: {
      title:"Bienvenido a EE.UU. 🇺🇸",
      sub:"Vamos a asegurarnos de que tienes lo esencial para tu primera semana.",
      items:[
        { id:"address",  emoji:"📍", label:"Dirección actual",      desc:"¿Sabes dónde dormirás esta noche?" },
        { id:"phone",    emoji:"📱", label:"Número activo",          desc:"Una SIM americana funcionando" },
        { id:"payment",  emoji:"💳", label:"Medio de pago",          desc:"Tarjeta o efectivo disponible" },
        { id:"id",       emoji:"🪪", label:"Documento de identidad", desc:"Pasaporte u otro documento" },
        { id:"internet", emoji:"🌐", label:"Acceso a internet",      desc:"WiFi o datos móviles" },
      ],
      btn:"Continuar →", note:"Puedes completar esto más tarde en tu perfil.",
    },
  }[lang];

  const toggle = (id: string) =>
    setChecked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,15,26,.92)", backdropFilter:"blur(8px)", zIndex:400, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 12px 20px" }}>
      <div style={{ background:"#0f1521", border:"1.5px solid rgba(232,184,75,.25)", borderRadius:22, padding:"24px 18px", width:"100%", maxWidth:480, animation:"slideUp .4s ease" }}>
        <div style={{ fontSize:36, textAlign:"center", marginBottom:12 }}>🇺🇸</div>
        <h3 style={{ fontSize:18, fontWeight:800, textAlign:"center", color:"#f4f1ec", marginBottom:6 }}>{T.title}</h3>
        <p style={{ fontSize:12, color:"#aaa", textAlign:"center", marginBottom:18, lineHeight:1.6 }}>{T.sub}</p>

        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
          {T.items.map(item => {
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
          {T.btn}
        </button>
        <div style={{ fontSize:11, color:"#555", textAlign:"center", marginTop:10 }}>{T.note}</div>
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
  const [showLightCheck,   setShowLightCheck]   = useState(false);

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
        localStorage.setItem("userName", name);
        localStorage.setItem("lang", userLang);

        // ✅ STATUS SYSTEM
        const status = computeStatus({
          arrivalConfirmed: data?.arrivalConfirmed,
          arrivalDate:      data?.arrivalDate,
          arrival:          data?.arrival,
        });
        setUserStatus(status);

        // ✅ Rediriger si not_arrived
        if (status === "not_arrived") {
          window.location.href = "/pre-arrival";
          return;
        }

        // ✅ Popup légère pour new — une seule fois
        const lcs = data?.lightCheckSeen || localStorage.getItem("kuabo_lightcheck_seen") === "true";
        setLightCheckSeen(lcs);
        if (status === "new" && !lcs) {
          setTimeout(() => setShowLightCheck(true), 1000);
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

      {/* LightCheck popup — new users seulement */}
      {showLightCheck && (
        <LightCheckPopup lang={lang} onClose={handleLightCheckClose}/>
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
            <HomeTab
              lang={lang} userId={userId} completedSteps={completedSteps}
              currentPhase={currentPhase} phaseProgress={phaseProgress}
              arrivalDate={arrivalDate} armyStatus={armyStatus}
              userState={userState} userCity={userCity} userCountry={userCountry}
              streak={streak} preChecklist={preChecklist}
              userStatus={userStatus}
              onOpenStep={setActiveStepModal}
              onViewArmyGuide={()=>setShowArmyGuide(true)}
              onTogglePreChecklist={id=>{ const u={...preChecklist,[id]:!preChecklist[id]}; setPreChecklist(u); localStorage.setItem("preChecklist",JSON.stringify(u)); }}
            />
          )}
          {activeTab==="explorer" && <ExplorerTab lang={lang}/>}
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
        @keyframes spin      { to { transform:rotate(360deg) } }
        @keyframes alertPop  { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes slideUp   { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}
