import nodemailer from "nodemailer";

interface EmailOptions {
  cc?: string;
  bcc?: string;
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

// Singleton transporter instance
let _transporter: any = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = createTransporter();
  }
  return _transporter;
}

export async function sendConfirmationEmail(to: string, subject: string, html: string, options?: EmailOptions) {
  const from = process.env.NOTIFICATION_FROM_EMAIL || `"GlowHomeo" <${process.env.SMTP_USER || "care@glowhomeo.in"}>`;
  const replyTo = process.env.NOTIFICATION_REPLY_TO_EMAIL || "care@glowhomeo.in";

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

  // Fallback to Zoho SMTP
  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn("SMTP is not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD). Email will not be sent to:", to);
    return { success: false, error: "SMTP not configured" };
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
