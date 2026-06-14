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
  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn("SMTP is not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD). Email will not be sent to:", to);
    return { success: false, error: "SMTP not configured" };
  }

  const from = process.env.NOTIFICATION_FROM_EMAIL || `"GlowHomeo" <${process.env.SMTP_USER}>`;
  const replyTo = process.env.NOTIFICATION_REPLY_TO_EMAIL || "care@glowhomeo.in";

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

    console.log("Successfully sent email to:", to, "| MessageID:", info.messageId);
    return { success: true, data: { id: info.messageId } };
    
  } catch (error: any) {
    console.error("Error sending email via SMTP:", error.message);
    return { success: false, error: error.message };
  }
}
