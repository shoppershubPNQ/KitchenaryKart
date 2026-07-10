import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth';
import { renderInvoicePdf } from '@/lib/invoice';
import { computeOrderSummary } from '@/lib/invoice-summary';
import { detectStateFromAddress, GST_STATES } from '@/lib/gst-states';

// pdfkit needs the Node runtime (reads font-metric files at runtime); never
// cache — an invoice is private per-customer.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Setting value with a static fallback (mirrors the admin invoice route). */
async function getSetting(key: string, fallback?: string): Promise<string | undefined> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

/**
 * Customer-facing GST tax-invoice PDF for one of the LOGGED-IN customer's own
 * PAID orders. Same generator + numbers as the admin invoice — the only
 * differences are the auth (customer session, ownership-checked) and that this
 * route never allocates a serial (it uses the one assigned at payment time).
 */
export async function GET(_req: NextRequest, { params }: { params: { number: string } }) {
  try {
    const session = getCustomerSession();
    if (!session) return new Response('Please sign in to download your invoice.', { status: 401 });

    const orderNumber = decodeURIComponent(params.number);
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: { select: { hsnCode: true } } } },
        customer: true,
      },
    });
    // Ownership — the order must exist AND belong to this customer. Return 404
    // (not 403) so we never confirm the existence of someone else's order.
    if (!order || order.customerId == null || order.customerId !== session.cid) {
      return new Response('Not found', { status: 404 });
    }
    // A GST tax invoice only exists once the order is actually paid
    // (PaymentStatus.completed). Refunded/pending/failed get no invoice.
    if (order.paymentStatus !== 'completed') {
      return new Response('Your invoice will be available after the payment is confirmed.', {
        status: 400,
      });
    }

    // ── Company / seller info (same defaults + Setting overrides as admin) ──
    const [companyName, companyGst, companyPan, companyAddress, companyStateName, companyStateCode] =
      await Promise.all([
        getSetting('company_name', 'Kitchenary Kart'),
        getSetting('company_gst', '27AAQPR2976J1ZU'),
        getSetting('company_pan', 'AAQPR2976J'),
        getSetting(
          'company_address',
          'A2/103, Parshwanagar, Opp. Swami Vivekanand Garden,\nKondhwa Budruk, Pune-411048\nMaharashtra, India',
        ),
        getSetting('company_state', 'Maharashtra'),
        getSetting('company_state_code', '27'),
      ]);

    // ── Buyer place-of-supply (shipping state, else billing, else seller). ──
    const detected =
      detectStateFromAddress(order.shippingAddress) ??
      detectStateFromAddress(order.customer?.billingAddress) ??
      GST_STATES.find((s) => s.name === companyStateName) ??
      null;
    const placeOfSupply = detected ? { name: detected.name, code: detected.code } : null;
    const isInterState = !!(detected && detected.code !== companyStateCode);

    // ── Per-line + totals via the shared helper (identical numbers/labels to
    // the website, admin and print view). GST on the discounted net value. ──
    const summary = computeOrderSummary(
      order.items.map((it) => ({
        name: it.productName || '',
        sku: it.productSku || '',
        hsnCode: it.product?.hsnCode ?? null,
        lineInclusive: Number(it.lineTotal),
        quantity: it.quantity,
        taxPercent: Number(it.taxPercent),
      })),
      Number(order.discountAmount || 0),
      Number(order.shippingCost || 0),
    );
    const taxBreakdown = isInterState
      ? { cgst: 0, sgst: 0, igst: summary.gstAmount }
      : {
          cgst: +(summary.gstAmount / 2).toFixed(2),
          sgst: +(summary.gstAmount / 2).toFixed(2),
          igst: 0,
        };

    // Use the serial already allocated at payment time — NEVER allocate a new
    // one from a customer request. Falls back to a proforma ref if somehow
    // missing (a paid order should always carry a serial).
    const formatted =
      order.invoiceFinancialYear && order.invoiceSerial != null
        ? `KK/${order.invoiceFinancialYear}/${String(order.invoiceSerial).padStart(4, '0')}`
        : null;
    const proforma = formatted == null;
    const invoiceNumber = formatted ?? `PRO/${order.orderNumber}`;

    const pdf = await renderInvoicePdf({
      orderNumber: order.orderNumber,
      invoiceNumber,
      proforma,
      date: order.createdAt,
      company: {
        name: companyName || 'Kitchenary Kart',
        gst: companyGst,
        pan: companyPan,
        address: companyAddress,
        state: companyStateName,
        stateCode: companyStateCode,
      },
      customer: {
        name: order.customerName || order.customer?.name || 'Customer',
        email: order.customerEmail || order.customer?.email || undefined,
        phone: order.customerPhone || order.customer?.phone || undefined,
        billingAddress: order.customer?.billingAddress || order.shippingAddress || undefined,
        shippingAddress: order.shippingAddress || order.customer?.billingAddress || undefined,
        gstNumber: order.customer?.gstNumber || undefined,
      },
      placeOfSupply,
      isInterState,
      taxBreakdown,
      summary,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('customer invoice error', e);
    return new Response('Could not generate the invoice. Please try again later.', { status: 500 });
  }
}
