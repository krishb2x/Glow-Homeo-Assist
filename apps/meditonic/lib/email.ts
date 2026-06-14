import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

interface EmailOptions {
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: { filename: string; content: string }[];
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
    pool: !isServerless, // Disable connection pooling in serverless environments
    maxConnections: isServerless ? undefined : 3,
    dnsFamily: 4, // Force IPv4 to prevent IPv6 resolution timeout issues
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
    console.warn("Email transport is not configured (missing SMTP or AWS credentials). Email will not be sent to:", to);
    return { success: false, error: "Email transport not configured" };
  }

  const isSES = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
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
  }

  const replyTo = process.env.NOTIFICATION_REPLY_TO_EMAIL || "care@glowhomeo.in";

  try {
    // Normalize CC and BCC to arrays
    const ccList = options?.cc 
      ? (Array.isArray(options.cc) ? options.cc : options.cc.split(',').map(s => s.trim()).filter(Boolean)) 
      : undefined;

    const bccList = options?.bcc 
      ? (Array.isArray(options.bcc) ? options.bcc : options.bcc.split(',').map(s => s.trim()).filter(Boolean)) 
      : undefined;

    // Build attachments in nodemailer format
    const attachments = options?.attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      encoding: "base64" as const,
    }));

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

    const providerName = isSES ? "SES" : "SMTP";
    console.log(`Successfully sent email via ${providerName} to:`, to, "| MessageID:", info.messageId);
    return { success: true, data: { id: info.messageId } };
    
  } catch (error: any) {
    const providerName = isSES ? "SES" : "SMTP";
    console.error(`Error sending email via ${providerName}:`, error.message);
    return { success: false, error: error.message };
  }
}
