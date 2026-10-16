'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import type { ChatPanelProps } from './ChatPanel';

/**
 * Website chatbot launcher - Kitchenary Kart's virtual sales assistant (Claude,
 * run by the ADMIN app at /api/public/chat and reached from here through the
 * /admin-api rewrite in next.config.js). This file only renders the bubble.
 *
 * Kept deliberately tiny, because it ships on every page:
 *  - layout.tsx loads it with next/dynamic + ssr:false, so it is not in the
 *    server render or the first JS bundle;
 *  - it waits for the browser to be idle before asking whether the chat is
 *    switched on (GET /admin-api/public/chat/config, cached 5 min in
 *    sessionStorage), and renders NOTHING when it is off or the call fails;
 *  - the panel itself (components/ChatPanel.tsx: messages, input, links) is a
 *    separate chunk fetched on the first open (prefetched on hover/focus).
 *
 * Stacked directly above the WhatsApp float (.kk-chat-float in globals.css).
 * The two popups close each other through window events: this panel fires
 * `kk:chat-open` and closes on `kk:wa-open` (components/WhatsAppFloat.tsx).
 *
 * Dev only: `?kkChatMock` in the URL shows the widget with canned replies and
 * never calls the admin API (dead code in production builds).
 */

const CFG_URL = '/admin-api/public/chat/config';
const CFG_KEY = 'kk_chat_cfg';
const OPEN_KEY = 'kk_chat_open';
const CFG_TTL_MS = 5 * 60 * 1000;
const DEFAULT_GREETING =
  "Namaste! I'm Kitchenary Kart's virtual sales assistant (an AI). Ask me about products, prices, stock or your order - in Hindi, English or Hinglish.";

type Cfg = { enabled: boolean; greeting: string };
type Panel = ComponentType<ChatPanelProps>;

function readCachedCfg(): Cfg | null {
  try {
    const raw = window.sessionStorage.getItem(CFG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { at?: unknown; enabled?: unknown; greeting?: unknown } | null;
    if (!c || typeof c.at !== 'number' || typeof c.enabled !== 'boolean') return null;
    const age = Date.now() - c.at;
    if (age < 0 || age > CFG_TTL_MS) return null;
    return { enabled: c.enabled, greeting: typeof c.greeting === 'string' ? c.greeting : '' };
  } catch {
    return null;
  }
}

function writeCachedCfg(c: Cfg): void {
  try {
    window.sessionStorage.setItem(CFG_KEY, JSON.stringify({ at: Date.now(), ...c }));
  } catch {
    /* private mode / storage blocked - just fetch again next page load */
  }
}

async function fetchCfg(signal: AbortSignal): Promise<Cfg | null> {
  const res = await fetch(CFG_URL, { headers: { Accept: 'application/json' }, credentials: 'omit', signal });
  if (!res.ok) return null;
  const j = (await res.json()) as { enabled?: unknown; greeting?: unknown } | null;
  if (!j || typeof j.enabled !== 'boolean') return null;
  return { enabled: j.enabled, greeting: typeof j.greeting === 'string' ? j.greeting.slice(0, 300) : '' };
}

/** One shared import of the panel chunk (also used to prefetch on hover). */
let panelPromise: Promise<Panel> | null = null;
function loadPanel(): Promise<Panel> {
  if (!panelPromise) {
    panelPromise = import('./ChatPanel')
      .then((m) => m.ChatPanel)
      .catch((e: unknown) => {
        panelPromise = null; // let the next click retry (e.g. a flaky network)
        throw e;
      });
  }
  return panelPromise;
}

const prefetchPanel = () => {
  loadPanel().catch(() => {});
};

export function ChatWidget() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [mock, setMock] = useState(false);
  const [open, setOpen] = useState(false);
  const [PanelComp, setPanelComp] = useState<Panel | null>(null);
  /** Bumped on every open the customer asked for - the panel focuses its input. */
  const [focusTick, setFocusTick] = useState(0);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // Start-up: wait for idle, then read the config (cache → network).
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const start = async () => {
      if (process.env.NODE_ENV !== 'production') {
        try {
          if (new URLSearchParams(window.location.search).has('kkChatMock')) {
            setMock(true);
            setCfg({ enabled: true, greeting: '(mock) Namaste!' });
            return;
          }
        } catch {
          /* ignore */
        }
      }
      let c = readCachedCfg();
      if (!c) {
        try {
          c = await fetchCfg(ctrl.signal);
        } catch {
          c = null;
        }
        if (c) writeCachedCfg(c);
      }
      if (cancelled || !c || !c.enabled) return;
      setCfg(c);
    };

    let idleId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => void start(), { timeout: 5000 });
    } else {
      timer = setTimeout(() => void start(), 1500);
    }
    return () => {
      cancelled = true;
      ctrl.abort();
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const openPanel = useCallback((userAsked: boolean) => {
    setOpen(true);
    if (userAsked) setFocusTick((t) => t + 1);
    loadPanel()
      .then((P) => setPanelComp(() => P))
      .catch(() => {
        // Chunk failed to load: show the bubble again so a later tap can retry.
        setOpen(false);
        try {
          window.sessionStorage.removeItem(OPEN_KEY);
        } catch {
          /* ignore */
        }
      });
  }, []);

  const closePanel = useCallback((focusLauncher: boolean) => {
    returnFocus.current = focusLauncher;
    setOpen(false);
    try {
      window.sessionStorage.removeItem(OPEN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Reopen after a full page load if the panel was open (sessionStorage flag).
  useEffect(() => {
    if (!cfg?.enabled) return;
    let reopen = false;
    try {
      reopen = window.sessionStorage.getItem(OPEN_KEY) === '1';
    } catch {
      reopen = false;
    }
    if (reopen) openPanel(false);
  }, [cfg, openPanel]);

  // Opening: tell the WhatsApp popup to close, remember the open state.
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent('kk:chat-open'));
    try {
      window.sessionStorage.setItem(OPEN_KEY, '1');
    } catch {
      /* ignore */
    }
  }, [open]);

  // The WhatsApp popup opened → close this panel.
  useEffect(() => {
    const onWa = () => closePanel(false);
    window.addEventListener('kk:wa-open', onWa);
    return () => window.removeEventListener('kk:wa-open', onWa);
  }, [closePanel]);

  // Closed with Escape / the X → focus goes back to the (re-shown) launcher.
  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    launcherRef.current?.focus();
  }, [open]);

  if (!cfg?.enabled) return null;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => openPanel(true)}
          onPointerEnter={prefetchPanel}
          onFocus={prefetchPanel}
          aria-label="Chat with our assistant"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="kk-chat-panel"
          title="Ask our assistant"
          data-track="chatbot_open"
          className="kk-chat-float kk-fade-in fixed z-[155] w-12 h-12 md:w-[54px] md:h-[54px] rounded-full bg-brand hover:bg-brand-hover text-white shadow-lg grid place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="md:w-[26px] md:h-[26px]"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* First open on a slow network: a spinner where the bubble was. */}
      {open && !PanelComp && (
        <div
          role="status"
          className="kk-chat-float fixed z-[155] w-12 h-12 md:w-[54px] md:h-[54px] rounded-full bg-brand text-white shadow-lg grid place-items-center"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          >
            <path d="M21 12a9 9 0 1 1-6.2-8.55" />
          </svg>
          <span className="sr-only">Opening chat…</span>
        </div>
      )}

      {PanelComp && (
        <PanelComp
          open={open}
          greeting={cfg.greeting.trim() || DEFAULT_GREETING}
          mock={mock}
          focusTick={focusTick}
          onClose={closePanel}
        />
      )}
    </>
  );
}
