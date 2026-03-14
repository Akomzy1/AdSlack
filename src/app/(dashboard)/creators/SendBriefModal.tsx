"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorMin {
  id:   string;
  name: string;
}

interface SendBriefModalProps {
  creator:       CreatorMin;
  onClose:       () => void;
  /** Pre-populated brief data from Remix (optional) */
  prefill?: {
    briefType:    string;
    briefContent: unknown;
    adId?:        string;
  };
}

const BRIEF_TYPES = [
  {
    value:       "UGC_SCRIPT",
    label:       "UGC Script",
    description: "Send your generated UGC script for the creator to follow",
    icon:        "📱",
  },
  {
    value:       "CREATIVE_BRIEF",
    label:       "Creative Brief",
    description: "High-level creative direction and brand guidelines",
    icon:        "📋",
  },
  {
    value:       "STORYBOARD",
    label:       "Storyboard",
    description: "Visual scene-by-scene breakdown",
    icon:        "🎬",
  },
  {
    value:       "CUSTOM",
    label:       "Custom",
    description: "Write your own brief from scratch",
    icon:        "✍️",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function SendBriefModal({ creator, onClose, prefill }: SendBriefModalProps) {
  const [briefType, setBriefType]       = useState<string>(prefill?.briefType ?? "UGC_SCRIPT");
  const [customMessage, setCustomMessage] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [sent, setSent]                 = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    let briefContent: unknown = prefill?.briefContent;
    if (briefType === "CUSTOM" || !briefContent) {
      briefContent = { text: customContent };
    }

    try {
      const res = await fetch(`/api/creators/${creator.id}/send-brief`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          briefType,
          briefContent,
          adId:          prefill?.adId,
          customMessage: customMessage || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to send brief");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Send Brief</h2>
            <p className="text-xs text-muted mt-0.5">To {creator.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {sent ? (
          /* Success state */
          <div className="p-8 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-lg font-semibold text-foreground">Brief sent!</p>
            <p className="text-sm text-muted mt-2 mb-6">
              {creator.name} will receive an email with your brief and a link to respond.
              You can track the status in your briefs dashboard.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Brief type selector */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Brief Type</p>
              <div className="grid grid-cols-2 gap-2">
                {BRIEF_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    onClick={() => setBriefType(bt.value)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      briefType === bt.value
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-2 hover:border-accent/40"
                    }`}
                  >
                    <span className="text-xl shrink-0">{bt.icon}</span>
                    <div>
                      <p className={`text-xs font-semibold ${briefType === bt.value ? "text-accent" : "text-foreground"}`}>
                        {bt.label}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{bt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content preview / custom content */}
            {briefType === "CUSTOM" ? (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Brief Content</p>
                <textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Describe what you need from this creator…"
                  rows={5}
                  className="w-full rounded-lg bg-surface-2 border border-border text-sm text-foreground px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50"
                />
              </div>
            ) : prefill?.briefContent ? (
              <div className="rounded-lg bg-surface-2 border border-border px-3 py-2.5">
                <p className="text-[10px] text-accent font-semibold uppercase tracking-wide mb-1">
                  ✓ Attached from Remix
                </p>
                <p className="text-xs text-muted">Your generated {BRIEF_TYPES.find(b => b.value === briefType)?.label} will be included.</p>
              </div>
            ) : (
              <div className="rounded-lg bg-surface-2 border border-border px-3 py-2.5">
                <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Brief Content</p>
                <p className="text-xs text-muted">
                  The creator will receive a blank {BRIEF_TYPES.find(b => b.value === briefType)?.label} request.
                  Generate content in the Remix tab to attach a full brief.
                </p>
              </div>
            )}

            {/* Personal message */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Personal Message <span className="font-normal normal-case text-muted">(optional)</span>
              </p>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add context, deadlines, or special requirements…"
                rows={3}
                className="w-full rounded-lg bg-surface-2 border border-border text-sm text-foreground px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onClose}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting || (briefType === "CUSTOM" && !customContent.trim())}
                className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Sending…" : "Send Brief"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
