"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { ChevronRight, Flame, Lock, Bell } from "lucide-react";
import { PHASES_META, PHASE_STEPS, STEP_GUIDES } from "./data";
import { isPhaseUnlocked, addDays, getDaysLeft } from "./utils";
import { computeKuaboScore, computeBadges, getScoreLabel, type Badge } from "./gamification";
import type { Lang, PhaseId } from "./data";
import type { UserStatus } from "@/lib/statusSystem";

// ══════════════════════════════════════════════
// NOTIFICATION BELL
// ══════════════════════════════════════════════
type Notification = {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type: "ssn" | "badge" | "admin" | "inactif" | "info";
};

function NotificationBell({ lang, userId }: { lang: Lang; userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "users", userId, "messages"));
        const msgs: Notification[] = [];
        for (const d of snap.docs) {
          const data = d.data() as any;
          const adminSnap = await getDoc(doc(db, "admin_messages", d.id)).catch(() => null);
          if (adminSnap?.exists()) {
            const ad = adminSnap.data() as any;
            const title = ad[`title_${lang}`] || ad.title_fr || "";
            const ts = ad.publishedAt ? new Date(ad.publishedAt) : new Date();
            const now = new Date();
            const diff = Math.floor((now.getTime() - ts.getTime()) / 60000);
            const timeStr =
              diff < 60
                ? lang === "fr" ? `Il y a ${diff} min` : `${diff} min ago`
                : diff < 1440
                ? lang === "fr" ? `Il y a ${Math.floor(diff / 60)}h` : `${Math.floor(diff / 60)}h ago`
                : lang === "fr" ? `Il y a ${Math.floor(diff / 1440)}j` : `${Math.floor(diff / 1440)}d ago`;
            msgs.push({
              id: d.id,
              message: title,
              time: timeStr,
              read: !!data.seen,
              type: ad.type === "urgent" ? "ssn" : "admin",
            });
          }
        }
        msgs.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
        setNotifications(msgs);
      } catch {}
    };
    load();
  }, [userId, lang]);

  const unread = notifications.filter((n) => !n.read).length;
  const displayed = showAll ? notifications : notifications.slice(0, 6);
  const hasMore = notifications.length > 6;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (userId) {
      try {
        await updateDoc(doc(db, "users", userId, "messages", id), { seen: true, seenAt: new Date().toISOString() });
      } catch {}
    }
  };

  const typeIcon: Record<string, string> = {
    ssn: "🪪", badge: "🏅", admin: "📢", inactif: "💤", info: "ℹ️",
  };

  const L = {
    fr: { title: "Notifications", empty: "Aucune notification", seeAll: "Voir tout", seeLess: "Réduire" },
    en: { title: "Notifications", empty: "No notifications", seeAll: "See all", seeLess: "Show less" },
    es: { title: "Notificaciones", empty: "Sin notificaciones", seeAll: "Ver todo", seeLess: "Reducir" },
  }[lang];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "relative", width: 40, height: 40, borderRadius: "50%",
          background: "#141d2e", border: "1px solid #1e2a3a",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1e2a3a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#141d2e")}
      >
        <Bell size={18} color={unread > 0 ? "#e8b84b" : "#555"} />
        {unread > 0 && (
          <div style={{
            position: "absolute", top: 6, right: 6,
            width: 8, height: 8, borderRadius: "50%",
            background: "#ef4444", border: "1.5px solid #0b0f1a",
          }} />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)", padding: "0 16px",
          }}
          onClick={() => { setOpen(false); setShowAll(false); }}
        >
          <div
            style={{
              background: "#0f1521", border: "1px solid #1e2a3a",
              borderRadius: 20, width: "100%", maxWidth: 420,
              maxHeight: "80vh", overflow: "hidden",
              display: "flex", flexDirection: "column",
              animation: "alertPop 0.25s cubic-bezier(.34,1.56,.64,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "18px 20px 14px", borderBottom: "1px solid #1e2a3a", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Bell size={16} color="#e8b84b" />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ec" }}>{L.title}</span>
                {unread > 0 && (
                  <span style={{
                    background: "#ef4444", color: "#fff", fontSize: 10,
                    fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                  }}>{unread}</span>
                )}
              </div>
              <button onClick={() => { setOpen(false); setShowAll(false); }}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1, padding: "10px 0" }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "#555", fontSize: 13 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
                  {L.empty}
                </div>
              ) : (
                displayed.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      display: "flex", gap: 12, padding: "12px 20px",
                      cursor: "pointer", background: n.read ? "transparent" : "rgba(232,184,75,0.04)",
                      borderBottom: "1px solid #1e2a3a", transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#141d2e")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? "transparent" : "rgba(232,184,75,0.04)")}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                      background: n.read ? "#2a3448" : "#e8b84b",
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: n.read ? "#888" : "#f4f1ec", lineHeight: 1.5, marginBottom: 4 }}>
                        {typeIcon[n.type]} {n.message}
                      </div>
                      <div style={{ fontSize: 11, color: "#555" }}>{n.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* See all button */}
            {hasMore && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid #1e2a3a", flexShrink: 0 }}>
                <button
                  onClick={() => setShowAll(!showAll)}
                  style={{
                    width: "100%", padding: "10px", background: "#141d2e",
                    border: "1px solid #1e2a3a", borderRadius: 10,
                    color: "#e8b84b", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {showAll ? L.seeLess : `${L.seeAll} (${notifications.length - 6} ${lang === "fr" ? "de plus" : "more"})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// KUABO SCORE WIDGET
// ══════════════════════════════════════════════
function KuaboScoreWidget({ score, streak, badges, lang }: {
  score: number; streak: number; badges: Badge[]; lang: Lang;
}) {
  const pct = Math.round((score / 1000) * 100);
  const label = getScoreLabel(score, lang);
  const unlockedBadges = badges.filter((b) => b.unlocked).slice(0, 4);
  const scoreColor = score < 250 ? "#e8b84b" : score < 500 ? "#2dd4bf" : score < 750 ? "#a78bfa" : "#22c55e";
  const L = {
    fr: { title: "Kuabo Score", next: "/ 1000", badges: "Badges récents", noBadge: "Continue pour débloquer tes premiers badges !" },
    en: { title: "Kuabo Score", next: "/ 1000", badges: "Recent badges", noBadge: "Keep going to unlock your first badges!" },
    es: { title: "Kuabo Score", next: "/ 1000", badges: "Insignias recientes", noBadge: "¡Sigue para desbloquear tus primeras insignias!" },
  }[lang];
  return (
    <div style={{ background: "linear-gradient(135deg,#141d2e,#0f1521)", border: `1px solid ${scoreColor}30`, borderRadius: 18, padding: "16px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: `radial-gradient(circle,${scoreColor}10,transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ fontSize: 10, color: scoreColor, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 12 }}>⭐ {L.title}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 6 }}>{L.next}</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: scoreColor, fontWeight: 700, background: `${scoreColor}15`, padding: "4px 10px", borderRadius: 10, border: `1px solid ${scoreColor}30` }}>{label}</div>
      </div>
      <div style={{ height: 6, background: "#1e2a3a", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(to right,${scoreColor},#2dd4bf)`, borderRadius: 6, transition: "width 1s ease" }} />
      </div>
      <div style={{ fontSize: 10, color: "#555", letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 8 }}>{L.badges}</div>
      {unlockedBadges.length === 0 ? (
        <div style={{ fontSize: 12, color: "#444", fontStyle: "italic" }}>{L.noBadge}</div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {unlockedBadges.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: `${b.color}10`, border: `1px solid ${b.color}30`, borderRadius: 20 }}>
              <span style={{ fontSize: 14 }}>{b.emoji}</span>
              <span style={{ fontSize: 11, color: b.color, fontWeight: 600 }}>{b.label[lang]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// CIRCULAR HERO
// ══════════════════════════════════════════════
function CircularHero({ currentPhase, phaseProgress, lang }: {
  currentPhase: PhaseId;
  phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }>;
  lang: Lang;
}) {
  const meta = PHASES_META[currentPhase];
  const prog = phaseProgress[currentPhase];
  const size = 96, sw = 8, r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (prog.pct / 100) * circ;
  const nextPhase = (currentPhase + 1) as PhaseId;
  const nextMeta = currentPhase < 5 ? PHASES_META[nextPhase] : null;
  const leftCount = prog.total - prog.done;
  const L = {
    fr: { done: `${prog.done} étape${prog.done !== 1 ? "s" : ""} complétée${prog.done !== 1 ? "s" : ""}`, left: leftCount === 0 ? "Toutes complétées ! 🎉" : `${leftCount} restante${leftCount !== 1 ? "s" : ""} pour débloquer` },
    en: { done: `${prog.done} step${prog.done !== 1 ? "s" : ""} completed`, left: leftCount === 0 ? "All completed! 🎉" : `${leftCount} left to unlock` },
    es: { done: `${prog.done} paso${prog.done !== 1 ? "s" : ""} completado${prog.done !== 1 ? "s" : ""}`, left: leftCount === 0 ? "¡Todos completados! 🎉" : `${leftCount} restante${leftCount !== 1 ? "s" : ""} para desbloquear` },
  }[lang];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, background: "linear-gradient(135deg,#141d2e,#0f1521)", border: `1px solid ${meta.color}30`, borderRadius: 18, padding: "18px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20px", right: "-20px", width: 100, height: 100, background: `radial-gradient(circle,${meta.color}08,transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={meta.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{prog.pct}%</div>
          <div style={{ fontSize: 9, color: "#aaa", marginTop: 2, letterSpacing: "0.04em" }}>Phase {currentPhase}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: meta.color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>{meta.emoji} Phase {currentPhase} — {meta.name[lang]}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f1ec", marginBottom: 4 }}>{L.done}</div>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>{nextMeta ? `${L.left} ${nextMeta.emoji} ${nextMeta.name[lang]}` : L.left}</div>
        <div style={{ height: 4, background: "#1e2a3a", borderRadius: 4, overflow: "hidden", marginTop: 12 }}>
          <div style={{ height: "100%", width: prog.pct + "%", background: `linear-gradient(to right,${meta.color},${nextMeta?.color || meta.color})`, borderRadius: 4, transition: "width 0.8s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PARCOURS — STYLE SPOTIFY DARK
// ══════════════════════════════════════════════
function ParcourSection({ lang, completedSteps, currentPhase, phaseProgress, onOpenStep }: {
  lang: Lang;
  completedSteps: string[];
  currentPhase: PhaseId;
  phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }>;
  onOpenStep: (id: string) => void;
}) {
  const L = {
    fr: { title: "Ton parcours Kuabo", seeAll: "Voir tout", inProgress: "EN COURS", done: "✅ Terminé", locked: "🔒 Verrouillé" },
    en: { title: "Your Kuabo Journey", seeAll: "See all", inProgress: "IN PROGRESS", done: "✅ Done", locked: "🔒 Locked" },
    es: { title: "Tu camino Kuabo", seeAll: "Ver todo", inProgress: "EN CURSO", done: "✅ Listo", locked: "🔒 Bloqueado" },
  }[lang];

  const phases = [1, 2, 3, 4, 5] as PhaseId[];
  const phaseEmojis: Record<PhaseId, string> = { 1: "🚀", 2: "🏗️", 3: "🌱", 4: "🇺🇸", 5: "♾️" };
  const phaseBgs: Record<PhaseId, string> = {
    1: "linear-gradient(145deg,#1a2235,#0d1520)",
    2: "linear-gradient(145deg,#0d1e1e,#091515)",
    3: "linear-gradient(145deg,#0d1e10,#091508)",
    4: "linear-gradient(145deg,#1a1535,#0d0f20)",
    5: "linear-gradient(145deg,#1e1508,#150e05)",
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f1ec", display: "flex", alignItems: "center", gap: 6 }}>
          🗺️ {L.title}
        </div>
        <span style={{ fontSize: 12, color: "#e8b84b", cursor: "pointer" }}>{L.seeAll}</span>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {phases.map((pid) => {
          const meta = PHASES_META[pid];
          const prog = phaseProgress[pid];
          const isActive = pid === currentPhase;
          const isComplete = prog.pct === 100;
          const unlocked = isPhaseUnlocked(pid, completedSteps);

          let badgeLabel = L.locked;
          let badgeBg = "#2a3448";
          let badgeColor = "#555";
          if (isComplete) { badgeLabel = L.done; badgeBg = "#16a34a"; badgeColor = "#bbf7d0"; }
          else if (isActive) { badgeLabel = L.inProgress; badgeBg = "#7c3aed"; badgeColor = "#e9d5ff"; }

          const progressColor = isComplete ? meta.color : isActive ? meta.color : "#2a3448";

          return (
            <div
              key={pid}
              style={{
                flex: "0 0 140px", borderRadius: 16, overflow: "hidden",
                background: "#141d2e", border: `1px solid ${isActive ? meta.color + "40" : "#1e2a3a"}`,
                cursor: "pointer", transition: "transform 0.2s",
                opacity: unlocked ? 1 : 0.5,
              }}
              onMouseEnter={(e) => { if (unlocked) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
            >
              {/* Image area */}
              <div style={{
                height: 110, position: "relative",
                background: phaseBgs[pid],
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* Glow */}
                <div style={{
                  position: "absolute", top: -10, right: -10, width: 60, height: 60,
                  borderRadius: "50%", background: `${meta.color}15`,
                  filter: "blur(12px)",
                }} />

                {/* Emoji with animation */}
                <span style={{
                  fontSize: 48, position: "relative", zIndex: 1,
                  filter: unlocked ? "none" : "grayscale(1) opacity(0.3)",
                  display: "block",
                  animation: isActive ? "floatEmoji 3s ease-in-out infinite" : "none",
                }}>
                  {unlocked ? phaseEmojis[pid] : "🔒"}
                </span>

                {/* Badge */}
                <div style={{
                  position: "absolute", top: 8, left: 8,
                  fontSize: 9, fontWeight: 700, padding: "3px 8px",
                  borderRadius: 20, background: badgeBg, color: badgeColor,
                  whiteSpace: "nowrap" as const,
                }}>{badgeLabel}</div>
              </div>

              {/* Info */}
              <div style={{ padding: "10px 10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f1ec", marginBottom: 2 }}>{meta.name[lang]}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 7 }}>
                  {unlocked ? `${prog.done}/${prog.total} étapes${isActive ? ` · ${prog.pct}%` : ""}` : (lang === "fr" ? "Verrouillé" : lang === "es" ? "Bloqueado" : "Locked")}
                </div>
                <div style={{ height: 3, background: "#1e2a3a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${unlocked ? prog.pct : 0}%`, background: progressColor, borderRadius: 2, transition: "width 0.6s ease" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes floatEmoji {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// COUNTDOWN SECTION
// ══════════════════════════════════════════════
function CountdownSection({ arrivalDate, lang, completedSteps, onOpenStep }: {
  arrivalDate: string | null; lang: Lang; completedSteps: string[]; onOpenStep: (id: string) => void;
}) {
  if (!arrivalDate) return null;
  const allDeadlines = [
    { id: "ssn", days: 10, priority: 1 }, { id: "phone", days: 1, priority: 2 }, { id: "bank", days: 14, priority: 3 },
    { id: "greencard", days: 21, priority: 4 }, { id: "housing", days: 30, priority: 5 }, { id: "license", days: 45, priority: 6 },
    { id: "job", days: 90, priority: 7 }, { id: "taxes_first", days: 90, priority: 8 }, { id: "real_id", days: 60, priority: 9 },
    { id: "credit_score", days: 60, priority: 10 }, { id: "taxes_annual", days: 365, priority: 11 }, { id: "renew_greencard", days: 3650, priority: 14 },
  ];
  const allPhaseSteps = [...PHASE_STEPS[1], ...PHASE_STEPS[2], ...PHASE_STEPS[3], ...PHASE_STEPS[4], ...PHASE_STEPS[5]];
  const ssnPending = !completedSteps.includes("ssn");
  const pending = allDeadlines
    .filter((d) => !completedSteps.includes(d.id))
    .map((d) => ({ ...d, daysLeft: getDaysLeft(arrivalDate, d.days), dateStr: addDays(arrivalDate, d.days) }))
    .filter((d) => d.daysLeft >= -30)
    .sort((a, b) => { if (ssnPending && a.id === "ssn") return -1; if (ssnPending && b.id === "ssn") return 1; return a.daysLeft - b.daysLeft; })
    .slice(0, 4);
  if (pending.length === 0) return null;
  const urgent = pending[0], others = pending.slice(1, 4);
  const isOverdue = urgent.daysLeft < 0;
  const urgColor = isOverdue || urgent.daysLeft <= 3 ? "#ef4444" : urgent.daysLeft <= 10 ? "#f97316" : "#e8b84b";
  const urgentStep = allPhaseSteps.find((s) => s.id === urgent.id);
  if (!urgentStep) return null;
  const stepEmoji: Record<string, string> = { ssn: "🪪", bank: "🏦", greencard: "💳", housing: "🏠", phone: "📱", job: "💼", license: "🚗", taxes_first: "📊", real_id: "🪪", credit_score: "📈", taxes_annual: "📊", renew_greencard: "💳" };
  const L = {
    fr: { urgentTitle: "Étape urgente à régler", overdue: "En retard !", days: "jours restants", deadline: "Deadline", next: "Prochaines deadlines", done: "Fait", guide: "Guide" },
    en: { urgentTitle: "Urgent step to complete", overdue: "Overdue!", days: "days left", deadline: "Deadline", next: "Upcoming deadlines", done: "Done", guide: "Guide" },
    es: { urgentTitle: "Paso urgente a completar", overdue: "¡Atrasado!", days: "días restantes", deadline: "Fecha límite", next: "Próximas fechas", done: "Hecho", guide: "Guía" },
  }[lang];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ background: `${urgColor}08`, border: `1px solid ${urgColor}35`, borderRadius: 14, padding: "16px", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: urgColor, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>⏱ {L.urgentTitle}</div>
          <div style={{ fontSize: 10, color: "#555" }}>{L.deadline} : {urgent.dateStr}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>{stepEmoji[urgent.id] || "📋"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>{urgentStep.label[lang]}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: urgColor, lineHeight: 1 }}>{isOverdue ? L.overdue : `${Math.abs(urgent.daysLeft)}`}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{!isOverdue && L.days}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={() => onOpenStep(urgent.id)} style={{ flex: 1, padding: "11px 8px", background: "#22c55e", border: "none", borderRadius: 10, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✅ {L.done}</button>
          <button onClick={() => onOpenStep(urgent.id)} style={{ flex: 1, padding: "11px 8px", background: "#e8b84b", border: "none", borderRadius: 10, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📖 {L.guide}</button>
          {STEP_GUIDES[urgent.id]?.explorerType && (
            <button onClick={() => (window.location.href = `/near/${STEP_GUIDES[urgent.id].explorerType}`)} style={{ padding: "11px 12px", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 10, color: "#2dd4bf", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>🗺️</button>
          )}
        </div>
      </div>
      {others.length > 0 && (
        <div style={{ background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 600 }}>📅 {L.next}</div>
          {others.map((d, i) => {
            const s = allPhaseSteps.find((st) => st.id === d.id);
            const dc = d.daysLeft <= 7 ? "#ef4444" : d.daysLeft <= 14 ? "#f97316" : "#e8b84b";
            return (
              <div key={d.id} onClick={() => onOpenStep(d.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < others.length - 1 ? "1px solid #1a2438" : "none", cursor: "pointer" }}>
                <div style={{ fontSize: 13, color: "#aaa" }}>{d.daysLeft <= 7 ? "🔴" : d.daysLeft <= 14 ? "🟠" : "🟡"} {s?.label[lang] || d.id}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: dc }}>{d.daysLeft}j →</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// KUABO AI BUTTON — ANIMÉ
// ══════════════════════════════════════════════
function KuaboAIButton({ lang, completedSteps, userState, userCity }: { lang: Lang; completedSteps: string[]; userState: string; userCity: string }) {
  const location = userCity || userState || (lang === "fr" ? "ta zone" : lang === "es" ? "tu zona" : "your area");
  const L = {
    fr: { title: "Demande à Kuabo AI", sub: `Ton assistant — ${location}` },
    en: { title: "Ask Kuabo AI", sub: `Your assistant — ${location}` },
    es: { title: "Pregunta a Kuabo AI", sub: `Tu asistente — ${location}` },
  }[lang];
  return (
    <button
      onClick={() => { localStorage.setItem("completedSteps", JSON.stringify(completedSteps)); window.location.href = "/chat"; }}
      style={{
        width: "100%", background: "#141d2e",
        border: "1px solid rgba(232,184,75,0.25)", borderRadius: 14,
        padding: "14px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 14,
        cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#1a2540")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#141d2e")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg,#f97316,#e8b84b)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 24, display: "block", animation: "robotBob 2s ease-in-out infinite" }}>🤖</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#f4f1ec", textAlign: "left" as const }}>{L.title}</div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{L.sub}</div>
        </div>
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "#1e2a3a", display: "flex", alignItems: "center",
        justifyContent: "center", color: "#e8b84b", fontSize: 14, flexShrink: 0,
      }}>→</div>
      <style>{`
        @keyframes robotBob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-3deg); }
          75% { transform: translateY(-3px) rotate(3deg); }
        }
      `}</style>
    </button>
  );
}

// ══════════════════════════════════════════════
// DAILY TIP — ANIMÉ
// ══════════════════════════════════════════════
function DailyTip({ lang, userState, userCountry }: { lang: Lang; userState: string; userCountry: string }) {
  const TIPS: Record<Lang, string[]> = {
    fr: ["Attends 10 jours après l'arrivée avant d'aller au bureau SSA pour le SSN.", "Achète une SIM T-Mobile dès l'aéroport — pas besoin de SSN.", "Tu peux ouvrir un compte Chase avec ton passeport seulement.", "Ta Green Card physique arrivera par courrier USCIS en 2-3 semaines.", "Zillow et Apartments.com sont les meilleurs sites pour trouver un logement.", "LinkedIn et Indeed sont les meilleurs sites pour chercher un emploi aux USA.", "Commence à construire ton credit score avec une secured credit card.", "Garde toujours une copie numérique de tes documents importants.", "Medicaid est gratuit si tes revenus sont bas — renseigne-toi dès que possible.", "Pour le permis, passe d'abord l'examen théorique en ligne sur le site DMV.", "📊 Rappel : la deadline pour les taxes IRS est le 15 avril de chaque année !", "La REAL ID est obligatoire pour prendre l'avion aux USA depuis mai 2025."],
    en: ["Wait 10 days after arrival before going to the SSA office for your SSN.", "Buy a T-Mobile SIM at the airport — no SSN needed.", "You can open a Chase account with your passport only.", "Your physical Green Card will arrive by USCIS mail in 2-3 weeks.", "Zillow and Apartments.com are the best sites to find housing.", "LinkedIn and Indeed are the best job search sites in the USA.", "Start building your credit score with a secured credit card.", "Always keep a digital copy of your important documents.", "Medicaid is free if your income is low — check eligibility as soon as possible.", "For your license, take the written test online on the DMV website first.", "📊 Reminder: the IRS tax deadline is April 15 every year!", "REAL ID is required for domestic flights in the USA since May 2025."],
    es: ["Espera 10 días después de llegar antes de ir a la oficina SSA para tu SSN.", "Compra una SIM de T-Mobile en el aeropuerto — no necesitas SSN.", "Puedes abrir una cuenta en Chase solo con tu pasaporte.", "Tu Green Card física llegará por correo USCIS en 2-3 semanas.", "Zillow y Apartments.com son los mejores sitios para encontrar vivienda.", "LinkedIn e Indeed son los mejores sitios de búsqueda de empleo en EE.UU.", "Comienza a construir tu historial crediticio con una tarjeta de crédito asegurada.", "Siempre guarda una copia digital de tus documentos importantes.", "Medicaid es gratuito si tus ingresos son bajos — infórmate lo antes posible.", "Para la licencia, haz primero el examen teórico en línea en el sitio del DMV.", "📊 Recordatorio: ¡la fecha límite del IRS es el 15 de abril de cada año!", "REAL ID es obligatorio para vuelos domésticos en EE.UU. desde mayo 2025."],
  };
  const [tip, setTip] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const f = async () => {
      try {
        const snap = await getDocs(collection(db, "admin_messages"));
        let found: string | null = null;
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.active || data.type !== "conseil") return;
          if ((data.state === "ALL" || data.state === userState) && (data.country === "ALL" || data.country === userCountry)) found = data["text_" + lang] || data.text_fr || null;
        });
        if (found) { setTip(found); setIsAdmin(true); } else setTip(TIPS[lang][new Date().getDate() % TIPS[lang].length]);
      } catch { setTip(TIPS[lang][new Date().getDate() % TIPS[lang].length]); }
      setLoaded(true);
    };
    f();
  }, [lang, userState, userCountry]);

  return (
    <div style={{
      background: isAdmin ? "rgba(232,184,75,0.05)" : "#0d1e1e",
      border: "1px solid " + (isAdmin ? "rgba(232,184,75,0.2)" : "rgba(45,212,191,0.18)"),
      borderRadius: 14, padding: "14px 16px",
      display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: isAdmin ? "rgba(232,184,75,0.15)" : "rgba(45,212,191,0.15)",
        border: "1px solid " + (isAdmin ? "rgba(232,184,75,0.3)" : "rgba(45,212,191,0.3)"),
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 20, display: "block", animation: "glowPulse 2.5s ease-in-out infinite" }}>
          {isAdmin ? "📢" : "💡"}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: isAdmin ? "#e8b84b" : "#2dd4bf", fontWeight: 600, marginBottom: 5 }}>
          {isAdmin ? (lang === "fr" ? "Message Kuabo" : "Kuabo Message") : (lang === "fr" ? "Conseil du jour" : lang === "es" ? "Consejo del día" : "Tip of the day")}
        </div>
        <div style={{ fontSize: 13, color: isAdmin ? "#f4e8c8" : "#c8eae8", lineHeight: 1.7 }}>{loaded ? tip : "..."}</div>
      </div>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADMIN MESSAGE CARD
// ══════════════════════════════════════════════
function AdminMessageCard({ lang, userId, userState }: { lang: Lang; userId: string | undefined; userState: string }) {
  const [msg, setMsg] = useState<any>(null); const [expanded, setExpanded] = useState(false); const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (!userId) return; const f = async () => { try { const snap = await getDocs(collection(db, "admin_messages")); let found: any = null; snap.forEach((d) => { const data = d.data() as any; if (!data.active || data.type === "conseil" || data.type === "pub" || data.type === "event") return; if (data.target === "all" || data.target === "state:" + userState) found = { id: d.id, ...data }; }); if (found) { const userMsg = await getDoc(doc(db, "users", userId, "messages", found.id)).catch(() => null); if (!userMsg?.exists() || !userMsg.data()?.seen) setMsg(found); } } catch {} }; f(); }, [userId, userState]);
  const handleSeen = async () => { if (!userId || !msg) return; try { await updateDoc(doc(db, "users", userId, "messages", msg.id), { seen: true, seenAt: new Date().toISOString() }).catch(() => {}); } catch {} setDismissed(true); };
  if (!msg || dismissed) return null;
  const title = msg["title_" + lang] || msg.title_fr || ""; const content = msg["content_" + lang] || msg.content_fr || ""; const isUrgent = msg.type === "urgent"; const color = isUrgent ? "#ef4444" : "#e8b84b";
  return (
    <div style={{ background: `${color}08`, border: `1.5px solid ${color}30`, borderRadius: 14, padding: "14px 16px", marginBottom: 14, position: "relative" }}>
      <button onClick={handleSeen} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16 }}>×</button>
      <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 6 }}>{isUrgent ? "⚠️ " : "📢 "}{lang === "fr" ? "Information Kuabo" : lang === "es" ? "Información Kuabo" : "Kuabo Information"}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f1ec", marginBottom: expanded ? 8 : 0, paddingRight: 20 }}>{title}</div>
      {expanded && <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7, marginBottom: 12 }}>{content}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => setExpanded(!expanded)} style={{ flex: 2, padding: "10px", background: color, border: "none", borderRadius: 10, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{expanded ? (lang === "fr" ? "Réduire" : "Collapse") : (lang === "fr" ? "👁️ Voir l'info" : "👁️ See info")}</button>
        <button onClick={handleSeen} style={{ flex: 1, padding: "10px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 10, color: "#aaa", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{lang === "fr" ? "Plus tard" : "Later"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ARMY BANNER
// ══════════════════════════════════════════════
function ArmyBanner({ armyStatus, lang, onViewGuide }: { armyStatus: string; lang: Lang; onViewGuide: () => void }) {
  const { ARMY_GUIDE: AG } = require("./data");
  const guide = AG[armyStatus]; if (!guide) return null;
  const g = guide[lang]; const color = armyStatus === "army" ? "#22c55e" : "#2dd4bf";
  const badge = { fr: { army: "🎖️ Soldat actif", army_interest: "🤔 J'y pense", army_unsure: "❓ Pas encore décidé" }, en: { army: "🎖️ Active soldier", army_interest: "🤔 Thinking about it", army_unsure: "❓ Not decided yet" }, es: { army: "🎖️ Soldado activo", army_interest: "🤔 Lo estoy pensando", army_unsure: "❓ Aún no decidido" } }[lang][armyStatus as "army" | "army_interest" | "army_unsure"] || "🎖️ Army";
  const btnL = { fr: "Voir mon guide Army →", en: "View my Army guide →", es: "Ver mi guía Army →" }[lang];
  return (
    <div style={{ background: `${color}06`, border: `1px solid ${color}25`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>{badge}</div>
      <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, marginBottom: 10 }}>{g.desc}</div>
      <button onClick={onViewGuide} style={{ width: "100%", padding: "11px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 10, color, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{btnL}</button>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADMIN EVENTS + PUB (inchangé — copie depuis original)
// ══════════════════════════════════════════════
function AdminEventsAndPub({ lang, userState, userCountry, userId }: { lang: Lang; userState: string; userCountry: string; userId: string }) {
  const [events, setEvents] = useState<any[]>([]); const [pub, setPub] = useState<any>(null); const [pubClosed, setPubClosed] = useState(false); const [participating, setParticipating] = useState<Record<string, boolean>>({}); const [selectedPub, setSelectedPub] = useState<any>(null); const [selectedEvt, setSelectedEvt] = useState<any>(null);
  useEffect(() => { const f = async () => { try { const snap = await getDocs(collection(db, "admin_messages")); const evts: any[] = []; let foundPub: any = null; snap.forEach((d) => { const data = d.data() as any; if (!data.active) return; const targeted = data.target === "all" || data.target === `state:${userState}` || data.target === "dv" || data.target === "army"; if (!targeted) return; if (data.type === "event") evts.push({ id: d.id, ...data }); if (data.type === "pub" && !foundPub) foundPub = { id: d.id, ...data }; }); evts.sort((a, b) => new Date(a.eventDate || 0).getTime() - new Date(b.eventDate || 0).getTime()); setEvents(evts); setPub(foundPub); const part: Record<string, boolean> = {}; evts.forEach((e) => { part[e.id] = (e.participants || []).includes(userId); }); setParticipating(part); } catch {} }; f(); }, [userState, userId]);
  const handleParticipate = async (eventId: string) => { if (!userId) return; const isIn = participating[eventId]; setParticipating((prev) => ({ ...prev, [eventId]: !isIn })); try { const ref = doc(db, "admin_messages", eventId); const snap = await getDoc(ref); if (!snap.exists()) return; const data = snap.data() as any; const parts: string[] = data.participants || []; await updateDoc(ref, { participants: isIn ? parts.filter((id: string) => id !== userId) : [...parts, userId] }); } catch {} };
  const getPubFields = (p: any, l: Lang) => ({ title: p?.[`title_${l}`] || p?.title_fr || "", desc: p?.[`desc_${l}`] || p?.desc_fr || "", cta: p?.[`cta_${l}`] || p?.cta_fr || "", url: p?.linkUrl || p?.link_url || "", image: p?.imageUrl || p?.image_url || "" });
  const getEvtFields = (e: any, l: Lang) => ({ title: e?.[`title_${l}`] || e?.title_fr || "", desc: e?.[`desc_${l}`] || e?.desc_fr || "", image: e?.imageUrl || e?.image_url || "" });
  if (!pub && events.length === 0) return null;
  const pubF = pub ? getPubFields(pub, lang) : null;
  return (
    <>
      {pub && pubF && !pubClosed && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 3, textAlign: "right" as const }}>{lang === "fr" ? "Publicité · Partenaire Kuabo" : "Ad · Kuabo Partner"}</div>
          <div style={{ position: "relative", background: "#141d2e", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 14, overflow: "hidden", cursor: "pointer" }} onClick={() => setSelectedPub(pub)}>
            <div style={{ height: 2, background: "linear-gradient(to right,#e8b84b,#f97316)" }} />
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={(e) => { e.stopPropagation(); setPubClosed(true); }} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, zIndex: 10 }}>✕</button>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(232,184,75,.12)", border: "1px solid rgba(232,184,75,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📢</div>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f1ec", marginBottom: 2 }}>{pubF.title || "..."}</div>
                {pubF.cta && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(232,184,75,.1)", border: "1px solid rgba(232,184,75,.3)", borderRadius: 18 }}><span style={{ fontSize: 11, color: "#e8b84b", fontWeight: 700 }}>{pubF.cta} →</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}
      {events.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 600 }}>📅 {lang === "fr" ? "Événements Kuabo" : "Kuabo Events"}</div>
          {events.map((event) => { const ef = getEvtFields(event, lang); const isIn = participating[event.id]; const dateStr = event.eventDate ? new Date(event.eventDate).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long" }) : ""; return (
            <div key={event.id} style={{ background: "#141d2e", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 14, overflow: "hidden", position: "relative", marginBottom: 8, cursor: "pointer" }} onClick={() => setSelectedEvt(event)}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to right,#2dd4bf,#e8b84b)" }} />
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f1ec", marginBottom: 3 }}>{ef.title}</div>
                  <div style={{ fontSize: 11, color: "#2dd4bf" }}>📅 {dateStr}{event.eventTime ? ` · ${event.eventTime}` : ""}</div>
                  {event.eventLocation && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>📍 {event.eventLocation}</div>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleParticipate(event.id); }} style={{ padding: "8px 12px", borderRadius: 16, border: "1px solid " + (isIn ? "rgba(34,197,94,0.4)" : "rgba(45,212,191,0.4)"), background: isIn ? "rgba(34,197,94,0.1)" : "rgba(45,212,191,0.1)", color: isIn ? "#22c55e" : "#2dd4bf", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" as const }}>{isIn ? (lang === "fr" ? "✓ Inscrit" : "✓ Going") : (lang === "fr" ? "Participer" : "Join")}</button>
              </div>
            </div>
          ); })}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// PHASE CARD (détail complet)
// ══════════════════════════════════════════════
function PhaseCard({ phaseId, lang, completedSteps, onOpenStep, isActive, isUnlocked }: {
  phaseId: PhaseId; lang: Lang; completedSteps: string[]; onOpenStep: (id: string) => void; isActive: boolean; isUnlocked: boolean;
}) {
  const [expanded, setExpanded] = useState(isActive);
  const meta = PHASES_META[phaseId]; const steps = PHASE_STEPS[phaseId]; const done = steps.filter((s) => completedSteps.includes(s.id)).length; const total = steps.length; const pct = Math.round((done / total) * 100); const isComplete = pct === 100;
  const L = { fr: { locked: "🔒 Termine la phase précédente d'abord", steps: "étapes", inProgress: "En cours" }, en: { locked: "🔒 Complete previous phase first", steps: "steps", inProgress: "In progress" }, es: { locked: "🔒 Completa la fase anterior primero", steps: "pasos", inProgress: "En curso" } }[lang];
  return (
    <div style={{ marginBottom: 10, background: isActive ? "#141d2e" : isComplete ? "rgba(34,197,94,0.05)" : "#0f1521", border: `1px solid ${isActive ? meta.color + "50" : isComplete ? "rgba(34,197,94,0.2)" : "#1e2a3a"}`, borderRadius: 14, overflow: "hidden", opacity: isUnlocked ? 1 : 0.55 }}>
      <div onClick={() => isUnlocked && setExpanded(!expanded)} style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: isUnlocked ? "pointer" : "default" }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: isUnlocked ? `${meta.color}12` : "#1a2438", border: `1.5px solid ${isUnlocked ? meta.color + "35" : "#2a3448"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{isUnlocked ? meta.emoji : <Lock size={18} color="#555" />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: meta.color, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const }}>Phase {phaseId}</span>
            {isComplete && <span style={{ fontSize: 10, color: "#22c55e" }}>✅</span>}
            {isActive && !isComplete && <span style={{ fontSize: 10, color: meta.color, background: `${meta.color}15`, padding: "1px 6px", borderRadius: 8 }}>{L.inProgress}</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: isUnlocked ? "#f4f1ec" : "#555" }}>{meta.emoji} {meta.name[lang]}</div>
          {isUnlocked && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{meta.desc[lang]}</div>}
          {!isUnlocked && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{L.locked}</div>}
        </div>
        {isUnlocked && (<div style={{ textAlign: "right" as const, flexShrink: 0 }}><div style={{ fontSize: 17, fontWeight: 800, color: isComplete ? "#22c55e" : meta.color }}>{pct}%</div><div style={{ fontSize: 10, color: "#555" }}>{done}/{total} {L.steps}</div></div>)}
        {isUnlocked && <ChevronRight size={16} color="#555" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />}
      </div>
      {isUnlocked && (<div style={{ height: 3, background: "#1e2a3a", margin: "0 16px 12px" }}><div style={{ height: "100%", width: pct + "%", background: isComplete ? "#22c55e" : meta.color, borderRadius: 3, transition: "width 0.6s ease" }} /></div>)}
      {expanded && isUnlocked && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
          {steps.map((step) => { const isDone = completedSteps.includes(step.id); const urgColor = step.urgency === "critical" ? "#ef4444" : step.urgency === "high" ? "#f97316" : meta.color; const guide = STEP_GUIDES[step.id]; return (
            <div key={step.id} style={{ borderRadius: 11, background: isDone ? "rgba(34,197,94,0.04)" : "#141d2e", border: `1px solid ${isDone ? "rgba(34,197,94,0.15)" : "#1e2a3a"}`, overflow: "hidden" }}>
              <div onClick={() => onOpenStep(step.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", cursor: "pointer", opacity: isDone ? 0.65 : 1 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: isDone ? "#22c55e" : "transparent", border: `2px solid ${isDone ? "#22c55e" : urgColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{isDone && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: isDone ? "#555" : "#f4f1ec", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{step.label[lang]}</div><div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{step.desc[lang]}</div></div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isDone ? "#22c55e" : urgColor, flexShrink: 0 }}>{isDone ? "✅" : step.urgency === "critical" ? "🔴" : step.urgency === "high" ? "🟠" : "📋"}</div>
              </div>
              {!isDone && guide && (<div style={{ display: "flex", gap: 6, padding: "0 12px 10px" }}>
                <button onClick={(e) => { e.stopPropagation(); onOpenStep(step.id); }} style={{ flex: 1, padding: "6px", background: "rgba(232,184,75,0.08)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 8, color: "#e8b84b", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>💡 {lang === "fr" ? "Pourquoi ?" : "Why?"}</button>
                {guide.guideUrl && <button onClick={(e) => { e.stopPropagation(); window.location.href = guide.guideUrl!; }} style={{ flex: 1, padding: "6px", background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 8, color: "#2dd4bf", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📖 Guide</button>}
                {guide.explorerType && <button onClick={(e) => { e.stopPropagation(); window.location.href = `/near/${guide.explorerType}`; }} style={{ padding: "6px 8px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, color: "#a78bfa", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗺️</button>}
              </div>)}
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// BOTTOM NAV
// ══════════════════════════════════════════════
export function BottomNav({ activeTab, setActiveTab, lang, onHomePress }: {
  activeTab: string; setActiveTab: (t: string) => void; lang: Lang; onHomePress: () => void;
}) {
  const L = { fr: { home: "Accueil", explorer: "Explorer", jobs: "Emplois", profile: "Profil" }, en: { home: "Home", explorer: "Explore", jobs: "Jobs", profile: "Profile" }, es: { home: "Inicio", explorer: "Explorar", jobs: "Empleo", profile: "Perfil" } }[lang];
  const tabs = [{ id: "home", icon: "🏠", label: L.home }, { id: "explorer", icon: "🌍", label: L.explorer }, { id: "jobs", icon: "💼", label: L.jobs }, { id: "profile", icon: "👤", label: L.profile }];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, height: 68, background: "#0f1521", borderTop: "1px solid #1e2a3a", display: "flex", alignItems: "center", zIndex: 200 }}>
      {tabs.map(({ id, icon, label }) => { const active = activeTab === id; return (
        <button key={id} onClick={() => id === "home" && activeTab === "home" ? onHomePress() : setActiveTab(id)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "8px 0", background: "transparent", border: "none", cursor: "pointer", position: "relative", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
          {active && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 30, height: 2, borderRadius: "0 0 3px 3px", background: "#e8b84b" }} />}
          <span style={{ fontSize: 22, filter: active ? "none" : "grayscale(1) opacity(.45)" }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? "#e8b84b" : "#4a5568" }}>{label}</span>
        </button>
      ); })}
    </div>
  );
}

// ══════════════════════════════════════════════
// HOME TAB — EXPORT PRINCIPAL
// ══════════════════════════════════════════════
export default function HomeTab({
  lang, userId, completedSteps, currentPhase, phaseProgress, arrivalDate,
  armyStatus, userState, userCity, userCountry, streak, userStatus,
  arrivalConfirmed, onOpenStep, onViewArmyGuide,
}: {
  lang: Lang; userId: string | undefined; completedSteps: string[]; currentPhase: PhaseId;
  phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }>;
  arrivalDate: string | null; armyStatus: string; userState: string; userCity: string; userCountry: string;
  streak: number; userStatus: UserStatus; arrivalConfirmed?: boolean;
  onOpenStep: (id: string) => void; onViewArmyGuide: () => void;
}) {
  const streakColor = streak >= 7 ? "#ef4444" : streak >= 3 ? "#f97316" : "#e8b84b";
  const score = computeKuaboScore({ completedSteps, streak });
  const badges = computeBadges({ completedSteps, arrivalConfirmed: arrivalConfirmed || false, arrivalDate, streak });

  return (
    <>
      {/* HEADER avec cloche */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "#aaa" }}>
            {lang === "fr" ? "Bonjour 👋" : lang === "es" ? "Buenos días 👋" : "Hello 👋"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f1ec" }}>
            {lang === "fr" ? "Ton tableau de bord" : lang === "es" ? "Tu panel" : "Your dashboard"}
          </div>
        </div>
        <NotificationBell lang={lang} userId={userId} />
      </div>

      {/* 1. Message Admin urgent */}
      {userId && <AdminMessageCard lang={lang} userId={userId} userState={userState} />}

      {/* 2. CircularHero */}
      <CircularHero currentPhase={currentPhase} phaseProgress={phaseProgress} lang={lang} />

      {/* 3. Kuabo Score */}
      <KuaboScoreWidget score={score} streak={streak} badges={badges} lang={lang} />

      {/* 4. Countdown */}
      <CountdownSection arrivalDate={arrivalDate} lang={lang} completedSteps={completedSteps} onOpenStep={onOpenStep} />

      {/* 5. Army */}
      {armyStatus && <ArmyBanner armyStatus={armyStatus} lang={lang} onViewGuide={onViewArmyGuide} />}

      {/* 6. Kuabo AI animé */}
      <KuaboAIButton lang={lang} completedSteps={completedSteps} userState={userState} userCity={userCity} />

      {/* 7. Conseil du jour animé */}
      <DailyTip lang={lang} userState={userState} userCountry={userCountry} />

      {/* 8. Pub + Events */}
      {userId && <AdminEventsAndPub lang={lang} userState={userState} userCountry={userCountry} userId={userId} />}

      {/* 9. Parcours Spotify dark */}
      <ParcourSection
        lang={lang}
        completedSteps={completedSteps}
        currentPhase={currentPhase}
        phaseProgress={phaseProgress}
        onOpenStep={onOpenStep}
      />

      {/* 10. Streak */}
      {streak > 0 && (
        <div style={{ background: "#0f1521", border: `1px solid ${streakColor}20`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Flame size={20} color={streakColor} />
          <div style={{ flex: 1 }}><span style={{ fontSize: 20, fontWeight: 800, color: streakColor }}>{streak}</span><span style={{ fontSize: 12, color: "#aaa", marginLeft: 6 }}>{lang === "fr" ? "jours de suite" : lang === "es" ? "días seguidos" : "days in a row"}</span></div>
          <span style={{ fontSize: 12, color: "#555" }}>{streak >= 7 ? "🔥" : streak >= 3 ? "💪" : "⭐"}</span>
        </div>
      )}

      {/* Détail phases */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 12, fontWeight: 600 }}>
          📋 {lang === "fr" ? "Détail des phases" : lang === "es" ? "Detalle de fases" : "Phase details"}
        </div>
        {([1, 2, 3, 4, 5] as PhaseId[]).map((pid) => (
          <PhaseCard key={pid} phaseId={pid} lang={lang} completedSteps={completedSteps} onOpenStep={onOpenStep} isActive={pid === currentPhase} isUnlocked={isPhaseUnlocked(pid, completedSteps)} />
        ))}
      </div>
    </>
  );
}
