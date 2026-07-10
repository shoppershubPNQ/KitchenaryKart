'use client';

/**
 * Mobile-only search icon in the top bar. Tapping it toggles the collapsible
 * search bar (see MobileSearchPanel) via a window event, keeping the header
 * itself minimal — logo, search icon, hamburger.
 */
export function MobileSearchToggle() {
  return (
    <button
      type="button"
      aria-label="Search"
      onClick={() => window.dispatchEvent(new CustomEvent('kk:toggle-search'))}
      className="grid place-items-center w-11 h-11 rounded text-ink hover:bg-bg-soft hover:text-brand transition"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
  );
}
