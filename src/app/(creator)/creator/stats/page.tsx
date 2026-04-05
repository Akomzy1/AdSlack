"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type BriefStatus = "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "COMPLETED";

interface RecentBrief {
  id: string;
  status: BriefStatus;
  productName: string;
  brandName: string;
  briefType: string;
  sentAt: string;
  respondedAt: string | null;
  completedAt: string | null;
}

interface Stats {
  profileViews: number;
  briefsThisMonth: number;
  completedBriefs: number;
  avgRating: number;
  recentBriefs: RecentBrief[];
}

const STATUS_COLORS: Record<BriefStatus, { bg: string; text: string }> = {
  SENT: { bg: "#3b82f622", text: "#3b82f6" },
  VIEWED: { bg: "#6b728022", text: "#9ca3af" },
  ACCEPTED: { bg: "#22c55e22", text: "#22c55e" },
  DECLINED: { bg: "#dc262622", text: "#dc2626" },
  COMPLETED: { bg: "#f59e0b22", text: "#f59e0b" },
};

const TIPS = [
  "Add your best portfolio examples to attract high-quality brands.",
  "Keep your availability status up to date — unavailable creators get fewer briefs.",
  "A complete bio with specific niches gets 3x more brief requests.",
  "Respond to briefs quickly — brands love creators who reply within 24 hours.",
];

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel: string;
  icon: string;
  accentColor: string;
}

function StatCard({ label, value, sublabel, icon, accentColor }: StatCardProps) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "linear-gradient(145deg, #0f1019, #12141f)",
        borderColor: "#1a1d2e",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: "#6b7280" }}>{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>{sublabel}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: accentColor + "22" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function CreatorStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/creator/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  const s = stats ?? {
    profileViews: 0,
    briefsThisMonth: 0,
    completedBriefs: 0,
    avgRating: 0,
    recentBriefs: [],
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Stats</h1>
        <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>Your creator performance overview</p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Profile Views"
          value={s.profileViews.toLocaleString()}
          sublabel="This month"
          icon="👁️"
          accentColor="#06b6d4"
        />
        <StatCard
          label="Briefs Received"
          value={s.briefsThisMonth}
          sublabel="This month"
          icon="📨"
          accentColor="#3b82f6"
        />
        <StatCard
          label="Briefs Completed"
          value={s.completedBriefs}
          sublabel="All time"
          icon="✅"
          accentColor="#22c55e"
        />
        <StatCard
          label="Avg Rating"
          value={s.avgRating > 0 ? s.avgRating.toFixed(1) + " ★" : "—"}
          sublabel="From brand reviews"
          icon="⭐"
          accentColor="#f59e0b"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          <h2 className="mb-4 text-sm font-semibold text-white">Recent Brief Activity</h2>
          {s.recentBriefs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-xs" style={{ color: "#6b7280" }}>No brief activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {s.recentBriefs.map((brief) => {
                const sc = STATUS_COLORS[brief.status] ?? { bg: "#1a1d2e", text: "#9ca3af" };
                const eventDate = brief.completedAt ?? brief.respondedAt ?? brief.sentAt;
                return (
                  <div key={brief.id} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: sc.text, boxShadow: `0 0 6px ${sc.text}66` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{brief.productName}</p>
                      <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{brief.brandName}</p>
                      <p className="text-[10px]" style={{ color: "#6b7280" }}>
                        {formatDistanceToNow(new Date(eventDate), { addSuffix: true })}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {brief.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tips */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          <h2 className="mb-4 text-sm font-semibold text-white">Tips to Get More Briefs</h2>
          <div className="space-y-3">
            {TIPS.map((tip, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: "#06b6d422", color: "#06b6d4" }}
                >
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
