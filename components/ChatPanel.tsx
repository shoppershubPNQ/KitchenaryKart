'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { currentSessionId } from '@/lib/track';

/**
 * Website chatbot panel - loaded by components/ChatWidget.tsx on the first
 * open (its own JS chunk, never on the first page load).
 *
 * Talks ONLY to POST /admin-api/public/chat (the admin app's public chat
 * route; contract in the chatbot spec §4.6). The server always answers with
 * JSON carrying `reply` - success or error - and the panel shows that text.
 *
 * Safety: bubbles are plain text. No dangerouslySetInnerHTML, no markdown
 * parser; only https links to kitchenarykart.com, the team's own WhatsApp
 * number and the couriers' tracking pages become <a>.
 *
 * Stored state: localStorage['kk_chat_v1'] = { sessionId?, chatToken?,
 * messages (last 50), updatedAt }, dropped after 12 h without activity (the
 * server's idle limit). The chat token (issued with a new chat) is what lets
 * this browser - and only this browser - continue the chat.
 */

export type Handoff = { whatsappUrl: string; phoneDisplay: string; telUrl: string; hours: string };

type ErrorCode =
  | 'invalid_request'
  | 'too_long'
  | 'forbidden_origin'
  | 'disabled'
  | 'unavailable'
  | 'rate_limited'
  | 'daily_cap'
  | 'session_cap'
  | 'busy'
  | 'upstream_busy'
  | 'refused'
  | 'error';

type ChatOk = {
  ok: true;
  sessionId: string;
  /** Only with a new chat. */
  chatToken?: string;
  newSession: boolean;
  reply: string;
  handoff: Handoff | null;
  leadSaved: boolean;
  remaining: number;
};
type ChatErr = {
  ok: false;
  code: ErrorCode;
  reply: string;
  handoff: Handoff | null;
  sessionId?: string;
  /** When the failed turn was a new chat's first. */
  chatToken?: string;
  retryAfterSec?: number;
  leadSaved: boolean;
};
type ChatResponse = ChatOk | ChatErr;

type Msg = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  handoff?: Handoff | null;
  /** Network failure / unreadable reply (styled as an error). */
  error?: boolean;
  /** Shows the "Your details were sent to our team." chip. */
  leadSaved?: boolean;
  /** session_cap reply: shows a "New chat" button in the bubble. */
  newChat?: boolean;
  /** A muted line from the widget itself (e.g. "New chat started"). */
  note?: boolean;
};
type Stored = { sessionId?: string; chatToken?: string; messages: Msg[]; updatedAt: number };

export interface ChatPanelProps {
  open: boolean;
  greeting: string;
  /** Dev-only canned replies (?kkChatMock); always false in production. */
  mock: boolean;
  /** Bumped when the customer opens the panel - focuses the input. */
  focusTick: number;
  onClose: (returnFocus: boolean) => void;
}

const CHAT_URL = '/admin-api/public/chat';
const STORE_KEY = 'kk_chat_v1';
const MAX_KEEP = 50;
const IDLE_MS = 12 * 60 * 60 * 1000;
const MAX_CHARS = 1000;
const COUNTER_FROM = 800;
const TIMEOUT_MS = 65_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const TRACK_RE = /^[a-z0-9]{8,40}$/i;
const QUICK_CHIPS = ['Find a product', 'Track my order', 'Bulk / B2B quote'];
const NET_ERROR = "Couldn't reach the assistant. Please check your connection and try again.";
const NEW_CHAT_NOTE = "New chat started - the assistant can't see the messages above.";
const NEW_CHAT_NOTE_HI = 'नई चैट शुरू हुई - असिस्टेंट ऊपर के संदेश नहीं देख सकता।';
/** The team's WhatsApp number - the only wa.me link that is ever clickable. */
const TEAM_WA_PATH = '/919890352455';
const SITE_HOSTS = new Set(['kitchenarykart.com', 'www.kitchenarykart.com']);
/** Courier tracking pages (track_order's tracking_url, admin/lib/shipping-providers.ts). */
const TRACKING_HOSTS = new Set(['www.delhivery.com', 'delhivery.com', 'shiprocket.co', 'www.shiprocket.co']);
const URL_SPLIT = /(https?:\/\/[^\s<>()"'।॥]+)/g;
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

const newMsgId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function cleanHandoff(h: unknown): Handoff | null {
  if (!h || typeof h !== 'object') return null;
  const o = h as Record<string, unknown>;
  const { whatsappUrl, phoneDisplay, telUrl, hours } = o;
  // Pinned to the team's own number: a handoff can never point anywhere else.
  if (typeof whatsappUrl !== 'string' || !/^https:\/\/wa\.me\/919890352455(\?|$)/.test(whatsappUrl)) return null;
  if (telUrl !== 'tel:+919890352455') return null;
  if (typeof phoneDisplay !== 'string' || typeof hours !== 'string') return null;
  return { whatsappUrl, telUrl, phoneDisplay: phoneDisplay.slice(0, 40), hours: hours.slice(0, 80) };
}

function cleanMsg(m: unknown): Msg | null {
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  if ((o.role !== 'user' && o.role !== 'bot') || typeof o.text !== 'string' || !o.text) return null;
  return {
    id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : newMsgId(),
    role: o.role,
    text: o.text.slice(0, 4000),
    handoff: o.role === 'bot' ? cleanHandoff(o.handoff) : null,
    error: o.error === true || undefined,
    leadSaved: o.leadSaved === true || undefined,
    newChat: o.newChat === true || undefined,
    note: (o.role === 'bot' && o.note === true) || undefined,
  };
}

function emptyChat(): Stored {
  return { messages: [], updatedAt: Date.now() };
}

function loadStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyChat();
    const s = JSON.parse(raw) as { sessionId?: unknown; chatToken?: unknown; messages?: unknown; updatedAt?: unknown } | null;
    if (!s || typeof s !== 'object' || typeof s.updatedAt !== 'number' || Date.now() - s.updatedAt > IDLE_MS) {
      window.localStorage.removeItem(STORE_KEY);
      return emptyChat();
    }
    const messages = Array.isArray(s.messages)
      ? s.messages.map(cleanMsg).filter((m): m is Msg => m !== null).slice(-MAX_KEEP)
      : [];
    const sessionId = typeof s.sessionId === 'string' && UUID_RE.test(s.sessionId) ? s.sessionId : undefined;
    const chatToken = sessionId && typeof s.chatToken === 'string' && TOKEN_RE.test(s.chatToken) ? s.chatToken : undefined;
    return { sessionId, chatToken, messages, updatedAt: s.updatedAt };
  } catch {
    return emptyChat();
  }
}

function saveStored(c: Stored): void {
  try {
    if (!c.sessionId && c.messages.length === 0) {
      window.localStorage.removeItem(STORE_KEY);
      return;
    }
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ sessionId: c.sessionId, chatToken: c.chatToken, messages: c.messages.slice(-MAX_KEEP), updatedAt: c.updatedAt }),
    );
  } catch {
    /* storage full / blocked - the chat still works for this page view */
  }
}

/** Accept only the documented shape; anything else counts as "couldn't reach". */
function parseResponse(d: unknown): ChatResponse | null {
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  if (typeof o.reply !== 'string' || !o.reply.trim()) return null;
  const reply = o.reply.slice(0, 4000);
  const handoff = cleanHandoff(o.handoff);
  const sessionId = typeof o.sessionId === 'string' && UUID_RE.test(o.sessionId) ? o.sessionId : undefined;
  if (o.ok === true) {
    if (!sessionId) return null;
    const rem = typeof o.remaining === 'number' && Number.isFinite(o.remaining) ? Math.max(0, Math.floor(o.remaining)) : 99;
    return {
      ok: true,
      sessionId,
      chatToken: typeof o.chatToken === 'string' && TOKEN_RE.test(o.chatToken) ? o.chatToken : undefined,
      newSession: o.newSession === true,
      reply,
      handoff,
      leadSaved: o.leadSaved === true,
      remaining: rem,
    };
  }
  return {
    ok: false,
    code: (typeof o.code === 'string' ? o.code : 'error') as ErrorCode,
    reply,
    handoff,
    sessionId,
    chatToken: typeof o.chatToken === 'string' && TOKEN_RE.test(o.chatToken) ? o.chatToken : undefined,
    retryAfterSec: typeof o.retryAfterSec === 'number' ? o.retryAfterSec : undefined,
    leadSaved: o.leadSaved === true,
  };
}

/**
 * Plain text → React nodes. `**x**` loses its stars; an https URL becomes a
 * link only for kitchenarykart.com / www.kitchenarykart.com, the team's own
 * WhatsApp number (wa.me/919890352455) and the couriers' tracking pages.
 * Every other URL (http:, javascript:, other hosts, any other wa.me number,
 * user:pass@ tricks) stays text.
 */
function renderText(text: string, onSiteLink: (e: ReactMouseEvent<HTMLAnchorElement>, path: string) => void): ReactNode[] {
  const parts = text.replace(/\*\*/g, '').split(URL_SPLIT);
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) out.push(part);
      return;
    }
    const m = /^(.*?)([.,;:!?)।॥]*)$/.exec(part);
    const raw = m ? m[1] : part;
    const trail = m ? m[2] : '';
    let url: URL | null = null;
    try {
      url = new URL(raw);
    } catch {
      url = null;
    }
    const host = url?.hostname ?? '';
    const allowedHost =
      SITE_HOSTS.has(host) || TRACKING_HOSTS.has(host) || (host === 'wa.me' && url?.pathname === TEAM_WA_PATH);
    const safe = url && url.protocol === 'https:' && !url.username && !url.password && allowedHost;
    if (!url || !safe) {
      out.push(part);
      return;
    }
    if (!SITE_HOSTS.has(host)) {
      out.push(
        <a key={i} href={url.href} target="_blank" rel="noopener noreferrer" className="text-brand underline break-all">
          {raw}
        </a>,
      );
    } else {
      const path = url.pathname + url.search;
      out.push(
        <a key={i} href={path} onClick={(e) => onSiteLink(e, path)} className="text-brand underline break-all">
          {raw}
        </a>,
      );
    }
    if (trail) out.push(trail);
  });
  return out;
}

export function ChatPanel({ open, greeting, mock, focusTick, onClose }: ChatPanelProps) {
  const router = useRouter();
  const [chat, setChat] = useState<Stored>(loadStored);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const chatRef = useRef(chat);
  chatRef.current = chat;
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  /** Bumped by "New chat" so a reply still in flight is dropped. */
  const epochRef = useRef(0);
  const firstSave = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Persist every real change (not the initial load - that would extend the
  // 12 h idle window just by opening the panel).
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    saveStored(chat);
  }, [chat]);

  // Focus the input when the customer opens the panel - only with a mouse /
  // trackpad: on a phone it would raise the keyboard over the greeting and
  // the quick chips the moment the panel opens.
  useEffect(() => {
    if (!open || focusTick <= 0) return;
    let fine = false;
    try {
      fine = window.matchMedia('(pointer: fine)').matches;
    } catch {
      fine = false;
    }
    if (fine) inputRef.current?.focus();
  }, [open, focusTick]);

  // Newest message in view.
  useEffect(() => {
    if (!open) return;
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, chat.messages.length, sending]);

  // Phones: the panel covers most of the screen, so stop the page behind it
  // from scrolling (same pattern as DrawerMount / AuthModal).
  useEffect(() => {
    if (!open) return;
    let mobile = false;
    try {
      mobile = window.matchMedia('(max-width: 767px)').matches;
    } catch {
      mobile = false;
    }
    if (!mobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Textarea grows from 1 to 4 rows, then scrolls.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || !open) return;
    el.style.height = 'auto';
    const cs = window.getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    const borders = px(cs.borderTopWidth) + px(cs.borderBottomWidth);
    const lineH = px(cs.lineHeight) || 20;
    const max = lineH * 4 + px(cs.paddingTop) + px(cs.paddingBottom) + borders;
    const want = el.scrollHeight + borders;
    el.style.height = `${Math.min(want, max)}px`;
    el.style.overflowY = want > max ? 'auto' : 'hidden';
  }, [input, open]);

  /** Append a bot bubble. A `note` (e.g. "New chat started") goes just before
   *  the customer's latest message - the first one the new chat saw. A new
   *  chat token replaces the old one; an error reply keeps its chat's token. */
  const appendBot = useCallback((m: Omit<Msg, 'id' | 'role'>, sessionId?: string, chatToken?: string, note?: string) => {
    setChat((c) => {
      const changedChat = !!sessionId && sessionId !== c.sessionId;
      const messages = [...c.messages];
      if (note) {
        let at = messages.length;
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            at = i;
            break;
          }
        }
        messages.splice(at, 0, { id: newMsgId(), role: 'bot', text: note, note: true });
      }
      messages.push({ id: newMsgId(), role: 'bot', ...m });
      return {
        sessionId: sessionId ?? c.sessionId,
        chatToken: chatToken ?? (changedChat ? undefined : c.chatToken),
        messages: messages.slice(-MAX_KEEP),
        updatedAt: Date.now(),
      };
    });
  }, []);

  // Header "New chat": the first tap asks, the second (within 3 s) starts over.
  const [confirmNew, setConfirmNew] = useState(false);
  useEffect(() => {
    if (!confirmNew) return;
    const t = setTimeout(() => setConfirmNew(false), 3000);
    return () => clearTimeout(t);
  }, [confirmNew]);

  const newChat = useCallback(() => {
    setConfirmNew(false);
    epochRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setSending(false);
    setRemaining(null);
    setChat(emptyChat());
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
    try {
      if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
    } catch {
      /* ignore */
    }
  }, []);

  const send = useCallback(
    async (raw: string, fromInput: boolean) => {
      const message = raw.trim().slice(0, MAX_CHARS);
      if (!message || sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);
      if (fromInput) setInput('');
      const epoch = epochRef.current;
      const sessionId = chatRef.current.sessionId;
      const chatToken = chatRef.current.chatToken;
      setChat((c) => ({
        ...c,
        messages: [...c.messages, { id: newMsgId(), role: 'user' as const, text: message }].slice(-MAX_KEEP),
        updatedAt: Date.now(),
      }));

      let data: unknown = null;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        if (process.env.NODE_ENV !== 'production' && mock) {
          // Dev-only canned replies (?kkChatMock). Never calls the admin API.
          // Type "#cap", "#lead", "#left", "#one", "#new" or "#err" to see those states.
          await new Promise((r) => setTimeout(r, 600));
          const sid =
            sessionId ??
            (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : '00000000-0000-4000-8000-000000000000');
          const handoff: Handoff = {
            whatsappUrl: `https://wa.me/919890352455?text=${encodeURIComponent('Hi, I was chatting with the Kitchenary Kart website assistant. (mock)')}`,
            phoneDisplay: '+91 98903 52455',
            telUrl: 'tel:+919890352455',
            hours: 'Mon–Sat, 10 am–7 pm IST',
          };
          const sent = chatRef.current.messages.filter((m) => m.role === 'user').length;
          const mockToken = 'mockmockmockmockmockmockmockmockmockmockmoc';
          if (/#err/i.test(message)) {
            data = null;
          } else if (/#cap/i.test(message)) {
            data = {
              ok: false,
              code: 'session_cap',
              sessionId: sid,
              handoff,
              reply: 'This chat has reached its message limit. Tap "New chat" to start again, or WhatsApp us on +91 98903 52455.',
            };
          } else {
            const restart = /#new/i.test(message);
            data = {
              ok: true,
              sessionId: restart ? '00000000-0000-4000-8000-00000000000e' : sid,
              ...(!sessionId || restart ? { chatToken: mockToken } : {}),
              newSession: !sessionId || restart,
              leadSaved: /#lead/i.test(message),
              remaining: /#one/i.test(message) ? 1 : /#left/i.test(message) ? 3 : Math.max(0, 30 - sent),
              handoff,
              reply:
                `(mock) You said: "${message}"\n\n` +
                '**Sample product link:** https://kitchenarykart.com/products.\n' +
                'Tracking: https://www.delhivery.com/track/package/123।\n' +
                'Not links (plain text): https://evil.com/x, http://kitchenarykart.com/shop, https://wa.me/911234567890, javascript:alert(1)',
            };
          }
        } else {
          const tsid = currentSessionId();
          const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId && UUID_RE.test(sessionId) ? sessionId : undefined,
              chatToken: sessionId && chatToken && TOKEN_RE.test(chatToken) ? chatToken : undefined,
              message,
              page: window.location.pathname.slice(0, 300),
              trackingSessionId: tsid && TRACK_RE.test(tsid) ? tsid : undefined,
            }),
            credentials: 'omit',
            cache: 'no-store',
            signal: ctrl.signal,
          });
          // The server answers JSON for every status (errors included).
          try {
            data = await res.json();
          } catch {
            data = null;
          }
        }
      } catch {
        data = null;
      } finally {
        clearTimeout(timer);
        if (abortRef.current === ctrl) abortRef.current = null;
      }

      // "New chat" was pressed while this was in flight: drop the answer.
      if (epoch !== epochRef.current) return;
      sendingRef.current = false;
      setSending(false);

      const r = parseResponse(data);
      if (!r) {
        appendBot({ text: NET_ERROR, error: true });
        return;
      }
      // The server quietly started a new chat (the old one was closed, idle,
      // or from an older assistant version): say so, because the assistant no
      // longer sees the messages above.
      const restarted = !!sessionId && r.sessionId !== undefined && r.sessionId !== sessionId;
      const note = restarted ? (/[ऀ-ॿ]/.test(message) ? NEW_CHAT_NOTE_HI : NEW_CHAT_NOTE) : undefined;
      if (r.ok) {
        appendBot({ text: r.reply, handoff: r.handoff, leadSaved: r.leadSaved || undefined }, r.sessionId, r.chatToken, note);
        setRemaining(r.remaining);
      } else {
        const capped = r.code === 'session_cap';
        appendBot(
          { text: r.reply, handoff: r.handoff, newChat: capped || undefined, leadSaved: r.leadSaved || undefined },
          r.sessionId,
          r.chatToken,
          note,
        );
        if (capped) setRemaining(0);
      }
    },
    [mock, appendBot],
  );

  const onSiteLink = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>, path: string) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      router.push(path);
      if (window.innerWidth < 768) onClose(false);
    },
    [router, onClose],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input, true);
  };

  const onInputKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input, true);
    }
  };

  const onPanelKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose(true);
    }
  };

  const showRemaining = remaining !== null && remaining <= 5;
  const showCounter = input.length > COUNTER_FROM;

  return (
    <div
      id="kk-chat-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="kk-chat-title"
      onKeyDown={onPanelKey}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className={`${open ? 'flex' : 'hidden'} kk-chat-panel fixed z-[170] inset-x-0 bottom-0 h-[85dvh] rounded-t-2xl md:inset-x-auto md:right-6 md:bottom-[calc(1.5rem+54px+0.75rem)] md:w-[380px] md:h-[min(600px,calc(100vh-140px))] md:rounded-xl bg-white shadow-lg border border-line flex-col overflow-hidden font-body`}
    >
      {/* Header */}
      <div className="bg-brand text-white px-4 py-3 flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <h2 id="kk-chat-title" className="font-head font-bold text-sm">
            Kitchenary Kart Assistant
          </h2>
          <p className="text-[11px] text-white/80">AI assistant · replies in seconds</p>
        </div>
        {/* Next to the X, so one mis-tap must not wipe the chat: the first tap
            asks, a second tap within 3 seconds starts over. */}
        <button
          type="button"
          onClick={() => (confirmNew ? newChat() : setConfirmNew(true))}
          aria-live="polite"
          className={`h-10 px-3 rounded-full text-[12px] font-semibold transition ${FOCUS_RING} focus-visible:outline-white ${
            confirmNew ? 'bg-white text-brand' : 'hover:bg-white/15'
          }`}
        >
          {confirmNew ? 'Start over?' : 'New chat'}
        </button>
        <button
          type="button"
          onClick={() => onClose(true)}
          aria-label="Close chat"
          className={`w-10 h-10 grid place-items-center rounded-full hover:bg-white/15 transition ${FOCUS_RING} focus-visible:outline-white`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      {/* AI notice - always shown, whatever the admin greeting says. */}
      <p className="text-[11px] text-muted bg-bg-soft px-4 py-1.5 border-b border-line">
        AI assistant - replies may be imperfect; chats are saved to help our team.{' '}
        <Link href="/policy/privacy-policy" className="underline hover:text-brand">
          Privacy
        </Link>
      </p>

      {/* Messages */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
      >
        <div className="mr-auto w-fit max-w-[90%] bg-bg-soft text-ink border border-line rounded-2xl rounded-bl-sm px-3 py-2 text-[13.5px] whitespace-pre-wrap break-words">
          {greeting}
        </div>
        {chat.messages.length === 0 && !sending && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_CHIPS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q, false)}
                className={`min-h-[40px] px-3 rounded-full border border-brand/40 bg-white text-brand text-[12.5px] font-medium hover:bg-brand hover:text-white transition ${FOCUS_RING} focus-visible:outline-brand`}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {chat.messages.map((m) =>
          m.role === 'user' ? (
            <div
              key={m.id}
              className="ml-auto w-fit max-w-[85%] bg-brand text-white rounded-2xl rounded-br-sm px-3 py-2 text-[13.5px] whitespace-pre-wrap break-words"
            >
              {m.text}
            </div>
          ) : m.note ? (
            <p key={m.id} className="text-center text-[11.5px] text-muted px-2 py-1">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className="mr-auto max-w-[90%]">
              <div
                className={`w-fit max-w-full rounded-2xl rounded-bl-sm px-3 py-2 text-[13.5px] whitespace-pre-wrap break-words border ${
                  m.error ? 'bg-white text-brand-dark border-brand/40' : 'bg-bg-soft text-ink border-line'
                }`}
              >
                {renderText(m.text, onSiteLink)}
              </div>
              {m.leadSaved && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11.5px] font-medium text-success">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Your details were sent to our team.
                </p>
              )}
              {m.newChat && (
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={newChat}
                    className={`min-h-[40px] px-4 rounded-full border-2 border-brand text-brand text-[12.5px] font-semibold hover:bg-brand hover:text-white transition ${FOCUS_RING} focus-visible:outline-brand`}
                  >
                    New chat
                  </button>
                </div>
              )}
              {m.handoff && (
                <div className="mt-1.5">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={m.handoff.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-track="chatbot_whatsapp"
                      className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full bg-[#25D366] text-white text-[12.5px] font-semibold hover:brightness-95 transition ${FOCUS_RING} focus-visible:outline-[#25D366]`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Chat on WhatsApp
                    </a>
                    <a
                      href={m.handoff.telUrl}
                      data-track="chatbot_call"
                      className="btn btn-outline min-h-[40px] px-3 py-0 rounded-full text-[12.5px] normal-case tracking-normal"
                    >
                      Call {m.handoff.phoneDisplay}
                    </a>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">Team hours: {m.handoff.hours}</p>
                </div>
              )}
            </div>
          ),
        )}

        {sending && (
          <div className="mr-auto w-fit bg-bg-soft border border-line rounded-2xl rounded-bl-sm px-3 py-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce motion-reduce:animate-none" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce motion-reduce:animate-none [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce motion-reduce:animate-none [animation-delay:300ms]" />
            <span className="sr-only">Assistant is typing</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t border-line p-2 flex items-end gap-2">
        <label htmlFor="kk-chat-input" className="sr-only">
          Your message
        </label>
        <textarea
          id="kk-chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onInputKey}
          rows={1}
          maxLength={MAX_CHARS}
          placeholder="Type your question… (Hindi / English)"
          enterKeyHint="send"
          className="form-input resize-none text-base md:text-sm"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || !input.trim()}
          className={`shrink-0 bg-brand text-white rounded-full w-10 h-10 grid place-items-center hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition ${FOCUS_RING} focus-visible:outline-brand`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </form>
      {(showRemaining || showCounter) && (
        <div className="px-3 pb-2 -mt-1 flex items-center justify-between gap-2 text-[11px] text-muted">
          <span>{showRemaining ? `${remaining} ${remaining === 1 ? 'message' : 'messages'} left in this chat` : ''}</span>
          {showCounter && (
            <span aria-live="polite">
              {input.length}/{MAX_CHARS}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
