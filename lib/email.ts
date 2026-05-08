/**
 * Transactional email via Resend.
 *
 * Currently used only for OTP delivery. Falls back to a no-op (logs to
 * console) when RESEND_API_KEY is missing — useful for local dev without
 * Resend access. In production, missing API key means OTP emails won't
 * be delivered, so the env var must be set on Vercel.
 */
import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[kk:email] RESEND_API_KEY missing — emails will NOT be sent.');
    return null;
  }
  client = new Resend(key);
  return client;
}

function getFromHeader(): string {
  const email = process.env.RESEND_FROM_EMAIL || 'noreply@kitchenarykart.com';
  const name = process.env.RESEND_FROM_NAME || 'KitchenaryKart';
  return `${name} <${email}>`;
}

/**
 * Mask an email for display: shoppershub.ind@gmail.com → sh****@gmail.com
 * Used so we can tell the user where the OTP was sent without exposing
 * the full address (in case they're on a shared device).
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 2) return local[0] + '****@' + domain;
  return local.slice(0, 2) + '****@' + domain;
}

interface SendOtpEmailArgs {
  to: string;
  code: string;
  customerName?: string | null;
}

/**
 * Send the OTP email. Returns true on success, false if Resend rejected
 * the send or env vars were missing. Never throws — caller decides how to
 * handle delivery failure (typically: log it, return generic "OTP sent"
 * to the user so we don't leak whether the email exists).
 */
export async function sendOtpEmail({ to, code, customerName }: SendOtpEmailArgs): Promise<boolean> {
  const resend = getClient();
  if (!resend) return false;

  const greeting = customerName ? `Hi ${customerName.split(' ')[0]},` : 'Hi,';

  const subject = `Your KitchenaryKart login code is ${code}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1ea;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;border:1px solid #e8e2d4;max-width:520px;width:100%;">
          <tr>
            <td style="padding:32px 32px 16px 32px;text-align:center;">
              <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a1a1a;letter-spacing:0.5px;">KitchenaryKart</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;color:#1a1a1a;font-size:15px;line-height:1.55;">
              <p style="margin:0 0 12px 0;">${greeting}</p>
              <p style="margin:0 0 24px 0;">Use the code below to sign in to your KitchenaryKart account. It expires in 5 minutes.</p>
              <div style="background:#1a1a1a;color:#efe3d0;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px 0;border-radius:6px;font-family:'Courier New',monospace;">${code}</div>
              <p style="margin:24px 0 0 0;color:#777;font-size:13px;line-height:1.5;">If you didn't request this code, you can safely ignore this email — someone may have entered your phone number by mistake.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px 32px;border-top:1px solid #f0ebde;color:#999;font-size:12px;text-align:center;">
              <div>KitchenaryKart · Commercial kitchen equipment</div>
              <div style="margin-top:4px;">This is an automated message — replies aren't monitored.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

Use the code below to sign in to your KitchenaryKart account. It expires in 5 minutes.

  ${code}

If you didn't request this code, you can safely ignore this email.

— KitchenaryKart`;

  try {
    const result = await resend.emails.send({
      from: getFromHeader(),
      to,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error('[kk:email] Resend error:', result.error);
      return false;
    }
    console.log(`[kk:email] OTP sent to ${maskEmail(to)} (id=${result.data?.id})`);
    return true;
  } catch (err) {
    console.error('[kk:email] sendOtpEmail threw:', err);
    return false;
  }
}
