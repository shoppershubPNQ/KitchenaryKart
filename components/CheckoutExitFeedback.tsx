'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FEEDBACK_REASONS, MAX_NOTE, OTHER_KEY } from '@/lib/checkout-feedback';
import { currentSessionId } from '@/lib/track';

/**
 * Asks, once, why someone is leaving checkout without paying.
 *
 * The abandoned-checkout alert already tells the team THAT a cart was lost.
 * This is the only thing that records why, and it has to catch the shopper
 * while they are still on the page — `beforeunload` cannot show anything of
 * our own, so the two real exits are caught instead:
 *
 *   desktop  the pointer leaving through the top of the window, which is the
 *            move towards the tab bar, the back button or the address bar.
 *   mobile   there is no pointer to leave, so the back gesture is caught by
 *            pushing one history entry on mount and answering `popstate`.
 *            The entry is removed again the moment the popup is done with,
 *            so a second back press leaves as the shopper expects.
 *
 * It appears once per checkout visit (sessionStorage, so a new tab may ask
 * again but a reload will not), never once payment has succeeded, and never
 * with an empty cart — there is nothing to abandon.
 */

const SEEN_KEY = 'kk_checkout_feedback_shown';

interface Props {
  /** True once payment is confirmed — the popup must never appear after that. */
  done: boolean;
  cartValue: number;
  itemCount: number;
}

export default function CheckoutExitFeedback({ done, cartValue, itemCount }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const armed = useRef(false);
  const pushed = useRef(false);
  /**
   * Set before every history.back() WE make, so the popstate it causes is not
   * mistaken for the shopper pressing back. Without it the popup opens the
   * instant checkout loads: React runs the effect twice in development, and
   * the first cleanup's back() arrives after the second run has re-attached
   * the listener. The same race is possible on any remount in production.
   */
  const selfPop = useRef(false);
  const doneRef = useRef(done);
  doneRef.current = done;

  /** Undo our spare history entry without tripping our own listener. */
  const popSelf = useCallback(() => {
    if (!pushed.current) return;
    pushed.current = false;
    selfPop.current = true;
    try {
      history.back();
    } catch {
      selfPop.current = false;
    }
  }, []);

  /** Never ask twice, and never ask after this point. */
  const disarm = useCallback(() => {
    armed.current = false;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* private mode — the in-memory flag still holds for this page */
    }
  }, []);

  const show = useCallback(() => {
    if (!armed.current || doneRef.current) return;
    disarm();
    setOpen(true);
  }, [disarm]);

  useEffect(() => {
    if (done || itemCount <= 0) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;
    armed.current = true;

    // Desktop: the pointer crossing the top edge.
    const onOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) show();
    };

    // Touch only: one spare history entry to absorb the back gesture. NOT on
    // a device with a real pointer — there, mouseout already catches the exit,
    // and a spare entry would mean Skip either strands a history step or
    // navigates a shopper off checkout who never asked to leave.
    const touch = !window.matchMedia?.('(pointer: fine)').matches;
    const onPop = () => {
      if (selfPop.current) {
        selfPop.current = false;
        return;
      }
      // The gesture has already consumed our entry; there is nothing to undo.
      pushed.current = false;
      show();
    };
    if (touch) {
      try {
        history.pushState({ kkFeedback: 1 }, '');
        pushed.current = true;
      } catch {
        /* history blocked — nothing to catch the gesture, so nothing to undo */
      }
    }

    document.addEventListener('mouseout', onOut);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('mouseout', onOut);
      window.removeEventListener('popstate', onPop);
      // Give the entry back so the shopper's next back press behaves.
      popSelf();
    };
  }, [done, itemCount, show, popSelf]);

  /**
   * Closing must never move the shopper. On touch the back gesture has
   * already spent our spare entry, and on a pointer device we never made one,
   * so there is nothing to undo here — only the cleanup, which runs when they
   * genuinely leave checkout, gives an unused entry back.
   */
  function close() {
    setOpen(false);
  }

  function submit() {
    if (!reason || sent) return;
    setSent(true);
    const sessionId = currentSessionId();
    const body = JSON.stringify({
      reason,
      note: reason === OTHER_KEY ? note : undefined,
      sessionId,
      cartValue,
      itemCount,
    });
    // Fire and forget: they are leaving, so this must not hold them up, and
    // sendBeacon survives the page going away mid-request.
    try {
      if (!navigator.sendBeacon?.('/api/checkout-feedback', new Blob([body], { type: 'application/json' }))) {
        throw new Error('beacon refused');
      }
    } catch {
      fetch('/api/checkout-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
    close();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[400]" onClick={close} aria-hidden />
      <div
        className="fixed inset-0 z-[401] grid place-items-end sm:place-items-center px-0 sm:px-4 py-0 sm:py-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kk-exit-title"
      >
        <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="px-5 pt-5 pb-3">
            <h2 id="kk-exit-title" className="text-base sm:text-lg font-semibold text-slate-900">
              What stopped you from placing your order?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              One tap helps us fix it. Your cart is still saved.
            </p>
          </div>

          <div className="px-5 pb-2 space-y-1.5">
            {FEEDBACK_REASONS.map((r) => (
              <label
                key={r.key}
                className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm cursor-pointer transition ${
                  reason === r.key
                    ? 'border-brand bg-brand/5 text-slate-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="kk-exit-reason"
                  value={r.key}
                  checked={reason === r.key}
                  onChange={() => setReason(r.key)}
                  className="accent-brand"
                />
                <span>{r.label}</span>
              </label>
            ))}

            {reason === OTHER_KEY && (
              <textarea
                autoFocus
                value={note}
                maxLength={MAX_NOTE}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell us in a line or two…"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={close}
              className="text-sm text-slate-500 hover:text-slate-700 px-2 py-2"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!reason || sent}
              className="px-5 py-2.5 rounded-md bg-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
