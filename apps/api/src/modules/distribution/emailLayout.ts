import nodemailer from "nodemailer";
import { logger } from "../../lib/logger";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type ChannelSendResult =
  | { ok: true; provider: string; messageId?: string; mock?: boolean }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 320) return false;
  return EMAIL_RE.test(email);
}

export function normalizeEmailAddress(raw: string): string {
  return raw.trim().toLowerCase();
}

/** When true, no outbound email is sent (even if RESEND_API_KEY is set). */
export function notificationMockSendEnabled(): boolean {
  return process.env.NOTIFICATION_MOCK_SEND === "true";
}

export function defaultFromAddress(): string {
  const defaultEmail = process.env.SMTP_USER || "care@glowhomeo.in";
  return (
    process.env.NOTIFICATION_FROM_EMAIL?.trim() || `GlowHomeo Assist <${defaultEmail}>`
  );
}

export function defaultReplyToAddress(): string {
  return process.env.NOTIFICATION_REPLY_TO_EMAIL?.trim() || "care@glowhomeo.in";
}

export type TransactionalEmailContent = {
  preheader?: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  clinicName: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

/** Branded transactional layout — table-based, accessible, PHI-safe footer. */
export function buildTransactionalEmail(content: TransactionalEmailContent): { html: string; text: string } {
  const brand = content.clinicName.trim() || "GlowHomeo Assist";
  const preheader = content.preheader ?? content.title;
  const ctaBlock =
    content.ctaLabel && content.ctaUrl
      ? `<tr><td style="padding:24px 32px 8px;">
          <a href="${escapeAttr(content.ctaUrl)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(content.ctaLabel)}</a>
        </td></tr>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
<span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:#0d9488;padding:20px 32px;">
  <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(brand)}</p>
  <p style="margin:4px 0 0;font-size:13px;color:#ccfbf1;">Secure patient communication</p>
</td></tr>
<tr><td style="padding:28px 32px 8px;">
  <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;line-height:1.4;">${escapeHtml(content.title)}</h1>
  ${content.bodyHtml}
</td></tr>
${ctaBlock}
<tr><td style="padding:24px 32px 28px;border-top:1px solid #f3f4f6;">
  <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b7280;">
    This is an automated message from ${escapeHtml(brand)} regarding your healthcare appointment or records.
    Please do not reply to this email with medical details.
  </p>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
    If you did not expect this message, contact the clinic directly or email
    <a href="mailto:${escapeAttr(defaultReplyToAddress())}" style="color:#0d9488;">${escapeHtml(defaultReplyToAddress())}</a>.
  </p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center;">Powered by GlowHomeo Assist</p>
</td></tr>
</table>
</body>
</html>`;

  const textParts = [content.title, "", content.bodyText.replace(/<[^>]+>/g, ""), ""];
  if (content.ctaLabel && content.ctaUrl) {
    textParts.push(`${content.ctaLabel}: ${content.ctaUrl}`, "");
  }
  textParts.push(
    "---",
    `This automated message is from ${brand}. Do not reply with medical details.`,
    `Questions: ${defaultReplyToAddress()}`
  );

  return { html, text: textParts.join("\n") };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

// Create a reusable SMTP transporter (Zoho)
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  const isServerless = !!process.env.VERCEL || !!process.env.LAMBDA_TASK_ROOT || !!process.env.NETLIFY;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: !isServerless,
    maxConnections: isServerless ? undefined : 3,
    dnsFamily: 4, // Force IPv4 to prevent Railway IPv6 resolution timeout issues
    connectionTimeout: 15000, // Fail faster if blocked
  } as any);
}

let _transporter: any = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = createTransporter();
  }
  return _transporter;
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<ChannelSendResult> {
  const to = normalizeEmailAddress(input.to);
  if (!isValidEmailAddress(to)) {
    return { ok: false, error: "Invalid recipient email address" };
  }

  if (notificationMockSendEnabled()) {
    logger.info("notification_email_mock", { to, subject: input.subject });
    return { ok: true, provider: "mock", mock: true, messageId: `mock-${Date.now()}` };
  }

  const from = defaultFromAddress();
  const replyTo = input.replyTo?.trim() || defaultReplyToAddress();

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      logger.info("notification_email_resend_attempt", { to, subject: input.subject });
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: input.subject,
          html: input.html,
          text: input.text || `Please enable HTML to view this email.`,
          reply_to: replyTo,
          tags: input.tags
        })
      });

      if (res.ok) {
        const data = await res.json() as { id?: string };
        return { ok: true, provider: "resend", messageId: data.id };
      } else {
        const errText = await res.text();
        logger.warn("notification_email_resend_failed", { to, error: errText });
        // Fallback to SMTP
      }
    } catch (e: any) {
      logger.warn("notification_email_resend_exception", { to, error: e.message });
      // Fallback to SMTP
    }
  }

  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("notification_email_mock_no_key", { to, subject: input.subject });
      return { ok: true, provider: "mock", mock: true, messageId: `mock-${Date.now()}` };
    }
    return { ok: false, error: "SMTP/Resend not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text || `Please enable HTML to view this email.`,
      replyTo,
    });

    return { ok: true, provider: "smtp", messageId: info.messageId };
  } catch (error: any) {
    logger.error("notification_email_error", { to, subject: input.subject, error: error.message });
    return { ok: false, error: error.message };
  }
}
