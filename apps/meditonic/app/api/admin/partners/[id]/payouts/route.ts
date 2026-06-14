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
      amount,
      paymentMethod,
      transactionRef = "",
      remarks = "",
      screenshotBase64 = "",
    } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "A valid payout amount is required" }, { status: 400 });
    }

    // 1. Fetch Partner and his applications
    const { data: partner, error: partnerError } = await supabase
      .from("mt_partners")
      .select("*, mt_partner_applications(*)")
      .eq("id", partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partnerName = partner.mt_partner_applications?.name || "Partner";
    const partnerEmail = partner.mt_partner_applications?.email;

    if (!partnerEmail) {
      return NextResponse.json({ error: "Partner email is not configured" }, { status: 400 });
    }

    // 2. Insert Payout row
    const { data: payout, error: payoutError } = await supabase
      .from("mt_partner_payouts")
      .insert({
        partner_id: partnerId,
        amount: Number(amount),
        status: "paid",
        payment_method: paymentMethod || "bank_transfer",
        transaction_reference: transactionRef || null,
        receipt_url: screenshotBase64 || null,
        admin_remarks: remarks || null,
        paid_at: new Date().toISOString()
      })
      .select()
      .single();

    if (payoutError) {
      console.error("Payout insert error:", payoutError);
      return NextResponse.json({ error: "Failed to log payout record: " + payoutError.message }, { status: 500 });
    }

    // 3. Mark all pending order attributions as paid for this partner
    const { error: updateAttrError } = await supabase
      .from("mt_order_attributions")
      .update({
        status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("partner_id", partnerId)
      .eq("status", "pending");

    if (updateAttrError) {
      console.error("Attribution update error:", updateAttrError);
    }

    // 4. Update partner totals in mt_partners (total_commission remains lifetime earned, but let's sync if required)
    // Supabase trigger or manual calculation updates partner balances.

    // 5. Send confirmation email with the screenshot attachment
    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(amount));

    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
        <h2 style="color: #10b981; font-size: 20px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">Referral Payout Cleared</h2>
        <p>Hello <strong>${partnerName}</strong>,</p>
        <p>We are pleased to inform you that your monthly referral commission payout has been successfully processed and marked as done.</p>
        
        <div style="margin: 20px 0; background-color: #f8fafc; padding: 20px; border-radius: 10px; border-left: 4px solid #10b981; font-size: 14px; color: #475569; line-height: 1.8;">
          <strong style="color: #0f172a; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Payout Details:</strong>
          <strong>Amount Paid:</strong> ${formattedAmount}<br/>
          <strong>Payment Method:</strong> ${paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}<br/>
          <strong>Transaction Ref:</strong> ${transactionRef || "N/A"}<br/>
          <strong>Paid Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        <p><strong>Admin Remarks / Notes:</strong></p>
        <blockquote style="margin: 15px 0; padding: 10px 15px; background-color: #fafafa; border-left: 3px solid #cbd5e1; font-style: italic; color: #475569;">
          ${remarks || "Your monthly payout has been processed successfully. Please review the attached receipt."}
        </blockquote>

        ${screenshotBase64 ? `<p style="font-size: 13px; color: #64748b;">We have attached the payment proof screenshot to this email for your reference.</p>` : ""}
        
        <p style="margin-top: 24px;">Thank you for partnering with us. We appreciate your efforts in helping patients discover premium homeopathic care.</p>
        
        <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 14px; color: #64748b;">
          Best Regards,<br>
          <strong>${BRAND.name || "MediTonic Support"}</strong><br>
          Email: ${BRAND.email || "care@glowhomeo.in"}<br>
          Website: <a href="${BRAND.siteUrl || "https://meditonic.glowhomeo.com"}" style="color: #10b981; text-decoration: none;">${BRAND.siteUrl || "https://meditonic.glowhomeo.com"}</a>
        </p>
      </div>
    `;

    const emailOptions: any = {};
    if (screenshotBase64 && screenshotBase64.startsWith("data:")) {
      try {
        const mimeTypeMatch = screenshotBase64.match(/^data:([^;]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
        const extension = mimeType.split("/")[1] || "png";
        const base64Data = screenshotBase64.split(",")[1];
        
        emailOptions.attachments = [
          {
            filename: `payout_receipt_${payout.id.split("-")[0]}.${extension}`,
            content: base64Data,
          }
        ];
      } catch (err) {
        console.error("Failed to parse attachment base64:", err);
      }
    }

    const emailResult = await sendConfirmationEmail(
      partnerEmail,
      `Your referral payout of ${formattedAmount} has been processed`,
      emailBody,
      emailOptions
    );

    // 6. Log in email audit trail
    const logStatus = emailResult.success ? "Sent" : "Failed";
    await supabase
      .from("mt_partner_email_logs")
      .insert({
        partner_id: partnerId,
        sent_by_admin: "MediTonic Admin",
        to_email: partnerEmail,
        cc_emails: [],
        bcc_emails: [],
        subject: `Your referral payout of ${formattedAmount} has been processed`,
        email_content_snapshot: emailBody,
        status: logStatus
      });

    return NextResponse.json({ success: true, payoutId: payout.id });

  } catch (error: any) {
    console.error("Initiate payout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
