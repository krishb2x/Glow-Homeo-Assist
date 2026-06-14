const nodemailer = require('nodemailer');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '../apps/meditonic/.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

console.log('=== Zoho SMTP Test ===');
console.log('Host:', SMTP_HOST);
console.log('Port:', SMTP_PORT);
console.log('User:', SMTP_USER);
console.log('Password:', SMTP_PASSWORD ? '****' + SMTP_PASSWORD.slice(-4) : 'NOT SET');

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
  console.error('❌ Missing SMTP credentials in .env');
  process.exit(1);
}

async function sendTestEmail() {
  // Create transporter with Zoho SMTP
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  // Verify connection
  console.log('\n📡 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (err) {
    console.error('❌ SMTP connection failed:', err.message);
    process.exit(1);
  }

  // Send test email
  console.log('\n📧 Sending test email to thisiskvt@gmail.com...');
  try {
    const info = await transporter.sendMail({
      from: `"MediTonic by GlowHomeo" <${SMTP_USER}>`,
      to: 'thisiskvt@gmail.com',
      subject: '✅ MediTonic SMTP Test — Zoho Connection Successful',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎉 SMTP Test Successful!</h1>
          </div>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              This is a test email from <strong style="color: #10b981;">MediTonic</strong> confirming that your Zoho SMTP integration is working correctly.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #94a3b8; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">SMTP Host</td>
                <td style="color: #f1f5f9; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${SMTP_HOST}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Port</td>
                <td style="color: #f1f5f9; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${SMTP_PORT} (SSL)</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">From</td>
                <td style="color: #f1f5f9; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${SMTP_USER}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 8px 0;">Sent At</td>
                <td style="color: #f1f5f9; padding: 8px 0; text-align: right;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            </table>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
            MediTonic — Premium Homeopathy by Dr. Aman Agrawal
          </p>
        </div>
      `,
      text: 'This is a test email from MediTonic confirming that your Zoho SMTP integration is working correctly.',
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    process.exit(1);
  }
}

sendTestEmail();
