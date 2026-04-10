import { useEffect, useState } from "react";
import { PHASE_STEPS } from "./data";
import type { PhaseId } from "./data";

// ══════════════════════════════════════════════
// STREAK
// ══════════════════════════════════════════════
export function useStreak(userId: string | undefined) {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const today    = new Date().toDateString();
    const key      = "kuabo_streak_" + userId;
    const dateKey  = "kuabo_streak_date_" + userId;
    const lastDate = localStorage.getItem(dateKey);
    const saved    = parseInt(localStorage.getItem(key) || "0");
    if (lastDate === today) { setStreak(saved); return; }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const next = lastDate === yesterday.toDateString() ? saved + 1 : 1;
    localStorage.setItem(key, String(next));
    localStorage.setItem(dateKey, today);
    setStreak(next);
  }, [userId]);
  return streak;
}

// ══════════════════════════════════════════════
// PHASE STATS
// ══════════════════════════════════════════════
export function getPhaseStats(completedSteps: string[]) {
  const phaseIds: PhaseId[] = [1, 2, 3, 4, 5];
  let currentPhase: PhaseId = 1;
  const phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }> = {} as any;

  phaseIds.forEach(pid => {
    const steps = PHASE_STEPS[pid];
    const done  = steps.filter(s => completedSteps.includes(s.id)).length;
    const total = steps.length;
    phaseProgress[pid] = { done, total, pct: Math.round((done / total) * 100) };
  });

  for (const pid of phaseIds) {
    if (phaseProgress[pid].pct < 100) { currentPhase = pid; break; }
    currentPhase = 5;
  }

  return { currentPhase, phaseProgress };
}

// ══════════════════════════════════════════════
// PHASE UNLOCKED
// ══════════════════════════════════════════════
export function isPhaseUnlocked(phaseId: PhaseId, completedSteps: string[]): boolean {
  if (phaseId === 1) return true;
  const prev = (phaseId - 1) as PhaseId;
  return PHASE_STEPS[prev].every(s => completedSteps.includes(s.id));
}

// ══════════════════════════════════════════════
// DATE HELPERS
// ══════════════════════════════════════════════
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function getDaysLeft(dateStr: string, days: number): number {
  const deadline = new Date(dateStr);
  deadline.setDate(deadline.getDate() + days);
  return Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}
