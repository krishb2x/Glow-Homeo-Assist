import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { createAdminClient } from "./supabase";

interface EmailOptions {
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: { filename: string; content: string }[];
}

let _sesTransporter: any = null;
let _smtpTransporter: any = null;

function getSESTransporter() {
  if (!_sesTransporter) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "eu-north-1";

    if (accessKeyId && secretAccessKey) {
      const sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      _sesTransporter = nodemailer.createTransport({
        SES: { ses: sesClient, aws: { SendRawEmailCommand } },
      } as any);
    }
  }
  return _sesTransporter;
}

function getSMTPTransporter() {
  if (!_smtpTransporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      const isServerless = !!process.env.VERCEL || !!process.env.LAMBDA_TASK_ROOT || !!process.env.NETLIFY;

      _smtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: !isServerless,
        maxConnections: isServerless ? undefined : 3,
        dnsFamily: 4,
        connectionTimeout: 15000,
      } as any);
    }
  }
  return _smtpTransporter;
}

// Maps email subject to its database toggle field in mt_email_settings
function getEmailToggleField(subject: string): string | null {
  const sub = subject.toLowerCase();
  if (sub.includes("booking") || sub.includes("consultation") || sub.includes("appointment")) {
    return "enable_consultation_confirmed";
  }
  if (sub.includes("order") || sub.includes("delivery") || sub.includes("fulfillment") || sub.includes("receipt") || sub.includes("store order")) {
    return "enable_store_product_delivery";
  }
  if (sub.includes("application received")) {
    return "enable_partner_application_received";
  }
  if (sub.includes("welcome to the") || (sub.includes("partner program") && sub.includes("welcome"))) {
    return "enable_partner_approved";
  }
  if (sub.includes("payout") || sub.includes("commission payout")) {
    return "enable_partner_payout_processed";
  }
  if (sub.includes("partner application") && (sub.includes("update") || sub.includes("status") || sub.includes("reject"))) {
    return "enable_partner_rejected";
  }
  return null;
}

// Helper to merge lists of emails
function mergeEmails(existing?: string | string[], defaults?: string | null): string[] | undefined {
  const list: string[] = [];
  if (existing) {
    if (Array.isArray(existing)) {
      list.push(...existing);
    } else {
      list.push(...existing.split(",").map(e => e.trim()).filter(Boolean));
    }
  }
  if (defaults) {
    list.push(...defaults.split(",").map(e => e.trim()).filter(Boolean));
  }
  const unique = Array.from(new Set(list));
  return unique.length > 0 ? unique : undefined;
}

export async function sendConfirmationEmail(to: string, subject: string, html: string, options?: EmailOptions) {
  let settings: any = null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("mt_email_settings")
      .select("*")
      .eq("clinic_id", "595cd444-e89c-4d1f-b31f-27f76f59e0d7")
      .maybeSingle();

    if (!error && data) {
      settings = data;
    }
  } catch (e: any) {
    console.warn("Failed to fetch mt_email_settings from database. Using fallback/environment configuration:", e.message);
  }

  // 1. Check template toggle
  const toggleField = getEmailToggleField(subject);
  if (settings && toggleField && settings[toggleField] === false) {
    console.log(`[Email] Skipping email sending for "${subject}" to ${to} because ${toggleField} is disabled.`);
    return { success: true, skipped: true };
  }

  // 2. Select Provider
  const provider = settings?.provider || (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? "ses" : "smtp");

  // 3. Resolve CC and BCC
  const ccList = mergeEmails(options?.cc, settings?.default_cc);
  const bccList = mergeEmails(options?.bcc, settings?.default_bcc);

  // 4. Resolve Sender "From"
  const isSES = provider === "ses";
  let from = process.env.NOTIFICATION_FROM_EMAIL || `"MediTonic" <${process.env.SMTP_USER || "care@glowhomeo.in"}>`;
  if (isSES) {
    const sesFrom = process.env.SES_FROM_EMAIL || "care@glowhomeo.com";
    if (process.env.NOTIFICATION_FROM_EMAIL) {
      if (process.env.NOTIFICATION_FROM_EMAIL.includes("<")) {
        from = process.env.NOTIFICATION_FROM_EMAIL.replace(/<[^>]+>/, `<${sesFrom}>`);
      } else {
        from = sesFrom;
      }
    } else {
      from = `"MediTonic" <${sesFrom}>`;
    }
  } else if (provider === "resend") {
    from = process.env.NOTIFICATION_FROM_EMAIL || `"MediTonic" <care@glowhomeo.in>`;
  }

  const replyTo = process.env.NOTIFICATION_REPLY_TO_EMAIL || "care@glowhomeo.in";

  // 5. Build attachments
  const attachments = options?.attachments?.map(att => ({
    filename: att.filename,
    content: att.content,
    encoding: "base64" as const,
  }));

  // Route email to provider
  if (provider === "resend") {
    const resendApiKey = settings?.resend_api_key?.trim() || process.env.RESEND_API_KEY?.trim();
    if (!resendApiKey) {
      console.error("[Email] Resend selected but RESEND_API_KEY is not configured.");
      return { success: false, error: "Resend API key not configured" };
    }

    try {
      console.log(`[Email] Sending email via Resend API to ${to}...`);
      const payload: any = {
        from,
        to: [to],
        subject,
        html,
        text: `Please enable HTML to view this email from MediTonic.`,
        reply_to: replyTo,
        cc: ccList,
        bcc: bccList,
      };

      if (options?.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments.map(att => ({
          filename: att.filename,
          content: att.content // Resend accepts base64 content
        }));
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resData = await res.json() as { id?: string };
        console.log("Successfully sent email via Resend API to:", to, "| MessageID:", resData.id);
        return { success: true, data: { id: resData.id } };
      } else {
        const errText = await res.text();
        console.error(`[Email] Resend API failed: ${errText}`);
        return { success: false, error: `Resend API failed: ${errText}` };
      }
    } catch (error: any) {
      console.error("[Email] Error sending email via Resend API:", error.message);
      return { success: false, error: error.message };
    }
  }

  // SES Router
  if (provider === "ses") {
    const transporter = getSESTransporter();
    if (!transporter) {
      console.error("[Email] SES selected but SES transporter could not be initialized.");
      return { success: false, error: "SES transporter not configured" };
    }

    try {
      console.log(`[Email] Sending email via AWS SES to ${to}...`);
      const info = await transporter.sendMail({
        from,
        to,
        cc: ccList,
        bcc: bccList,
        replyTo,
        subject,
        html,
        text: `Please enable HTML to view this email from MediTonic.`,
        attachments,
      });
      console.log("Successfully sent email via SES to:", to, "| MessageID:", info.messageId);
      return { success: true, data: { id: info.messageId } };
    } catch (error: any) {
      console.error("[Email] Error sending email via SES:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Default / SMTP Zoho Router
  const transporter = getSMTPTransporter();
  if (!transporter) {
    console.error("[Email] SMTP selected but SMTP transporter could not be initialized.");
    return { success: false, error: "SMTP transporter not configured" };
  }

  try {
    console.log(`[Email] Sending email via Zoho SMTP to ${to}...`);
    const info = await transporter.sendMail({
      from,
      to,
      cc: ccList,
      bcc: bccList,
      replyTo,
      subject,
      html,
      text: `Please enable HTML to view this email from MediTonic.`,
      attachments,
    });
    console.log("Successfully sent email via SMTP to:", to, "| MessageID:", info.messageId);
    return { success: true, data: { id: info.messageId } };
  } catch (error: any) {
    console.error("[Email] Error sending email via SMTP:", error.message);
    return { success: false, error: error.message };
  }
}

