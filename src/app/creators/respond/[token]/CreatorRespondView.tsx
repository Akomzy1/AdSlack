"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BriefData {
  id:            string;
  briefType:     string;
  briefContent:  unknown;
  customMessage: string | null;
  status:        string;
  sentAt:        string;
  respondedAt:   string | null;
  creator:       { id: string; name: string; profileImageUrl: string | null };
  senderName:    string | null;
}

const BRIEF_TYPE_LABELS: Record<string, string> = {
  CREATIVE_BRIEF: "Creative Brief",
  UGC_SCRIPT:     "UGC Script",
  STORYBOARD:     "Storyboard",
  CUSTOM:         "Custom Brief",
};

// ─── Brief content renderer ───────────────────────────────────────────────────

function BriefContentDisplay({ type, content }: { type: string; content: unknown }) {
  if (!content || typeof content !== "object") {
    return <pre className="text-xs text-muted whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>;
  }

  // CUSTOM: just show text
  if (type === "CUSTOM") {
    const c = content as Record<string, unknown>;
    if (typeof c.text === "string") {
      return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.text}</p>;
    }
  }

  // UGC_SCRIPT: show first script summary
  if (type === "UGC_SCRIPT") {
    const scripts = Array.isArray(content) ? content as Record<string, unknown>[] : null;
    if (scripts?.[0]) {
      const s = scripts[0] as Record<string, unknown>;
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {typeof s.platform === "string" && (
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                {s.platform}
              </span>
            )}
            {typeof s.angle === "string" && (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-foreground border border-border">
                {s.angle}
              </span>
            )}
            {typeof s.estimatedDuration === "string" && (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted border border-border">
                ~{s.estimatedDuration}
              </span>
            )}
          </div>
          {Array.isArray(s.sections) && (s.sections as Record<string, unknown>[]).slice(0, 3).map((sec, i) => (
            <div key={i} className="border-l-2 border-accent/30 pl-3">
              <p className="text-[10px] font-semibold text-accent uppercase tracking-wide">
                {typeof sec.type === "string" ? sec.type : `Section ${i + 1}`}
                {typeof sec.timestamp === "string" && <span className="text-muted normal-case"> · {sec.timestamp}</span>}
              </p>
              {typeof sec.spoken === "string" && (
                <p className="text-sm text-foreground mt-1">"{sec.spoken}"</p>
              )}
            </div>
          ))}
          {scripts.length > 1 && (
            <p className="text-xs text-muted">+{scripts.length - 1} more script variation{scripts.length > 2 ? "s" : ""} included</p>
          )}
        </div>
      );
    }
  }

  // Fallback: pretty JSON
  return (
    <pre className="text-xs text-muted whitespace-pre-wrap overflow-auto max-h-64 rounded-lg bg-surface-3 p-3">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function CreatorRespondView({ token }: { token: string }) {
  const [brief, setBrief]     = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [responded, setResponded]   = useState(false);
  const [message, setMessage]       = useState("");
  const [error, setError]           = useState<string | null>(null);

  // Fetch brief by scanning token — we need to find the brief ID first.
  // The API accepts: GET /api/briefs/[id]/respond?token=[token]
  // But we only have the token, not the ID. We'll use a dedicated lookup endpoint.
  useEffect(() => {
    // Use the token-lookup endpoint
    fetch(`/api/briefs/by-token/${token}`)
      .then((r) => r.json() as Promise<BriefData & { error?: string }>)
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBrief(data);
          setBriefId(data.id);
          if (data.status === "ACCEPTED" || data.status === "DECLINED") {
            setResponded(true);
          }
        }
      })
      .catch(() => setError("Failed to load brief"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRespond = async (status: "ACCEPTED" | "DECLINED") => {
    if (!briefId) return;
    setResponding(true);
    setError(null);

    try {
      const res = await fetch(`/api/briefs/${briefId}/respond`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, status, message: message || undefined }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to respond");
      }

      setBrief((b) => b ? { ...b, status } : b);
      setResponded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !brief) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-xl font-semibold text-foreground mb-2">Link not found</p>
          <p className="text-sm text-muted">
            This brief link may be invalid or expired. Please contact the sender directly.
          </p>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const typeLabel = BRIEF_TYPE_LABELS[brief.briefType] ?? brief.briefType;
  const sentDate  = new Date(brief.sentAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">Adslack</span>
          <span className="text-xs text-muted">Creator Portal</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Intro */}
        <div>
          <p className="text-sm text-muted mb-1">From {brief.senderName ?? "a brand"} · {sentDate}</p>
          <h1 className="text-2xl font-bold text-foreground">
            You received a {typeLabel}
          </h1>
          <p className="text-sm text-muted mt-1">
            Hi {brief.creator.name}, please review the brief below and let the sender know if you can take it on.
          </p>
        </div>

        {/* Personal message */}
        {brief.customMessage && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="text-[11px] font-semibold text-accent uppercase tracking-wide mb-2">Message from sender</p>
            <p className="text-sm text-foreground leading-relaxed italic">"{brief.customMessage}"</p>
          </div>
        )}

        {/* Brief content */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-4">{typeLabel}</p>
          <BriefContentDisplay type={brief.briefType} content={brief.briefContent} />
        </div>

        {/* Response area */}
        {responded ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            {brief.status === "ACCEPTED" ? (
              <>
                <p className="text-3xl mb-2">🤝</p>
                <p className="text-lg font-semibold text-green-400">Brief Accepted</p>
                <p className="text-sm text-muted mt-2">
                  You accepted this brief. The sender has been notified. They will contact you at your registered email to discuss next steps.
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">🙏</p>
                <p className="text-lg font-semibold text-foreground">Brief Declined</p>
                <p className="text-sm text-muted mt-2">
                  You declined this brief. No action is required.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Your Response</p>

            {/* Optional message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note (questions, availability, rate adjustments)… optional"
              rows={3}
              className="w-full rounded-lg bg-surface-2 border border-border text-sm text-foreground px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50"
            />

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => void handleRespond("ACCEPTED")}
                disabled={responding}
                className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-500 disabled:opacity-50 transition-colors"
              >
                {responding ? "…" : "✓ Accept Brief"}
              </button>
              <button
                onClick={() => void handleRespond("DECLINED")}
                disabled={responding}
                className="flex-1 py-2.5 rounded-lg bg-surface-2 border border-border text-sm font-medium text-muted hover:bg-surface-3 disabled:opacity-50 transition-colors"
              >
                Decline
              </button>
            </div>

            <p className="text-[10px] text-muted text-center">
              No account required. Your response will be emailed to the sender.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
