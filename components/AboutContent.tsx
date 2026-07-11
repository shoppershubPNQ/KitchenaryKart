'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import styles from './AboutContent.module.css';

interface Faq {
  q: string;
  a: string;
}

/**
 * About page — bespoke marketing layout ported from a standalone HTML/CSS/JS
 * design. Styling lives in AboutContent.module.css (locally scoped, no leakage
 * into the rest of the site). Reveal-on-scroll + stat counters run client-side
 * in the effect below, scoped to this subtree. Header/Footer come from the app
 * layout — the design's own footer was intentionally dropped to avoid a
 * duplicate.
 */
export function AboutContent({ faqs }: { faqs: Faq[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Reveal-on-scroll: add the `inview` (hashed) class when each element
    // scrolls into view.
    const revealEls = Array.from(
      root.getElementsByClassName(styles.reveal),
    ) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.inview);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    revealEls.forEach((el) => io.observe(el));

    // Animated stat counters.
    const counters = Array.from(
      root.getElementsByClassName(styles.num),
    ) as HTMLElement[];
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = parseInt(el.dataset.target || '0', 10);
          const suffix =
            target >= 1000 ? '+' : target === 200 ? '+' : target === 100 ? '%' : '';
          const duration = 1400;
          const startTime = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.floor(eased * target) + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = target + suffix;
          };
          requestAnimationFrame(tick);
          cio.unobserve(el);
        });
      },
      { threshold: 0.4 },
    );
    counters.forEach((c) => cio.observe(c));

    return () => {
      io.disconnect();
      cio.disconnect();
    };
  }, []);

  return (
    <div className={styles.kkAbout} ref={rootRef}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.wrap}>
          <div className={`${styles.reveal} ${styles.inview}`}>
            <div className={styles.eyebrow}>About KitchenaryKart</div>
            <h1>
              India&apos;s Trusted Commercial Kitchen Equipment &amp;{' '}
              <span>HORECA</span> Supplier
            </h1>
            <p>
              We supply reliable, professional-grade equipment to restaurants,
              hotels, cloud kitchens, bakeries, cafes and caterers across India
              and international markets — so your kitchen runs efficiently, every
              service.
            </p>
            <div className={styles.heroCtas}>
              <a href="#why" className={`${styles.abtn} ${styles.abtnPrimary}`}>
                Why Choose Us →
              </a>
              <a href="#serve" className={`${styles.abtn} ${styles.abtnOutline}`}>
                Who We Serve
              </a>
            </div>
          </div>
        </div>
        <div className={styles.heroDiagonal} />
      </section>

      {/* STATS */}
      <div className={styles.stats}>
        <div className={styles.wrap}>
          <div className={`${styles.stat} ${styles.reveal}`}>
            <div className={styles.num} data-target={2000}>
              0
            </div>
            <div className={styles.lbl}>Curated Products</div>
          </div>
          <div className={`${styles.stat} ${styles.reveal}`}>
            <div className={styles.num} data-target={200}>
              0
            </div>
            <div className={styles.lbl}>HORECA Clients</div>
          </div>
          <div className={`${styles.stat} ${styles.reveal}`}>
            <div className={styles.num} data-target={28}>
              0
            </div>
            <div className={styles.lbl}>States Delivered To</div>
          </div>
          <div className={`${styles.stat} ${styles.reveal}`}>
            <div className={styles.num} data-target={100}>
              0
            </div>
            <div className={styles.lbl}>% GST Compliant</div>
          </div>
        </div>
      </div>

      {/* BUILT FOR PROFESSIONAL KITCHENS */}
      <section id="built">
        <div className={`${styles.wrap} ${styles.built}`}>
          <div className={`${styles.builtCopy} ${styles.reveal}`}>
            <div className={styles.eyebrow}>Our Focus</div>
            <h2 className={styles.builtHeading}>Built for Professional Kitchens</h2>
            <p>
              Unlike general e-commerce stores, KitchenaryKart focuses
              exclusively on the hospitality industry. We understand what
              restaurants, hotels, cloud kitchens, institutional kitchens,
              bakeries and catering businesses actually need on the line.
            </p>
            <p>
              Whether you&apos;re launching a new restaurant, upgrading hotel
              kitchen equipment, setting up a cloud kitchen, or sourcing for an
              export project, our team helps you find the right equipment — with
              transparent pricing, technical guidance and dependable support.
            </p>
            <p>
              From deep fryers, bain maries and griddles to refrigeration,
              buffet solutions, bar tools and kitchen accessories — we supply
              equipment designed to perform where it matters most.
            </p>
          </div>
          <div className={`${styles.mediaBox} ${styles.reveal}`}>
            <video
              src="/asset/download.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="KitchenaryKart commercial kitchen equipment in a professional kitchen"
            />
          </div>
        </div>
      </section>

      {/* WHAT WE SUPPLY */}
      <section
        id="categories"
        style={{ background: 'var(--cream)', borderTop: '1px solid var(--line)' }}
      >
        <div className={styles.wrap}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <div className={styles.eyebrow}>What We Supply</div>
            <h2>Nine categories, one commercial kitchen equipment supplier</h2>
            <p>
              Our catalog covers <strong>2,000+ products</strong> across every
              station of a professional kitchen — from hot equipment and
              refrigeration to buffet, bar, bakery, housekeeping and spare parts.
            </p>
          </div>
          <div className={styles.catGrid}>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>25+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 21h8M12 17v4M5 3h14l-1.5 9a5.5 5.5 0 0 1-11 0L5 3z" />
              </svg>
              <h3>Hot Equipment</h3>
              <p>
                Bain marie, deep fryers, griddles, ovens, shawarma machines,
                rice &amp; corn steamers, waffle makers and more commercial
                cooking equipment.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>10+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              <h3>Cold Equipment</h3>
              <p>
                Cold display showcases, commercial blenders, ice cube &amp;
                crusher machines, juice dispensers and softy ice cream machines.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>14+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="8" width="18" height="10" rx="1" />
                <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
              </svg>
              <h3>Buffet &amp; Tableware</h3>
              <p>
                Chafing dishes, GN pans, cereal dispensers, food warmers, menu
                stands, cutlery holders and buffet service essentials.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>11+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 21h8M12 17v4M7 3h10v6a5 5 0 0 1-10 0V3z" />
                <path d="M17 5h2a2 2 0 0 1 0 4h-2M7 5H5a2 2 0 0 0 0 4h2" />
              </svg>
              <h3>Bar &amp; Beverage</h3>
              <p>
                Beer towers, juice &amp; urn dispensers, shakers, muddlers, cup
                holders and LED sign boards for cafes and bars.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>14+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <h3>Kitchen &amp; Baking</h3>
              <p>
                Commercial &amp; spiral mixers, dough dividers, bread slicers,
                cake tools, piping bags and bakery equipment.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>14+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12l9-9 9 9M5 10v10h14V10" />
              </svg>
              <h3>Housekeeping &amp; Hotel Supplies</h3>
              <p>
                Hand &amp; hair dryers, soap dispensers, hotel trolleys, queue
                managers, dustbins and service bells.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>19+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3v6a3 3 0 0 0 3 3v9M15 3v6a3 3 0 0 1-3 3M18 3v18" />
              </svg>
              <h3>Kitchen Accessories</h3>
              <p>
                Knives, chopping boards, woks, cast iron pans, thermometers,
                ladles, whisks and everyday kitchen tools.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>70+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8c0-2 8-2 8 0v10c0-2-8-2-8 0V8zM20 8c0-2-8-2-8 0v10c0-2 8-2 8 0V8z" />
              </svg>
              <h3>Polyrattan Products</h3>
              <p>
                Buffet display baskets, bread baskets and presentation solutions
                for hotel and restaurant buffets.
              </p>
            </div>
            <div className={`${styles.catCard} ${styles.reveal}`}>
              <span className={styles.catCount}>200+</span>
              <svg
                className={styles.catIcon}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a4 4 0 0 1-5.34 5.33L7.71 19.3a1 1 0 0 1-2.82-2.82l7.72-7.75a4 4 0 0 1 5.34-5.33l-3.1 3.1z" />
              </svg>
              <h3>Spare Parts</h3>
              <p>
                Genuine spare parts for deep fryers, bain maries, ovens, ice
                crushers, mixers, softy and shawarma machines.
              </p>
            </div>
          </div>
          <p className={`${styles.catNote} ${styles.reveal}`}>
            Can&apos;t find what you&apos;re looking for? Our full catalog goes
            far beyond what&apos;s listed here —{' '}
            <Link href="/contact" className={styles.catNoteLink}>
              get in touch
            </Link>{' '}
            and our team will help you source it.
          </p>
        </div>
      </section>

      {/* CITIES */}
      <section className={styles.cities}>
        <div className={`${styles.wrap} ${styles.reveal}`}>
          <div className={styles.eyebrow} style={{ marginBottom: '2px' }}>
            Where We Deliver
          </div>
          <div className={styles.citiesRow}>
            <span className={styles.cityChip}>Pune</span>
            <span className={styles.cityChip}>Mumbai</span>
            <span className={styles.cityChip}>Bangalore</span>
            <span className={styles.cityChip}>Hyderabad</span>
            <span className={styles.cityChip}>Delhi NCR</span>
            <span className={styles.cityChip}>Chennai</span>
            <span className={styles.cityChip}>Ahmedabad</span>
            <span className={styles.cityChip}>+ 20 More Cities Nationwide</span>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className={styles.tickerWrap}>
        <div className={styles.ticker}>
          <span>
            Commercial Kitchen Equipment Supplier
            <span>HORECA Equipment India</span>
            <span>Cloud Kitchen Setup</span>
            <span>Restaurant Equipment Wholesale</span>
            <span>Bakery &amp; Bar Equipment</span>
            <span>B2B Bulk Orders Welcome</span>
          </span>
          <span>
            Commercial Kitchen Equipment Supplier
            <span>HORECA Equipment India</span>
            <span>Cloud Kitchen Setup</span>
            <span>Restaurant Equipment Wholesale</span>
            <span>Bakery &amp; Bar Equipment</span>
            <span>B2B Bulk Orders Welcome</span>
          </span>
        </div>
      </div>

      {/* WHY CHOOSE */}
      <section id="why" className={styles.why}>
        <div className={styles.wrap}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <div className={styles.eyebrow}>Why Hospitality Businesses Choose Us</div>
            <h2>Reasons operators keep ordering from us</h2>
          </div>
        </div>
        <div className={`${styles.whyGrid} ${styles.wrap}`}>
          <div className={`${styles.whyCard} ${styles.reveal}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
            </svg>
            <h3>Commercial-Grade, Built to Last</h3>
            <p>
              Heavy-gauge stainless steel construction sourced for real HORECA
              volume — engineered for daily commercial kitchen use, not
              occasional home cooking.
            </p>
          </div>
          <div className={`${styles.whyCard} ${styles.reveal}`}>
            <span className={styles.tag}>9 Categories</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <h3>One-Stop HORECA Sourcing</h3>
            <p>
              Hot equipment, refrigeration, bakery, bar, buffet and housekeeping
              in a single catalog — order once instead of chasing multiple
              vendors.
            </p>
          </div>
          <div className={`${styles.whyCard} ${styles.reveal}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a4 4 0 0 1-5.34 5.33L7.71 19.3a1 1 0 0 1-2.82-2.82l7.72-7.75a4 4 0 0 1 5.34-5.33l-3.1 3.1z" />
            </svg>
            <h3>Genuine Spare Parts, Zero Downtime</h3>
            <p>
              Original spare parts for fryers, bain maries, ovens and mixers keep
              equipment running — a stalled kitchen costs more than the part
              itself.
            </p>
          </div>
          <div className={`${styles.whyCard} ${styles.reveal}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v16H4z" />
              <path d="M4 9h16M9 9v11" />
            </svg>
            <h3>Transparent, GST-Compliant Billing</h3>
            <p>
              Every order ships with proper GST documentation and no hidden costs
              — invoices your accounts team can reconcile without follow-up
              calls.
            </p>
          </div>
          <div className={`${styles.whyCard} ${styles.reveal}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0z" />
              <path d="M12 3c2.5 3 4 6 4 9s-1.5 6-4 9c-2.5-3-4-6-4-9s1.5-6 4-9z" />
            </svg>
            <h3>Nationwide Delivery, Export Ready</h3>
            <p>
              Shipping to 28 states across India, plus export documentation and
              logistics support for international HORECA buyers.
            </p>
          </div>
          <div className={`${styles.whyCard} ${styles.reveal}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
            </svg>
            <h3>Dedicated B2B Account Support</h3>
            <p>
              Bulk pricing and a dedicated account manager for multi-outlet and
              cloud kitchen chains, with hands-on help on specs and kitchen
              planning.
            </p>
          </div>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section id="serve">
        <div className={`${styles.wrap} ${styles.serveLayout}`}>
          <div className={`${styles.reveal} ${styles.imgExpand} ${styles.serveMedia}`}>
            <img
              src="/asset/about.png"
              width={1200}
              height={800}
              loading="lazy"
              decoding="async"
              alt="KitchenaryKart supplies commercial kitchen equipment to restaurants, hotels and cloud kitchens across India"
              className={styles.serveImg}
            />
          </div>
          <div className={styles.serveCopy}>
            <div className={`${styles.sectionHead} ${styles.reveal}`}>
              <div className={styles.eyebrow}>Who We Serve</div>
              <h2>Businesses that run on our equipment</h2>
              <p>
                From independent food businesses to large hospitality
                operations, we help organisations source dependable equipment
                that supports long-term success.
              </p>
            </div>
            <div className={`${styles.serveChips} ${styles.reveal}`}>
              <div className={styles.chip}>Restaurants</div>
              <div className={styles.chip}>Hotels &amp; Resorts</div>
              <div className={styles.chip}>Cloud Kitchens</div>
              <div className={styles.chip}>Cafes &amp; QSR Chains</div>
              <div className={styles.chip}>Bakeries &amp; Confectioneries</div>
              <div className={styles.chip}>Catering Businesses</div>
              <div className={styles.chip}>Institutional Kitchens</div>
              <div className={styles.chip}>Hospitals &amp; Educational Institutions</div>
              <div className={styles.chip}>Hospitality Consultants</div>
              <div className={styles.chip}>International Importers &amp; Distributors</div>
            </div>
          </div>
        </div>
      </section>

      {/* B2B PARTNER PROGRAM */}
      <section
        id="b2b"
        style={{
          background: 'var(--cream)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className={styles.wrap}>
          <div
            className={`${styles.sectionHead} ${styles.reveal}`}
            style={{ maxWidth: '720px' }}
          >
            <div className={styles.eyebrow}>B2B Partner Program</div>
            <h2>Running a Cloud Kitchen, Restaurant or Café? Join Our B2B Side.</h2>
            <p>
              Whether you&apos;re a single-outlet café or a multi-city cloud
              kitchen chain — if you&apos;re in the business of food,
              KitchenaryKart is built for you. Register as a B2B partner for
              wholesale pricing, GST-compliant invoicing, dedicated account
              support and priority sourcing across every category. Everything
              your kitchen needs is here, in one place.
            </p>
          </div>
          <div className={`${styles.serveChips} ${styles.reveal}`}>
            <div className={styles.chip}>Wholesale / Bulk Pricing</div>
            <div className={styles.chip}>Dedicated Account Manager</div>
            <div className={styles.chip}>Priority Sourcing</div>
            <div className={styles.chip}>Flexible Payment Terms</div>
            <div className={styles.chip}>Multi-Outlet Ordering</div>
          </div>
          <div className={styles.reveal} style={{ marginTop: '32px' }}>
            <Link
              href="/contact"
              className={`${styles.abtn} ${styles.abtnPrimary}`}
              title="Register as a KitchenaryKart B2B / wholesale partner"
            >
              Register as a B2B Partner →
            </Link>
          </div>
        </div>
      </section>

      {/* VISION / MISSION */}
      <div className={styles.vm}>
        <div className={`${styles.vmPanel} ${styles.vision} ${styles.reveal}`}>
          <span className={styles.vmNum}>OUR VISION</span>
          <h3>Where we&apos;re headed</h3>
          <p>
            To become India&apos;s most trusted HORECA and commercial kitchen
            equipment supplier — making professional hospitality equipment
            accessible, affordable and easy to procure for businesses worldwide.
          </p>
        </div>
        <div className={`${styles.vmPanel} ${styles.mission} ${styles.reveal}`}>
          <span className={styles.vmNum}>OUR MISSION</span>
          <h3>How we get there</h3>
          <p>
            Simplifying commercial kitchen procurement through quality products,
            transparent pricing, responsive support and industry expertise —
            helping hospitality businesses build efficient, profitable,
            future-ready operations.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <section id="faq">
        <div className={styles.wrap}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <div className={styles.eyebrow}>FAQs</div>
            <h2>Common Questions from HORECA Buyers</h2>
            <p>
              Straight answers for restaurants, hotels, cloud kitchens and cafes
              sourcing commercial kitchen equipment in India.
            </p>
          </div>
          <div className={`${styles.faqList} ${styles.reveal}`}>
            {faqs.map((f) => (
              <details className={styles.faqItem} key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className={styles.ctaBand}>
        <div className={styles.glow} />
        <div className={`${styles.wrap} ${styles.ctaBandWrap} ${styles.reveal}`}>
          <h2>Let&apos;s Build Better Kitchens Together</h2>
          <p>
            Whether you need a single product, a complete kitchen setup, or bulk
            procurement support — we&apos;re here to help.
          </p>
          <Link
            href="/contact"
            className={`${styles.abtn} ${styles.abtnPrimary}`}
            title="Contact the KitchenaryKart sales team"
          >
            Talk to Our Team →
          </Link>
        </div>
      </section>
    </div>
  );
}
