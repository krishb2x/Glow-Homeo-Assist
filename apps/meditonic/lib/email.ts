interface EmailOptions {
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: { filename: string; content: string }[];
}

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

  console.log("[Email] Refreshing Zoho Mail API access token...");
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
  console.log(`[Email] Zoho token refreshed successfully. Expiry in ${data.expires_in} seconds.`);

  return _zohoAccessToken;
}

async function getZohoAccountId(accessToken: string, senderEmail: string): Promise<string> {
  if (_zohoAccountId) {
    return _zohoAccountId;
  }

  console.log(`[Email] Fetching Zoho account list to resolve accountId for ${senderEmail}...`);
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
      console.warn(`[Email] Sender email ${senderEmail} not found in Zoho accounts. Defaulting to first available account: ${result.data[0].mailboxAddress}`);
      _zohoAccountId = result.data[0].accountId;
    } else {
      throw new Error(`No accounts found in your Zoho developer configuration.`);
    }
  } else {
    _zohoAccountId = matchedAccount.accountId;
  }

  console.log(`[Email] Resolved Zoho accountId: ${_zohoAccountId} for mailbox ${senderEmail}`);
  return _zohoAccountId;
}

import { createAdminClient } from "./supabase";

function getToggleKey(subject: string): string | null {
  const s = subject.toLowerCase();
  if (s.includes("consultation confirmation") || s.includes("booking confirmed")) {
    return "enable_consultation_confirmed";
  }
  if (s.includes("order") || s.includes("delivery") || s.includes("ebook")) {
    return "enable_store_product_delivery";
  }
  if (s.includes("application received")) {
    return "enable_partner_application_received";
  }
  if (s.includes("approved") || s.includes("partner account approved")) {
    return "enable_partner_approved";
  }
  if (s.includes("payout")) {
    return "enable_partner_payout_processed";
  }
  if (s.includes("rejected")) {
    return "enable_partner_rejected";
  }
  return null;
}

export async function sendConfirmationEmail(to: string, subject: string, html: string, options?: EmailOptions) {
  // Resolve CC and BCC from options
  const ccList = options?.cc ? (Array.isArray(options.cc) ? options.cc : options.cc.split(",").map(e => e.trim()).filter(Boolean)) : [];
  const bccList = options?.bcc ? (Array.isArray(options.bcc) ? options.bcc : options.bcc.split(",").map(e => e.trim()).filter(Boolean)) : [];

  // Resolve Sender "From"
  const from = process.env.NOTIFICATION_FROM_EMAIL || `"MediTonic" <${process.env.SMTP_USER || "care@glowhomeo.in"}>`;

  try {
    const supabase = createAdminClient();
    const clinicId = process.env.MEDITONIC_CLINIC_ID || "595cd444-e89c-4d1f-b31f-27f76f59e0d7";

    const { data: settings } = await supabase
      .from("mt_email_settings")
      .select("*")
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (settings) {
      const toggleKey = getToggleKey(subject);
      if (toggleKey && settings[toggleKey] === false) {
        console.log(`[Email] Email dispatch skipped because template toggle ${toggleKey} is disabled for subject: ${subject}`);
        return { success: true, skipped: true };
      }
    }

    // 1. Route: Resend HTTP API
    if (settings?.provider === "resend") {
      const resendApiKey = settings.resend_api_key || process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        throw new Error("Missing Resend API Key");
      }

      const defaultCcList = settings.default_cc ? settings.default_cc.split(",").map((e: string) => e.trim()).filter(Boolean) : [];
      const defaultBccList = settings.default_bcc ? settings.default_bcc.split(",").map((e: string) => e.trim()).filter(Boolean) : [];

      const finalCc = Array.from(new Set([...ccList, ...defaultCcList]));
      const finalBcc = Array.from(new Set([...bccList, ...defaultBccList]));

      const body: any = {
        from,
        to: [to],
        subject,
        html,
      };

      if (finalCc.length > 0) body.cc = finalCc;
      if (finalBcc.length > 0) body.bcc = finalBcc;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend HTTP API failed: ${res.statusText} - ${errText}`);
      }

      const result = await res.json() as { id: string };
      return { success: true, data: { id: result.id } };
    }

    // 2. Route: AWS SES
    if (settings?.provider === "ses") {
      const { SESClient } = await import("@aws-sdk/client-ses");
      const sesClient = new SESClient({
        region: process.env.AWS_REGION || "ap-south-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });

      const nodemailerModule = await import("nodemailer");
      const nodemailer = nodemailerModule.default || nodemailerModule;
      const transporter = nodemailer.createTransport({
        SES: { ses: sesClient, aws: await import("@aws-sdk/client-ses") },
      } as any);

      const defaultBccList = settings.default_bcc ? settings.default_bcc.split(",").map((e: string) => e.trim()).filter(Boolean) : [];
      const finalBcc = Array.from(new Set([...bccList, ...defaultBccList]));

      const mailOptions: any = {
        from,
        to,
        subject,
        html,
      };

      if (ccList.length > 0) mailOptions.cc = ccList;
      if (finalBcc.length > 0) mailOptions.bcc = finalBcc;

      const info = await transporter.sendMail(mailOptions);
      return { success: true, data: { id: info.messageId } };
    }

    // 3. Fallback: Zoho REST API or SMTP
    const hasZohoConfig = process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN;

    if (hasZohoConfig) {
      console.log(`[Email] Sending email via Zoho Mail REST API to ${to}...`);
      const accessToken = await getZohoAccessToken();
      
      let rawFromAddress = process.env.SMTP_USER || "care@glowhomeo.in";
      const fromMatch = from.match(/<([^>]+)>/);
      if (fromMatch) {
        rawFromAddress = fromMatch[1];
      }

      const accountId = await getZohoAccountId(accessToken, rawFromAddress);

      const uploadedAttachments: { storeName: string; attachmentName: string; attachmentPath: string }[] = [];
      if (options?.attachments && options.attachments.length > 0) {
        console.log(`[Email] Uploading ${options.attachments.length} attachments to Zoho file store...`);
        for (const att of options.attachments) {
          const buffer = Buffer.from(att.content, "base64");
          const blob = new Blob([buffer], { type: "application/octet-stream" });
          
          const formData = new FormData();
          formData.append("attach", blob, att.filename);

          const uploadRes = await fetch(`https://mail.zoho.in/api/accounts/${accountId}/messages/attachments?uploadType=multipart`, {
            method: "POST",
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
            body: formData,
          });

          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(`Failed to upload attachment ${att.filename}: ${uploadRes.statusText} - ${errText}`);
          }

          const uploadResult = await uploadRes.json() as {
            data?: { storeName: string; attachmentName: string; attachmentPath: string }[];
            status?: { code: number; description: string };
          };

          if (uploadResult.data && Array.isArray(uploadResult.data) && uploadResult.data.length > 0) {
            const upInfo = uploadResult.data[0];
            uploadedAttachments.push({
              storeName: upInfo.storeName,
              attachmentName: upInfo.attachmentName,
              attachmentPath: upInfo.attachmentPath,
              originalName: att.filename,
            } as any);
            console.log(`[Email] Successfully uploaded attachment: ${att.filename} -> ${upInfo.storeName}`);
          } else {
            throw new Error(`Invalid upload response structure for attachment ${att.filename}: ${JSON.stringify(uploadResult)}`);
          }
        }
      }

      const ccString = ccList.length > 0 ? ccList.join(",") : undefined;
      const bccString = bccList.length > 0 ? bccList.join(",") : undefined;

      const payload: any = {
        fromAddress: rawFromAddress,
        toAddress: to,
        subject,
        content: html,
        mailFormat: "html",
        askReceipt: "no",
      };

      if (ccString) payload.ccAddress = ccString;
      if (bccString) payload.bccAddress = bccString;
      if (uploadedAttachments.length > 0) {
        payload.attachments = uploadedAttachments;
      }

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
        console.log(`Successfully sent email via Zoho REST API to: ${to} | MessageID: ${sendResult.data?.messageId || "unknown"}`);
        return { success: true, data: { id: sendResult.data?.messageId } };
      } else {
        const errDesc = sendResult.status?.description || JSON.stringify(sendResult);
        console.error(`[Email] Zoho REST API send failed: ${errDesc}`);
        return { success: false, error: `Zoho REST API send failed: ${errDesc}` };
      }
    } else {
      console.log(`[Email] Zoho config not found. Falling back to nodemailer SMTP for ${to}...`);
      const nodemailerModule = await import("nodemailer");
      const nodemailer = nodemailerModule.default || nodemailerModule;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.zoho.in",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER || "care@glowhomeo.in",
          pass: process.env.SMTP_PASSWORD || "",
        },
      });

      const mailOptions: any = {
        from,
        to,
        subject,
        html,
      };

      if (ccList.length > 0) mailOptions.cc = ccList;
      if (bccList.length > 0) mailOptions.bcc = bccList;

      const info = await transporter.sendMail(mailOptions);
      return { success: true, data: { id: info.messageId } };
    }
  } catch (error: any) {
    console.error("[Email] Error sending email:", error.message);
    return { success: false, error: error.message };
  }
}
