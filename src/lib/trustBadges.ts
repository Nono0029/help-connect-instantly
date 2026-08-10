export type TrustTier = "newcomer" | "helper5" | "helper10" | "trusted";

export interface TrustBadge {
  key: TrustTier;
  label: string;
  icon: "sprout" | "sparkles" | "star" | "shield";
}

const TIERS: TrustBadge[] = [
  { key: "trusted", label: "Voisin de confiance", icon: "shield" },
  { key: "helper10", label: "10 missions", icon: "star" },
  { key: "helper5", label: "5 missions", icon: "sparkles" },
  { key: "newcomer", label: "Nouveau voisin", icon: "sprout" },
];

export function computeBadge(missionsCompleted: number, noteAvg: number): TrustBadge {
  if (missionsCompleted >= 25 && noteAvg > 4.5) return TIERS[0];
  if (missionsCompleted >= 10) return TIERS[1];
  if (missionsCompleted >= 5) return TIERS[2];
  return TIERS[3];
}

export function badgeLabel(tier: TrustBadge, t: (key: string) => string): string {
  switch (tier.key) {
    case "trusted": return t("badges.trusted");
    case "helper10": return t("badges.helper10");
    case "helper5": return t("badges.helper5");
    default: return t("badges.newcomer");
  }
}
