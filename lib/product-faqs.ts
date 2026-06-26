/**
 * PDP FAQ resolution.
 *
 * Every product page should carry an FAQ block — it lifts long-tail
 * search ("does X come with GST invoice", "can I get bulk pricing on
 * Y"), feeds FAQPage rich results, and gives AI search engines (SGO)
 * clean question/answer pairs to quote.
 *
 * Resolution:
 *   1. If the admin has authored custom FAQs on the product, use those
 *      verbatim (already normalised to {q,a} by lib/products.parseFaqs).
 *   2. Otherwise, generate a set of FAQs from the product's real,
 *      verifiable attributes — GST/ITC eligibility, the ₹3,000
 *      free-shipping threshold, 7-day defect returns, payment methods,
 *      bulk pricing, and any populated specs (dimensions / power /
 *      capacity). Nothing here is a claim we can't stand behind.
 *
 * Keep the generated answers factual and aligned with PdpTrustBadges /
 * the GBP description so the whole site tells one consistent story.
 */
import type { ProductFaq } from './products';

const WHATSAPP = '+91 98903 52455';
const FREE_SHIP_ABOVE = '₹5,000';

interface FaqProductInput {
  name: string;
  category: string | null;
  subcategory: string | null;
  dimensions: string | null;
  power: string | null;
  capacity: string | null;
  hsnCode: string | null;
  taxPercent: number;
  stock: number;
}

/**
 * Returns the FAQ list to render + mark up on a PDP. Custom FAQs win;
 * otherwise a generated, attribute-aware default set (4–7 entries).
 */
export function resolveProductFaqs(
  p: FaqProductInput,
  custom: ProductFaq[],
): ProductFaq[] {
  if (custom && custom.length > 0) return custom;

  const noun = (p.subcategory || p.category || 'commercial kitchen equipment').toLowerCase();
  const faqs: ProductFaq[] = [];

  // GST / ITC — the single biggest B2B trust question in India.
  faqs.push({
    q: `Does the ${p.name} come with a GST invoice?`,
    a: `Yes. Every order ships with a proper GST tax invoice (${p.taxPercent}% GST${
      p.hsnCode ? `, HSN ${p.hsnCode}` : ''
    }), so registered restaurants, hotels and cloud kitchens can claim full Input Tax Credit. Need a custom invoice for a specific GSTIN? WhatsApp us at ${WHATSAPP}.`,
  });

  // Shipping.
  faqs.push({
    q: `What are the delivery charges and timelines?`,
    a: `We deliver pan-India. Shipping is free on orders above ${FREE_SHIP_ABOVE}; below that a flat delivery fee applies at checkout. Most orders are dispatched within 1–3 business days, with delivery typically in 3–7 business days depending on your pin code.`,
  });

  // Bulk / B2B.
  faqs.push({
    q: `Can I get bulk or wholesale pricing on the ${p.name}?`,
    a: `Yes — we offer direct brand pricing with no middleman markup, and special rates on multi-unit and HORECA bulk orders. Message us on WhatsApp at ${WHATSAPP} with the quantity you need for a quote.`,
  });

  // Spec-driven Q only when we actually have specs to answer with.
  const specBits: string[] = [];
  if (p.dimensions) specBits.push(`Dimensions: ${p.dimensions}`);
  if (p.power) specBits.push(`Power: ${p.power}`);
  if (p.capacity) specBits.push(`Capacity: ${p.capacity}`);
  if (specBits.length > 0) {
    faqs.push({
      q: `What are the specifications of the ${p.name}?`,
      a: `${specBits.join(' · ')}. Full specifications are listed in the Specifications section above. For any detail not listed, WhatsApp us at ${WHATSAPP}.`,
    });
  }

  // Payments.
  faqs.push({
    q: `What payment methods do you accept?`,
    a: `We accept UPI, debit/credit cards, net banking and EMI through a secure Razorpay checkout. You can also pay over WhatsApp for assisted or bulk orders.`,
  });

  // Returns / warranty.
  faqs.push({
    q: `What is the return and warranty policy?`,
    a: `We offer 7-day returns on manufacturing defects — if the ${noun} arrives damaged or faulty, contact us and we'll arrange a replacement or refund. Warranty terms vary by product; reach us at ${WHATSAPP} for the specific warranty on this item.`,
  });

  // Availability — only when in stock, to reassure on buy intent.
  if (p.stock > 0) {
    faqs.push({
      q: `Is the ${p.name} in stock?`,
      a: `Yes, this item is currently in stock and ready to dispatch. Place your order online, or WhatsApp ${WHATSAPP} to confirm availability for a large quantity.`,
    });
  }

  return faqs;
}
