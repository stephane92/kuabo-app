"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { ChevronRight, Globe, LogOut, Search } from "lucide-react";

import ExplorerTab   from "../components/ExplorerTab";
import DocumentsTab  from "./components/DocumentsTab";
import ProfileTab    from "./components/ProfileTab";
import HomeTab, { BottomNav } from "./components/HomeTab";
import { SearchModal, StepModal, ArmyGuideModal, PhaseUnlockOverlay } from "./components/Modals";
import { PHASE_STEPS } from "./components/data";
import { getPhaseStats, useStreak } from "./components/utils";
import type { Lang, PhaseId } from "./components/data";

export default function Dashboard() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── State utilisateur ──────────────────────────────────
  const [ready,          setReady]          = useState(false);
  const [lang,           setLang]           = useState<Lang>("fr");
  const [activeTab,      setActiveTab]      = useState<string>("home");
  const [userName,       setUserName]       = useState("");
  const [userEmail,      setUserEmail]      = useState("");
  const [userCountry,    setUserCountry]    = useState("us");
  const [userState,      setUserState]      = useState("");
  const [userCity,       setUserCity]       = useState("");
  const [userId,         setUserId]         = useState<string | undefined>(undefined);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [arrivalDate,    setArrivalDate]    = useState<string | null>(null);
  const [armyStatus,     setArmyStatus]     = useState("");
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [toast,          setToast]          = useState<string | null>(null);
  const [lastAction,     setLastAction]     = useState<string | null>(null);
  const [preChecklist,   setPreChecklist]   = useState<Record<string, boolean>>({});

  // ── State modals ───────────────────────────────────────
  const [showSearch,      setShowSearch]      = useState(false);
  const [activeStepModal, setActiveStepModal] = useState<string | null>(null);
  const [showArmyGuide,   setShowArmyGuide]   = useState(false);
  const [phaseUnlockAnim, setPhaseUnlockAnim] = useState<PhaseId | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep,      setDeleteStep]      = useState(1);
  const [deleteInput,     setDeleteInput]     = useState("");
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState("");

  const streak                       = useStreak(userId);
  const { currentPhase, phaseProgress } = getPhaseStats(completedSteps);

  // ── Scroll top on tab change ───────────────────────────
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
        const snap      = await getDoc(doc(db, "users", user.uid));
        const data      = snap.exists() ? (snap.data() as any) : {};
        const savedLang = localStorage.getItem("lang") as Lang;

        // Si le nom Firebase est "***" (compte partiellement supprimé) → on prend Google ou email
        const rawName = data?.name;
        const name    = (!rawName || rawName === "***" || rawName === "")
          ? (user.displayName || user.email?.split("@")[0] || "User")
          : rawName;

        // Si le nom était "***", on le répare dans Firebase automatiquement
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
      } catch {}
      setReady(true);
    });
    return () => { clearTimeout(timeout); unsub(); };
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
      removed: { fr: "❌ Étape retirée",    en: "❌ Step removed",    es: "❌ Paso eliminado" },
      done:    { fr: "✅ Étape complétée !", en: "✅ Step completed!", es: "✅ ¡Paso completado!" },
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
    if (deleteInput !== "DELETE") { setDeleteError(lang === "fr" ? "Tape DELETE pour confirmer" : "Type DELETE to confirm"); return; }
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
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0b0f1a", gap: 14 }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "serif" }}>
        <span style={{ color: "#e8b84b" }}>Ku</span><span style={{ color: "#f4f1ec" }}>abo</span>
      </div>
      <svg width="36" height="36" viewBox="0 0 34 34" style={{ animation: "spin 1s linear infinite" }}>
        <circle cx="17" cy="17" r="13" fill="none" stroke="#1e2a3a" strokeWidth="4" />
        <circle cx="17" cy="17" r="13" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="82" strokeDashoffset="62" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{ background: "#0b0f1a", height: "100dvh", overflow: "hidden", color: "#f4f1ec" }}>

      {/* Modals globaux */}
      {showSearch && <SearchModal lang={lang} onClose={() => setShowSearch(false)} />}
      <PhaseUnlockOverlay phaseId={phaseUnlockAnim} lang={lang} onDone={() => setPhaseUnlockAnim(null)} />
      <ArmyGuideModal armyStatus={showArmyGuide ? armyStatus : null} lang={lang} onClose={() => setShowArmyGuide(false)} />
      <StepModal stepId={activeStepModal} lang={lang} completedSteps={completedSteps} onToggle={toggleStep} onClose={() => setActiveStepModal(null)} />

      {/* Modal suppression compte */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }}
          onClick={() => { setShowDeleteModal(false); setDeleteStep(1); setDeleteInput(""); setDeleteError(""); }}>
          <div style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e => e.stopPropagation()}>
            {deleteStep === 1 && (<>
              <div style={{ fontSize: 40, textAlign: "center", marginBottom: 14 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444", textAlign: "center", marginBottom: 10 }}>{lang === "fr" ? "Supprimer ton compte ?" : "Delete your account?"}</div>
              <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 1.7, marginBottom: 22 }}>{lang === "fr" ? "Cette action est irréversible." : "This action is irreversible."}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setShowDeleteModal(false); setDeleteStep(1); }} style={{ flex: 1, padding: "13px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#f4f1ec", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
                <button onClick={() => setDeleteStep(2)} style={{ flex: 1, padding: "13px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: "#ef4444", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Continuer" : "Continue"}</button>
              </div>
            </>)}
            {deleteStep === 2 && (<>
              <div style={{ fontSize: 40, textAlign: "center", marginBottom: 14 }}>🗑️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444", textAlign: "center", marginBottom: 8 }}>{lang === "fr" ? "Confirmation finale" : "Final confirmation"}</div>
              <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 1.7, marginBottom: 18 }}>{lang === "fr" ? `Tape "DELETE" pour confirmer.` : `Type "DELETE" to confirm.`}</div>
              <input value={deleteInput} onChange={e => { setDeleteInput(e.target.value); setDeleteError(""); }} placeholder="DELETE"
                style={{ width: "100%", padding: "13px", background: "#141d2e", border: "1px solid " + (deleteInput === "DELETE" ? "#ef4444" : "#1e2a3a"), borderRadius: 12, color: "#f4f1ec", fontSize: 16, fontFamily: "inherit", outline: "none", marginBottom: 10, boxSizing: "border-box" as const, textAlign: "center" as const, letterSpacing: "0.1em" }} />
              {deleteError && <div style={{ fontSize: 12, color: "#ef4444", textAlign: "center", marginBottom: 10 }}>⚠️ {deleteError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setDeleteStep(1); setDeleteInput(""); setDeleteError(""); }} style={{ flex: 1, padding: "13px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#f4f1ec", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Retour" : "Back"}</button>
                <button onClick={handleDeleteAccount} disabled={deleting || deleteInput !== "DELETE"}
                  style={{ flex: 1, padding: "13px", background: deleteInput === "DELETE" ? "#ef4444" : "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: deleteInput === "DELETE" ? "#fff" : "#ef4444", fontSize: 14, fontWeight: 600, cursor: deleteInput === "DELETE" ? "pointer" : "default", fontFamily: "inherit", opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? (lang === "fr" ? "Suppression..." : "Deleting...") : (lang === "fr" ? "Supprimer définitivement" : "Delete permanently")}
                </button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Zone scrollable */}
      <div ref={pageRef} style={{ height: "calc(100dvh - 68px)", overflowY: "auto", WebkitOverflowScrolling: "touch" as any }}>
        <div style={{ padding: "16px 16px 20px", maxWidth: 480, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: "bold", fontSize: 22, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#e8b84b" }}>Ku</span><span style={{ color: "#f4f1ec" }}>abo</span>
            </div>
            <div ref={menuRef} style={{ position: "relative" }}>
              <div style={{ background: "#1a2438", padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "#aaa" }} onClick={() => setMenuOpen(!menuOpen)}>
                <Globe size={13} color="#aaa" />
                <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{userName}</span>
                <ChevronRight size={13} color="#aaa" style={{ transform: menuOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </div>
              {menuOpen && (
                <div style={{ position: "absolute", right: 0, top: "110%", background: "#1a2438", padding: "8px", borderRadius: 12, minWidth: 150, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                  <div style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderRadius: 7, color: "#f4f1ec" }} onClick={() => changeLang("fr")}>🇫🇷 Français</div>
                  <div style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderRadius: 7, color: "#f4f1ec" }} onClick={() => changeLang("en")}>🇺🇸 English</div>
                  <div style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderRadius: 7, color: "#f4f1ec" }} onClick={() => changeLang("es")}>🇪🇸 Español</div>
                  <hr style={{ borderColor: "#2a3448", margin: "5px 0" }} />
                  <div style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderRadius: 7, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }} onClick={handleLogout}>
                    <LogOut size={13} /> {lang === "fr" ? "Déconnexion" : lang === "es" ? "Cerrar sesión" : "Logout"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barre de recherche */}
          <button onClick={() => setShowSearch(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 14px", marginBottom: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const }}>
            <Search size={16} color="#555" />
            <span style={{ fontSize: 14, color: "#555", flex: 1 }}>{{ fr: "🔍 Chercher un guide...", en: "🔍 Search a guide...", es: "🔍 Buscar una guía..." }[lang]}</span>
          </button>

          {/* Onglets */}
          {activeTab === "home" && (
            <HomeTab lang={lang} userId={userId} completedSteps={completedSteps} currentPhase={currentPhase} phaseProgress={phaseProgress} arrivalDate={arrivalDate} armyStatus={armyStatus} userState={userState} userCity={userCity} userCountry={userCountry} streak={streak} preChecklist={preChecklist}
              onOpenStep={setActiveStepModal} onViewArmyGuide={() => setShowArmyGuide(true)}
              onTogglePreChecklist={id => { const u = { ...preChecklist, [id]: !preChecklist[id] }; setPreChecklist(u); localStorage.setItem("preChecklist", JSON.stringify(u)); }}
            />
          )}
          {activeTab === "documents" && <div style={{ marginTop: 4 }}><DocumentsTab lang={lang} completedSteps={completedSteps} /></div>}
          {activeTab === "explorer" && <ExplorerTab lang={lang} />}
          {activeTab === "profile" && (
            <div style={{ marginTop: 4 }}>
              <ProfileTab userName={userName} userEmail={userEmail} userCountry={userCountry} userState={userState} userCity={userCity} lang={lang} completedSteps={completedSteps} armyStatus={armyStatus} onArmyChange={setArmyStatus} changeLang={changeLang} onLogout={handleLogout} onDeleteAccount={() => setShowDeleteModal(true)} />
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#1a2438", padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>{toast}</span>
          {lastAction && <span onClick={undo} style={{ marginLeft: 10, cursor: "pointer", color: "#e8b84b", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>↩ {lang === "fr" ? "Annuler" : lang === "es" ? "Deshacer" : "Undo"}</span>}
        </div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} onHomePress={handleHomePress} />

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes alertPop { 0% { transform: scale(0.85); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}
