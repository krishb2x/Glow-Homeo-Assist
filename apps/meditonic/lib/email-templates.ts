// Base styling variables
const COLORS = {
  primary: "#1B6B5C",
  secondary: "#10b981",
  background: "#f8fafc",
  card: "#ffffff",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  border: "#e2e8f0"
};

// Base HTML Wrapper
function BaseTemplate(title: string, preheader: string, contentHtml: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text for email clients -->
  <span style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader}
  </span>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${COLORS.card}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-top: 8px solid ${COLORS.primary};">
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid ${COLORS.border};">
              <p style="margin: 0 0 12px 0; color: ${COLORS.primary}; font-size: 14px; font-weight: 600; font-style: italic;">
                "Healing Beyond Symptoms – Restoring Health, Hormones, and Happiness."
              </p>
              <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 13px; line-height: 20px;">
                <strong>MediTonic Team</strong><br>
                <a href="mailto:care.meditonic@gmail.com" style="color: ${COLORS.primary}; text-decoration: none;">care.meditonic@gmail.com</a>
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 18px;">
                This is an automated confirmation email from MediTonic.<br>
                <strong>Powered by GlowHomeo</strong>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ----------------------------------------------------------------------
// Specific Email Templates
// ----------------------------------------------------------------------

export function Template_ConsultationConfirmed(
  name: string,
  details?: { 
    phone?: string; 
    type?: string;
    concernCategory?: string;
    concernDescription?: string;
    bookingId?: string;
  }
) {
  const html = `
    <!-- Checkmark Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #E5F1EE; border-radius: 50%; line-height: 64px; text-align: center;">
        <span style="color: ${COLORS.primary}; font-size: 32px;">✓</span>
      </div>
    </div>

    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 24px; font-weight: 700; text-align: center;">Booking Confirmed!</h2>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px; text-align: center;">
      Thank you for choosing MediTonic. Your payment was successful and your consultation request has been received.
    </p>

    <!-- What happens next card -->
    <div style="background-color: #E5F1EE; border: 1px solid #cce3dc; padding: 24px; border-radius: 12px; margin-bottom: 32px;">
      <h3 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 15px; font-weight: 600;">What happens next?</h3>
      
      <ul style="margin: 0; padding-left: 20px; color: ${COLORS.textSecondary}; font-size: 14px; line-height: 24px;">
        <li>Our team will review your details.</li>
        <li>You will be contacted on your registered mobile number.</li>
        <li>Consultation timing and further instructions will be shared shortly.</li>
      </ul>
    </div>

    <h3 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 16px; font-weight: 600; border-bottom: 1px solid ${COLORS.border}; padding-bottom: 8px;">Booking Details</h3>
    
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.textSecondary}; font-size: 14px; width: 120px;"><strong>Booking ID:</strong></td>
        <td style="padding: 8px 0; color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 600;">${details?.bookingId || 'MT-Pending'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.textSecondary}; font-size: 14px;"><strong>Patient:</strong></td>
        <td style="padding: 8px 0; color: ${COLORS.textPrimary}; font-size: 14px;">${name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.textSecondary}; font-size: 14px;"><strong>Mobile:</strong></td>
        <td style="padding: 8px 0; color: ${COLORS.textPrimary}; font-size: 14px;">${details?.phone || 'Not Provided'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.textSecondary}; font-size: 14px;"><strong>Consultation:</strong></td>
        <td style="padding: 8px 0; color: ${COLORS.textPrimary}; font-size: 14px; text-transform: capitalize;">${(details?.type || 'Online Consultation').replace('-', ' ')}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.textSecondary}; font-size: 14px;"><strong>Concern:</strong></td>
        <td style="padding: 8px 0; color: ${COLORS.textPrimary}; font-size: 14px; text-transform: capitalize;">${(details?.concernCategory || 'General').replace('-', ' ')}</td>
      </tr>
    </table>
  `;
  return BaseTemplate("Booking Confirmed - MediTonic", "Your MediTonic consultation has been confirmed.", html);
}

export function Template_EbookPurchased(
  name: string,
  details?: { phone?: string; amount?: number }
) {
  const amountRow = details?.amount !== undefined ? `
    <tr>
      <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px;">Amount Paid:</td>
      <td style="padding-bottom: 8px; color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500;">₹${details.amount}</td>
    </tr>
  ` : "";

  const phoneRow = details?.phone ? `
    <tr>
      <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px; width: 100px;">Phone/WA:</td>
      <td style="padding-bottom: 8px; color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500;">${details.phone}</td>
    </tr>
  ` : "";

  const detailsHtml = (amountRow || phoneRow) ? `
    <div style="background-color: #f8fafc; border: 1px solid ${COLORS.border}; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: ${COLORS.primary}; font-size: 14px; font-weight: 600; text-transform: uppercase;">Order Details</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${phoneRow}
        ${amountRow}
      </table>
    </div>
  ` : "";

  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Order Confirmed!</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Dear ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Thank you for your eBook purchase from MediTonic. We have successfully received your payment.
    </p>
    
    ${detailsHtml}

    <div style="background-color: #f0fdf4; border-left: 4px solid ${COLORS.secondary}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Next Steps</h3>
      <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 22px;">
        You will receive your eBook download link or a direct copy from our team shortly via WhatsApp/Email.
      </p>
    </div>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards,<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("eBook Purchase Confirmed", "Your eBook purchase was successful.", html);
}

export function Template_PartnerApplication(name: string) {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Application Received</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Hi ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Thank you for applying to the <strong>MediTonic Partner Program</strong>! We have received your application.
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid ${COLORS.border}; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px; line-height: 22px;">
        Our team will review your application within the next 24-48 hours. Once approved, you'll receive your portal login details and instructions on how to generate your referral codes.
      </p>
    </div>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards,<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Application Received", "We have received your MediTonic Partner Application.", html);
}

export function Template_PartnerApproved(name: string, loginUrl: string, tempPassword: string, email: string) {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Welcome to the Program!</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Hi ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      We are thrilled to welcome you to the <strong>MediTonic Partner Referral Program</strong>! Your application has been approved.
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your Portal Credentials</h3>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px; width: 80px;">Login URL:</td>
          <td style="padding-bottom: 8px; font-size: 14px;"><a href="${loginUrl}" style="color: ${COLORS.primary}; font-weight: 500; text-decoration: none;">${loginUrl}</a></td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px;">Email:</td>
          <td style="padding-bottom: 8px; color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500;">${email}</td>
        </tr>
        <tr>
          <td style="color: ${COLORS.textSecondary}; font-size: 14px;">Password:</td>
          <td style="color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500; font-family: monospace; background: #dcfce7; padding: 2px 6px; border-radius: 4px; display: inline-block;">${tempPassword}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 14px; line-height: 22px;">
      <em>Please log in to your dashboard to change your password immediately and view your assigned referral codes.</em>
    </p>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards,<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Application Approved!", "Welcome to the MediTonic Partner Program.", html);
}

export function Template_PartnerRejected(name: string) {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Application Update</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Hi ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Thank you for your interest in the MediTonic Partner Program. After careful consideration, we are unable to approve your application at this time.
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      We appreciate you taking the time to apply and wish you the best in your future endeavors.
    </p>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards,<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Application Update", "An update regarding your MediTonic Partner Application.", html);
}
