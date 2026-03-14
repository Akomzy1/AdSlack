"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useSubscription } from "@/hooks/useSubscription";
import { SendBriefModal } from "../SendBriefModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id:        string;
  rating:    number;
  comment:   string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

interface CreatorDetail {
  id:              string;
  name:            string;
  profileImageUrl: string | null;
  bio:             string | null;
  platforms:       string[];
  niches:          string[];
  contentStyles:   string[];
  priceRange:      string;
  turnaroundDays:  number;
  portfolioUrls:   string[];
  rating:          number;
  reviewCount:     number;
  completedBriefs: number;
  country:         string;
  language:        string;
  isVerified:      boolean;
  isAvailable:     boolean;
  createdAt:       string;
  reviews:         Review[];
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const cls   = size === "lg" ? "text-lg" : "text-xs";
  return (
    <span className={`text-yellow-400 ${cls}`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      <span className="text-surface-3">{"★".repeat(empty)}</span>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreatorProfile({ creatorId }: { creatorId: string }) {
  const { role } = useSubscription();
  const [creator, setCreator] = useState<CreatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Check for pending brief from Remix "Send to Creator" flow
  const [pendingBrief, setPendingBrief] = useState<{
    briefType: string; briefContent: unknown; adId?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("pendingBrief");
      if (stored) {
        setPendingBrief(JSON.parse(stored) as { briefType: string; briefContent: unknown; adId?: string });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/creators/${creatorId}`)
      .then((r) => r.json() as Promise<{ creator?: CreatorDetail; error?: string }>)
      .then((data) => {
        if (data.error) setError(data.error);
        else setCreator(data.creator ?? null);
      })
      .catch(() => setError("Failed to load creator"))
      .finally(() => setLoading(false));
  }, [creatorId]);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-32 bg-surface-2 rounded-xl" />
        <div className="h-24 bg-surface-2 rounded-xl" />
        <div className="h-48 bg-surface-2 rounded-xl" />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-24">
        <p className="text-2xl mb-2">😕</p>
        <p className="text-lg font-semibold text-foreground">Creator not found</p>
        <Link href={"/creators" as Route} className="mt-4 text-sm text-accent hover:underline block">
          ← Back to creators
        </Link>
      </div>
    );
  }

  const isPro = role === "PRO" || role === "SCALE" || role === "AGENCY";

  return (
    <>
      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
        {/* Back link */}
        <Link href={"/creators" as Route} className="text-sm text-muted hover:text-accent transition-colors">
          ← Back to creators
        </Link>

        {/* Pending brief banner */}
        {pendingBrief && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 flex items-center gap-3">
            <span className="text-xl">📎</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-accent">Brief ready to send</p>
              <p className="text-xs text-muted mt-0.5">
                Your {pendingBrief.briefType.replace(/_/g, " ").toLowerCase()} will be attached when you send a brief to this creator.
              </p>
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {creator.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.profileImageUrl}
                  alt={creator.name}
                  className="w-20 h-20 rounded-full object-cover bg-surface-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-surface-3 flex items-center justify-center text-3xl font-bold text-muted">
                  {creator.name[0]}
                </div>
              )}
              {creator.isAvailable && (
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-surface" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{creator.name}</h1>
                {creator.isVerified && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    ✓ Verified
                  </span>
                )}
                {creator.isAvailable ? (
                  <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                    Available
                  </span>
                ) : (
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    Unavailable
                  </span>
                )}
                <span className="text-xs text-muted ml-auto">{creator.country} · {creator.language.toUpperCase()}</span>
              </div>

              <div className="flex items-center gap-2 mt-1.5">
                <Stars rating={creator.rating} size="lg" />
                <span className="text-sm font-semibold text-foreground">{creator.rating.toFixed(1)}</span>
                <span className="text-sm text-muted">({creator.reviewCount} reviews)</span>
                <span className="text-sm text-muted">·</span>
                <span className="text-sm text-muted">{creator.completedBriefs} briefs completed</span>
              </div>

              {creator.bio && (
                <p className="text-sm text-muted mt-3 leading-relaxed">{creator.bio}</p>
              )}
            </div>

            {/* CTA */}
            <div className="shrink-0">
              {isPro ? (
                <button
                  onClick={() => setModalOpen(true)}
                  disabled={!creator.isAvailable}
                  className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send Brief
                </button>
              ) : (
                <Link
                  href={"/billing" as Route}
                  className="block px-5 py-2.5 rounded-lg bg-surface-2 border border-accent/30 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors text-center"
                >
                  Upgrade to Send Brief
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Price Range</p>
            <p className="text-base font-semibold text-foreground">{creator.priceRange}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Typical Turnaround</p>
            <p className="text-base font-semibold text-foreground">{creator.turnaroundDays} days</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Member Since</p>
            <p className="text-base font-semibold text-foreground">
              {new Date(creator.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Platforms + Niches + Styles */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {creator.platforms.map((p) => (
                <span key={p} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Niches</p>
            <div className="flex flex-wrap gap-2">
              {creator.niches.map((n) => (
                <span key={n} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground border border-border">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Content Styles</p>
            <div className="flex flex-wrap gap-2">
              {creator.contentStyles.map((s) => (
                <span key={s} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground border border-border">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio */}
        {creator.portfolioUrls.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Portfolio</p>
            <div className="flex flex-wrap gap-2">
              {creator.portfolioUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-xs text-accent hover:bg-surface-3 transition-colors"
                >
                  Sample {i + 1} ↗
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
            Reviews ({creator.reviewCount})
          </p>
          {creator.reviews.length === 0 ? (
            <p className="text-sm text-muted">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {creator.reviews.map((r) => (
                <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {r.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.user.image} alt={r.user.name ?? ""} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-[10px] text-muted font-bold">
                        {r.user.name?.[0] ?? "?"}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-foreground">{r.user.name ?? "Anonymous"}</span>
                    <Stars rating={r.rating} />
                    <span className="text-[10px] text-muted ml-auto">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-muted leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Send Brief Modal */}
      {modalOpen && (
        <SendBriefModal
          creator={creator}
          prefill={pendingBrief ?? undefined}
          onClose={() => {
            setModalOpen(false);
            try { sessionStorage.removeItem("pendingBrief"); } catch { /* ignore */ }
          }}
        />
      )}
    </>
  );
}
