"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type BriefStatus = "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "COMPLETED";
type BriefType = "UGC_SCRIPT" | "STORYBOARD" | "CREATIVE_BRIEF" | "CUSTOM";

interface Brief {
  id: string;
  productName: string;
  brandName: string;
  briefType: BriefType;
  briefContent: unknown;
  customMessage: string | null;
  status: BriefStatus;
  senderEmail: string | null;
  sentAt: string;
  respondedAt: string | null;
  completedAt: string | null;
  sender: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface CountEntry {
  status: BriefStatus;
  _count: number;
}

const STATUS_TABS: { key: BriefStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SENT", label: "New" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DECLINED", label: "Declined" },
];

const STATUS_COLORS: Record<BriefStatus, { bg: string; text: string }> = {
  SENT: { bg: "#3b82f622", text: "#3b82f6" },
  VIEWED: { bg: "#6b728022", text: "#9ca3af" },
  ACCEPTED: { bg: "#22c55e22", text: "#22c55e" },
  DECLINED: { bg: "#dc262622", text: "#dc2626" },
  COMPLETED: { bg: "#f59e0b22", text: "#f59e0b" },
};

const TYPE_ICONS: Record<BriefType, string> = {
  UGC_SCRIPT: "📝",
  STORYBOARD: "🎬",
  CREATIVE_BRIEF: "📋",
  CUSTOM: "✉️",
};

const TYPE_LABELS: Record<BriefType, string> = {
  UGC_SCRIPT: "UGC Script",
  STORYBOARD: "Storyboard",
  CREATIVE_BRIEF: "Creative Brief",
  CUSTOM: "Custom",
};

function BriefContent({ brief }: { brief: Brief }) {
  const content = brief.briefContent as Record<string, unknown> | null;

  if (brief.briefType === "UGC_SCRIPT" && content) {
    const c = content as { hook?: string; problem?: string; demo?: string; proof?: string; cta?: string; script?: string };
    return (
      <div className="space-y-3">
        {c.hook && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>Hook</p>
            <p className="mt-1 text-sm" style={{ color: "#e5e7eb" }}>{c.hook as string}</p>
          </div>
        )}
        {c.problem && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>Problem</p>
            <p className="mt-1 text-sm" style={{ color: "#e5e7eb" }}>{c.problem as string}</p>
          </div>
        )}
        {c.demo && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>Demo</p>
            <p className="mt-1 text-sm" style={{ color: "#e5e7eb" }}>{c.demo as string}</p>
          </div>
        )}
        {c.proof && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>Proof</p>
            <p className="mt-1 text-sm" style={{ color: "#e5e7eb" }}>{c.proof as string}</p>
          </div>
        )}
        {c.cta && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>CTA</p>
            <p className="mt-1 text-sm" style={{ color: "#e5e7eb" }}>{c.cta as string}</p>
          </div>
        )}
        {c.script && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#06b6d4" }}>Full Script</p>
            <pre className="mt-1 text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "#e5e7eb" }}>{c.script as string}</pre>
          </div>
        )}
      </div>
    );
  }

  if (brief.briefType === "STORYBOARD" && content) {
    const frames = (content as { frames?: unknown[] }).frames ?? [];
    if (frames.length > 0) {
      return (
        <div className="space-y-3">
          {frames.map((frame, i) => {
            const f = frame as { title?: string; description?: string; visual?: string };
            return (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: "#1a1d2e" }}>
                <p className="text-xs font-semibold" style={{ color: "#06b6d4" }}>Frame {i + 1}{f.title ? ` — ${f.title}` : ""}</p>
                {f.description && <p className="mt-1 text-sm" style={{ color: "#e5e7eb" }}>{f.description}</p>}
                {f.visual && <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>Visual: {f.visual}</p>}
              </div>
            );
          })}
        </div>
      );
    }
  }

  // Generic JSON display
  if (content) {
    return (
      <pre className="text-xs whitespace-pre-wrap rounded-lg p-3" style={{ backgroundColor: "#0c0e18", color: "#9ca3af" }}>
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  }

  return null;
}

export default function CreatorBriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [counts, setCounts] = useState<CountEntry[]>([]);
  const [activeTab, setActiveTab] = useState<BriefStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [confirmAction, setConfirmAction] = useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBriefs();
  }, [activeTab]);

  async function loadBriefs() {
    setLoading(true);
    const url = activeTab === "ALL" ? "/api/creator/briefs" : `/api/creator/briefs?status=${activeTab}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs ?? []);
        if (data.counts) setCounts(data.counts);
      }
    } finally {
      setLoading(false);
    }
  }

  function getCount(status: BriefStatus | "ALL"): number {
    if (status === "ALL") return counts.reduce((sum, c) => sum + c._count, 0);
    return counts.find((c) => c.status === status)?._count ?? 0;
  }

  async function updateStatus(briefId: string, status: BriefStatus) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/creator/briefs/${briefId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBriefs((prev) => prev.map((b) => (b.id === briefId ? { ...b, ...updated } : b)));
        setSelectedBrief((prev) => (prev?.id === briefId ? { ...prev, ...updated } : prev));
        setConfirmAction(null);
        loadBriefs();
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && briefs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left: Brief list */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Briefs</h1>
          <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>Creative briefs sent by brands</p>
        </div>

        {/* Filter tabs */}
        <div className="mb-5 flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count = getCount(tab.key);
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedBrief(null); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active ? "#06b6d422" : "transparent",
                  color: active ? "#06b6d4" : "#9ca3af",
                  border: active ? "1px solid #06b6d444" : "1px solid transparent",
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: active ? "#06b6d444" : "#1a1d2e", color: active ? "#06b6d4" : "#6b7280" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Brief cards */}
        {briefs.length === 0 ? (
          <div className="rounded-2xl border py-16 text-center" style={{ borderColor: "#1a1d2e" }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm font-medium text-white">No briefs yet</p>
            <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>Briefs from brands will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {briefs.map((brief) => {
              const statusColor = STATUS_COLORS[brief.status];
              const isSelected = selectedBrief?.id === brief.id;
              return (
                <button
                  key={brief.id}
                  onClick={() => setSelectedBrief(isSelected ? null : brief)}
                  className="w-full rounded-xl border p-4 text-left transition-all hover:border-cyan-500/30"
                  style={{
                    background: "linear-gradient(145deg, #0f1019, #12141f)",
                    borderColor: isSelected ? "#06b6d444" : "#1a1d2e",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xl shrink-0">{TYPE_ICONS[brief.briefType]}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{brief.productName}</p>
                        <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{brief.brandName}</p>
                        <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>
                          {formatDistanceToNow(new Date(brief.sentAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
                        {brief.status === "SENT" ? "New" : brief.status.charAt(0) + brief.status.slice(1).toLowerCase()}
                      </span>
                      <span className="text-[10px]" style={{ color: "#6b7280" }}>{TYPE_LABELS[brief.briefType]}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Brief detail */}
      {selectedBrief && (
        <div className="w-96 shrink-0">
          <div
            className="sticky top-24 rounded-2xl border p-6"
            style={{
              background: "linear-gradient(145deg, #0f1019, #12141f)",
              borderColor: "#1a1d2e",
            }}
          >
            <div className="mb-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{TYPE_ICONS[selectedBrief.briefType]}</span>
                    <h2 className="text-base font-bold text-white">{selectedBrief.productName}</h2>
                  </div>
                  <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>{selectedBrief.brandName}</p>
                </div>
                <button onClick={() => setSelectedBrief(null)} className="text-gray-500 hover:text-gray-300">✕</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-[10px] rounded-full px-2 py-0.5" style={{ backgroundColor: STATUS_COLORS[selectedBrief.status].bg, color: STATUS_COLORS[selectedBrief.status].text }}>
                  {selectedBrief.status}
                </span>
                <span className="text-[10px] rounded-full px-2 py-0.5" style={{ backgroundColor: "#1a1d2e", color: "#9ca3af" }}>
                  {TYPE_LABELS[selectedBrief.briefType]}
                </span>
                <span className="text-[10px]" style={{ color: "#6b7280" }}>
                  {formatDistanceToNow(new Date(selectedBrief.sentAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Content */}
            {selectedBrief.briefContent && (
              <div className="mb-4 rounded-xl border p-4" style={{ borderColor: "#1a1d2e" }}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>Brief Content</p>
                <BriefContent brief={selectedBrief} />
              </div>
            )}

            {/* Custom message */}
            {selectedBrief.customMessage && (
              <div className="mb-4 rounded-xl border p-4" style={{ borderColor: "#1a1d2e" }}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>Message from Brand</p>
                <p className="text-sm" style={{ color: "#e5e7eb" }}>{selectedBrief.customMessage}</p>
              </div>
            )}

            {/* Sender email for ACCEPTED */}
            {selectedBrief.status === "ACCEPTED" && selectedBrief.senderEmail && (
              <div className="mb-4 rounded-xl border p-4" style={{ borderColor: "#22c55e44", backgroundColor: "#22c55e0a" }}>
                <p className="text-xs font-semibold" style={{ color: "#22c55e" }}>Brand Contact</p>
                <p className="mt-1 text-sm text-white">{selectedBrief.senderEmail}</p>
              </div>
            )}

            {/* Action buttons */}
            {selectedBrief.status === "SENT" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction("ACCEPTED")}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: "#22c55e" }}
                >
                  Accept Brief
                </button>
                <button
                  onClick={() => setConfirmAction("DECLINED")}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
                  style={{ borderColor: "#374151", color: "#9ca3af" }}
                >
                  Decline
                </button>
              </div>
            )}

            {selectedBrief.status === "ACCEPTED" && (
              <button
                onClick={() => updateStatus(selectedBrief.id, "COMPLETED")}
                disabled={actionLoading}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#f59e0b" }}
              >
                {actionLoading ? "Updating…" : "Mark as Completed"}
              </button>
            )}

            {selectedBrief.status === "COMPLETED" && (
              <div className="rounded-xl border py-3 text-center text-sm font-semibold" style={{ borderColor: "#f59e0b44", backgroundColor: "#f59e0b0a", color: "#f59e0b" }}>
                Completed
              </div>
            )}
          </div>

          {/* Confirm modals */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-sm rounded-2xl border p-6" style={{ background: "#12141f", borderColor: "#1a1d2e" }}>
                <h3 className="text-base font-bold text-white">
                  {confirmAction === "ACCEPTED" ? "Accept this brief?" : "Decline this brief?"}
                </h3>
                <p className="mt-2 text-sm" style={{ color: "#9ca3af" }}>
                  {confirmAction === "ACCEPTED"
                    ? "The brand will be notified. You'll receive their contact email."
                    : "The brand will be notified that you've declined."}
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
                    style={{ borderColor: "#374151", color: "#9ca3af" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateStatus(selectedBrief.id, confirmAction)}
                    disabled={actionLoading}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                    style={{ backgroundColor: confirmAction === "ACCEPTED" ? "#22c55e" : "#dc2626" }}
                  >
                    {actionLoading ? "…" : confirmAction === "ACCEPTED" ? "Accept" : "Decline"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
