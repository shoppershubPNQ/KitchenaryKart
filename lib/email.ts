/**
 * Transactional email via Resend.
 *
 * Currently used only for OTP delivery. Falls back to a no-op (logs to
 * console) when RESEND_API_KEY is missing — useful for local dev without
 * Resend access. In production, missing API key means OTP emails won't
 * be delivered, so the env var must be set on Vercel.
 */
import { Resend } from 'resend';
import {
  BRAND, button, emailShell, esc, paragraph, spacer, textBody, textFooter,
  WHATSAPP_LINK, WHATSAPP_NUMBER,
} from './email-layout';

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
  const name = process.env.RESEND_FROM_NAME || 'Kitchenary Kart';
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
export function buildOtpEmail(code: string, customerName: string | null | undefined, purpose: 'login' | 'register') {
  const firstName = customerName ? customerName.split(' ')[0] : null;
  const greeting = purpose === 'register'
    ? (firstName ? `Welcome to Kitchenary Kart, ${firstName}!` : 'Welcome to Kitchenary Kart!')
    : (firstName ? `Hi ${firstName},` : 'Hi,');

  const intro = purpose === 'register'
    ? "Use the code below to verify your email and finish creating your account. It expires in 5 minutes."
    : "Use the code below to sign in to your Kitchenary Kart account. It expires in 5 minutes.";

  const subject = purpose === 'register'
    ? `Verify your email — code ${code}`
    : `Your Kitchenary Kart login code is ${code}`;

  const ignoreNote = purpose === 'register'
    ? "If you didn't sign up for Kitchenary Kart, you can safely ignore this email."
    : "If you didn't request this code, you can safely ignore this email — someone may have entered your phone number by mistake.";

  // The code is the whole point of this email, so it gets the largest type in
  // the set and generous letter-spacing — it is usually read off a phone held
  // in one hand while the other types it into the site.
  const codeBlock = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${BRAND.ink};border-radius:10px;">
    <tr>
      <td align="center" style="padding:22px 12px;">
        <div style="color:#EFE3D0;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:10px;font-family:'Courier New',Courier,monospace;">${esc(code)}</div>
      </td>
    </tr>
  </table>`;

  const html = emailShell({
    subject,
    preheader: `${code} is your code. It expires in 5 minutes.`,
    eyebrow: purpose === 'register' ? 'Verify your email' : 'Sign in',
    heading: greeting,
    quiet: true,
    body: [
      paragraph(intro),
      spacer(8),
      codeBlock,
      spacer(20),
      paragraph(ignoreNote, { muted: true, size: 13 }),
    ].join(''),
  });

  const text = textBody([
    greeting,
    '',
    intro,
    '',
    `    ${code}`,
    '',
    ignoreNote,
  ]) + textFooter();

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
  const subject = `We'll tell you when it's back: ${args.productName}`;

  const html = emailShell({
    subject,
    preheader: `We will email you the moment ${args.productName} is available again.`,
    eyebrow: 'Alert set',
    heading: "We'll tell you the moment it's back.",
    body: [
      paragraph(
        `Thank you for your interest in <strong>${esc(args.productName)}</strong>. It is out of stock right now, ` +
          `and you are on the list — we will email you as soon as it returns.`,
      ),
      spacer(10),
      button('View the product', url),
      spacer(20),
      paragraph(
        `Need it urgently, or in bulk? <a href="${WHATSAPP_LINK}" style="color:${BRAND.red};">WhatsApp ${WHATSAPP_NUMBER}</a> — ` +
          `we can often source a sold-out item faster than the website shows.`,
        { size: 14 },
      ),
    ].join(''),
    footerNote: 'You requested this alert on kitchenarykart.com. We will email you once, when it is back.',
  });

  const text = textBody([
    `Thank you for your interest in ${args.productName}.`,
    '',
    'It is out of stock right now, and you are on the list — we will email you as soon as it returns.',
    '',
    `View the product: ${url}`,
    '',
    `Need it urgently or in bulk? WhatsApp ${WHATSAPP_NUMBER} — we can often source a sold-out item faster than the website shows.`,
    '',
    'You requested this alert on kitchenarykart.com. We will email you once, when it is back.',
  ]) + textFooter();

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
