'use client';

export function MobileNavToggle() {
  return (
    <button
      type="button"
      aria-label="Menu"
      onClick={() => window.dispatchEvent(new CustomEvent('kk:open-slide-nav'))}
      className="grid place-items-center w-11 h-11 rounded text-ink hover:bg-bg-soft"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
  );
}
