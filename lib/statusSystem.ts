// lib/statusSystem.ts
// ══════════════════════════════════════════════
// SYSTÈME DE STATUT KUABO
// Calcule automatiquement le statut depuis Firebase
// ══════════════════════════════════════════════

export type UserStatus = "not_arrived" | "new" | "settling" | "established";

/**
 * Calcule le statut automatiquement
 * Règle : arrivalConfirmed: false → toujours not_arrived
 * Sinon calculé depuis daysInUSA
 */
export function computeStatus(data: {
  arrivalConfirmed?: boolean;
  arrivalDate?: string | null;
  arrival?: string; // ancien champ step2 ("abroad"|"new"|"months"|"settled")
}): UserStatus {

  // ✅ Pas encore confirmé → toujours not_arrived
  if (!data.arrivalConfirmed) return "not_arrived";

  // Calculer jours depuis arrivalDate
  if (data.arrivalDate) {
    const arrival = new Date(data.arrivalDate);
    const today   = new Date();
    const days    = Math.floor((today.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 30)  return "new";
    if (days < 365) return "settling";
    return "established";
  }

  // Fallback sur l'ancien champ "arrival" de step2
  if (data.arrival === "new")     return "new";
  if (data.arrival === "months")  return "settling";
  if (data.arrival === "settled") return "established";

  return "not_arrived";
}

/**
 * Calcule le nombre de jours aux USA depuis arrivalDate
 */
export function computeDaysInUSA(arrivalDate: string | null): number {
  if (!arrivalDate) return 0;
  const arrival = new Date(arrivalDate);
  const today   = new Date();
  return Math.max(0, Math.floor((today.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Vérifie si la date d'arrivée est passée
 */
export function isArrivalDatePassed(arrivalDate: string | null): boolean {
  if (!arrivalDate) return false;
  return new Date(arrivalDate) <= new Date();
}
