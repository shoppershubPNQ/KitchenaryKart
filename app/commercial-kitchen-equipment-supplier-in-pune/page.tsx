import { SupplierLanding, supplierMetadata } from '@/components/SupplierLanding';

const SLUG = 'commercial-kitchen-equipment-supplier-in-pune';
export const revalidate = 600;
export function generateMetadata() {
  return supplierMetadata(SLUG);
}
export default function Page() {
  return <SupplierLanding slug={SLUG} />;
}
