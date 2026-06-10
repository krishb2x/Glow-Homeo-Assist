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

    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 24px; font-weight: 700; text-align: center;">Booking Confirmed! (बुकिंग कन्फर्म हो गई!)</h2>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px; text-align: center;">
      Thank you for choosing MediTonic. Your payment was successful and your consultation request has been received.<br>
      MediTonic को चुनने के लिए धन्यवाद। आपका भुगतान सफल रहा और आपका परामर्श अनुरोध प्राप्त हो गया है।
    </p>

    <!-- What happens next card -->
    <div style="background-color: #E5F1EE; border: 1px solid #cce3dc; padding: 24px; border-radius: 12px; margin-bottom: 32px;">
      <h3 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 15px; font-weight: 600;">What happens next? (आगे क्या होगा?)</h3>
      
      <ul style="margin: 0; padding-left: 20px; color: ${COLORS.textSecondary}; font-size: 14px; line-height: 24px;">
        <li>Our team will review your details.<br>(हमारी टीम आपके विवरण की समीक्षा करेगी।)</li>
        <li>You will be contacted on your registered mobile number.<br>(आपके पंजीकृत मोबाइल नंबर पर आपसे संपर्क किया जाएगा।)</li>
        <li>Consultation timing and further instructions will be shared shortly.<br>(परामर्श का समय और आगे के निर्देश जल्द ही साझा किए जाएंगे।)</li>
      </ul>
    </div>

    <h3 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 16px; font-weight: 600; border-bottom: 1px solid ${COLORS.border}; padding-bottom: 8px;">Booking Details (बुकिंग विवरण)</h3>
    
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
  return BaseTemplate("Booking Confirmed / बुकिंग कन्फर्म हो गई - MediTonic", "Your MediTonic consultation has been confirmed.", html);
}

export function Template_EbookPurchased(
  name: string,
  details?: { phone?: string; amount?: number }
) {
  const amountRow = details?.amount !== undefined ? `
    <tr>
      <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px;">Amount Paid (भुगतान राशि):</td>
      <td style="padding-bottom: 8px; color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500;">₹${details.amount}</td>
    </tr>
  ` : "";

  const phoneRow = details?.phone ? `
    <tr>
      <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px; width: 150px;">Phone/WA (फ़ोन):</td>
      <td style="padding-bottom: 8px; color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500;">${details.phone}</td>
    </tr>
  ` : "";

  const detailsHtml = (amountRow || phoneRow) ? `
    <div style="background-color: #f8fafc; border: 1px solid ${COLORS.border}; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: ${COLORS.primary}; font-size: 14px; font-weight: 600; text-transform: uppercase;">Order Details (ऑर्डर विवरण)</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${phoneRow}
        ${amountRow}
      </table>
    </div>
  ` : "";

  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Order Confirmed! (ऑर्डर कन्फर्म हो गया!)</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Dear / प्रिय ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Thank you for your eBook purchase from MediTonic. We have successfully received your payment.<br>
      MediTonic से ई-बुक खरीदने के लिए धन्यवाद। हमें आपका भुगतान सफलतापूर्वक प्राप्त हो गया है।
    </p>
    
    ${detailsHtml}

    <div style="background-color: #f0fdf4; border-left: 4px solid ${COLORS.secondary}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Next Steps (अगला कदम)</h3>
      <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 22px;">
        You will receive your eBook download link or a direct copy from our team shortly via WhatsApp/Email.<br>
        आपको जल्द ही हमारी टीम से व्हाट्सएप/ईमेल के माध्यम से अपनी ई-बुक का डाउनलोड लिंक या कॉपी प्राप्त होगी।
      </p>
    </div>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards (सादर),<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("eBook Purchase Confirmed / ई-बुक की खरीदारी कन्फर्म हो गई", "Your eBook purchase was successful.", html);
}

export function Template_PartnerApplication(name: string) {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Application Received (आवेदन प्राप्त हुआ)</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Hi / नमस्ते ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Thank you for applying to the <strong>MediTonic Partner Program</strong>! We have received your application.<br>
      <strong>MediTonic पार्टनर प्रोग्राम</strong> में आवेदन करने के लिए धन्यवाद! हमें आपका आवेदन प्राप्त हो गया है।
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid ${COLORS.border}; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px; line-height: 22px;">
        Our team will review your application within the next 24-48 hours. Once approved, you'll receive your portal login details and instructions on how to generate your referral codes.<br><br>
        हमारी टीम अगले 24-48 घंटों के भीतर आपके आवेदन की समीक्षा करेगी। स्वीकृत होने के बाद, आपको अपने पोर्टल लॉगिन विवरण और अपने रेफरल कोड जनरेट करने के निर्देश प्राप्त होंगे।
      </p>
    </div>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards (सादर),<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Application Received / आवेदन प्राप्त हुआ", "We have received your MediTonic Partner Application.", html);
}

export function Template_PartnerApproved(name: string, loginUrl: string, tempPassword: string, email: string) {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Welcome to the Program! (प्रोग्राम में आपका स्वागत है!)</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Hi / नमस्ते ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      We are thrilled to welcome you to the <strong>MediTonic Partner Referral Program</strong>! Your application has been approved.<br>
      हमें आपको <strong>MediTonic पार्टनर रेफरल प्रोग्राम</strong> में शामिल करने में खुशी हो रही है! आपका आवेदन स्वीकृत कर लिया गया है।
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your Portal Credentials (आपके पोर्टल क्रेडेंशियल)</h3>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px; width: 100px;">Login URL:</td>
          <td style="padding-bottom: 8px; font-size: 14px;"><a href="${loginUrl}" style="color: ${COLORS.primary}; font-weight: 500; text-decoration: none;">${loginUrl}</a></td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: ${COLORS.textSecondary}; font-size: 14px;">Email (ईमेल):</td>
          <td style="padding-bottom: 8px; color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500;">${email}</td>
        </tr>
        <tr>
          <td style="color: ${COLORS.textSecondary}; font-size: 14px;">Password (पासवर्ड):</td>
          <td style="color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 500; font-family: monospace; background: #dcfce7; padding: 2px 6px; border-radius: 4px; display: inline-block;">${tempPassword}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 14px; line-height: 22px;">
      <em>Please log in to your dashboard to change your password immediately and view your assigned referral codes.</em><br>
      <em>कृपया अपना पासवर्ड तुरंत बदलने और अपने रेफरल कोड देखने के लिए अपने डैशबोर्ड में लॉग इन करें।</em>
    </p>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards (सादर),<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Application Approved! / आवेदन स्वीकृत हुआ!", "Welcome to the MediTonic Partner Program.", html);
}

export function Template_PartnerRejected(name: string) {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 20px; font-weight: 600;">Application Update (आवेदन अपडेट)</h2>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Hi / नमस्ते ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Thank you for your interest in the MediTonic Partner Program. After careful consideration, we are unable to approve your application at this time.<br>
      MediTonic पार्टनर प्रोग्राम में रुचि दिखाने के लिए धन्यवाद। सावधानीपूर्वक विचार करने के बाद, हम इस समय आपके आवेदन को स्वीकृत करने में असमर्थ हैं।
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      We appreciate you taking the time to apply and wish you the best in your future endeavors.<br>
      हम आवेदन करने के लिए आपके द्वारा निकाले गए समय की सराहना करते हैं और आपके भविष्य के प्रयासों के लिए शुभकामनाएं देते हैं।
    </p>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards (सादर),<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Application Update / आवेदन अपडेट", "An update regarding your MediTonic Partner Application.", html);
}

export function Template_ProgramPurchased(
  name: string,
  details?: { programName?: string; amount?: number }
) {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">Welcome to the Program! (प्रोग्राम में आपका स्वागत है!)</h2>
    <p style="margin: 0 0 16px 0; color: #64748b; font-size: 15px; line-height: 24px;">
      Dear / प्रिय ${name},
    </p>
    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 24px;">
      Thank you for enrolling in the <strong>${details?.programName || 'MediTonic Premium Program'}</strong>. Your payment was successfully captured.<br>
      <strong>${details?.programName || 'MediTonic Premium Program'}</strong> में नामांकन करने के लिए धन्यवाद। आपका भुगतान सफलतापूर्वक प्राप्त हो गया है।
    </p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Next Steps (अगला कदम)</h3>
      <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 22px;">
        Our clinical team has been notified of your enrollment. You will receive a follow-up email or call shortly with your comprehensive program guidelines and next steps.<br>
        हमारी क्लिनिकल टीम को आपके नामांकन के बारे में सूचित कर दिया गया है। आपको अपने व्यापक प्रोग्राम दिशानिर्देशों और अगले कदमों के साथ जल्द ही एक फॉलो-अप ईमेल या कॉल प्राप्त होगी।
      </p>
    </div>

    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards (सादर),<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Program Enrollment Confirmed / प्रोग्राम नामांकन कन्फर्म हो गया", "Your MediTonic program enrollment was successful.", html);
}

export function Template_StorePaymentConfirmed(name: string, orderId: string) {
  const html = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #E5F1EE; border-radius: 50%; line-height: 64px; text-align: center;">
        <span style="color: ${COLORS.primary}; font-size: 32px;">✓</span>
      </div>
    </div>
    <h2 style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 24px; font-weight: 700; text-align: center;">Payment Successful (भुगतान सफल)</h2>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px; text-align: center;">
      Hi / नमस्ते ${name}, thank you for your order! We have successfully received your payment for Order #${orderId.slice(0, 8)}.<br>
      आपके ऑर्डर के लिए धन्यवाद! हमें ऑर्डर #${orderId.slice(0, 8)} के लिए आपका भुगतान सफलतापूर्वक प्राप्त हो गया है।
    </p>
    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 700; text-transform: uppercase;">Next Steps (अगला कदम)</h3>
      <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 22px;">
        Your order is currently being processed. You will receive a separate email shortly containing your secure download links and delivery information.<br>
        आपका ऑर्डर वर्तमान में प्रोसेस किया जा रहा है। आपको जल्द ही एक अलग ईमेल प्राप्त होगा जिसमें आपके सुरक्षित डाउनलोड लिंक और डिलीवरी की जानकारी होगी।
      </p>
    </div>
    <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Warm regards (सादर),<br>
      <strong style="color: ${COLORS.textPrimary};">The MediTonic Team</strong>
    </p>
  `;
  return BaseTemplate("Payment Confirmed / भुगतान प्राप्त हुआ", "We have received your payment.", html);
}

export function Template_StoreProductDelivery(name: string, orderId: string, downloadLinks: any[], physicalItems: any[], hasFailedDigitalItems: boolean = false) {
  let html = `
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Hello ${name},
    </p>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Your order #${orderId.slice(0, 8)} has been successfully processed.<br>
      आपका ऑर्डर #${orderId.slice(0, 8)} सफलतापूर्वक पूरा कर दिया गया है।
    </p>
  `;

  if (hasFailedDigitalItems) {
    html += `
    <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #9f1239; font-size: 14px; font-weight: 700; text-transform: uppercase;">Technical Delay Notice (तकनीकी समस्या)</h3>
      <p style="margin: 0 0 12px 0; color: #be123c; font-size: 14px; line-height: 22px;">
        We apologize, but a technical error occurred while generating your digital download.<br>
        हमें खेद है, लेकिन आपका डिजिटल डाउनलोड तैयार करते समय एक तकनीकी त्रुटि हुई है।
      </p>
      <p style="margin: 0 0 12px 0; color: #be123c; font-size: 14px; line-height: 22px;">
        <strong>Our team will fulfill your order manually within the next 24 hours.</strong><br>
        <strong>हमारी टीम अगले 24 घंटों के भीतर आपके आदेश को पूरा करेगी।</strong>
      </p>
      <p style="margin: 0; color: #be123c; font-size: 14px; line-height: 22px;">
        For immediate action if required, please send your payment screenshot to our WhatsApp support: <strong>7599651592</strong><br>
        तत्काल सहायता के लिए, कृपया अपना भुगतान स्क्रीनशॉट हमारे WhatsApp सपोर्ट पर भेजें: <strong>7599651592</strong>
      </p>
    </div>
    `;
  }

  if (downloadLinks.length > 0) {
    html += `
    <p style="margin: 0 0 8px 0; color: ${COLORS.textPrimary}; font-size: 16px; font-weight: 600;">
      Your Digital Download
    </p>
    `;
    
    downloadLinks.forEach(link => {
      html += `
      <p style="margin: 0 0 8px 0; color: ${COLORS.textPrimary}; font-size: 15px; font-weight: 600; line-height: 24px;">
        ${link.title}
      </p>
      `;

      if (link.summary) {
        html += `
        <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 14px; line-height: 22px;">
          ${link.summary}
        </p>
        `;
      }

      html += `
      <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
        Download Link:<br>
        <a href="${link.downloadUrl}" style="color: ${COLORS.primary}; font-weight: 500; text-decoration: underline;">[Download eBook]</a>
      </p>
      `;
    });

    html += `
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Link Validity:<br>
      This secure download link will remain active for 7 days.<br>
      यह सुरक्षित डाउनलोड लिंक 7 दिनों तक सक्रिय रहेगा।
    </p>

    <p style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 16px; font-weight: 600;">
      PDF Password
    </p>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      Password: Your Registered Mobile Number
    </p>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      If a mobile number was not provided during purchase, please use your registered email address.<br>
      यदि खरीद के समय मोबाइल नंबर उपलब्ध नहीं कराया गया था, तो कृपया अपना पंजीकृत ईमेल पता पासवर्ड के रूप में उपयोग करें।
    </p>

    <p style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 16px; font-weight: 600;">
      Security Notice
    </p>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      This eBook is a licensed copy generated exclusively for you and contains personalized ownership protection.<br>
      यह ई-बुक केवल आपके उपयोग हेतु लाइसेंस प्राप्त प्रति है और इसमें व्यक्तिगत स्वामित्व सुरक्षा शामिल है।
    </p>

    <p style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 16px; font-weight: 600;">
      Educational Disclaimer
    </p>
    <p style="margin: 0 0 24px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      For educational use by doctors, medical students, and healthcare professionals only. Not intended for self-diagnosis or self-medication.<br>
      केवल डॉक्टरों, मेडिकल विद्यार्थियों एवं स्वास्थ्य पेशेवरों के शैक्षणिक उपयोग हेतु। स्वयं रोग की पहचान या स्वयं दवा लेने के लिए नहीं।
    </p>
    `;
  }

  if (physicalItems.length > 0) {
    html += `
    <p style="margin: 0 0 16px 0; color: ${COLORS.textPrimary}; font-size: 16px; font-weight: 600;">
      Physical Deliveries
    </p>
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      The following items will be delivered to your address within 5-7 days:<br>
      निम्नलिखित आइटम 5-7 दिनों के भीतर आपके पते पर वितरित किए जाएंगे:
    </p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px; color: ${COLORS.textPrimary}; font-size: 14px; line-height: 24px;">
    `;
    physicalItems.forEach(item => {
      html += `<li>${item.title}</li>`;
    });
    html += `</ul>`;
  }

  html += `
    <p style="margin: 0 0 16px 0; color: ${COLORS.textSecondary}; font-size: 15px; line-height: 24px;">
      If you experience any issues accessing your download, please contact our support team.<br>
      यदि डाउनलोड करने में कोई समस्या आती है, तो कृपया हमारी सहायता टीम से संपर्क करें।
    </p>
  `;
  return BaseTemplate(`Order #${orderId.slice(0, 8)} Delivered`, "Your order has been processed.", html);
}

export function Template_StoreAdminNotification(order: any, downloadLinks: any[], physicalItems: any[]) {
  let html = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">New Store Order Fulfilled</h2>
    <p style="margin: 0 0 16px 0; color: #64748b; font-size: 15px; line-height: 24px;">
      A new order has been paid and automatically fulfilled.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; width: 120px; color: #64748b; font-size: 13px;">Order ID:</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 500;">${order.id}</td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Customer:</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 500;">${order.customer_name}</td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Email:</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 500;">${order.customer_email}</td></tr>
      <tr><td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Phone:</td><td style="padding: 12px 16px; color: #1e293b; font-size: 14px; font-weight: 500;">${order.customer_phone || 'N/A'}</td></tr>
    </table>
  `;

  if (downloadLinks.length > 0) {
    html += `
      <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px;">Digital Items Provided:</h3>
      <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #64748b; font-size: 14px;">
        ${downloadLinks.map(link => `<li>${link.title}</li>`).join('')}
      </ul>
    `;
  }

  if (physicalItems.length > 0) {
    html += `
      <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px;">Physical Items (Action Required):</h3>
      <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #b91c1c; font-size: 14px; font-weight: 500;">
        ${physicalItems.map(item => `<li>${item.title}</li>`).join('')}
      </ul>
      <p style="margin: 0 0 24px 0; color: #64748b; font-size: 14px;">Please ensure physical items are shipped to the customer's address.</p>
    `;
  }

  return BaseTemplate("Admin: New Order", "A new store order was placed.", html);
}
