"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Globe, Edit2, LogOut, ChevronRight } from "lucide-react";

type Lang    = "fr" | "en" | "es";
type PhaseId = 1 | 2 | 3 | 4 | 5;

// ── Imports des données partagées (depuis data.ts) ──────────────────────────
import { PHASES_META, PHASE_STEPS } from "./data";
import { getPhaseStats, isPhaseUnlocked } from "./utils";
import { ThemeToggle } from "./ThemeToggle";

// ══════════════════════════════════════════════
// PROFILE TAB
// ══════════════════════════════════════════════
export default function ProfileTab({
  userName, userEmail, userCountry, userState, userCity,
  lang, completedSteps, armyStatus,
  onArmyChange, changeLang, onLogout, onDeleteAccount,
}: {
  userName: string;
  userEmail: string;
  userCountry: string;
  userState: string;
  userCity: string;
  lang: Lang;
  completedSteps: string[];
  armyStatus: string;
  onArmyChange: (s: string) => void;
  changeLang: (l: Lang) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const [commVisible,   setCommVisible]   = useState(false);
  const [notifEnabled,  setNotifEnabled]  = useState(false);
  const [msgEnabled,    setMsgEnabled]    = useState(true);
  const [editingName,   setEditingName]   = useState(false);
  const [newName,       setNewName]       = useState(userName);
  const [savingName,    setSavingName]    = useState(false);
  const [nameSaved,     setNameSaved]     = useState(false);
  const [passwordSent,  setPasswordSent]  = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [displayName,   setDisplayName]   = useState(userName);
  const [showArmyModal,    setShowArmyModal]    = useState(false);
  const [armyConfirmOpt,   setArmyConfirmOpt]   = useState<string | null>(null); // option en attente de confirmation

  const { currentPhase, phaseProgress } = getPhaseStats(completedSteps);
  const globalPct = Math.round(Object.values(phaseProgress).reduce((acc, p) => acc + p.pct, 0) / 5);

  useEffect(() => {
    if (profileLoaded) return;
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
      } catch {}
      setProfileLoaded(true);
    };
    load();
  }, [profileLoaded]);

  const saveToggle = useCallback(async (field: string, value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    try { await updateDoc(doc(db, "users", user.uid), { [field]: value }); } catch {}
  }, []);

  const handleCommToggle  = useCallback(() => { const v = !commVisible;  setCommVisible(v);  saveToggle("communityVisible", v); }, [commVisible,  saveToggle]);
  const handleNotifToggle = useCallback(() => { const v = !notifEnabled; setNotifEnabled(v); saveToggle("notifEnabled",      v); }, [notifEnabled, saveToggle]);
  const handleMsgToggle   = useCallback(() => { const v = !msgEnabled;   setMsgEnabled(v);   saveToggle("msgEnabled",        v); }, [msgEnabled,   saveToggle]);

  const saveName = useCallback(async () => {
    if (!newName.trim()) return;
    const user = auth.currentUser;
    if (!user) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: newName.trim() });
      localStorage.setItem("userName", newName.trim());
      setDisplayName(newName.trim());
      setNameSaved(true);
      setTimeout(() => { setNameSaved(false); setEditingName(false); }, 1500);
    } catch {}
    setSavingName(false);
  }, [newName]);

  const handlePasswordReset = useCallback(async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    setPasswordSent(false);
    setPasswordError("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordSent(true);
    } catch {
      setPasswordError(lang === "fr" ? "Erreur — réessaie" : "Error — try again");
    }
  }, [lang]);

  const handleShare = useCallback(() => {
    const messages: Record<Lang, string> = {
      fr: `Salut ! J'utilise Kuabo pour m'installer aux USA. Rejoins-moi : https://kuabo.co 🌍`,
      en: `Hey! I use Kuabo to settle in the USA. Join me: https://kuabo.co 🌍`,
      es: `¡Hola! Uso Kuabo para instalarme en EE.UU. Únete: https://kuabo.co 🌍`,
    };
    if (navigator.share) navigator.share({ title: "Kuabo", text: messages[lang], url: "https://kuabo.co" }).catch(() => {});
    else navigator.clipboard.writeText(messages[lang]).catch(() => {});
  }, [lang]);

  const Toggle = useCallback(({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      style={{ width: 50, height: 28, borderRadius: 14, background: value ? "#e8b84b" : "#2a3448", border: "none", cursor: "pointer", position: "relative", transition: "background 0.15s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 4, left: value ? 26 : 4, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
    </button>
  ), []);

  const ARMY_OPTS: Record<Lang, { value: string; label: string; icon: string; desc: string }[]> = {
    fr: [
      { value: "army",          label: "Je suis dans l'Army",     icon: "🎖️", desc: "Soldat actif — avantages militaires" },
      { value: "army_interest", label: "J'y pense",               icon: "🤔", desc: "Intéressé mais pas encore engagé" },
      { value: "army_unsure",   label: "Pas encore décidé",       icon: "❓", desc: "Exploration — je veux en savoir plus" },
    ],
    en: [
      { value: "army",          label: "I'm in the Army",         icon: "🎖️", desc: "Active soldier — military benefits" },
      { value: "army_interest", label: "I'm thinking about it",   icon: "🤔", desc: "Interested but not yet enlisted" },
      { value: "army_unsure",   label: "Not decided yet",         icon: "❓", desc: "Exploring — I want to learn more" },
    ],
    es: [
      { value: "army",          label: "Estoy en el Army",        icon: "🎖️", desc: "Soldado activo — beneficios militares" },
      { value: "army_interest", label: "Lo estoy pensando",       icon: "🤔", desc: "Interesado pero aún no alistado" },
      { value: "army_unsure",   label: "Aún no lo decidí",        icon: "❓", desc: "Explorando — quiero saber más" },
    ],
  };

  const armyBadgeLabel = {
    fr: { army: "🎖️ Soldat actif",        army_interest: "🤔 J'y pense",              army_unsure: "❓ Pas encore décidé" },
    en: { army: "🎖️ Active soldier",       army_interest: "🤔 Thinking about it",      army_unsure: "❓ Not decided yet" },
    es: { army: "🎖️ Soldado activo",       army_interest: "🤔 Lo estoy pensando",      army_unsure: "❓ Aún no lo decidí" },
  }[lang][armyStatus as "army" | "army_interest" | "army_unsure"] || "🎖️ Army";

  const L = {
    fr: { title: "Mon Profil",  globalScore: "Score global Kuabo",      phase: "Phase",   of: "sur", saveName: "Sauvegarder", cancelName: "Annuler",  nameSaved: "✅ Nom modifié !",      editNameTitle: "Modifier ton nom",     editNameSub: "Entre ton nouveau nom",      security: "Sécurité",    changePass: "Changer le mot de passe", passSent: "✅ Email envoyé !",   preferences: "Préférences", language: "Langue",  privacy: "Confidentialité", commMap: "Carte communauté",  commSub: "Apparaître anonymement",  messages: "Messages",  msgSub: "Recevoir des messages",  notifications: "Notifications", notifSub: "Rappels quotidiens",  share: "Partager Kuabo", shareSub: "Inviter un ami immigrant",  help: "Aide",  legal: "Légal",  terms: "Conditions d'utilisation", privacy2: "Politique de confidentialité", account: "Compte",   logout: "Déconnexion",    deleteAccount: "Supprimer mon compte",  deleteSub: "Action irréversible",  version: "Version 1.0 · Kuabo", phases: "Mes phases",    armySection: "Statut Army",    armyChange: "Modifier mon statut Army",  armyModalTitle: "Mon statut Army" },
    en: { title: "My Profile",  globalScore: "Global Kuabo Score",      phase: "Phase",   of: "of", saveName: "Save",        cancelName: "Cancel",   nameSaved: "✅ Name updated!",      editNameTitle: "Edit your name",       editNameSub: "Enter your new name",        security: "Security",    changePass: "Change password",         passSent: "✅ Email sent!",      preferences: "Preferences", language: "Language", privacy: "Privacy",          commMap: "Community map",     commSub: "Appear anonymously",      messages: "Messages",  msgSub: "Receive messages",       notifications: "Notifications", notifSub: "Daily reminders",     share: "Share Kuabo",    shareSub: "Invite an immigrant friend", help: "Help",  legal: "Legal",  terms: "Terms of Service",         privacy2: "Privacy Policy",              account: "Account",  logout: "Logout",         deleteAccount: "Delete my account",     deleteSub: "Irreversible action",  version: "Version 1.0 · Kuabo", phases: "My phases",     armySection: "Army Status",    armyChange: "Change my Army status",     armyModalTitle: "My Army status" },
    es: { title: "Mi Perfil",   globalScore: "Puntuación global Kuabo", phase: "Fase",    of: "de", saveName: "Guardar",      cancelName: "Cancelar", nameSaved: "✅ ¡Nombre actualizado!", editNameTitle: "Editar tu nombre",   editNameSub: "Ingresa tu nuevo nombre",    security: "Seguridad",   changePass: "Cambiar contraseña",      passSent: "✅ ¡Email enviado!",  preferences: "Preferencias", language: "Idioma",  privacy: "Privacidad",       commMap: "Mapa comunidad",    commSub: "Aparecer anónimamente",   messages: "Mensajes",  msgSub: "Recibir mensajes",       notifications: "Notificaciones", notifSub: "Recordatorios diarios", share: "Compartir Kuabo", shareSub: "Invitar un amigo inmigrante",help: "Ayuda", legal: "Legal",  terms: "Términos de Servicio",     privacy2: "Política de Privacidad",      account: "Cuenta",   logout: "Cerrar sesión",  deleteAccount: "Eliminar mi cuenta",    deleteSub: "Acción irreversible",  version: "Versión 1.0 · Kuabo",  phases: "Mis fases",     armySection: "Estado Army",    armyChange: "Cambiar mi estado Army",    armyModalTitle: "Mi estado Army" },
  }[lang];

  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "👤";
  const size = 96, sw = 7, r = (size - sw) / 2, circ = 2 * Math.PI * r, offset = circ - (globalPct / 100) * circ;
  const currentPhaseMeta = PHASES_META[currentPhase];

  const Section = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 8, marginTop: 18, paddingLeft: 2 }}>{title}</div>
  );

  return (
    <div style={{ paddingBottom: 20 }}>

      {/* ── Modal édition du nom ─────────────────────────── */}
      {editingName && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }}
          onClick={() => setEditingName(false)}
        >
          <div
            style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 32, height: 3, background: "#2a3448", borderRadius: 3, margin: "0 auto 18px" }} />
            {nameSaved ? (
              <div style={{ textAlign: "center", padding: "18px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#22c55e" }}>{L.nameSaved}</div>
                <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>{displayName}</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>{L.editNameTitle}</div>
                <div style={{ fontSize: 13, color: "#aaa", marginBottom: 18 }}>{L.editNameSub}</div>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={displayName}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  style={{ width: "100%", padding: "14px", background: "#141d2e", border: "1px solid #e8b84b", borderRadius: 12, color: "#f4f1ec", fontSize: 16, fontFamily: "inherit", outline: "none", marginBottom: 16, boxSizing: "border-box" as const }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setEditingName(false)} style={{ flex: 1, padding: "13px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{L.cancelName}</button>
                  <button onClick={saveName} disabled={savingName || !newName.trim()} style={{ flex: 1, padding: "13px", background: "#e8b84b", border: "none", borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: savingName ? 0.7 : 1 }}>
                    {savingName ? "..." : L.saveName}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal statut Army ─────────────────────────────── */}
      {showArmyModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "0 16px" }}
          onClick={() => { setShowArmyModal(false); setArmyConfirmOpt(null); }}
        >
          <div
            style={{ background: "#0f1521", border: "1px solid #1e2a3a", borderRadius: 20, padding: "24px 18px", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", animation: "alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Étape 1 : choisir ── */}
            {!armyConfirmOpt && (<>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>{L.armyModalTitle}</div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
                {lang === "fr" ? "Choisis ton statut actuel :" : lang === "es" ? "Elige tu estado actual:" : "Choose your current status:"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {ARMY_OPTS[lang].map(opt => {
                  const isSel = armyStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (isSel) return; // déjà sélectionné, rien à faire
                        setArmyConfirmOpt(opt.value);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: isSel ? "rgba(34,197,94,0.07)" : "#141d2e", border: "1px solid " + (isSel ? "rgba(34,197,94,0.25)" : "#1e2a3a"), borderRadius: 12, cursor: isSel ? "default" : "pointer", width: "100%", textAlign: "left" as const, fontFamily: "inherit" }}
                    >
                      <span style={{ fontSize: 22 }}>{opt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: isSel ? "#22c55e" : "#f4f1ec", fontWeight: isSel ? 700 : 500 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{opt.desc}</div>
                      </div>
                      {isSel && <span style={{ fontSize: 16, color: "#22c55e" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {/* Bouton Fermer */}
              <button
                onClick={() => setShowArmyModal(false)}
                style={{ width: "100%", padding: "13px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
              >
                {lang === "fr" ? "← Retour" : lang === "es" ? "← Volver" : "← Back"}
              </button>
            </>)}

            {/* ── Étape 2 : confirmer ── */}
            {armyConfirmOpt && (() => {
              const opt = ARMY_OPTS[lang].find(o => o.value === armyConfirmOpt)!;
              return (<>
                <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>{opt.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f1ec", textAlign: "center", marginBottom: 8 }}>
                  {lang === "fr" ? "Confirmer le changement ?" : lang === "es" ? "¿Confirmar el cambio?" : "Confirm the change?"}
                </div>
                <div style={{ background: "rgba(232,184,75,0.06)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 12, padding: "14px", marginBottom: 20, textAlign: "center" as const }}>
                  <div style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>
                    {lang === "fr" ? "Nouveau statut :" : lang === "es" ? "Nuevo estado:" : "New status:"}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ec" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{opt.desc}</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setArmyConfirmOpt(null)}
                    style={{ flex: 1, padding: "13px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {lang === "fr" ? "← Retour" : lang === "es" ? "← Volver" : "← Back"}
                  </button>
                  <button
                    onClick={async () => {
                      setShowArmyModal(false);
                      setArmyConfirmOpt(null);
                      onArmyChange(armyConfirmOpt);
                      const user = auth.currentUser;
                      if (user) {
                        try { await updateDoc(doc(db, "users", user.uid), { armyStatus: armyConfirmOpt, isArmy: armyConfirmOpt === "army", reason: armyConfirmOpt }); } catch {}
                      }
                    }}
                    style={{ flex: 1, padding: "13px", background: "#22c55e", border: "none", borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {lang === "fr" ? "✅ Confirmer" : lang === "es" ? "✅ Confirmar" : "✅ Confirm"}
                  </button>
                </div>
              </>);
            })()}
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ fontSize: 21, fontWeight: 700, color: "#fff", marginBottom: 16 }}>{L.title}</div>

      {/* ── Avatar + infos ────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", width: size, height: size, marginBottom: 10 }}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={currentPhaseMeta.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1a2438", border: `2px solid ${currentPhaseMeta.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: currentPhaseMeta.color }}>{initials}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{displayName}</div>
          <button onClick={() => { setNewName(displayName); setNameSaved(false); setEditingName(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
            <Edit2 size={14} color="#aaa" />
          </button>
        </div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 6 }}>{userEmail}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, justifyContent: "center" }}>
          <div style={{ padding: "3px 10px", borderRadius: 18, background: `${currentPhaseMeta.color}14`, border: `1px solid ${currentPhaseMeta.color}35`, fontSize: 11, color: currentPhaseMeta.color, fontWeight: 700 }}>
            {currentPhaseMeta.emoji} {L.phase} {currentPhase} — {currentPhaseMeta.name[lang]}
          </div>
          {armyStatus && (
            <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.22)", fontSize: 11, color: "#22c55e", fontWeight: 700 }}>{armyBadgeLabel}</div>
          )}
          {(userCity || userState) && (
            <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(45,212,191,0.07)", border: "1px solid rgba(45,212,191,0.18)", fontSize: 11, color: "#2dd4bf", fontWeight: 600 }}>📍 {userCity || userState}</div>
          )}
        </div>
      </div>

      {/* ── Score global ──────────────────────────────────── */}
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "14px 16px", marginBottom: 4 }}>
        <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>{L.globalScore}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: currentPhaseMeta.color, lineHeight: 1 }}>{globalPct}%</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 5, background: "#1e2a3a", borderRadius: 5, overflow: "hidden", marginBottom: 3 }}>
              <div style={{ height: "100%", width: globalPct + "%", background: `linear-gradient(to right,${currentPhaseMeta.color},#2dd4bf)`, borderRadius: 5, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{L.phase} {currentPhase} {L.of} 5 — {currentPhaseMeta.name[lang]}</div>
          </div>
        </div>
      </div>

      {/* ── Mes phases ────────────────────────────────────── */}
      <Section title={L.phases} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 4 }}>
        {([1, 2, 3, 4, 5] as PhaseId[]).map(pid => {
          const meta    = PHASES_META[pid];
          const prog    = phaseProgress[pid];
          const unlocked = isPhaseUnlocked(pid, completedSteps);
          const complete = prog.pct === 100;
          return (
            <div key={pid} style={{ flex: "1 0 calc(33% - 6px)", background: complete ? "rgba(34,197,94,0.05)" : pid === currentPhase ? `${meta.color}10` : "#141d2e", border: `1px solid ${complete ? "rgba(34,197,94,0.25)" : pid === currentPhase ? meta.color + "35" : "#1e2a3a"}`, borderRadius: 10, padding: "8px", textAlign: "center" as const, opacity: unlocked ? 1 : 0.4 }}>
              <div style={{ fontSize: 20 }}>{unlocked ? meta.emoji : "🔒"}</div>
              <div style={{ fontSize: 9, color: complete ? "#22c55e" : pid === currentPhase ? meta.color : "#555", fontWeight: 600, marginTop: 2 }}>{prog.pct}%</div>
            </div>
          );
        })}
      </div>

      {/* ── Section Army ──────────────────────────────────── */}
      {armyStatus && (
        <>
          <Section title={L.armySection} />
          <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 12, padding: "14px 16px", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎖️</div>
                <div>
                  <div style={{ fontSize: 14, color: "#22c55e", fontWeight: 600 }}>{armyBadgeLabel}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>DV + Army</div>
                </div>
              </div>
              <button onClick={() => setShowArmyModal(true)} style={{ padding: "7px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 9, color: "#22c55e", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {L.armyChange}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Sécurité ──────────────────────────────────────── */}
      <Section title={L.security} />
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🔐</div>
            <span style={{ fontSize: 14, color: "#fff" }}>{L.changePass}</span>
          </div>
          <button onClick={handlePasswordReset} style={{ background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.25)", borderRadius: 8, padding: "6px 12px", color: "#e8b84b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {lang === "fr" ? "Envoyer" : lang === "es" ? "Enviar" : "Send"}
          </button>
        </div>
        {passwordSent  && <div style={{ fontSize: 12, color: "#22c55e", marginTop: 8, paddingLeft: 44 }}>{L.passSent}</div>}
        {passwordError && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 8, paddingLeft: 44 }}>{passwordError}</div>}
      </div>

      {/* ── Préférences / Langue ──────────────────────────── */}
      <Section title={L.preferences} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Langue */}
        <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "13px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Globe size={16} color="#e8b84b" />
              </div>
              <span style={{ fontSize: 14, color: "#fff" }}>{L.language}</span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {(["fr", "en", "es"] as Lang[]).map(lg => (
                <button key={lg} onClick={() => changeLang(lg)} style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid", borderColor: lang === lg ? "#e8b84b" : "#2a3448", background: lang === lg ? "rgba(232,184,75,0.1)" : "transparent", color: lang === lg ? "#e8b84b" : "#aaa", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {lg.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Thème Light / Dark */}
        <ThemeToggle lang={lang} />

      </div>

      {/* ── Confidentialité / Toggles ─────────────────────── */}
      <Section title={L.privacy} />
      <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "13px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { icon: "🗺️", label: L.commMap,        sub: L.commSub,   value: commVisible,  onToggle: handleCommToggle },
          { icon: "💬", label: L.messages,        sub: L.msgSub,    value: msgEnabled,   onToggle: handleMsgToggle },
          { icon: "🔔", label: L.notifications,   sub: L.notifSub,  value: notifEnabled, onToggle: handleNotifToggle },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, color: "#fff" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{item.sub}</div>
              </div>
            </div>
            <Toggle value={item.value} onToggle={item.onToggle} />
          </div>
        ))}
      </div>

      {/* ── Partager ──────────────────────────────────────── */}
      <Section title={L.share} />
      <button onClick={handleShare} style={{ width: "100%", background: "linear-gradient(135deg,rgba(232,184,75,0.07),rgba(45,212,191,0.04))", border: "1px solid rgba(232,184,75,0.18)", borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(232,184,75,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👥</div>
          <div style={{ textAlign: "left" as const }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#f4f1ec" }}>{L.share}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{L.shareSub}</div>
          </div>
        </div>
        <span style={{ color: "#e8b84b", fontSize: 16 }}>↗</span>
      </button>

      {/* ── Aide ──────────────────────────────────────────── */}
      <Section title={L.help} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { icon: "📧", label: "support@kuabo.co",                                                                        action: () => { window.location.href = "mailto:support@kuabo.co"; } },
          { icon: "💬", label: "WhatsApp +1 (970) 534-0694",                                                              action: () => { window.open("https://wa.me/19705340694", "_blank"); } },
          { icon: "🌐", label: "kuabo.co",                                                                                action: () => { window.open("https://kuabo.co", "_blank"); } },
          { icon: "🐛", label: lang === "fr" ? "Signaler un bug"              : lang === "es" ? "Reportar error"          : "Report a bug",        action: () => { window.location.href = "mailto:support@kuabo.co?subject=Bug Kuabo"; } },
          { icon: "💡", label: lang === "fr" ? "Suggérer une fonctionnalité" : lang === "es" ? "Sugerir función"         : "Suggest a feature",   action: () => { window.location.href = "mailto:support@kuabo.co?subject=Suggestion Kuabo"; } },
        ].map((item, i) => (
          <button key={i} onClick={item.action} style={{ width: "100%", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{item.icon}</div>
              <span style={{ fontSize: 13, color: "#fff" }}>{item.label}</span>
            </div>
            <ChevronRight size={15} color="#555" />
          </button>
        ))}
      </div>

      {/* ── Légal ─────────────────────────────────────────── */}
      <Section title={L.legal} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { icon: "📄", label: L.terms,    action: () => { window.location.href = "/terms"; } },
          { icon: "🔒", label: L.privacy2, action: () => { window.location.href = "/privacy"; } },
        ].map((item, i) => (
          <button key={i} onClick={item.action} style={{ width: "100%", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{item.icon}</div>
              <span style={{ fontSize: 13, color: "#fff" }}>{item.label}</span>
            </div>
            <ChevronRight size={15} color="#555" />
          </button>
        ))}
      </div>

      {/* ── Compte ────────────────────────────────────────── */}
      <Section title={L.account} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={onLogout} style={{ width: "100%", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={15} color="#ef4444" />
            </div>
            <span style={{ fontSize: 13, color: "#ef4444" }}>{L.logout}</span>
          </div>
          <ChevronRight size={15} color="#ef4444" />
        </button>
        <button onClick={onDeleteAccount} style={{ width: "100%", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a2438", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🗑️</div>
            <div style={{ textAlign: "left" as const }}>
              <div style={{ fontSize: 13, color: "#ef4444" }}>{L.deleteAccount}</div>
              <div style={{ fontSize: 10, color: "#555" }}>{L.deleteSub}</div>
            </div>
          </div>
          <ChevronRight size={15} color="#ef4444" />
        </button>
      </div>

      <div style={{ textAlign: "center" as const, fontSize: 11, color: "#333", paddingTop: 12 }}>{L.version}</div>
    </div>
  );
}
