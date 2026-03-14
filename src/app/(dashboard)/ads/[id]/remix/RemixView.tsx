"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type {
  HooksOutput,
  ScriptsOutput,
  AdCopyOutput,
  CreativeBrief,
} from "@/services/remixEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdInfo {
  id: string;
  brandName: string;
  productName: string | null;
  niche: string;
  platform: string;
  adType: string;
  duration: number | null;
  thumbnailUrl: string | null;
  isActive: boolean;
}

interface RemixViewProps {
  ad: AdInfo;
  userRole: string;
  creditsRemaining: number | null; // null = unlimited
  creditsTotal: number | null;     // null = unlimited
}

type TabId = "hooks" | "scripts" | "adcopy" | "brief";

interface TabResults {
  hooks?: HooksOutput;
  scripts?: ScriptsOutput;
  adcopy?: AdCopyOutput;
  brief?: CreativeBrief;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHE_EMOJI: Record<string, string> = {
  beauty: "💄", kitchen: "🍳", pets: "🐾", fitness: "💪",
  tech: "💻", home_decor: "🏠", fashion: "👗", health: "🌿",
  gaming: "🎮", finance: "💰", education: "📚", other: "📦",
};

const PLATFORM_CONFIG: Record<string, { label: string; dotClass: string }> = {
  TIKTOK:    { label: "TikTok",    dotClass: "bg-[#ff0050]" },
  FACEBOOK:  { label: "Facebook",  dotClass: "bg-[#1877f2]" },
  INSTAGRAM: { label: "Instagram", dotClass: "bg-[#e1306c]" },
  YOUTUBE:   { label: "YouTube",   dotClass: "bg-[#ff0000]" },
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "hooks",   label: "Alt Hooks",         icon: "⚡" },
  { id: "scripts", label: "Script Variations",  icon: "📄" },
  { id: "adcopy",  label: "Ad Copy Sets",       icon: "✍️" },
  { id: "brief",   label: "Creative Brief",     icon: "📋" },
];

const TAB_META: Record<TabId, {
  title: string;
  description: string;
  bullets: string[];
  generatingText: string;
  cost: string;
  endpoint: string;
}> = {
  hooks: {
    title:          "Generate 8 Hook Variations",
    description:    "One hook per psychological framework, reverse-engineered from this ad's winning DNA.",
    bullets: [
      "8 frameworks: Curiosity Gap, Bold Claim, POV, Problem-Agitate, Social Proof Lead, Controversial, Story Open, Pattern Interrupt",
      "Reasoning behind why each hook works for this specific audience",
      "Platform-calibrated voice and tone",
    ],
    generatingText: "Forging hooks...",
    cost:           "1 credit",
    endpoint:       "hooks",
  },
  scripts: {
    title:          "Generate 3 Script Variations",
    description:    "Same product, completely different creative angles — each a full production script with timestamps.",
    bullets: [
      "3 distinctly different creative angles (Villain Origin, Skeptic's Journey, Day-in-the-Life...)",
      "Full timestamped scripts with visual direction + audio copy",
      "Duration-matched to the original ad",
    ],
    generatingText: "Forging scripts...",
    cost:           "1 credit",
    endpoint:       "scripts",
  },
  adcopy: {
    title:          "Generate 4 Ad Copy Sets",
    description:    "Platform-calibrated copy sets, each built on a different persuasion architecture.",
    bullets: [
      "4 persuasion angles: Fear of Losing, Social Identity, Skeptic Reframe, Proof-First...",
      "Headline + primary text + description + CTA button per set",
      "Voice and tone tuned for the original platform",
    ],
    generatingText: "Forging copy...",
    cost:           "1 credit",
    endpoint:       "adcopy",
  },
  brief: {
    title:          "Generate Creative Brief",
    description:    "A production-ready brief your creative team can execute from — no kickoff meeting needed.",
    bullets: [
      "Full shot list with timing and shot type",
      "Target audience with psychographic profile + consumption context",
      "Visual direction, music direction, avoid list, and style references",
    ],
    generatingText: "Forging brief...",
    cost:           "1 credit",
    endpoint:       "brief",
  },
};

// Cycle through these for angle/type tags
const ANGLE_COLORS = [
  "bg-accent/15 text-accent border-accent/30",
  "bg-primary/15 text-primary border-primary/30",
  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "bg-success/15 text-success border-success/30",
  "bg-warning/15 text-warning border-warning/30",
  "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "bg-danger/15 text-danger border-danger/30",
];

const HOOK_TYPE_COLORS: Record<string, string> = {
  "Curiosity Gap":     "bg-primary/15 text-primary border-primary/30",
  "Bold Claim":        "bg-accent/15 text-accent border-accent/30",
  "POV":               "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Problem-Agitate":   "bg-danger/15 text-danger border-danger/30",
  "Social Proof Lead": "bg-success/15 text-success border-success/30",
  "Controversial":     "bg-warning/15 text-warning border-warning/30",
  "Story Open":        "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Pattern Interrupt": "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

// ─── Brief export ─────────────────────────────────────────────────────────────

function buildBriefText(brief: CreativeBrief, adName: string): string {
  const hr1 = "=".repeat(60);
  const hr2 = "-".repeat(40);
  const lines: string[] = [
    `CREATIVE BRIEF — ${adName}`,
    hr1, "",
    "OVERVIEW", hr2, brief.overview, "",
    "TARGET AUDIENCE", hr2,
    `Primary:   ${brief.targetAudience.primary}`,
    `Mindset:   ${brief.targetAudience.psychographic}`,
    `Context:   ${brief.targetAudience.contentConsumptionContext}`, "",
    "KEY MESSAGE", hr2, brief.keyMessage, "",
    "TONE & STYLE", hr2, brief.toneAndStyle, "",
    "VISUAL DIRECTION", hr2,
    `Aesthetic:     ${brief.visualDirection.aesthetic}`,
    `Colour Notes:  ${brief.visualDirection.colorNotes}`,
    `Text Overlays: ${brief.visualDirection.textOverlayStyle}`,
    `Avoid:         ${brief.visualDirection.avoidList.join(" · ")}`, "",
    "SHOT LIST", hr2,
    ...brief.shotList.map((s) =>
      `  Shot ${s.shot} [${s.type}] ${s.duration}s — ${s.description}`
    ), "",
    "MUSIC DIRECTION", hr2,
    `Mood:       ${brief.musicDirection.mood}`,
    `Tempo:      ${brief.musicDirection.tempo}`,
    `References: ${brief.musicDirection.references}`, "",
    "SPECS", hr2,
    `Dimensions: ${brief.dimensions}`,
    `Duration:   ${brief.duration ? `${brief.duration}s` : "Static"}`, "",
    "CTA STRATEGY", hr2,
    `CTA:       ${brief.ctaStrategy.primaryCta}`,
    `Placement: ${brief.ctaStrategy.placement}`,
    `Urgency:   ${brief.ctaStrategy.urgencyMechanic ?? "None"}`, "",
    "REFERENCES", hr2,
    ...brief.references.map((r) => `  · ${r}`), "",
    hr1,
    `Generated by Adslack Forge Remix · ${new Date().toLocaleDateString()}`,
  ];
  return lines.join("\n");
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RemixView({ ad, userRole, creditsRemaining, creditsTotal }: RemixViewProps) {
  const [activeTab, setActiveTab]         = useState<TabId>("hooks");
  const [results, setResults]             = useState<TabResults>({});
  const [generating, setGenerating]       = useState<TabId | null>(null);
  const [errors, setErrors]               = useState<Partial<Record<TabId, string>>>({});
  const [credits, setCredits]             = useState(creditsRemaining);
  const [toast, setToast]                 = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade]     = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<TabId | null>(null);
  const [expandedScripts, setExpandedScripts] = useState<Set<number>>(new Set());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platform  = PLATFORM_CONFIG[ad.platform] ?? { label: ad.platform, dotClass: "bg-muted" };
  const emoji     = NICHE_EMOJI[ad.niche] ?? "📦";
  const adTitle   = ad.productName ?? ad.brandName;
  const isUnlimited = credits === null;

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ── Copy helper ───────────────────────────────────────────────────────────
  const copy = useCallback((text: string, label = "Copied!") => {
    navigator.clipboard.writeText(text).then(() => showToast(label));
  }, [showToast]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const executeGenerate = useCallback(async (tab: TabId) => {
    setGenerating(tab);
    setErrors((prev) => ({ ...prev, [tab]: undefined }));

    try {
      const res = await fetch(`/api/ads/${ad.id}/remix/${TAB_META[tab].endpoint}`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; reason?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as Record<string, unknown>;

      // Update cached results
      setResults((prev) => ({
        ...prev,
        [tab]: data[tab === "adcopy" ? "copies" : tab === "brief" ? "brief" : tab === "hooks" ? "hooks" : "scripts"],
      }));

      // Decrement credits locally
      if (!isUnlimited) {
        setCredits((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [tab]: err instanceof Error ? err.message : "Generation failed",
      }));
    } finally {
      setGenerating(null);
    }
  }, [ad.id, isUnlimited]);

  const handleGenerate = useCallback((tab: TabId) => {
    // FREE tier gate
    if (userRole === "FREE") {
      setShowUpgrade(true);
      return;
    }
    // Low credit warning (< 5)
    if (!isUnlimited && credits !== null && credits < 5) {
      setPendingConfirm(tab);
      return;
    }
    executeGenerate(tab);
  }, [userRole, isUnlimited, credits, executeGenerate]);

  const confirmLowCredit = useCallback(() => {
    if (pendingConfirm) {
      setPendingConfirm(null);
      executeGenerate(pendingConfirm);
    }
  }, [pendingConfirm, executeGenerate]);

  // ── Script expand toggle ──────────────────────────────────────────────────
  const toggleScript = useCallback((idx: number) => {
    setExpandedScripts((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const isGeneratingThisTab = generating === activeTab;
  const hasResult = !!results[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-6 space-y-6">

        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href={`/ads/${ad.id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono">←</span> Back to X-Ray
          </Link>
          {/* Credits badge */}
          <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            isUnlimited
              ? "bg-success/10 text-success border-success/30"
              : credits === 0
              ? "bg-danger/10 text-danger border-danger/30"
              : credits !== null && credits < 5
              ? "bg-warning/10 text-warning border-warning/30"
              : "bg-surface-2 text-muted-foreground border-border"
          }`}>
            <span className="text-[10px]">⚡</span>
            {isUnlimited
              ? "Unlimited credits"
              : `${credits ?? 0}${creditsTotal ? `/${creditsTotal}` : ""} credits remaining`}
          </div>
        </div>

        {/* ── Ad identity header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
          {/* Thumbnail */}
          {ad.thumbnailUrl ? (
            <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-3">
              <Image
                src={ad.thumbnailUrl}
                alt={ad.brandName}
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
          ) : (
            <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-2xl">
              {emoji}
            </div>
          )}

          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {ad.niche.replace("_", " ")}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${platform.dotClass}`} />
                {platform.label}
              </span>
              {ad.isActive && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                  ● Live
                </span>
              )}
            </div>
            <h1 className="font-bold text-foreground truncate leading-tight">
              {adTitle}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{ad.brandName}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold text-accent uppercase tracking-widest">Forge Remix</p>
            <p className="text-[10px] text-muted mt-0.5 max-w-[160px] leading-relaxed">
              AI variations based on winning ad DNA
            </p>
          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab) => {
            const isActive  = activeTab === tab.id;
            const hasData   = !!results[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-accent text-white border-accent shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                    : "bg-surface border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {/* Green dot if result cached */}
                {hasData && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border border-background" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Generation area ────────────────────────────────────────────── */}
        <div className="min-h-[420px]">
          {/* Empty state */}
          {!hasResult && !isGeneratingThisTab && (
            <EmptyState
              tab={activeTab}
              error={errors[activeTab]}
              onGenerate={() => handleGenerate(activeTab)}
              disabled={credits === 0 && !isUnlimited}
            />
          )}

          {/* Generating */}
          {isGeneratingThisTab && (
            <GeneratingSpinner text={TAB_META[activeTab].generatingText} />
          )}

          {/* Results */}
          {hasResult && !isGeneratingThisTab && (
            <div className="space-y-3">
              {/* Regenerate bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  {activeTab === "hooks"   && `${results.hooks?.length ?? 0} hooks generated`}
                  {activeTab === "scripts" && `${results.scripts?.length ?? 0} scripts generated`}
                  {activeTab === "adcopy"  && `${results.adcopy?.length ?? 0} copy sets generated`}
                  {activeTab === "brief"   && "Brief generated"}
                </span>
                <button
                  onClick={() => handleGenerate(activeTab)}
                  disabled={credits === 0 && !isUnlimited}
                  className="btn-secondary h-7 px-3 text-[11px] disabled:opacity-40"
                >
                  ↺ Regenerate
                </button>
              </div>

              {/* Per-type renderers */}
              {activeTab === "hooks"   && results.hooks   && (
                <HookResults hooks={results.hooks} onCopy={copy} />
              )}
              {activeTab === "scripts" && results.scripts && (
                <ScriptResults
                  scripts={results.scripts}
                  expanded={expandedScripts}
                  onToggle={toggleScript}
                  onCopy={copy}
                />
              )}
              {activeTab === "adcopy" && results.adcopy && (
                <AdCopyResults copies={results.adcopy} onCopy={copy} />
              )}
              {activeTab === "brief" && results.brief && (
                <BriefResult
                  brief={results.brief}
                  adName={`${ad.brandName}${ad.productName ? ` · ${ad.productName}` : ""}`}
                  onCopy={copy}
                />
              )}
            </div>
          )}
        </div>

        <div className="h-10" />
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 rounded-full border border-success/30 bg-surface-2 px-4 py-2 text-sm font-medium text-success shadow-lg">
          <span>✓</span> {toast}
        </div>
      </div>

      {/* ── Low credit confirmation modal ─────────────────────────────────── */}
      {pendingConfirm && (
        <Modal onClose={() => setPendingConfirm(null)}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h3 className="text-center font-bold text-foreground mb-2">Running low on credits</h3>
          <p className="text-center text-sm text-muted-foreground mb-6">
            You have <strong className="text-warning">{credits} credit{credits === 1 ? "" : "s"}</strong> remaining.
            This will use 1 credit. Continue?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setPendingConfirm(null)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmLowCredit}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              Generate anyway
            </button>
          </div>
        </Modal>
      )}

      {/* ── Upgrade modal ──────────────────────────────────────────────────── */}
      {showUpgrade && (
        <Modal onClose={() => setShowUpgrade(false)}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-3xl mx-auto mb-4">
            ⚡
          </div>
          <h3 className="text-center font-bold text-foreground text-lg mb-2">
            Forge Remix is a PRO feature
          </h3>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Upgrade to PRO to generate hooks, scripts, ad copy sets, and creative briefs from any winning ad.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUpgrade(false)}
              className="flex-1 btn-secondary"
            >
              Maybe later
            </button>
            <Link
              href="/pricing"
              className="flex-1 text-center rounded-lg bg-gradient-to-r from-accent to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(249,115,22,0.3)] hover:shadow-[0_0_24px_rgba(249,115,22,0.5)] transition-all"
            >
              Upgrade to PRO →
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  tab, error, onGenerate, disabled,
}: {
  tab: TabId;
  error?: string;
  onGenerate: () => void;
  disabled: boolean;
}) {
  const meta = TAB_META[tab];
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-8 py-14 flex flex-col items-center text-center gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-3xl shadow-[0_0_20px_rgba(249,115,22,0.15)]">
        ⚒️
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-bold text-foreground">{meta.title}</h2>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <ul className="space-y-1.5 text-left max-w-md w-full">
        {meta.bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2 text-xs text-muted-foreground">
            <span className="shrink-0 mt-0.5 text-accent">✦</span>
            {bullet}
          </li>
        ))}
      </ul>
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-orange-400 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(249,115,22,0.3)] hover:shadow-[0_0_36px_rgba(249,115,22,0.5)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <span>⚡</span>
        Generate · {meta.cost}
      </button>
      {disabled && (
        <p className="text-xs text-danger">
          You&apos;ve used all your credits. <Link href="/pricing" className="underline">Upgrade your plan</Link> to get more.
        </p>
      )}
    </div>
  );
}

// ─── Generating spinner ───────────────────────────────────────────────────────

function GeneratingSpinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-accent/20 animate-spin border-t-accent" />
        <div className="absolute inset-0 rounded-full bg-accent/5 animate-pulse" />
        <div className="absolute inset-2 flex items-center justify-center text-xl">
          ⚡
        </div>
      </div>
      <div className="space-y-1 text-center">
        <p className="font-semibold text-foreground">{text}</p>
        <p className="text-xs text-muted-foreground">Analysing ad DNA · building variations...</p>
      </div>
    </div>
  );
}

// ─── Hook results ─────────────────────────────────────────────────────────────

function HookResults({
  hooks, onCopy,
}: {
  hooks: HooksOutput;
  onCopy: (text: string, label?: string) => void;
}) {
  return (
    <div className="space-y-3">
      {hooks.map((hook, i) => {
        const tagClass = HOOK_TYPE_COLORS[hook.type] ?? ANGLE_COLORS[i % ANGLE_COLORS.length];
        return (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-4 animate-fade-in flex gap-4"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            <div className="flex-1 min-w-0 space-y-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tagClass}`}>
                {hook.type}
              </span>
              <p className="text-base font-medium italic leading-relaxed text-foreground">
                &ldquo;{hook.hook}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hook.reasoning}
              </p>
            </div>
            <button
              onClick={() => onCopy(hook.hook, "Hook copied!")}
              className="shrink-0 self-start btn-secondary h-7 px-2.5 text-[11px]"
            >
              Copy
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Script results ───────────────────────────────────────────────────────────

function ScriptResults({
  scripts, expanded, onToggle, onCopy,
}: {
  scripts: ScriptsOutput;
  expanded: Set<number>;
  onToggle: (i: number) => void;
  onCopy: (text: string, label?: string) => void;
}) {
  return (
    <div className="space-y-3">
      {scripts.map((script, i) => {
        const isOpen   = expanded.has(i);
        const tagClass = ANGLE_COLORS[i % ANGLE_COLORS.length];
        const scriptText = script.script
          .map((l) => `${l.timestamp.padEnd(8)} [${l.visual}]\n         ${l.audio}`)
          .join("\n\n");

        return (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface overflow-hidden animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            {/* Header row */}
            <button
              onClick={() => onToggle(i)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tagClass}`}>
                  {script.angle}
                </span>
                {!isOpen && (
                  <p className="text-xs text-muted-foreground italic truncate max-w-xs">
                    {script.rationale}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onCopy(scriptText, "Script copied!"); }}
                  className="btn-secondary h-7 px-2.5 text-[11px]"
                >
                  Copy Script
                </button>
                <span className="text-muted font-mono text-sm">
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t border-border">
                <p className="px-4 py-3 text-xs italic text-muted-foreground leading-relaxed border-b border-border/60 bg-surface-2/30">
                  {script.rationale}
                </p>
                {/* Script code block */}
                <div className="border-b border-border bg-surface-3/30 px-4 py-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-danger/50" />
                  <div className="h-2 w-2 rounded-full bg-warning/50" />
                  <div className="h-2 w-2 rounded-full bg-success/50" />
                  <span className="ml-1 font-mono text-[10px] text-muted">script.txt</span>
                </div>
                <div className="divide-y divide-border/40 font-mono">
                  {script.script.map((line, j) => (
                    <div key={j} className="grid grid-cols-[56px_1fr] px-4 py-2.5 hover:bg-surface-3/40 transition-colors">
                      <span className="text-accent text-xs pt-0.5 shrink-0">{line.timestamp}</span>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted">[{line.visual}]</p>
                        <p className="text-sm text-foreground-2 leading-relaxed break-words">{line.audio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Ad copy results ──────────────────────────────────────────────────────────

function AdCopyResults({
  copies, onCopy,
}: {
  copies: AdCopyOutput;
  onCopy: (text: string, label?: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {copies.map((set, i) => {
        const tagClass = ANGLE_COLORS[i % ANGLE_COLORS.length];
        const formatted = [
          `ANGLE: ${set.angle}`,
          `HEADLINE: ${set.headline}`,
          "",
          set.primaryText,
          "",
          `DESCRIPTION: ${set.description}`,
          `CTA: ${set.ctaButton}`,
        ].join("\n");

        return (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-4 space-y-3 animate-fade-in flex flex-col"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            {/* Angle tag + copy button */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tagClass}`}>
                {set.angle}
              </span>
              <button
                onClick={() => onCopy(formatted, "Copy set copied!")}
                className="btn-secondary h-6 px-2 text-[10px]"
              >
                Copy All
              </button>
            </div>

            {/* Headline */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Headline</p>
              <p className="text-lg font-bold text-foreground leading-tight">{set.headline}</p>
            </div>

            {/* Primary text */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Primary Text</p>
              <p className="text-sm text-foreground-2 leading-relaxed">{set.primaryText}</p>
            </div>

            {/* Description */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Description</p>
              <p className="text-xs text-muted-foreground">{set.description}</p>
            </div>

            {/* CTA preview */}
            <div className="mt-auto pt-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1.5">CTA Button</p>
              <span className="inline-flex items-center rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white">
                {set.ctaButton}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Brief result ─────────────────────────────────────────────────────────────

function BriefResult({
  brief, adName, onCopy,
}: {
  brief: CreativeBrief;
  adName: string;
  onCopy: (text: string, label?: string) => void;
}) {
  const handleExport = () => {
    const text = buildBriefText(brief, adName);
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${adName.toLowerCase().replace(/[\s·]+/g, "-")}-brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden animate-fade-in">
      {/* Brief header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📋</span>
          <div>
            <h3 className="font-bold text-foreground text-sm">Creative Brief</h3>
            <p className="text-[11px] text-muted-foreground">{adName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopy(buildBriefText(brief, adName), "Brief copied!")}
            className="btn-secondary h-7 px-3 text-[11px]"
          >
            Copy Brief
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary h-7 px-3 text-[11px]"
          >
            ↓ Export .txt
          </button>
        </div>
      </div>

      <div className="divide-y divide-border/60 px-6">

        {/* Overview */}
        <BriefSection title="Overview" icon="📌">
          <p className="text-sm text-foreground-2 leading-relaxed">{brief.overview}</p>
        </BriefSection>

        {/* Target Audience */}
        <BriefSection title="Target Audience" icon="🎯">
          <div className="space-y-3">
            <BriefField label="Primary" value={brief.targetAudience.primary} />
            <BriefField label="Psychographic" value={brief.targetAudience.psychographic} />
            <BriefField label="Consumption Context" value={brief.targetAudience.contentConsumptionContext} />
          </div>
        </BriefSection>

        {/* Key Message */}
        <BriefSection title="Key Message" icon="💬">
          <blockquote className="border-l-2 border-accent/50 pl-3">
            <p className="text-sm font-medium italic text-foreground">&ldquo;{brief.keyMessage}&rdquo;</p>
          </blockquote>
        </BriefSection>

        {/* Tone */}
        <BriefSection title="Tone & Style" icon="🎨">
          <p className="text-sm text-foreground-2 leading-relaxed">{brief.toneAndStyle}</p>
        </BriefSection>

        {/* Visual Direction */}
        <BriefSection title="Visual Direction" icon="🎬">
          <div className="space-y-3">
            <BriefField label="Aesthetic" value={brief.visualDirection.aesthetic} />
            <BriefField label="Colour Notes" value={brief.visualDirection.colorNotes} />
            <BriefField label="Text Overlays" value={brief.visualDirection.textOverlayStyle} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-1.5">Avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {brief.visualDirection.avoidList.map((item, i) => (
                  <span key={i} className="rounded-md border border-danger/30 bg-danger/10 px-2 py-0.5 text-xs text-danger">
                    ✕ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </BriefSection>

        {/* Shot List */}
        <BriefSection title="Shot List" icon="🎥">
          <div className="space-y-2">
            {brief.shotList.map((shot) => (
              <div key={shot.shot} className="flex gap-3">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded bg-surface-3 text-[10px] font-bold text-muted-foreground mt-0.5">
                  {shot.shot}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="rounded-sm bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {shot.type}
                    </span>
                    <span className="font-mono text-[10px] text-muted">{shot.duration}s</span>
                  </div>
                  <p className="text-xs text-foreground-2 leading-relaxed">{shot.description}</p>
                </div>
              </div>
            ))}
          </div>
        </BriefSection>

        {/* Music */}
        <BriefSection title="Music Direction" icon="🎵">
          <div className="space-y-2">
            <BriefField label="Mood" value={brief.musicDirection.mood} />
            <BriefField label="Tempo" value={brief.musicDirection.tempo} />
            <BriefField label="References" value={brief.musicDirection.references} />
          </div>
        </BriefSection>

        {/* Specs */}
        <BriefSection title="Specs" icon="📐">
          <div className="space-y-2">
            <BriefField label="Dimensions" value={brief.dimensions} />
            <BriefField label="Duration" value={brief.duration ? `${brief.duration} seconds` : "Static"} />
          </div>
        </BriefSection>

        {/* CTA Strategy */}
        <BriefSection title="CTA Strategy" icon="📣">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Primary CTA</span>
              <span className="rounded-lg bg-primary/90 px-3 py-1 text-xs font-semibold text-white">
                {brief.ctaStrategy.primaryCta}
              </span>
            </div>
            <BriefField label="Placement" value={brief.ctaStrategy.placement} />
            {brief.ctaStrategy.urgencyMechanic && (
              <BriefField label="Urgency Mechanic" value={brief.ctaStrategy.urgencyMechanic} />
            )}
          </div>
        </BriefSection>

        {/* References */}
        <BriefSection title="References" icon="🔗">
          <ul className="space-y-1.5">
            {brief.references.map((ref, i) => (
              <li key={i} className="flex gap-2 text-xs text-foreground-2">
                <span className="shrink-0 text-accent">→</span>
                {ref}
              </li>
            ))}
          </ul>
        </BriefSection>

      </div>
    </div>
  );
}

function BriefSection({
  title, icon, children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{icon}</span>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function BriefField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-0.5">{label}</p>
      <p className="text-sm text-foreground-2 leading-relaxed">{value}</p>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl border border-border bg-surface-2 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-foreground transition-colors text-xs"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
