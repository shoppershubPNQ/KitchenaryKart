'use client';

import { useEffect, useState } from 'react';

/**
 * WhatsApp floating chat widget.
 *
 * Click the green float → small chat preview opens above it with
 * quick-action buttons. Each button opens wa.me with a pre-filled
 * message so the customer's first reply is already framed (much
 * higher conversion than "Hi" cold opens).
 */
export function WhatsAppFloat() {
  const num = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919890352455';
  const [open, setOpen] = useState(false);

  // Close on Escape for a11y
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const waLink = (msg: string) =>
    `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;

  return (
    <>
      {open && (
        <ChatPopup
          waLink={waLink}
          onClose={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close WhatsApp chat' : 'Open WhatsApp chat'}
        aria-expanded={open}
        className="kk-wa-float fixed bottom-2 right-4 md:bottom-5 md:right-5 w-12 h-12 md:w-[54px] md:h-[54px] rounded-full bg-[#25D366] shadow-lg grid place-items-center z-[160] hover:scale-[1.08] transition-transform"
      >
        {open ? (
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
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="white"
            className="md:w-[26px] md:h-[26px]"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}
      </button>
    </>
  );
}

interface PopupProps {
  waLink: (msg: string) => string;
  onClose: () => void;
}

function ChatPopup({ waLink, onClose }: PopupProps) {
  const [custom, setCustom] = useState('');

  // Friendlier brand-voice opener — every pre-fill leads with the
  // same warm hello so the first message the customer sends always
  // reads like a real introduction, not a templated query.
  const quickActions = [
    {
      label: 'Ask about a product',
      msg:
        'Hi 👋\nI came across Kitchenary Kart and would like to ask about a product. Could you help?',
    },
    {
      label: 'Bulk / B2B pricing',
      msg:
        'Hi 👋\nI came across Kitchenary Kart and would like a bulk / B2B quote for my restaurant or cloud kitchen.',
    },
    {
      label: 'Track my order',
      msg:
        'Hi 👋\nI placed an order with Kitchenary Kart and would like to check the status.\nOrder number: ',
    },
    {
      label: 'Something else',
      msg:
        'Hi 👋\nI came across Kitchenary Kart and would like to know more.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-label="WhatsApp chat with KitchenaryKart"
      className="fixed bottom-[76px] right-4 md:bottom-[88px] md:right-5 w-[calc(100vw-32px)] max-w-[340px] z-[160] rounded-xl bg-white shadow-2xl border border-line overflow-hidden animate-[kk-wa-in_180ms_ease-out]"
    >
      <style jsx>{`
        @keyframes kk-wa-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white grid place-items-center font-bold text-[#075E54]">
          K
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">KitchenaryKart Support</div>
          <div className="text-[11px] text-white/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
            Typically replies within an hour
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/15 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div
        className="px-4 py-4 max-h-[60vh] overflow-y-auto"
        style={{
          backgroundColor: '#ECE5DD',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0, transparent 50%)',
        }}
      >
        {/* Greeting bubble */}
        <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[90%] shadow-sm">
          <div className="text-[13px] text-ink leading-snug whitespace-pre-line">
            {'👋 Welcome to Kitchenary Kart!\nBuild Your Dream Kitchen With Us.\nWe are ready to assist you 🚀'}
          </div>
          <div className="text-[10px] text-muted mt-1">KitchenaryKart Team</div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 space-y-1.5">
          {quickActions.map((q) => (
            <a
              key={q.label}
              href={waLink(q.msg)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center justify-between gap-2 bg-white rounded-md px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-[#dcf8c6] transition shadow-sm"
            >
              <span>{q.label}</span>
              <span className="text-[#25D366] text-base leading-none">→</span>
            </a>
          ))}
        </div>

        {/* Custom message */}
        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const msg = custom.trim();
            if (!msg) return;
            window.open(waLink(msg), '_blank', 'noopener');
            onClose();
          }}
        >
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type your own message…"
            rows={2}
            className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-[#25D366] resize-none"
          />
          <button
            type="submit"
            disabled={!custom.trim()}
            aria-label="Send via WhatsApp"
            className="shrink-0 w-9 h-9 rounded-full bg-[#25D366] text-white grid place-items-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-white border-t border-line text-[10px] text-muted text-center">
        Opens a chat in WhatsApp · Powered by WhatsApp
      </div>
    </div>
  );
}
