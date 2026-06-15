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

export async function sendConfirmationEmail(to: string, subject: string, html: string, options?: EmailOptions) {
  // Resolve CC and BCC from options
  const ccList = options?.cc ? (Array.isArray(options.cc) ? options.cc : options.cc.split(",").map(e => e.trim()).filter(Boolean)) : undefined;
  const bccList = options?.bcc ? (Array.isArray(options.bcc) ? options.bcc : options.bcc.split(",").map(e => e.trim()).filter(Boolean)) : undefined;

  // Resolve Sender "From"
  const from = process.env.NOTIFICATION_FROM_EMAIL || `"MediTonic" <${process.env.SMTP_USER || "care@glowhomeo.in"}>`;

  try {
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

    const ccString = ccList && ccList.length > 0 ? ccList.join(",") : undefined;
    const bccString = bccList && bccList.length > 0 ? bccList.join(",") : undefined;

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
  } catch (error: any) {
    console.error("[Email] Error sending email via Zoho REST API:", error.message);
    return { success: false, error: error.message };
  }
}
