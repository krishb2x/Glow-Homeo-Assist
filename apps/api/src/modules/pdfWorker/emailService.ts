import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

interface EmailOptions {
  cc?: string;
  bcc?: string;
}

// Create a reusable transporter (AWS SES or Zoho SMTP)
function createTransporter() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "eu-north-1";

  // 1. AWS SES (Primary)
  if (accessKeyId && secretAccessKey) {
    const sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return nodemailer.createTransport({
      SES: { ses: sesClient, aws: { SendRawEmailCommand } },
    } as any);
  }

  // 2. Zoho SMTP (Fallback)
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

// Singleton transporter instance
let _transporter: any = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = createTransporter();
  }
  return _transporter;
}

export async function sendConfirmationEmail(to: string, subject: string, html: string, options?: EmailOptions) {
  const isSES = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  let from = process.env.NOTIFICATION_FROM_EMAIL || `"GlowHomeo" <${process.env.SMTP_USER || "care@glowhomeo.in"}>`;
  if (isSES) {
    const sesFrom = process.env.SES_FROM_EMAIL || "care@glowhomeo.com";
    if (process.env.NOTIFICATION_FROM_EMAIL) {
      if (process.env.NOTIFICATION_FROM_EMAIL.includes("<")) {
        from = process.env.NOTIFICATION_FROM_EMAIL.replace(/<[^>]+>/, `<${sesFrom}>`);
      } else {
        from = sesFrom;
      }
    } else {
      from = `"GlowHomeo" <${sesFrom}>`;
    }
  }

  const replyTo = process.env.NOTIFICATION_REPLY_TO_EMAIL || "care@glowhomeo.in";

  // 1. AWS SES (Primary)
  if (isSES) {
    const transporter = getTransporter();
    if (transporter) {
      try {
        console.log(`[Email] Attempting to send email via AWS SES to ${to}...`);
        const info = await transporter.sendMail({
          from,
          to,
          cc: options?.cc || undefined,
          bcc: options?.bcc || undefined,
          replyTo,
          subject,
          html,
          text: `Please enable HTML to view this email.`,
        });
        console.log("Successfully sent email via AWS SES to:", to, "| MessageID:", info.messageId);
        return { success: true, data: { id: info.messageId } };
      } catch (error: any) {
        console.error("Error sending email via AWS SES:", error.message);
        // Fallback to Resend or Zoho SMTP if SES fails
      }
    }
  }

  // 2. Resend API
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      console.log(`[Email] Attempting to send email via Resend API (HTTPS) to ${to}...`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text: `Please enable HTML to view this email.`,
          reply_to: replyTo,
          cc: options?.cc ? [options.cc] : undefined,
          bcc: options?.bcc ? [options.bcc] : undefined,
        })
      });

      if (res.ok) {
        const data = await res.json() as { id?: string };
        console.log("Successfully sent email via Resend API to:", to, "| MessageID:", data.id);
        return { success: true, data: { id: data.id } };
      } else {
        const errText = await res.text();
        console.warn(`[Email] Resend API failed: ${errText}. Falling back to SMTP...`);
      }
    } catch (e: any) {
      console.warn(`[Email] Resend API exception: ${e.message}. Falling back to SMTP...`);
    }
  }

  // 3. Zoho SMTP
  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn("Email transport is not configured. Email will not be sent to:", to);
    return { success: false, error: "Email transport not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      cc: options?.cc || undefined,
      bcc: options?.bcc || undefined,
      replyTo,
      subject,
      html,
      text: `Please enable HTML to view this email.`,
    });

    console.log("Successfully sent email via SMTP to:", to, "| MessageID:", info.messageId);
    return { success: true, data: { id: info.messageId } };
    
  } catch (error: any) {
    console.error("Error sending email via SMTP:", error.message);
    return { success: false, error: error.message };
  }
}
