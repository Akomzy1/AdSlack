import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── Auth guard ────────────────────────────────────────────────────────────────

function isAdmin(email: string | null | undefined, role: string): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  return adminEmails.includes(email.toLowerCase()) || role === UserRole.AGENCY;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-accent/30 bg-accent/5" : "border-border bg-surface"}`}>
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted">{label}</p>
      <p className={`text-3xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

// ── Role row ──────────────────────────────────────────────────────────────────

function RoleBar({
  role,
  count,
  total,
  color,
}: {
  role: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-foreground-2">{role}</span>
        <span className="text-muted">
          {count.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-3">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Stats {
  users: {
    total: number;
    new7d: number;
    active7d: number;
    byRole: Record<string, number>;
  };
  ads: { total: number; active: number; addedToday: number };
  aiUsage: { remixesTotal: number; remixesToday: number; anatomyToday: number };
  revenue: { mrrUsd: number; activeSubscriptions: number };
  alerts: { notificationsTotal: number; notificationsToday: number };
  generatedAt: string;
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    // Server-to-server call: pass a shared internal secret to bypass session check overhead
    const res = await fetch(`${base}/api/admin/stats`, {
      headers: { Cookie: "" }, // session will be re-checked via getServerSession inside route
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<Stats>;
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/discover");
  if (!isAdmin(session.user.email, session.user.role as string)) redirect("/discover");

  const stats = await fetchStats();

  if (!stats) {
    return (
      <div className="p-8 text-center text-muted">
        <p className="text-lg font-semibold">Unable to load stats</p>
        <p className="text-sm">Check server logs for errors.</p>
      </div>
    );
  }

  const totalUsers = stats.users.total;

  return (
    <div className="max-w-5xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted">
            Last updated: {new Date(stats.generatedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          Admin only
        </div>
      </div>

      {/* Users */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Users</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={stats.users.total} />
          <StatCard label="New (7d)" value={stats.users.new7d} accent />
          <StatCard label="Active (7d)" value={stats.users.active7d} sub="made a remix or anatomy" />
          <StatCard label="Paid users" value={(stats.users.byRole.PRO ?? 0) + (stats.users.byRole.SCALE ?? 0) + (stats.users.byRole.AGENCY ?? 0)} />
        </div>

        {/* Role breakdown */}
        <div className="mt-4 rounded-xl border border-border bg-surface p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Users by plan</p>
          <RoleBar role="Free" count={stats.users.byRole.FREE ?? 0} total={totalUsers} color="bg-muted/40" />
          <RoleBar role="Pro" count={stats.users.byRole.PRO ?? 0} total={totalUsers} color="bg-accent" />
          <RoleBar role="Scale" count={stats.users.byRole.SCALE ?? 0} total={totalUsers} color="bg-primary" />
          <RoleBar role="Agency" count={stats.users.byRole.AGENCY ?? 0} total={totalUsers} color="bg-success" />
        </div>
      </section>

      {/* Revenue */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Revenue</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="MRR"
            value={`$${stats.revenue.mrrUsd.toLocaleString()}`}
            sub="active subscriptions only"
            accent
          />
          <StatCard
            label="Active subscriptions"
            value={stats.revenue.activeSubscriptions}
            sub={`$${totalUsers > 0 ? Math.round(stats.revenue.mrrUsd / totalUsers) : 0} ARPU`}
          />
        </div>
      </section>

      {/* Ads database */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Ad database</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total ads" value={stats.ads.total} />
          <StatCard label="Active ads" value={stats.ads.active} />
          <StatCard label="Ingested today" value={stats.ads.addedToday} accent />
        </div>
      </section>

      {/* AI usage */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">AI usage</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total remixes" value={stats.aiUsage.remixesTotal} />
          <StatCard label="Remixes today" value={stats.aiUsage.remixesToday} accent />
          <StatCard label="Anatomy today" value={stats.aiUsage.anatomyToday} />
        </div>
      </section>

      {/* Alerts */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Velocity alerts</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total notifications sent" value={stats.alerts.notificationsTotal} />
          <StatCard label="Notifications today" value={stats.alerts.notificationsToday} accent />
        </div>
      </section>

      {/* Funnel summary */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">Conversion funnel</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {[
            { step: "Total users", count: stats.users.total, pct: 100 },
            { step: "Active (7d)", count: stats.users.active7d, pct: totalUsers > 0 ? Math.round((stats.users.active7d / totalUsers) * 100) : 0 },
            { step: "Any paid plan", count: (stats.users.byRole.PRO ?? 0) + (stats.users.byRole.SCALE ?? 0) + (stats.users.byRole.AGENCY ?? 0), pct: totalUsers > 0 ? Math.round(((stats.users.byRole.PRO ?? 0) + (stats.users.byRole.SCALE ?? 0) + (stats.users.byRole.AGENCY ?? 0)) / totalUsers * 100) : 0 },
            { step: "Scale or Agency", count: (stats.users.byRole.SCALE ?? 0) + (stats.users.byRole.AGENCY ?? 0), pct: totalUsers > 0 ? Math.round(((stats.users.byRole.SCALE ?? 0) + (stats.users.byRole.AGENCY ?? 0)) / totalUsers * 100) : 0 },
          ].map((row, i) => (
            <div key={row.step} className={`flex items-center justify-between px-5 py-3.5 border-b border-border/60 last:border-0 ${i === 0 ? "" : "bg-surface-2/40"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted w-4">{i + 1}</span>
                <span className="text-sm text-foreground-2">{row.step}</span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div className="w-32 h-1.5 rounded-full bg-surface-3">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-sm font-semibold text-foreground w-16 text-right">
                  {row.count.toLocaleString()}
                </span>
                <span className="text-xs text-muted w-10 text-right">{row.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
