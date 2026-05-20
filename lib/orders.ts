/**
 * Customer-side order helpers.
 *
 * Storefront-facing — only fetches data and shapes the public-safe
 * view. Admin writes the underlying fields (status, tracking, etc.);
 * the storefront just renders them.
 */
import { prisma } from './db';

export interface PublicOrderItem {
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface PublicOrder {
  orderNumber: string;
  invoiceNumber: string | null;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  shippingAddress: string;
  customerName: string;
  customerPhone: string;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: PublicOrderItem[];
}

/** Compose `KK/2026-27/0001` from raw serial + FY columns. */
function formatInvoiceNumber(fy: string | null, serial: number | null): string | null {
  if (!fy || serial == null) return null;
  return `KK/${fy}/${String(serial).padStart(4, '0')}`;
}

/** Last 4 digits of a phone number, stripped of non-digits. */
function last4(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.slice(-4);
}

/**
 * List all orders for a logged-in customer, newest first.
 * Returns a compact list view (no items joined) for the index page.
 */
export async function listOrdersForCustomer(customerId: number) {
  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    select: {
      orderNumber: true,
      createdAt: true,
      orderStatus: true,
      paymentStatus: true,
      totalAmount: true,
      carrierName: true,
      trackingNumber: true,
      shippedAt: true,
      deliveredAt: true,
      _count: { select: { items: true } },
    },
  });
  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    totalAmount: Number(o.totalAmount ?? 0),
    itemCount: o._count.items,
    carrierName: o.carrierName,
    trackingNumber: o.trackingNumber,
    shippedAt: o.shippedAt?.toISOString() ?? null,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
  }));
}

/**
 * Load a single order by its public order number. Returns the public
 * view (no internalNotes, no Razorpay refs).
 *
 * Pass `customerId` to require ownership (account flow), or
 * `requirePhoneSuffix` to require the last 4 digits of the registered
 * phone (guest /track lookup).
 *
 * Returns `null` if not found or auth check fails.
 */
export async function loadPublicOrder(
  orderNumber: string,
  opts: { customerId?: number; requirePhoneSuffix?: string } = {},
): Promise<PublicOrder | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: { select: { imageUrl: true } } } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!order) return null;

  // Ownership check — for /account/orders, must belong to this customer.
  if (opts.customerId != null) {
    if (order.customerId !== opts.customerId) return null;
  }

  // Guest lookup — last 4 digits of the registered phone must match.
  if (opts.requirePhoneSuffix !== undefined) {
    const expected = opts.requirePhoneSuffix.replace(/\D/g, '').slice(-4);
    if (!expected || expected.length < 4) return null;
    const onFile = last4(order.customerPhone) || last4(order.customer?.phone);
    if (onFile !== expected) return null;
  }

  return {
    orderNumber: order.orderNumber,
    invoiceNumber: formatInvoiceNumber(order.invoiceFinancialYear, order.invoiceSerial),
    createdAt: order.createdAt.toISOString(),
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal ?? 0),
    taxAmount: Number(order.taxAmount ?? 0),
    shippingCost: Number(order.shippingCost ?? 0),
    totalAmount: Number(order.totalAmount ?? 0),
    shippingAddress: order.shippingAddress ?? '',
    customerName: order.customerName ?? order.customer?.name ?? '',
    customerPhone: order.customerPhone ?? order.customer?.phone ?? '',
    carrierName: order.carrierName,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    items: order.items.map((it) => ({
      productName: it.productName ?? '',
      productSku: it.productSku ?? '',
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      lineTotal: Number(it.lineTotal),
      imageUrl: it.product?.imageUrl ?? null,
    })),
  };
}
