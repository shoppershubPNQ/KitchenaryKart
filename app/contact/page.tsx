import { QuoteForm } from '@/components/QuoteForm';
import { DEFAULT_OG_IMAGES } from '@/lib/og';

export const metadata = {
  title: 'Contact',
  description:
    'Get a quote for commercial kitchen equipment. Bulk pricing, spec sheets, and DDP export quotes within 4 business hours.',
  alternates: { canonical: '/contact' },
  openGraph: {
    type: 'website',
    url: '/contact',
    title: 'Contact — KitchenaryKart',
    description:
      'Get a quote for commercial kitchen equipment. Bulk pricing and spec sheets within 4 business hours.',
    siteName: 'KitchenaryKart',
    locale: 'en_IN',
    images: DEFAULT_OG_IMAGES,
  },
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-cream py-14 px-6 text-center">
        <h1 className="text-[clamp(2rem,3.4vw,2.8rem)] mb-3">Request a quote</h1>
        <p className="text-ink-soft max-w-[640px] mx-auto">
          Send us your requirements. We'll come back within 4 business hours with bulk pricing, spec sheets, lead time
          and shipping terms.
        </p>
      </section>

      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-14 grid gap-12 md:grid-cols-[1.2fr_1fr] grid-cols-1">
        <QuoteForm />

        <aside>
          <div className="bg-bg-soft p-7 rounded-lg">
            <h3 className="mb-4 text-[1.2rem] font-head font-bold">Get in touch</h3>
            <Row strong="Call us" info={<a href="tel:+919890352455" className="text-ink font-semibold">+91 98903 52455</a>} sub="Mon–Sat · 10am–7pm IST" />
            <Row strong="Email" info={<a href="mailto:support@kitchenarykart.com" className="text-ink font-semibold">support@kitchenarykart.com</a>} sub="Replies within 4 business hours" />
            <Row strong="WhatsApp" info={<a href="https://wa.me/919890352455" target="_blank" rel="noopener" className="text-ink font-semibold">Chat with sales</a>} sub="Fastest response" />
            <Row strong="Export enquiries" info={<span className="text-ink">DDP to US, UK, UAE, EU and 40+ countries</span>} />
          </div>
        </aside>
      </div>
    </>
  );
}

function Row({ strong, info, sub }: { strong: string; info: React.ReactNode; sub?: string }) {
  return (
    <div className="flex gap-3.5 py-3.5 border-b border-line last:border-b-0 text-sm">
      <div>
        <strong className="block mb-0.5 text-xs text-muted uppercase tracking-wider">{strong}</strong>
        {info}
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
