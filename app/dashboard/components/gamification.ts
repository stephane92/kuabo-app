// ══════════════════════════════════════════════
// KUABO GAMIFICATION SYSTEM
// ══════════════════════════════════════════════

import type { PhaseId } from "./data";
import { PHASE_STEPS } from "./data";

// ── Types ──────────────────────────────────────
export type Badge = {
  id:       string;
  emoji:    string;
  label:    Record<"fr"|"en"|"es", string>;
  desc:     Record<"fr"|"en"|"es", string>;
  color:    string;
  unlocked: boolean;
};

// ── Définition des badges ─────────────────────
export const BADGE_DEFS = [
  {
    id: "arrival",
    emoji: "🛬",
    label: { fr:"Atterrissage", en:"Landing", es:"Aterrizaje" },
    desc:  { fr:"Arrivée aux USA confirmée", en:"Arrival in the USA confirmed", es:"Llegada a EE.UU. confirmada" },
    color: "#22c55e",
    condition: (opts: BadgeOpts) => opts.arrivalConfirmed,
  },
  {
    id: "ssn_flash",
    emoji: "🪪",
    label: { fr:"SSN Flash", en:"SSN Flash", es:"SSN Flash" },
    desc:  { fr:"SSN obtenu en moins de 10 jours", en:"SSN obtained in less than 10 days", es:"SSN obtenido en menos de 10 días" },
    color: "#e8b84b",
    condition: (opts: BadgeOpts) => {
      if (!opts.completedSteps.includes("ssn") || !opts.arrivalDate) return false;
      const days = Math.floor((Date.now() - new Date(opts.arrivalDate + "T12:00:00").getTime()) / 86400000);
      return days <= 10;
    },
  },
  {
    id: "banker",
    emoji: "🏦",
    label: { fr:"Banquier", en:"Banker", es:"Banquero" },
    desc:  { fr:"Compte bancaire ouvert", en:"Bank account opened", es:"Cuenta bancaria abierta" },
    color: "#2dd4bf",
    condition: (opts: BadgeOpts) => opts.completedSteps.includes("bank"),
  },
  {
    id: "employed",
    emoji: "💼",
    label: { fr:"Employé", en:"Employed", es:"Empleado" },
    desc:  { fr:"Premier emploi trouvé aux USA", en:"First job found in the USA", es:"Primer empleo encontrado en EE.UU." },
    color: "#a78bfa",
    condition: (opts: BadgeOpts) => opts.completedSteps.includes("job"),
  },
  {
    id: "streak_7",
    emoji: "🔥",
    label: { fr:"Régulier", en:"Regular", es:"Regular" },
    desc:  { fr:"7 jours de connexion consécutifs", en:"7 consecutive login days", es:"7 días consecutivos de conexión" },
    color: "#ef4444",
    condition: (opts: BadgeOpts) => opts.streak >= 7,
  },
  {
    id: "phase1",
    emoji: "🏆",
    label: { fr:"Phase 1 Done", en:"Phase 1 Done", es:"Fase 1 Hecha" },
    desc:  { fr:"Phase 1 entièrement complétée", en:"Phase 1 fully completed", es:"Fase 1 completamente completada" },
    color: "#e8b84b",
    condition: (opts: BadgeOpts) => {
      const ids = PHASE_STEPS[1].map((s: any) => s.id);
      return ids.every((id: string) => opts.completedSteps.includes(id));
    },
  },
  {
    id: "phase5",
    emoji: "🦅",
    label: { fr:"Citoyen", en:"Citizen", es:"Ciudadano" },
    desc:  { fr:"Phase 5 entièrement complétée", en:"Phase 5 fully completed", es:"Fase 5 completamente completada" },
    color: "#f97316",
    condition: (opts: BadgeOpts) => {
      const ids = PHASE_STEPS[5].map((s: any) => s.id);
      return ids.every((id: string) => opts.completedSteps.includes(id));
    },
  },
  {
    id: "ambassador",
    emoji: "🤝",
    label: { fr:"Ambassadeur", en:"Ambassador", es:"Embajador" },
    desc:  { fr:"3 employeurs recommandés", en:"3 employers recommended", es:"3 empleadores recomendados" },
    color: "#22c55e",
    condition: (opts: BadgeOpts) => (opts.jobRecommendations || 0) >= 3,
  },
  {
    id: "homeowner",
    emoji: "🏠",
    label: { fr:"Logé", en:"Housed", es:"Alojado" },
    desc:  { fr:"Logement permanent trouvé", en:"Permanent housing found", es:"Vivienda permanente encontrada" },
    color: "#2dd4bf",
    condition: (opts: BadgeOpts) => opts.completedSteps.includes("housing"),
  },
  {
    id: "driver",
    emoji: "🚗",
    label: { fr:"Conducteur", en:"Driver", es:"Conductor" },
    desc:  { fr:"Permis de conduire obtenu", en:"Driver's license obtained", es:"Licencia de conducir obtenida" },
    color: "#a78bfa",
    condition: (opts: BadgeOpts) => opts.completedSteps.includes("license"),
  },
];

export type BadgeOpts = {
  completedSteps:    string[];
  arrivalConfirmed:  boolean;
  arrivalDate:       string | null;
  streak:            number;
  jobRecommendations?: number;
};

// ── Calcul score ───────────────────────────────
export function computeKuaboScore(opts: {
  completedSteps:   string[];
  streak:           number;
  jobRecommendations?: number;
  jobLikes?:        number;
}): number {
  let score = 0;

  // +10 par étape complétée
  score += opts.completedSteps.length * 10;

  // +50 par phase entièrement complétée
  const phaseIds: PhaseId[] = [1, 2, 3, 4, 5];
  for (const pid of phaseIds) {
    const ids = PHASE_STEPS[pid].map((s: any) => s.id);
    if (ids.every((id: string) => opts.completedSteps.includes(id))) {
      score += 50;
    }
  }

  // +5 par jour de streak
  score += opts.streak * 5;

  // +20 par recommandation employeur
  score += (opts.jobRecommendations || 0) * 20;

  // +2 par like donné
  score += (opts.jobLikes || 0) * 2;

  return Math.min(score, 1000); // Cap à 1000
}

// ── Calcul badges débloqués ────────────────────
export function computeBadges(opts: BadgeOpts): Badge[] {
  return BADGE_DEFS.map(def => ({
    id:       def.id,
    emoji:    def.emoji,
    label:    def.label,
    desc:     def.desc,
    color:    def.color,
    unlocked: def.condition(opts),
  }));
}

// ── Score label ────────────────────────────────
export function getScoreLabel(score: number, lang: "fr"|"en"|"es"): string {
  if (score < 100) return { fr:"Débutant", en:"Beginner", es:"Principiante" }[lang];
  if (score < 250) return { fr:"En chemin", en:"On the way", es:"En camino" }[lang];
  if (score < 500) return { fr:"Installé", en:"Settling in", es:"Instalándose" }[lang];
  if (score < 750) return { fr:"Confirmé", en:"Confirmed", es:"Confirmado" }[lang];
  if (score < 1000) return { fr:"Expert", en:"Expert", es:"Experto" }[lang];
  return { fr:"🏆 Légendaire", en:"🏆 Legendary", es:"🏆 Legendario" }[lang];
}
