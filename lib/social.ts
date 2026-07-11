import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/**
 * Social-media links for the storefront footer. Each link lives in the
 * `settings` key/value table under a well-known key:
 *   social.instagram
 *   social.youtube
 *   social.twitter
 *   social.facebook
 *   social.whatsapp
 *   social.linkedin
 *
 * The admin manages them at /dashboard/social. Empty / missing values are
 * filtered out so the footer only renders icons that actually have a link.
 * Keep this list in sync with the admin's PLATFORMS (app/api/social/route.ts).
 */
export type SocialPlatform =
  | 'instagram'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'whatsapp'
  | 'linkedin';

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'youtube',
  'twitter',
  'facebook',
  'whatsapp',
  'linkedin',
];

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

async function _getSocialLinks(): Promise<SocialLinks> {
  const keys = SOCIAL_PLATFORMS.map((p) => `social.${p}`);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const out: SocialLinks = {};
  for (const r of rows) {
    const platform = r.key.replace(/^social\./, '') as SocialPlatform;
    const v = (r.value || '').trim();
    if (v && SOCIAL_PLATFORMS.includes(platform)) out[platform] = v;
  }
  return out;
}

/** 10-min cache; busted by admin via /api/revalidate?tag=social. */
export const getSocialLinks = unstable_cache(
  _getSocialLinks,
  ['kk:social-links'],
  { revalidate: 600, tags: ['social'] },
);
