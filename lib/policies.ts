import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

export interface PublicPolicy {
  slug: string;
  title: string;
  body: string;
  position: number;
  updatedAt: string;
}

async function _getActivePolicies(): Promise<PublicPolicy[]> {
  const rows = await prisma.policy.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    body: r.body,
    position: r.position,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/** All active policies, cached 5 min; busted by admin via `?tag=policies`. */
export const getActivePolicies = unstable_cache(
  _getActivePolicies,
  ['kk:active-policies'],
  { revalidate: 300, tags: ['policies'] },
);

async function _getPolicyBySlug(slug: string): Promise<PublicPolicy | null> {
  const r = await prisma.policy.findFirst({ where: { slug, isActive: true } });
  if (!r) return null;
  return {
    slug: r.slug,
    title: r.title,
    body: r.body,
    position: r.position,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const getPolicyBySlug = unstable_cache(
  _getPolicyBySlug,
  ['kk:policy-by-slug'],
  { revalidate: 300, tags: ['policies'] },
);
