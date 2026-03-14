import { UserRole } from "@prisma/client";

export type Feature =
  | "ad_search"
  | "ad_anatomy"
  | "remix_hooks"
  | "remix_script"
  | "remix_copy"
  | "remix_brief"
  | "remix_wireframe"
  | "predictive_alerts"
  | "team_seats"
  | "api_access"
  | "white_label"
  | "client_workspaces"
  | "bulk_export";

export interface PlanConfig {
  role: UserRole;
  name: string;
  price: number; // monthly USD
  stripePriceEnvKey: string;
  description: string;
  creditsPerMonth: number; // -1 = unlimited
  searchesPerDay: number; // -1 = unlimited
  teamSeats: number;
  features: Feature[];
  highlight: boolean;
  badge?: string;
}

export const PLANS: Record<UserRole, PlanConfig> = {
  FREE: {
    role: UserRole.FREE,
    name: "Free",
    price: 0,
    stripePriceEnvKey: "",
    description: "Get started exploring winning ads.",
    creditsPerMonth: 0,
    searchesPerDay: 10,
    teamSeats: 1,
    features: ["ad_search"],
    highlight: false,
  },
  PRO: {
    role: UserRole.PRO,
    name: "Pro",
    price: 59,
    stripePriceEnvKey: "STRIPE_PRICE_PRO_MONTHLY",
    description: "Full ad intelligence for solo marketers.",
    creditsPerMonth: 50,
    searchesPerDay: -1,
    teamSeats: 1,
    features: [
      "ad_search",
      "ad_anatomy",
      "remix_hooks",
      "remix_script",
      "remix_copy",
      "remix_brief",
    ],
    highlight: true,
    badge: "Most Popular",
  },
  SCALE: {
    role: UserRole.SCALE,
    name: "Scale",
    price: 149,
    stripePriceEnvKey: "STRIPE_PRICE_SCALE_MONTHLY",
    description: "Unlimited power for growing teams.",
    creditsPerMonth: -1,
    searchesPerDay: -1,
    teamSeats: 5,
    features: [
      "ad_search",
      "ad_anatomy",
      "remix_hooks",
      "remix_script",
      "remix_copy",
      "remix_brief",
      "remix_wireframe",
      "predictive_alerts",
      "team_seats",
      "api_access",
    ],
    highlight: false,
  },
  AGENCY: {
    role: UserRole.AGENCY,
    name: "Agency",
    price: 299,
    stripePriceEnvKey: "STRIPE_PRICE_AGENCY_MONTHLY",
    description: "White-label intelligence for agencies.",
    creditsPerMonth: -1,
    searchesPerDay: -1,
    teamSeats: 15,
    features: [
      "ad_search",
      "ad_anatomy",
      "remix_hooks",
      "remix_script",
      "remix_copy",
      "remix_brief",
      "remix_wireframe",
      "predictive_alerts",
      "team_seats",
      "api_access",
      "white_label",
      "client_workspaces",
      "bulk_export",
    ],
    highlight: false,
  },
};

export const FEATURE_LABELS: Record<Feature, string> = {
  ad_search: "Ad search & discovery",
  ad_anatomy: "AI ad anatomy breakdown",
  remix_hooks: "Hook alternatives (AI)",
  remix_script: "Script rewriter (AI)",
  remix_copy: "Ad copy generator (AI)",
  remix_brief: "Creative brief generator (AI)",
  remix_wireframe: "Landing page wireframe (AI)",
  predictive_alerts: "Early velocity alerts",
  team_seats: "Team seats",
  api_access: "API access",
  white_label: "White-label reports",
  client_workspaces: "Client workspaces",
  bulk_export: "Bulk export",
};

// Role hierarchy: higher index = more access
const ROLE_ORDER: UserRole[] = [
  UserRole.FREE,
  UserRole.PRO,
  UserRole.SCALE,
  UserRole.AGENCY,
];

export function roleRank(role: UserRole): number {
  return ROLE_ORDER.indexOf(role);
}

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleRank(userRole) >= roleRank(requiredRole);
}

export function canAccessFeature(userRole: UserRole, feature: Feature): boolean {
  return PLANS[userRole].features.includes(feature);
}
