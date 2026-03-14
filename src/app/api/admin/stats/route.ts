/**
 * Admin stats endpoint — returns platform metrics.
 * Gated to admin emails (ADMIN_EMAILS env var, comma-separated)
 * or AGENCY role as a fallback.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { PLANS } from "@/constants/plans";

function isAdmin(email: string | null | undefined, role: UserRole): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  if (adminEmails.includes(email.toLowerCase())) return true;
  return role === UserRole.AGENCY;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session.user.email, session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    newUsers7d,
    usersByRole,
    totalAds,
    adsToday,
    activeAds,
    totalRemixes,
    remixesToday,
    anatomyToday,
    activeSubscriptions,
    totalNotifications,
    notificationsToday,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.user.groupBy({ by: ["role"], _count: { id: true } }),
    db.ad.count(),
    db.ad.count({ where: { createdAt: { gte: todayStart } } }),
    db.ad.count({ where: { isActive: true } }),
    db.remix.count(),
    db.remix.count({ where: { createdAt: { gte: todayStart } } }),
    db.adAnatomy.count({ where: { createdAt: { gte: todayStart } } }),
    db.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: true },
    }),
    db.notification.count(),
    db.notification.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  // MRR calculation
  const mrr = activeSubscriptions.reduce((sum, sub) => {
    const plan = Object.values(PLANS).find(
      (p) => p.role.toUpperCase() === sub.plan?.toUpperCase()
    );
    return sum + (plan?.price ?? 0);
  }, 0);

  // Users active in last 7 days (proxy: created a remix or anatomy)
  const activeUserIds7d = await db.remix.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { userId: true },
    distinct: ["userId"],
  });

  const roleMap = Object.fromEntries(
    usersByRole.map((r) => [r.role, r._count.id])
  );

  return NextResponse.json({
    users: {
      total: totalUsers,
      new7d: newUsers7d,
      active7d: activeUserIds7d.length,
      byRole: {
        FREE: roleMap.FREE ?? 0,
        PRO: roleMap.PRO ?? 0,
        SCALE: roleMap.SCALE ?? 0,
        AGENCY: roleMap.AGENCY ?? 0,
      },
    },
    ads: {
      total: totalAds,
      active: activeAds,
      addedToday: adsToday,
    },
    aiUsage: {
      remixesTotal: totalRemixes,
      remixesToday,
      anatomyToday,
    },
    revenue: {
      mrrUsd: mrr,
      activeSubscriptions: activeSubscriptions.length,
    },
    alerts: {
      notificationsTotal: totalNotifications,
      notificationsToday,
    },
    generatedAt: now.toISOString(),
  });
}
