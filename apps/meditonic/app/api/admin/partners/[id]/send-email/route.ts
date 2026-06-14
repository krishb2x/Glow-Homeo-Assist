import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../../lib/supabase";
import { sendConfirmationEmail } from "../../../../../../lib/email";
import { BRAND } from "../../../../../../lib/constants";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const { id: partnerId } = await params;
    const body = await req.json();

    const {
      to,
      cc = [],
      bcc = [],
      subject = "Your Referral Program Configuration Has Been Updated",
      adminName = "Admin",
      configs = [], // Active product configs to generate the table
    } = body;

    if (!to) {
      return NextResponse.json({ error: "Recipient email (to) is required" }, { status: 400 });
    }

    // 1. Fetch Partner and Referral Code details
    const { data: partner, error: partnerError } = await supabase
      .from("mt_partners")
      .select("*, mt_partner_applications(*)")
      .eq("id", partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const { data: referralCode } = await supabase
      .from("mt_referral_codes")
      .select("*")
      .eq("partner_id", partnerId)
      .limit(1)
      .maybeSingle();

    const partnerName = partner.mt_partner_applications?.name || "Partner";
    const partnerEmail = partner.mt_partner_applications?.email || to;
    const code = referralCode?.code || "N/A";

    // 2. Generate the Referral Table HTML dynamically
    let tableHtml = `
      <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 15px; margin-bottom: 15px;">
        <thead>
          <tr style="background-color: #f8fafc; text-align: left; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #475569; text-transform: uppercase; tracking: 0.05em;">Product</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #475569; text-transform: uppercase; tracking: 0.05em;">Customer Benefit</th>
            <th style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #475569; text-transform: uppercase; tracking: 0.05em;">Your Commission</th>
          </tr>
        </thead>
        <tbody>
    `;

    const activeConfigs = configs.filter((c: any) => c.is_active);
    if (activeConfigs.length === 0) {
      tableHtml += `
        <tr>
          <td colspan="3" style="padding: 16px; text-align: center; color: #64748b; font-size: 14px;">No products currently configured.</td>
        </tr>
      `;
    } else {
      activeConfigs.forEach((cfg: any) => {
        const discountText = cfg.discount_type === 'percentage' ? `${cfg.discount_value}% Off` : `₹${cfg.discount_value} Off`;
        const commissionText = cfg.commission_type === 'percentage' ? `${cfg.commission_value}% Commission` : `₹${cfg.commission_value} Commission`;
        
        tableHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; font-weight: 500;">${cfg.name}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; color: #475569;">${discountText}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; color: #10b981; font-weight: 600;">${commissionText}</td>
          </tr>
        `;
      });
    }
    tableHtml += `
        </tbody>
      </table>
    `;

    // 3. Define the template body
    const templateBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">Referral Program Configuration Updated</h2>
        <p>Hello <strong>{{Partner_Name}}</strong>,</p>
        <p>Your referral program settings have been successfully updated.</p>
        <p style="margin-top: 20px; margin-bottom: 20px; background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
          <strong style="color: #475569; display: block; font-size: 12px; text-transform: uppercase; tracking: 0.05em; margin-bottom: 4px;">Your Referral Code:</strong>
          <span style="font-family: monospace; font-size: 24px; font-weight: 700; color: #0f172a; tracking: 0.05em;">{{Referral_Code}}</span>
        </p>
        <p>The following products and benefits are currently configured for your referral code:</p>
        
        {{Referral_Table}}
        
        <p style="margin-top: 24px;">You can now promote your referral code and start earning commissions based on successful purchases.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 14px; color: #64748b;">
          Best Regards,<br>
          <strong>{{Company_Name}}</strong><br>
          Email: {{Support_Email}}<br>
          Website: <a href="{{Website_URL}}" style="color: #10b981; text-decoration: none;">{{Website_URL}}</a>
        </p>
      </div>
    `;

    // 4. Resolve Template Placeholders
    const resolvedBody = templateBody
      .replace(/{{Partner_Name}}/g, partnerName)
      .replace(/{{Partner_Email}}/g, partnerEmail)
      .replace(/{{Referral_Code}}/g, code)
      .replace(/{{Referral_Table}}/g, tableHtml)
      .replace(/{{Company_Name}}/g, BRAND.name || "MediTonic")
      .replace(/{{Support_Email}}/g, BRAND.email || "care@glowhomeo.in")
      .replace(/{{Website_URL}}/g, BRAND.siteUrl || "https://meditonic.glowhomeo.com")
      .replace(/{{Admin_Name}}/g, adminName)
      .replace(/{{Current_Date}}/g, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));

    // 5. Send email via Resend utility
    const emailResult = await sendConfirmationEmail(
      to,
      subject,
      resolvedBody,
      { cc, bcc }
    );

    // 6. Log email delivery in audit table
    const logStatus = emailResult.success ? "Sent" : "Failed";
    const { error: logErr } = await supabase
      .from("mt_partner_email_logs")
      .insert({
        partner_id: partnerId,
        sent_by_admin: adminName,
        to_email: to,
        cc_emails: Array.isArray(cc) ? cc : (cc ? [cc] : []),
        bcc_emails: Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []),
        subject,
        email_content_snapshot: resolvedBody,
        status: logStatus,
      });

    if (logErr) {
      console.error("Failed to write to email logs:", logErr);
    }

    if (!emailResult.success) {
      return NextResponse.json({ error: "Failed to send email: " + emailResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send config email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const { id: partnerId } = await params;

    // Fetch email logs for this partner
    const { data: logs, error: logsError } = await supabase
      .from("mt_partner_email_logs")
      .select("*")
      .eq("partner_id", partnerId)
      .order("sent_at", { ascending: false });

    if (logsError) {
      return NextResponse.json({ error: "Failed to load email logs: " + logsError.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error: any) {
    console.error("Fetch email logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
