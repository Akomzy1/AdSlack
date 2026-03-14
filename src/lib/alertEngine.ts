/**
 * Alert Engine
 *
 * Core matching logic for velocity alerts.
 * Called by the cron job every 30 minutes.
 *
 * For each active AlertRule:
 *  1. Query ads that exceeded velocityThreshold since rule.lastCheckedAt
 *  2. Filter by niche/platform/keywords if set
 *  3. Deduplicate (skip ads already notified for this rule)
 *  4. Create Notification records
 *  5. For INSTANT rules: send email immediately
 *  6. For DAILY_DIGEST / WEEKLY_DIGEST: accumulate — emails sent by separate digest pass
 */

import { type AlertRule, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendAlertEmail } from "@/lib/email";

// ── Exported entry-point ──────────────────────────────────────────────────────

export interface AlertRunResult {
  rulesProcessed: number;
  newNotifications: number;
  emailsSent: number;
  errors: string[];
}

export async function runAlertCycle(): Promise<AlertRunResult> {
  const now = new Date();
  const result: AlertRunResult = {
    rulesProcessed: 0,
    newNotifications: 0,
    emailsSent: 0,
    errors: [],
  };

  // Load all active rules with user email
  const rules = await db.alertRule.findMany({
    where: { isActive: true },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  result.rulesProcessed = rules.length;

  for (const rule of rules) {
    try {
      const { notifications, emailsSent } = await processRule(rule, now);
      result.newNotifications += notifications;
      result.emailsSent += emailsSent;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[alertEngine] Rule ${rule.id} failed:`, msg);
      result.errors.push(`Rule ${rule.id}: ${msg}`);
    }
  }

  return result;
}

// ── Digest email pass (called separately, e.g. daily at 08:00) ───────────────

export async function sendDigestEmails(
  frequency: "DAILY_DIGEST" | "WEEKLY_DIGEST"
): Promise<{ emailsSent: number; errors: string[] }> {
  const windowMs = frequency === "DAILY_DIGEST"
    ? 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  const digestPeriod = frequency === "DAILY_DIGEST"
    ? "past 24 hours"
    : "past 7 days";

  const since = new Date(Date.now() - windowMs);
  let emailsSent = 0;
  const errors: string[] = [];

  // Find rules with unsent digest notifications
  const rules = await db.alertRule.findMany({
    where: { isActive: true, frequency },
    include: {
      user: { select: { id: true, email: true, name: true } },
      notifications: {
        where: { emailSentAt: null, createdAt: { gte: since } },
        include: { ad: true },
      },
    },
  });

  for (const rule of rules) {
    if (!rule.user.email || rule.notifications.length === 0) continue;
    try {
      const ads = rule.notifications.map((n) => ({
        id: n.ad.id,
        brandName: n.ad.brandName,
        productName: n.ad.productName,
        niche: n.ad.niche,
        platform: n.ad.platform as string,
        thumbnailUrl: n.ad.thumbnailUrl,
        hookText: n.ad.hookText,
        velocityScore: n.ad.velocityScore,
        velocityTier: n.ad.velocityTier,
        daysRunning: n.ad.daysRunning,
      }));

      await sendAlertEmail({
        to: rule.user.email,
        userName: rule.user.name,
        ads,
        ruleName: rule.name,
        isDigest: true,
        digestPeriod,
      });

      // Mark all as emailed
      await db.notification.updateMany({
        where: {
          id: { in: rule.notifications.map((n) => n.id) },
        },
        data: { emailSentAt: new Date() },
      });

      emailsSent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Rule ${rule.id}: ${msg}`);
    }
  }

  return { emailsSent, errors };
}

// ── Per-rule processing ───────────────────────────────────────────────────────

async function processRule(
  rule: AlertRule & { user: { id: string; email: string | null; name: string | null } },
  now: Date
): Promise<{ notifications: number; emailsSent: number }> {
  const since = rule.lastCheckedAt ?? new Date(Date.now() - 30 * 60 * 1000);

  // Build ad query
  const adWhere: Prisma.AdWhereInput = {
    isActive: true,
    velocityScore: { gte: rule.velocityThreshold },
    updatedAt: { gte: since },
  };

  if (rule.niches.length > 0) {
    adWhere.niche = { in: rule.niches };
  }

  if (rule.platforms.length > 0) {
    adWhere.platform = { in: rule.platforms as Prisma.EnumPlatformFilter["in"] };
  }

  // Keyword filter (applied post-query to avoid complex DB search)
  const keywords = rule.keywords
    ? rule.keywords.toLowerCase().split(/\s+/).filter(Boolean)
    : [];

  const ads = await db.ad.findMany({
    where: adWhere,
    select: {
      id: true,
      brandName: true,
      productName: true,
      niche: true,
      platform: true,
      thumbnailUrl: true,
      hookText: true,
      velocityScore: true,
      velocityTier: true,
      daysRunning: true,
    },
  });

  // Filter by keywords
  const matched = keywords.length > 0
    ? ads.filter((ad) => {
        const haystack = [ad.brandName, ad.productName, ad.hookText]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return keywords.every((kw) => haystack.includes(kw));
      })
    : ads;

  if (matched.length === 0) {
    await db.alertRule.update({
      where: { id: rule.id },
      data: { lastCheckedAt: now },
    });
    return { notifications: 0, emailsSent: 0 };
  }

  // Deduplicate: skip ads already notified for this rule
  const existingNotifications = await db.notification.findMany({
    where: {
      alertRuleId: rule.id,
      adId: { in: matched.map((a) => a.id) },
    },
    select: { adId: true },
  });
  const notifiedAdIds = new Set(existingNotifications.map((n) => n.adId));
  const newAds = matched.filter((a) => !notifiedAdIds.has(a.id));

  if (newAds.length === 0) {
    await db.alertRule.update({
      where: { id: rule.id },
      data: { lastCheckedAt: now },
    });
    return { notifications: 0, emailsSent: 0 };
  }

  // Create notifications
  await db.notification.createMany({
    data: newAds.map((ad) => ({
      userId: rule.userId,
      alertRuleId: rule.id,
      adId: ad.id,
      title: `${ad.brandName} hit velocity ${Math.round(ad.velocityScore)} (${ad.velocityTier})`,
      body: ad.hookText?.slice(0, 160) ?? null,
    })),
    skipDuplicates: true,
  });

  // Update rule checkpoint
  await db.alertRule.update({
    where: { id: rule.id },
    data: { lastCheckedAt: now },
  });

  let emailsSent = 0;

  // Send instant emails
  if (rule.frequency === "INSTANT" && rule.user.email) {
    // Rate limit: max 1 instant email per rule per 5 minutes
    const recentEmail = await db.notification.findFirst({
      where: {
        alertRuleId: rule.id,
        emailSentAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    if (!recentEmail) {
      try {
        await sendAlertEmail({
          to: rule.user.email,
          userName: rule.user.name,
          ads: newAds.map((ad) => ({
            ...ad,
            platform: ad.platform as string,
          })),
          ruleName: rule.name,
          isDigest: false,
        });

        // Mark the new notifications as emailed
        await db.notification.updateMany({
          where: {
            alertRuleId: rule.id,
            adId: { in: newAds.map((a) => a.id) },
            emailSentAt: null,
          },
          data: { emailSentAt: now },
        });

        emailsSent = 1;
      } catch (err) {
        console.error(`[alertEngine] Email failed for rule ${rule.id}:`, err);
      }
    }
  }

  return { notifications: newAds.length, emailsSent };
}

// ── Alert rule limit by plan ──────────────────────────────────────────────────

export const ALERT_LIMITS: Record<string, number> = {
  FREE: 0,
  PRO: 5,
  SCALE: 20,
  AGENCY: 50,
};
