'use client';

/**
 * Client-side auth state. Polls /api/auth/me once on mount and listens for
 * the `kk:auth-changed` window event to refresh.
 *
 *   - `openAuth()` opens the auth modal (modal is mounted once in the layout).
 *   - After login/logout, fire `kk:auth-changed` to refresh every hook.
 */
import { useEffect, useState } from 'react';

export interface AuthCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

const AUTH_EVT = 'kk:auth-changed';

export function openAuth(opts?: { redirectTo?: string; onSuccess?: () => void }) {
  window.dispatchEvent(
    new CustomEvent('kk:open-auth', {
      detail: {
        redirectTo: opts?.redirectTo,
        onSuccess: opts?.onSuccess,
      },
    }),
  );
}

export function emitAuthChanged() {
  window.dispatchEvent(new CustomEvent(AUTH_EVT));
}

export function useAuth() {
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setCustomer(data.customer ?? null);
          } else {
            setCustomer(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const h = () => {
      setLoading(true);
      load();
    };
    window.addEventListener(AUTH_EVT, h);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EVT, h);
    };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCustomer(null);
    emitAuthChanged();
  }

  return { customer, loading, loggedIn: !!customer, logout };
}
