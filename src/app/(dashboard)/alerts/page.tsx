import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALERT_LIMITS } from "@/lib/alertEngine";
import { AlertsView } from "./AlertsView";

export const metadata: Metadata = {
  title: "Velocity Alerts | Adsentify",
  description: "Get notified when ads matching your criteria hit high velocity scores.",
};

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const userId = session.user.id;
  const userRole = session.user.role ?? "FREE";

  const rules = await db.alertRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { notifications: true } },
    },
  });

  const limit = ALERT_LIMITS[userRole] ?? 0;

  return (
    <AlertsView
      initialRules={rules.map((r) => ({
        id: r.id,
        name: r.name,
        niches: r.niches,
        platforms: r.platforms,
        velocityThreshold: r.velocityThreshold,
        keywords: r.keywords,
        frequency: r.frequency,
        isActive: r.isActive,
        notificationCount: r._count.notifications,
        lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }))}
      userRole={userRole}
      limit={limit}
    />
  );
}
