import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'Lorestone <noreply@lorestone.app>'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${FRONTEND_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your Lorestone account',
    html: emailTemplate({
      heading: 'Verify your email',
      subheading: 'One last step',
      body: `Hi ${name}, thanks for joining Lorestone. Click the button below to verify your email address and start building your campaigns.`,
      buttonText: 'Verify email address',
      buttonUrl: link,
      footnote: "This link expires in 24 hours. If you didn't create a Lorestone account, you can safely ignore this email.",
    }),
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  const link = `${FRONTEND_URL}/`
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Lorestone account is ready',
    html: emailTemplate({
      heading: `Welcome, ${name}.`,
      subheading: 'Account verified',
      body: "Your email is confirmed and your account is ready. Head to your dashboard to create your first campaign, add characters, and start running sessions.",
      buttonText: 'Go to your campaigns',
      buttonUrl: link,
      footnote: 'You are receiving this because you created a Lorestone account. If this wasn\'t you, contact us at support@lorestone.app.',
    }),
  })
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Lorestone password',
    html: emailTemplate({
      heading: 'Reset your password',
      subheading: 'Password reset request',
      body: `Hi ${name}, we received a request to reset the password for your Lorestone account. Click the button below to choose a new password.`,
      buttonText: 'Reset password',
      buttonUrl: link,
      footnote: "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.",
    }),
  })
}

function emailTemplate({ heading, subheading, body, buttonText, buttonUrl, footnote }: {
  heading: string
  subheading: string
  body: string
  buttonText: string
  buttonUrl: string
  footnote: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0906;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#0b0906;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Card -->
        <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;background-color:#111009;border:1px solid #3a3020;border-radius:8px;overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background-color:#0f0d0a;border-bottom:1px solid #2a2010;padding:20px 40px;text-align:center;">
              <span style="font-family:Georgia,serif;font-size:13px;color:#c8a44a;letter-spacing:4px;text-transform:uppercase;font-weight:normal;">Lorestone</span>
            </td>
          </tr>

          <!-- Decorative top line -->
          <tr>
            <td style="padding:0;">
              <div style="height:2px;background:linear-gradient(to right,transparent,#c8a44a 40%,#c8a44a 60%,transparent);"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 8px;">

              <!-- Subheading -->
              <p style="margin:0 0 8px;font-size:11px;color:#786c5c;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,serif;">${subheading}</p>

              <!-- Heading -->
              <h1 style="margin:0 0 20px;font-size:22px;color:#e6d8c0;font-weight:normal;font-family:Georgia,serif;line-height:1.3;">${heading}</h1>

              <!-- Divider -->
              <div style="height:1px;background-color:#2a2010;margin-bottom:20px;"></div>

              <!-- Body text -->
              <p style="margin:0 0 32px;font-size:15px;color:#b4a48a;line-height:1.7;font-family:Georgia,serif;">${body}</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:4px;background-color:#c8a44a;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:14px 36px;font-size:12px;color:#0b0906;text-decoration:none;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,serif;font-weight:bold;">${buttonText}</a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:20px 0 0;font-size:12px;color:#4a4035;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${buttonUrl}" style="color:#786c5c;word-break:break-all;">${buttonUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #2a2010;margin-top:16px;">
              <p style="margin:0;font-size:12px;color:#4a4035;line-height:1.6;font-family:Georgia,serif;">${footnote}</p>
            </td>
          </tr>

        </table>

        <!-- Bottom note -->
        <p style="margin:20px 0 0;font-size:11px;color:#3a3020;font-family:Georgia,serif;">© Lorestone · Your campaign companion</p>

      </td>
    </tr>
  </table>
</body>
</html>`
}
