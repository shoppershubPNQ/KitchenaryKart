'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

/**
 * Sign-out control for the account sidebar. Uses the shared useAuth().logout
 * (clears the session cookie + fires kk:auth-changed so the header updates),
 * then bounces to the home page since /account is auth-gated.
 */
export function SignOutButton() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={async () => {
        await logout();
        router.push('/');
      }}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted hover:bg-white hover:text-brand transition text-left w-full"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      Sign out
    </button>
  );
}
