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
  /** Tweaks subject line + intro copy. Default 'login'. */
  purpose?: 'login' | 'register';
}

/**
 * Build the branded HTML/text email for an OTP. Same template for login
 * and registration verification — only the subject and intro line differ.
 */
function buildOtpEmail(code: string, customerName: string | null | undefined, purpose: 'login' | 'register') {
  const firstName = customerName ? customerName.split(' ')[0] : null;
  const greeting = purpose === 'register'
    ? (firstName ? `Welcome to KitchenaryKart, ${firstName}!` : 'Welcome to KitchenaryKart!')
    : (firstName ? `Hi ${firstName},` : 'Hi,');

  const intro = purpose === 'register'
    ? "Use the code below to verify your email and finish creating your account. It expires in 5 minutes."
    : "Use the code below to sign in to your KitchenaryKart account. It expires in 5 minutes.";

  const subject = purpose === 'register'
    ? `Verify your email — code ${code}`
    : `Your KitchenaryKart login code is ${code}`;

  const ignoreNote = purpose === 'register'
    ? "If you didn't sign up for KitchenaryKart, you can safely ignore this email."
    : "If you didn't request this code, you can safely ignore this email — someone may have entered your phone number by mistake.";

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
              <p style="margin:0 0 24px 0;">${intro}</p>
              <div style="background:#1a1a1a;color:#efe3d0;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px 0;border-radius:6px;font-family:'Courier New',monospace;">${code}</div>
              <p style="margin:24px 0 0 0;color:#777;font-size:13px;line-height:1.5;">${ignoreNote}</p>
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

${intro}

  ${code}

${ignoreNote}

— KitchenaryKart`;

  return { subject, html, text };
}

/**
 * Send an OTP email. Returns true on success, false if Resend rejected the
 * send or env vars were missing. Never throws — caller decides how to handle
 * delivery failure (typically: log it, return generic "OTP sent" to the user
 * so we don't leak whether the email exists).
 */
export async function sendOtpEmail({ to, code, customerName, purpose = 'login' }: SendOtpEmailArgs): Promise<boolean> {
  const resend = getClient();
  if (!resend) return false;

  const { subject, html, text } = buildOtpEmail(code, customerName, purpose);

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
    console.log(`[kk:email] ${purpose} OTP sent to ${maskEmail(to)} (id=${result.data?.id})`);
    return true;
  } catch (err) {
    console.error('[kk:email] sendOtpEmail threw:', err);
    return false;
  }
}

/**
 * Tell the team someone asked to be notified about a sold-out product.
 * A delivery failure must never fail the customer's request — their row is
 * already saved, and the restock cron reads the table, not this email.
 *
 * Recipients mirror the new-order alert (ADMIN_NOTIFY_EMAIL + the two business
 * inboxes) so stock demand shows up where the team already reads.
 */
export async function sendRestockRequestAlert(args: {
  sku: string;
  productName: string;
  email: string;
  /** 10-digit local number when the customer gave one — null otherwise. */
  phone?: string | null;
  waiting: number;
}): Promise<boolean> {
  const resend = getClient();
  if (!resend) return false;

  // Same inboxes the new-order alert uses, so stock demand lands where the
  // team already looks. noreply@ was the old default and is a SENDING address
  // nobody reads — never route alerts there. (admin@kitchenarykart.com is the
  // admin LOGIN, not a mailbox, so it must not be used either.)
  const to = [
    ...new Set(
      [
        ...(process.env.ADMIN_NOTIFY_EMAIL || '').split(',').map((s) => s.trim()),
        'shoppershub.ind@gmail.com',
        'support@kitchenarykart.com',
      ].filter(Boolean),
    ),
  ];
  const url = `https://kitchenarykart.com/product/${encodeURIComponent(args.sku)}`;
  const subject = `Stock request: ${args.productName} (${args.sku})`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.6">
  <h2 style="margin:0 0 12px;font-size:17px">Someone wants a sold-out product</h2>
  <p style="margin:0 0 6px"><b>Product:</b> ${escapeHtml(args.productName)}</p>
  <p style="margin:0 0 6px"><b>SKU:</b> ${escapeHtml(args.sku)}</p>
  <p style="margin:0 0 6px"><b>Customer:</b> <a href="mailto:${escapeHtml(args.email)}">${escapeHtml(args.email)}</a></p>
  ${
    args.phone
      ? `<p style="margin:0 0 6px"><b>Phone:</b> <a href="tel:+91${escapeHtml(args.phone)}" style="font-weight:bold">+91 ${escapeHtml(args.phone)}</a> &nbsp;·&nbsp; <a href="https://wa.me/91${escapeHtml(args.phone)}" style="color:#25D366;font-weight:bold;text-decoration:none">WhatsApp</a></p>`
      : `<p style="margin:0 0 6px;color:#888"><b>Phone:</b> not given</p>`
  }
  <p style="margin:0 0 14px"><b>Total waiting for this SKU:</b> ${args.waiting}</p>
  <p style="margin:0 0 6px"><a href="${url}">${url}</a></p>
  <p style="margin:14px 0 0;color:#666;font-size:12.5px">They are emailed automatically once the SKU is back in stock.</p>
</div>`;
  const text = `Stock request\n\nProduct: ${args.productName}\nSKU: ${args.sku}\nCustomer: ${args.email}\nTotal waiting: ${args.waiting}\n${url}\n\nThey are emailed automatically once the SKU is back in stock.`;

  try {
    const result = await resend.emails.send({ from: getFromHeader(), to, subject, html, text });
    if (result.error) {
      console.error('[kk:email] restock-alert Resend error:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[kk:email] sendRestockRequestAlert threw:', err);
    return false;
  }
}

/** Minimal HTML escape for values interpolated into the emails above. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Confirm to the CUSTOMER that we recorded their back-in-stock request.
 * Sent immediately on submit — the on-page "Thanks!" alone left people
 * checking their inbox for a mail that only arrives on restock, and a
 * confirmation also proves the address they typed actually works.
 *
 * The real alert ("it's back") comes later from the admin restock cron.
 */
export async function sendRestockRequestConfirmation(args: {
  to: string;
  sku: string;
  productName: string;
}): Promise<boolean> {
  const resend = getClient();
  if (!resend) return false;

  const url = `https://kitchenarykart.com/product/${encodeURIComponent(args.sku)}`;
  const name = escapeHtml(args.productName);
  const subject = `We'll tell you when it's back: ${args.productName}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222;line-height:1.6;max-width:560px">
  <p style="margin:0 0 14px">Thank you for your interest in <b>${name}</b>.</p>
  <p style="margin:0 0 14px">This product is currently out of stock. We&rsquo;ll notify you as soon as it becomes available again.</p>
  <p style="margin:0 0 12px">Need it urgently or in bulk? Talk to us directly:</p>
  <p style="margin:0 0 18px">
    <a href="https://wa.me/919890352455" style="background:#25D366;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;display:inline-block;font-weight:bold;margin:0 8px 8px 0">WhatsApp us</a>
    <a href="tel:+919890352455" style="background:#1a1a1a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;display:inline-block;font-weight:bold;margin:0 8px 8px 0">Call +91 98903 52455</a>
  </p>
  <p style="margin:0 0 18px;font-size:14px">Or email <a href="mailto:support@kitchenarykart.com" style="color:#9E2A2B;font-weight:bold;text-decoration:none">support@kitchenarykart.com</a>.</p>
  <p style="margin:0 0 20px">
    <a href="${url}" style="background:#9E2A2B;color:#fff;text-decoration:none;padding:11px 22px;border-radius:6px;display:inline-block;font-weight:bold">View product</a>
  </p>
  <p style="margin:16px 0 0;color:#777;font-size:12.5px">You requested this alert on kitchenarykart.com.</p>
</div>`;
  const text = `Thank you for your interest in ${args.productName}.\n\nThis product is currently out of stock. We'll notify you as soon as it becomes available again.\n\nNeed it urgently or in bulk? Talk to us directly:\nWhatsApp: https://wa.me/919890352455\nCall: +91 98903 52455\nEmail: support@kitchenarykart.com\n\nView product: ${url}\n\nYou requested this alert on kitchenarykart.com.`;

  try {
    const result = await resend.emails.send({ from: getFromHeader(), to: args.to, subject, html, text });
    if (result.error) {
      console.error('[kk:email] restock-confirmation Resend error:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[kk:email] sendRestockRequestConfirmation threw:', err);
    return false;
  }
}
