'use client';

import { useEffect, useState } from 'react';

/**
 * Floating "back to top" button.
 *
 * Fades in once the user has scrolled down a screenful, and jumps straight
 * back to the top on click. Positioned bottom-LEFT — the WhatsApp float (and
 * its chat popup) own the bottom-right, so keeping this on the opposite corner
 * avoids any overlap on either breakpoint. Positioning mirrors `.kk-wa-float`
 * (safe-area aware) so the two floats sit at the same height on each side.
 */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after roughly one viewport of scrolling — enough that "top" is
    // actually out of reach, without flashing on short pages.
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label="Scroll to top"
      className={`kk-totop fixed w-12 h-12 md:w-[54px] md:h-[54px] rounded-full bg-brand text-white shadow-lg grid place-items-center z-[150] transition-all duration-300 hover:bg-brand-dark hover:scale-[1.08] ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="md:w-[26px] md:h-[26px]"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
