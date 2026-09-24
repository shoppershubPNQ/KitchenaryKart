/**
 * The reasons offered when someone leaves checkout without paying.
 *
 * ONE list, used by the popup, the API validator and the admin report. The
 * `key` is what gets stored and must never change — rewording a label would
 * otherwise split one reason into two in every report ever run. Change the
 * `label` freely; add a key only by appending.
 *
 * Delivery was deliberately left out. Shipping is ₹399 under ₹5,000 and free
 * above, stated on the cart before this point, so "delivery costs too much"
 * tells the team nothing they cannot already read off the order. The two
 * slots went to answers that can actually be acted on: a page that did not
 * say enough, and a buyer who wanted to speak to someone — which for HORECA
 * orders is a sale the WhatsApp line can still recover.
 */
export interface FeedbackReason {
  key: string;
  label: string;
}

export const FEEDBACK_REASONS: FeedbackReason[] = [
  { key: 'price_high', label: 'Price is too high' },
  { key: 'need_details', label: 'I need more product details' },
  { key: 'want_to_talk', label: 'I want to talk to someone first' },
  { key: 'payment_missing', label: 'My preferred payment option is missing' },
  { key: 'checkout_problem', label: 'I had a problem at checkout' },
  { key: 'still_deciding', label: "I'm still deciding" },
  { key: 'other', label: 'Other' },
];

export const REASON_KEYS = FEEDBACK_REASONS.map((r) => r.key);

/** The report prints labels; rows written before a rewording still resolve. */
export function reasonLabel(key: string): string {
  return FEEDBACK_REASONS.find((r) => r.key === key)?.label ?? key;
}

/** Free text is offered for this one answer only. */
export const OTHER_KEY = 'other';
export const MAX_NOTE = 500;
