interface EmailOptions {
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendConfirmationEmail(to: string, subject: string, html: string, options?: EmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured. Email will not be sent to:", to);
    return { success: false, error: "API Key missing" };
  }

  // Use the brand email if configured, otherwise use Resend's default onboarding email for testing
  const from = process.env.RESEND_FROM_EMAIL || process.env.NOTIFICATION_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const ccList = options?.cc 
      ? (Array.isArray(options.cc) ? options.cc : options.cc.split(',').map(s => s.trim()).filter(Boolean)) 
      : undefined;

    const bccList = options?.bcc 
      ? (Array.isArray(options.bcc) ? options.bcc : options.bcc.split(',').map(s => s.trim()).filter(Boolean)) 
      : undefined;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        cc: ccList,
        bcc: bccList,
        reply_to: process.env.NOTIFICATION_REPLY_TO_EMAIL || "care@glowhomeo.in",
        subject,
        html,
        text: `Please enable HTML to view this email from MediTonic.`
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Failed to send email via Resend:", errorText);
      return { success: false, error: errorText };
    }

    const data = await res.json();
    console.log("Successfully sent confirmation email to:", to);
    return { success: true, data };
    
  } catch (error: any) {
    console.error("Error sending email via Resend:", error);
    return { success: false, error: error.message };
  }
}
