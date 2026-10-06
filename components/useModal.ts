'use client';

import { useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour shared by the search dialogs (voice, photo): focus moves
 * into the dialog when it opens and Tab stays inside it; Escape and the phone's
 * Back button close it; the page behind doesn't scroll; and focus returns to
 * whatever opened it.
 */
export function useModal(open: boolean, dialogRef: RefObject<HTMLElement>, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.offsetParent !== null);
    (focusables()[0] ?? dialogRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close only this dialog, not the menu drawer it may have been opened from.
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      // Focus fell out (the focused button was removed when the dialog changed
      // step) or sits on the dialog box itself: bring it back inside.
      if (!dialogRef.current?.contains(active) || active === dialogRef.current) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // Android Back / browser Back: the page navigates, so at least close the sheet
    // (and stop the microphone) instead of leaving it open over the next page.
    const onPop = () => closeRef.current();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      if (opener?.isConnected) opener.focus();
    };
  }, [open, dialogRef]);
}

/**
 * Props for a dialog's dimmed backdrop: a tap that starts and ends on the
 * backdrop closes the dialog (a drag that ends there doesn't). onClick, not
 * onMouseDown — iOS Safari only delivers taps on a plain <div> to React when it
 * has a click handler.
 */
export function useBackdropClose(onClose: () => void) {
  const downOnBackdrop = useRef(false);
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      downOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
      downOnBackdrop.current = false;
    },
  };
}

/** A plain left click — Ctrl/Cmd/Shift/middle clicks open a new tab and must leave the dialog open. */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
