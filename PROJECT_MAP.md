# 🗺️ KitchenaryKart — Frontend / Backend Map

> This is a **labeling guide only**. Nothing is actually renamed — Next.js requires exact
> file names (`page.tsx`, `route.ts`, etc.), so real renames would break the app.
> Use this as a mental map of "what is frontend vs backend".

**One app, not two.** This is a full-stack Next.js 14 app. Frontend (UI) and backend
(server logic + database) live in the same repo and deploy together to Vercel.

Legend: 🟢 = FRONTEND (runs in the browser / builds the UI) · 🔵 = BACKEND (runs on the
server: APIs, database, business logic) · ⚪ = SHARED / CONFIG

---

## 📁 `app/` — Pages + API (mixed)

This folder is where frontend and backend meet.

### 🟢 FRONTEND — pages the visitor sees
| File / folder | Label |
|---|---|
| `app/page.tsx` | 🟢 Home page |
| `app/layout.tsx` | 🟢 Site-wide shell (header/footer wrapper) |
| `app/globals.css` | 🟢 Global styles |
| `app/shop/` | 🟢 Shop / listing page |
| `app/product/` | 🟢 Product detail pages |
| `app/products/` | 🟢 Products index |
| `app/category/` | 🟢 Category pages |
| `app/checkout/page.tsx` | 🟢 Checkout page *(client-side)* |
| `app/account/` | 🟢 Customer account pages |
| `app/wishlist/` | 🟢 Wishlist page |
| `app/blog/` | 🟢 Blog pages |
| `app/about/`, `app/contact/`, `app/policy/` | 🟢 Static info pages |
| `app/*-equipment-supplier*/` | 🟢 SEO landing pages |
| `app/track/` | 🟢 Order tracking page |

### 🔵 BACKEND — server endpoints (no UI, return data/JSON)
| File / folder | Label |
|---|---|
| `app/api/auth/*` | 🔵 Login / register / OTP / session |
| `app/api/catalog/facebook/` | 🔵 Product feed for Facebook |
| `app/api/coupons/validate/` | 🔵 Coupon validation |
| `app/api/search/` | 🔵 Search endpoint |
| `app/api/reviews/*` | 🔵 Reviews read/write |
| `app/api/track/` | 🔵 Analytics / event tracking |
| `app/api/cron/keepalive/` | 🔵 Scheduled DB keep-alive |
| `app/api/revalidate/` | 🔵 Cache revalidation |

### 🔵 BACKEND — SEO machine-readable files (server-generated)
| File | Label |
|---|---|
| `app/sitemap.ts` | 🔵 Generates sitemap.xml |
| `app/robots.ts` | 🔵 Generates robots.txt |
| `app/merchant-feed.xml/` | 🔵 Google Merchant product feed |

---

## 📁 `components/` — 🟢 FRONTEND (all UI building blocks)

Every file here is frontend. Most are **interactive** ("use client" — they run live in the
browser): `Header`, `ProductCard`, `HeroCarousel`, `ShopView`, `CartButton`, `AuthModal`,
`QuoteForm`, `VariantSelector`, `WishlistDrawer`, `HeaderSearch`, etc.

A few are **server-rendered UI** (still frontend, just built on the server): `Footer.tsx`,
`ProductFaq.tsx`, `ReviewsSection.tsx`, `SupplierLanding.tsx`, `TrustStrip.tsx`,
`PdpTrustBadges.tsx`, `OrderDetailView.tsx`, `OrderStatusTimeline.tsx`.

---

## 📁 `lib/` — mostly 🔵 BACKEND (logic + data layer)

### 🔵 BACKEND — server logic & database access
| File | Label |
|---|---|
| `lib/db.ts` | 🔵 Database client (Prisma → Neon Postgres) |
| `lib/products.ts` | 🔵 Product queries |
| `lib/orders.ts` | 🔵 Order logic |
| `lib/reviews.ts` | 🔵 Reviews data |
| `lib/categories.ts`, `collections.ts` | 🔵 Catalog data |
| `lib/auth.ts` | 🔵 Auth / session logic |
| `lib/otp-store.ts` | 🔵 OTP storage |
| `lib/email.ts` | 🔵 Sending emails (Resend) |
| `lib/coupon.ts` | 🔵 Coupon rules |
| `lib/shipping.ts`, `shipping-zones.ts` | 🔵 Shipping logic |
| `lib/order-summary.ts` | 🔵 Order totals |
| `lib/rate-limit.ts` | 🔵 API rate limiting (Upstash Redis) |
| `lib/blog.ts`, `landing-pages.ts`, `policies.ts`, `product-faqs.ts`, `category-content.ts`, `banners.ts`, `reels.ts`, `social.ts` | 🔵 Content/data sources |
| `lib/json-ld.ts` | 🔵 SEO structured data |
| `lib/analytics.ts` | 🔵 Analytics helpers |

### 🟢 FRONTEND — browser-side helpers ("use client")
| File | Label |
|---|---|
| `lib/cart.ts` | 🟢 Cart state in the browser |
| `lib/wishlist.ts` | 🟢 Wishlist state in the browser |
| `lib/useAuth.ts` | 🟢 Auth React hook |
| `lib/rating.tsx` | 🟢 Star-rating UI component |
| `lib/format.ts` | ⚪ Formatting helper (used both sides) |

---

## 📁 Other folders

| Path | Label |
|---|---|
| `prisma/schema.prisma` | 🔵 BACKEND — database schema (your tables) |
| `public/` | 🟢 FRONTEND — static images/assets |
| `scripts/` | 🔵 BACKEND — dev/build scripts |
| `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.js`, `vercel.json`, `package.json`, `.env.example` | ⚪ CONFIG — build & deploy setup |

---

## 🧭 Quick rule of thumb

- In **`components/`** → it's **frontend** (UI).
- In **`app/api/`** → it's **backend** (server endpoint).
- In **`lib/`** → it's **backend** logic, *except* `cart.ts`, `wishlist.ts`, `useAuth.ts`, `rating.tsx` which are frontend.
- **`prisma/`** and the **database** → backend.
- A page in **`app/`** (like `page.tsx`) is **frontend UI**, but it often runs backend
  code (Prisma queries) on the server before sending HTML to the browser.
