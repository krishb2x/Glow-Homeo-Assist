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

// Zoho Token Caching variables for API project
let _zohoAccessToken: string | null = null;
let _zohoTokenExpiry = 0;
let _zohoAccountId: string | null = null;

async function getZohoAccessToken(): Promise<string> {
  const now = Date.now();
  if (_zohoAccessToken && _zohoTokenExpiry > now + 60000) {
    return _zohoAccessToken;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Zoho API configuration (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN)");
  }

  logger.info("email_zoho_token_refresh");
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch("https://accounts.zoho.in/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Zoho token: ${res.statusText} - ${errText}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number; error?: string };
  if (data.error || !data.access_token) {
    throw new Error(`Zoho token refresh error: ${JSON.stringify(data)}`);
  }

  _zohoAccessToken = data.access_token;
  _zohoTokenExpiry = Date.now() + (data.expires_in * 1000);
  return _zohoAccessToken;
}

async function getZohoAccountId(accessToken: string, senderEmail: string): Promise<string> {
  if (_zohoAccountId) {
    return _zohoAccountId;
  }

  logger.info("email_zoho_accounts_fetch", { senderEmail });
  const res = await fetch("https://mail.zoho.in/api/accounts", {
    method: "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Zoho accounts: ${res.statusText} - ${errText}`);
  }

  const result = await res.json() as {
    data?: { accountId: string; mailboxAddress: string }[];
    status?: { code: number; description: string };
  };

  if (!result.data || !Array.isArray(result.data)) {
    throw new Error(`Invalid accounts response structure: ${JSON.stringify(result)}`);
  }

  const emailLower = senderEmail.toLowerCase();
  const matchedAccount = result.data.find(
    acc => acc.mailboxAddress.toLowerCase() === emailLower
  );

  if (!matchedAccount) {
    if (result.data.length > 0) {
      logger.warn("email_zoho_sender_mismatch", { senderEmail, defaultTo: result.data[0].mailboxAddress });
      _zohoAccountId = result.data[0].accountId;
    } else {
      throw new Error(`No accounts found in your Zoho developer configuration.`);
    }
  } else {
    _zohoAccountId = matchedAccount.accountId;
  }

  return _zohoAccountId;
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

  try {
    logger.info("notification_email_zoho_api_attempt", { to, subject: input.subject });
    const accessToken = await getZohoAccessToken();
    
    let rawFromAddress = process.env.SMTP_USER || "care@glowhomeo.in";
    const fromMatch = from.match(/<([^>]+)>/);
    if (fromMatch) {
      rawFromAddress = fromMatch[1];
    }

    const accountId = await getZohoAccountId(accessToken, rawFromAddress);

    const payload: any = {
      fromAddress: rawFromAddress,
      toAddress: to,
      subject: input.subject,
      content: input.html,
      mailFormat: "html",
      askReceipt: "no",
    };

    const sendRes = await fetch(`https://mail.zoho.in/api/accounts/${accountId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const sendResult = await sendRes.json() as any;

    if (sendRes.ok && sendResult.status?.code === 200) {
      logger.info("notification_email_zoho_api_success", { to, messageId: sendResult.data?.messageId });
      return { ok: true, provider: "zoho_api", messageId: sendResult.data?.messageId };
    } else {
      const errDesc = sendResult.status?.description || JSON.stringify(sendResult);
      logger.error("notification_email_zoho_api_failed", { to, error: errDesc });
      return { ok: false, error: `Zoho REST API send failed: ${errDesc}` };
    }
  } catch (error: any) {
    logger.error("notification_email_zoho_api_error", { to, error: error.message });
    return { ok: false, error: error.message };
  }
}
