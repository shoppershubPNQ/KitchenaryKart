/**
 * Redirects /images/<path> to the Cloudinary CDN.
 * Images were uploaded with public_id `kk/<path>` (extension stripped).
 * f_auto,q_auto = let Cloudinary auto-pick optimal format (WebP/AVIF) +
 *                 compression for the requesting browser.
 */
import { NextRequest } from 'next/server';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || 'ddvay7jt0';

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const rel = params.path.map(decodeURIComponent).join('/');
  // w_1600,c_limit caps delivery width so a stale/external /images/ hit can't
  // pull a full-res original (bandwidth guard; c_limit only downscales).
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1600,c_limit/kk/${rel}`;
  return Response.redirect(url, 308);
}
