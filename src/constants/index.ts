export const APP_NAME = "Adslack";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    credits: 0,
    adSearchesPerDay: 10,
  },
  pro: {
    name: "Pro",
    price: 59,
    credits: 50,
    adSearchesPerDay: Infinity,
  },
  scale: {
    name: "Scale",
    price: 149,
    credits: Infinity,
    adSearchesPerDay: Infinity,
  },
  agency: {
    name: "Agency",
    price: 299,
    credits: Infinity,
    adSearchesPerDay: Infinity,
  },
} as const;

export const PLATFORMS = {
  meta: { label: "Meta", color: "#1877f2" },
  tiktok: { label: "TikTok", color: "#ff0050" },
} as const;

export const HOOK_TYPES = [
  "curiosity_gap",
  "pain_point",
  "social_proof",
  "pattern_interrupt",
  "bold_claim",
  "question",
  "story",
  "tutorial",
] as const;
