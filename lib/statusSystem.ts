// lib/statusSystem.ts
// ══════════════════════════════════════════════
// SYSTÈME DE STATUT KUABO
// ══════════════════════════════════════════════

export type UserStatus = "not_arrived" | "new" | "settling" | "established";

export function computeStatus(data: {
  arrivalConfirmed?: boolean;
  arrivalDate?: string | null;
  arrival?: string;
  preArrivalCompleted?: boolean;
}): UserStatus {

  // ✅ Si preArrivalCompleted → accès dashboard même sans arrivalConfirmed
  // Évite la boucle infinie pre-arrival → dashboard → pre-arrival
  if (data.preArrivalCompleted) {
    if (!data.arrivalConfirmed) return "new";
    // Calculer depuis arrivalDate
    if (data.arrivalDate) {
      const days = computeDaysInUSA(data.arrivalDate);
      if (days < 30)  return "new";
      if (days < 365) return "settling";
      return "established";
    }
    return "new";
  }

  // ✅ Pas confirmé ET pas complété → not_arrived
  if (!data.arrivalConfirmed) {
    // Fallback sur l'ancien champ "arrival" de step2
    if (data.arrival === "new")     return "new";
    if (data.arrival === "months")  return "settling";
    if (data.arrival === "settled") return "established";
    return "not_arrived";
  }

  // ✅ Confirmé → calculer depuis arrivalDate
  if (data.arrivalDate) {
    const days = computeDaysInUSA(data.arrivalDate);
    if (days < 30)  return "new";
    if (days < 365) return "settling";
    return "established";
  }

  return "new";
}

export function computeDaysInUSA(arrivalDate: string | null): number {
  if (!arrivalDate) return 0;
  const arrival = new Date(arrivalDate);
  const today   = new Date();
  return Math.max(0, Math.floor((today.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)));
}

export function isArrivalDatePassed(arrivalDate: string | null): boolean {
  if (!arrivalDate) return false;
  return new Date(arrivalDate) <= new Date();
}
