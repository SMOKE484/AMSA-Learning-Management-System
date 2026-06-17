import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const CONFIGS = {
  verification: {
    subject: 'Verify your AMSA LMS email',
    heading: 'Email Verification',
    body: 'Use the code below to verify your email address.',
    color: '#00B2B2',
  },
  'password-reset': {
    subject: 'Reset your AMSA LMS password',
    heading: 'Password Reset',
    body: 'Use the code below to reset your password.',
    color: '#E53E3E',
  },
};

export const sendOTPEmail = async (to, name, otp, purpose) => {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const cfg = CONFIGS[purpose];

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0"
            style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
            <tr><td style="height:4px;background:linear-gradient(90deg,#E53E3E,#F6E05E,#00B2B2,#3182CE);"></td></tr>
            <tr><td style="padding:32px;text-align:center;">
              <h2 style="color:#1a1a1a;margin:0 0 8px;font-size:22px;">${cfg.heading}</h2>
              <p style="color:#666;margin:0 0 28px;font-size:15px;">Hi ${name}, ${cfg.body}</p>
              <div style="display:inline-block;background:#f8f8f8;border-radius:12px;padding:20px 40px;
                border:2px dashed #ddd;margin:0 0 28px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:${cfg.color};">${otp}</span>
              </div>
              <p style="color:#999;font-size:13px;margin:0;">
                This code expires in 10 minutes. Do not share it with anyone.
              </p>
            </td></tr>
            <tr><td style="padding:16px 32px;background:#f8f8f8;text-align:center;">
              <p style="color:#aaa;font-size:12px;margin:0;">AMSA Learning Management System</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'AMSA LMS <onboarding@resend.dev>',
    to,
    subject: cfg.subject,
    html,
  });

  if (error) throw new Error(error.message);
};
