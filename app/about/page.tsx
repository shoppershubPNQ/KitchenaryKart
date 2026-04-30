import Link from 'next/link';

export const metadata = {
  title: 'About — KitchenaryKart',
  description:
    'KitchenaryKart supplies commercial kitchen equipment to restaurants, hotels and cloud kitchens across India and worldwide.',
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-cream py-14 px-6 text-center">
        <h1 className="text-[clamp(2rem,3.4vw,2.8rem)] mb-3">About KitchenaryKart</h1>
        <p className="text-ink-soft max-w-[640px] mx-auto">
          We supply commercial-grade kitchen, bar, buffet and housekeeping equipment to restaurants, hotels and cloud
          kitchens across India and worldwide.
        </p>
      </section>

      <div className="max-w-[960px] mx-auto px-6 py-14">
        <h2 className="text-[1.5rem] mt-10 mb-3.5">Who we are</h2>
        <p className="text-ink-soft mb-3.5 text-[15px]">
          KitchenaryKart is a HORECA-focused supplier with 2,000+ curated SKUs — from deep fryers and bain maries to
          polyrattan baskets and chafing dishes. Every product in our catalog is rated for professional use; we don't
          stock domestic-grade substitutes dressed up for restaurants.
        </p>

        <h2 className="text-[1.5rem] mt-10 mb-3.5">How we work</h2>
        <ul className="list-disc pl-5 space-y-2 text-ink-soft">
          <li><strong>Inquiry-led pricing.</strong> Add everything your kitchen needs to an inquiry list. We respond within 4 business hours with bulk pricing, lead time and spec sheets.</li>
          <li><strong>Export-ready.</strong> DDP (duty-paid) shipping to US, UK, UAE and EU. You see landed cost before you commit.</li>
          <li><strong>GST-invoiced.</strong> Every order in India ships with a proper tax invoice and 12-month warranty on electric equipment.</li>
          <li><strong>Installation and training support</strong> available on request for heavy equipment.</li>
        </ul>

        <h2 className="text-[1.5rem] mt-10 mb-3.5">Who we serve</h2>
        <p className="text-ink-soft text-[15px]">
          Restaurants, hotels, cloud kitchens, caterers, bakeries, QSRs, cafes, bars, institutional canteens and export
          partners across India, the Gulf, Europe and North America.
        </p>

        <h2 className="text-[1.5rem] mt-10 mb-3.5">Get in touch</h2>
        <p className="text-ink-soft text-[15px]">
          For bulk inquiries, exports, or product questions —{' '}
          <Link href="/contact" className="text-brand font-semibold">send us a message</Link> or WhatsApp us at{' '}
          <strong>+91 98903 52455</strong>.
        </p>
      </div>
    </>
  );
}
