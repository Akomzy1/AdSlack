/**
 * Email service — wraps Resend for transactional emails.
 * Falls back to console.log if RESEND_API_KEY is not set (dev/test).
 */

import { APP_URL, APP_NAME } from "@/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AlertEmailPayload {
  to: string;
  userName: string | null;
  ads: Array<{
    id: string;
    brandName: string;
    productName: string | null;
    niche: string;
    platform: string;
    thumbnailUrl: string | null;
    hookText: string | null;
    velocityScore: number;
    velocityTier: string;
    daysRunning: number;
  }>;
  ruleName: string;
  isDigest: boolean;   // true = daily/weekly digest, false = instant
  digestPeriod?: string; // "past 24 hours" | "past 7 days"
}

// ── Resend client (lazy-initialised) ─────────────────────────────────────────

let resendClient: import("resend").Resend | null = null;

function getResend(): import("resend").Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require("resend") as typeof import("resend");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// ── Brief email types ─────────────────────────────────────────────────────────

export interface BriefEmailPayload {
  to:            string;
  creatorName:   string;
  senderName:    string;
  briefType:     string;
  customMessage: string | null;
  responseToken: string;
}

// ── Brief email send ──────────────────────────────────────────────────────────

export async function sendBriefEmail(payload: BriefEmailPayload): Promise<void> {
  const resend = getResend();
  const briefLabel: Record<string, string> = {
    CREATIVE_BRIEF: "Creative Brief",
    UGC_SCRIPT:     "UGC Script",
    STORYBOARD:     "Storyboard",
    CUSTOM:         "Custom Brief",
  };
  const label   = briefLabel[payload.briefType] ?? "Brief";
  const subject = `${payload.senderName} sent you a ${label} — ${APP_NAME}`;
  const html    = buildBriefEmailHtml(payload, label);

  if (!resend) {
    console.log(`[email] Would send brief to ${payload.to}: ${subject}`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? `${APP_NAME} <noreply@adslack.com>`;
  const { error } = await resend.emails.send({ from, to: payload.to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── Alert email send ──────────────────────────────────────────────────────────

export async function sendAlertEmail(payload: AlertEmailPayload): Promise<void> {
  const resend = getResend();
  const subject = payload.isDigest
    ? `${APP_NAME} Digest — ${payload.ads.length} new ads matching "${payload.ruleName}"`
    : `🔥 ${payload.ads[0]?.brandName ?? "Ad"} just hit velocity — "${payload.ruleName}"`;

  const html = buildAlertEmailHtml(payload);

  if (!resend) {
    console.log(`[email] Would send to ${payload.to}: ${subject}`);
    console.log(`[email] ${payload.ads.length} ads in payload`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? `${APP_NAME} <alerts@adslack.com>`;

  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildAlertEmailHtml(payload: AlertEmailPayload): string {
  const { ads, ruleName, isDigest, digestPeriod, userName } = payload;
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const intro = isDigest
    ? `Here are the ${ads.length} new ads matching your alert rule <strong>${esc(ruleName)}</strong> from the ${digestPeriod ?? "past 24 hours"}.`
    : `A new ad from <strong>${esc(ads[0]?.brandName ?? "")}</strong> just crossed your velocity threshold for rule <strong>${esc(ruleName)}</strong>.`;

  const adCards = ads
    .map((ad) => buildAdCard(ad))
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${APP_NAME} Alert</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                  ${APP_NAME}
                </span>
                <span style="font-size:12px;color:#f97316;margin-left:8px;font-weight:600;">ALERTS</span>
              </td>
              <td align="right">
                <span style="display:inline-block;padding:4px 10px;background:#f9731620;border:1px solid #f9731640;border-radius:20px;font-size:11px;font-weight:600;color:#f97316;">
                  ${isDigest ? (digestPeriod === "past 7 days" ? "WEEKLY DIGEST" : "DAILY DIGEST") : "⚡ INSTANT ALERT"}
                </span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Intro card -->
        <tr><td style="background:#13131a;border:1px solid #1e1e2e;border-radius:16px;padding:24px 28px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:15px;color:#a0a0b0;">${greeting}</p>
          <p style="margin:0;font-size:15px;color:#e0e0f0;line-height:1.6;">${intro}</p>
        </td></tr>

        <tr><td style="height:20px;"></td></tr>

        <!-- Ad cards -->
        ${adCards}

        <!-- Footer -->
        <tr><td style="padding-top:32px;border-top:1px solid #1e1e2e;margin-top:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:12px;color:#505070;">
                  You received this because you have an alert rule active on ${APP_NAME}.<br>
                  <a href="${APP_URL}/alerts" style="color:#f97316;text-decoration:none;">Manage alerts</a>
                  &nbsp;·&nbsp;
                  <a href="${APP_URL}/alerts" style="color:#505070;text-decoration:none;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAdCard(ad: AlertEmailPayload["ads"][number]): string {
  const tierColor: Record<string, string> = {
    EXPLOSIVE: "#22c55e",
    HIGH: "#f97316",
    RISING: "#eab308",
    STEADY: "#6b7280",
  };
  const color = tierColor[ad.velocityTier] ?? "#6b7280";
  const platformLabel = ad.platform.charAt(0) + ad.platform.slice(1).toLowerCase();
  const viewUrl = `${APP_URL}/ads/${ad.id}`;

  const thumbnail = ad.thumbnailUrl
    ? `<img src="${esc(ad.thumbnailUrl)}" width="120" height="90" style="object-fit:cover;border-radius:8px;display:block;" alt="${esc(ad.brandName)}">`
    : `<div style="width:120px;height:90px;background:#1e1e2e;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;">📺</div>`;

  return `
<tr><td style="background:#13131a;border:1px solid #1e1e2e;border-radius:16px;padding:20px;margin-bottom:12px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="120" valign="top" style="padding-right:16px;">
        ${thumbnail}
      </td>
      <td valign="top">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size:16px;font-weight:700;color:#ffffff;">${esc(ad.brandName)}</span>
              ${ad.productName ? `<span style="font-size:13px;color:#a0a0b0;margin-left:6px;">${esc(ad.productName)}</span>` : ""}
            </td>
            <td align="right">
              <span style="display:inline-block;padding:3px 8px;background:${color}20;border:1px solid ${color}40;border-radius:20px;font-size:11px;font-weight:700;color:${color};">
                ${ad.velocityTier === "EXPLOSIVE" ? "🔥 " : ad.velocityTier === "HIGH" ? "⚡ " : ""}${ad.velocityTier}
              </span>
            </td>
          </tr>
          <tr><td colspan="2" style="padding-top:4px;">
            <span style="font-size:11px;color:#505070;">${esc(platformLabel)} · ${esc(ad.niche)} · ${ad.daysRunning}d running</span>
          </td></tr>
          <tr><td colspan="2" style="padding-top:8px;">
            <span style="display:inline-block;background:#f9731630;color:#f97316;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">
              Score ${Math.round(ad.velocityScore)}
            </span>
          </td></tr>
          ${ad.hookText ? `
          <tr><td colspan="2" style="padding-top:10px;">
            <p style="margin:0;font-size:12px;color:#a0a0b0;font-style:italic;line-height:1.5;border-left:2px solid #f9731650;padding-left:10px;">
              &ldquo;${esc(ad.hookText.slice(0, 140))}${ad.hookText.length > 140 ? "…" : ""}&rdquo;
            </p>
          </td></tr>` : ""}
          <tr><td colspan="2" style="padding-top:14px;">
            <a href="${viewUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:700;">
              View in ${APP_NAME} →
            </a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="height:10px;"></td></tr>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBriefEmailHtml(payload: BriefEmailPayload, label: string): string {
  const respondUrl = `${APP_URL}/creators/respond/${payload.responseToken}`;
  const messageBlock = payload.customMessage
    ? `<tr><td style="padding-top:16px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
        <p style="margin:0;font-size:14px;color:#e0e0f0;line-height:1.6;border-left:2px solid #f9731650;padding-left:12px;font-style:italic;">
          &ldquo;${esc(payload.customMessage)}&rdquo;
        </p>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${APP_NAME} — Brief Received</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${APP_NAME}</span>
          <span style="font-size:12px;color:#f97316;margin-left:8px;font-weight:600;">CREATORS</span>
        </td></tr>

        <!-- Main card -->
        <tr><td style="background:#13131a;border:1px solid #1e1e2e;border-radius:16px;padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td>
              <p style="margin:0 0 4px;font-size:15px;color:#a0a0b0;">Hi ${esc(payload.creatorName)},</p>
              <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                You received a <span style="color:#f97316;">${esc(label)}</span>
              </p>
              <p style="margin:0;font-size:14px;color:#a0a0b0;line-height:1.6;">
                <strong style="color:#e0e0f0;">${esc(payload.senderName)}</strong> wants to collaborate with you
                and has sent you a ${esc(label)} via ${APP_NAME}.
              </p>
            </td></tr>
            ${messageBlock}
            <tr><td style="padding-top:24px;">
              <a href="${respondUrl}"
                 style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">
                View Brief &amp; Respond →
              </a>
            </td></tr>
            <tr><td style="padding-top:16px;">
              <p style="margin:0;font-size:12px;color:#505070;">
                Or copy this link: <a href="${respondUrl}" style="color:#f97316;text-decoration:none;">${respondUrl}</a>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#505070;text-align:center;">
            Sent via ${APP_NAME} Creator Marketplace · No account required to respond
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
