'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { currentSessionId } from '@/lib/track';
import { VoiceSearchButton, type VoiceLang } from './VoiceSearchButton';
import { CHAT_VOICE_TEXTS, photoText, photoUi, type PhotoTextKey } from './chat-media-text';
import type { PreparedPhoto } from './chat-photo';

/**
 * Website chatbot panel - loaded by components/ChatWidget.tsx on the first
 * open (its own JS chunk, never on the first page load).
 *
 * Talks ONLY to POST /admin-api/public/chat (the admin app's public chat
 * route; contract in the chatbot spec §4.6). The server always answers with
 * JSON carrying `reply` - success or error - and the panel shows that text.
 *
 * Mic: the site's voice-search button (components/VoiceSearchButton, the
 * browser's own speech recogniser - no audio leaves the browser through us)
 * with chat wording and its own remembered language (kk:chat-voice-lang;
 * until the customer picks one it follows the script they type in); the
 * words land in the text box for the customer to check and send. Hidden
 * where the browser has no speech recognition.
 *
 * Camera: one photo per message, at most 2 per chat (the server decides; the
 * panel only mirrors it). On a phone / tablet the camera button offers "Take
 * a photo" (input with capture="environment") or "Choose from gallery"; a
 * computer opens the file picker. Hidden when the admin's model takes no
 * photos (config `photos`). components/chat-photo is import()ed when a photo
 * is picked and shrinks it (≤1024 px JPEG, <300 KB); only when the photo is
 * SENT does it ask the site's photo search for up to 8 matching SKUs as hints
 * (skipped on Data Saver / slow connections; a short wait, then the photo goes
 * without them). Request fields `image` + `photoMatches` (contract:
 * chatbot-mic-camera-notes.md "Contract").
 *
 * Safety: bubbles are plain text. No dangerouslySetInnerHTML, no markdown
 * parser; only https links to kitchenarykart.com, the team's own WhatsApp
 * number and the couriers' tracking pages become <a>.
 *
 * Stored state: localStorage['kk_chat_v1'] = { sessionId?, chatToken?,
 * messages (last 50), updatedAt }, dropped after 12 h without activity (the
 * server's idle limit). The chat token (issued with a new chat) is what lets
 * this browser - and only this browser - continue the chat. A photo is kept
 * there only as a small thumbnail.
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
  | 'error'
  | 'photo_limit'
  | 'photo_invalid';

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
  /** Customer photo: a small JPEG data URL (the sent photo itself is not kept). */
  photo?: string;
  /** The server answered this photo's message (counts toward the 2 per chat). */
  photoOk?: boolean;
};
type Stored = { sessionId?: string; chatToken?: string; messages: Msg[]; updatedAt: number };

/** The photo in the composer, waiting to be sent. */
type PendingPhoto = { state: 'preparing'; run: number } | { state: 'ready'; run: number; photo: PreparedPhoto };

type PhotoModule = typeof import('./chat-photo');
let photoModule: Promise<PhotoModule> | null = null;
/** components/chat-photo, fetched the first time a photo is picked. */
function loadPhotoModule(): Promise<PhotoModule> {
  if (!photoModule) {
    photoModule = import('./chat-photo').catch((e: unknown) => {
      photoModule = null; // a flaky network may retry
      throw e;
    });
  }
  return photoModule;
}

export interface ChatPanelProps {
  open: boolean;
  greeting: string;
  /** Dev-only canned replies (?kkChatMock); always false in production. */
  mock: boolean;
  /** The chat accepts photos (config `photos`); false hides the camera. */
  photos?: boolean;
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
/** Photos per chat (the server's cap; the panel only mirrors it). */
const MAX_CHAT_PHOTOS = 2;
/** Longest wait at send time for the photo search hints when the model is
 *  already loaded (embed + one request); then the photo goes without them. */
const HINT_WAIT_MS = 6000;
/** ...and when it is not loaded yet: long enough for a browser-cached model to
 *  start, far too short for the first ~25 MB download (that one carries on in
 *  the background for the next photo). */
const HINT_WAIT_COLD_MS = 3000;
/** Server errors after which the photo (and its words) go back into the
 *  composer, so one tap retries: nothing was answered. */
const RETRY_CODES = new Set<ErrorCode>(['busy', 'upstream_busy', 'rate_limited', 'error']);
/** photoLimitSid for a refusal that came before the chat had a session. */
const NO_SESSION = '__new';
/** Under a photo-limit message: the team's WhatsApp (the only number ever linked). */
const PHOTO_WA_URL = `https://wa.me/919890352455?text=${encodeURIComponent(
  "Hi, I was chatting with the Kitchenary Kart website assistant. I'd like to send photos of an item.",
)}`;
/** A stored bubble thumbnail (chat-photo makes them ≤ 40,000 chars). */
const THUMB_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
const THUMB_MAX = 60_000;
const DEVANAGARI = /[ऀ-ॿ]/;
const ICON_BTN = `shrink-0 w-10 h-10 rounded-full grid place-items-center text-muted hover:text-brand hover:bg-bg-soft transition ${FOCUS_RING} focus-visible:outline-brand`;

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
  if ((o.role !== 'user' && o.role !== 'bot') || typeof o.text !== 'string') return null;
  // Only a customer's own photo thumbnail, and only a plain JPEG data URL.
  const photo =
    o.role === 'user' && typeof o.photo === 'string' && o.photo.length <= THUMB_MAX && THUMB_RE.test(o.photo)
      ? o.photo
      : undefined;
  if (!o.text && !photo) return null;
  return {
    id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : newMsgId(),
    role: o.role,
    text: o.text.slice(0, 4000),
    handoff: o.role === 'bot' ? cleanHandoff(o.handoff) : null,
    error: o.error === true || undefined,
    leadSaved: o.leadSaved === true || undefined,
    newChat: o.newChat === true || undefined,
    note: (o.role === 'bot' && o.note === true) || undefined,
    photo,
    photoOk: photo && o.photoOk === true ? true : undefined,
  };
}

/** Customer photos the server accepted in the current chat (after the last "New chat started" note). */
function photosInChat(messages: Msg[]): number {
  let n = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.note) break;
    if (m.role === 'user' && m.photo && m.photoOk) n++;
  }
  return n;
}

/** The script of the customer's latest typed message ('hi' = Devanagari), or
 *  null when they have typed nothing yet (photo-only messages and the quick
 *  chips' fixed English words say nothing about their language). */
function lastUserScript(messages: Msg[]): 'hi' | 'en' | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user' || !m.text || QUICK_CHIPS.includes(m.text)) continue;
    return DEVANAGARI.test(m.text) ? 'hi' : 'en';
  }
  return null;
}

const wait = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      },
    );
  });

function CameraIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7.5 6.5H4.5A2 2 0 0 0 2.5 8.5v10a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2h-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function GalleryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
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

export function ChatPanel({ open, greeting, mock, photos = true, focusTick, onClose }: ChatPanelProps) {
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

  // Camera.
  const [pending, setPending] = useState<PendingPhoto | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  /** Bumped whenever the composer's photo changes, so a slow preparation is dropped. */
  const photoRunRef = useRef(0);
  /** Why a photo could not be added (shown in the customer's script at render time). */
  const [photoErrorKey, setPhotoErrorKey] = useState<PhotoTextKey | null>(null);
  /** The chat the server refused a further photo for (photo_limit; NO_SESSION before a chat exists). */
  const [photoLimitSid, setPhotoLimitSid] = useState<string | null>(null);
  /** Gallery / file picker (no capture). */
  const fileRef = useRef<HTMLInputElement>(null);
  /** The phone's camera (capture="environment"). */
  const captureRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Touch screen: the camera button opens "Take a photo / Choose from gallery". */
  const [touch, setTouch] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  // Mic.
  /** Bumped to close the voice sheet and stop listening (send, new chat, panel closed). */
  const [voiceCancel, setVoiceCancel] = useState(0);
  /** Bumped when spoken words land in the box. */
  const [voiceTick, setVoiceTick] = useState(0);
  /** Bumped by the voice sheet's "Type instead". */
  const [typeTick, setTypeTick] = useState(0);

  useEffect(() => {
    try {
      setTouch(window.matchMedia('(pointer: coarse)').matches);
    } catch {
      setTouch(false);
    }
  }, []);

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

  // The panel was closed: stop listening, close the photo menu.
  useEffect(() => {
    if (open) return;
    setVoiceCancel((n) => n + 1);
    setPhotoMenu(false);
  }, [open]);

  // "Type instead" in the voice sheet: to the text box (it raises the phone's
  // keyboard - that is what the customer asked for). Runs after the sheet's
  // own "focus back to the mic" (same commit, cleanups first).
  useEffect(() => {
    if (typeTick) inputRef.current?.focus();
  }, [typeTick]);

  // Photo menu (touch screens): focus its first choice; a tap outside closes it.
  useEffect(() => {
    if (!photoMenu) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (menuRef.current?.contains(t) || cameraRef.current?.contains(t))) return;
      setPhotoMenu(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [photoMenu]);

  // Spoken words were added: back to the text box so Enter sends - mouse /
  // trackpad only (on a phone it would raise the keyboard). Runs after the
  // voice sheet's own "focus back to the mic" (same commit, cleanups first).
  useEffect(() => {
    if (!voiceTick) return;
    let fine = false;
    try {
      fine = window.matchMedia('(pointer: fine)').matches;
    } catch {
      fine = false;
    }
    const el = inputRef.current;
    if (!fine || !el) return;
    el.focus();
    const end = el.value.length;
    try {
      el.setSelectionRange(end, end);
    } catch {
      /* ignore */
    }
  }, [voiceTick]);

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
    photoRunRef.current += 1;
    setPending(null);
    setPhotoErrorKey(null);
    setPhotoLimitSid(null);
    setPhotoMenu(false);
    setVoiceCancel((n) => n + 1);
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
      // The composer's photo goes with a typed message (not with a quick chip).
      const pend = fromInput ? pendingRef.current : null;
      if (pend?.state === 'preparing') return; // Send stays disabled until it is ready
      const photo = pend?.state === 'ready' ? pend : null;
      if ((!message && !photo) || sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);
      setVoiceCancel((n) => n + 1);
      setPhotoMenu(false);
      setPhotoErrorKey(null);
      if (fromInput) setInput('');
      if (photo) {
        photoRunRef.current += 1;
        setPending(null);
      }
      const epoch = epochRef.current;
      const sessionId = chatRef.current.sessionId;
      const chatToken = chatRef.current.chatToken;
      const userMsgId = newMsgId();
      const userMsg: Msg = { id: userMsgId, role: 'user', text: message, ...(photo ? { photo: photo.photo.thumb } : {}) };
      setChat((c) => ({
        ...c,
        messages: [...c.messages, userMsg].slice(-MAX_KEEP),
        updatedAt: Date.now(),
      }));

      // Photo search hints, started only now that the photo is sent (the
      // customer is no longer typing, so the model's main-thread work does not
      // get in the way): whatever is ready within the wait. Without them the
      // assistant still sees the photo and searches itself.
      let photoMatches: string[] = [];
      if (photo) {
        const stop = new AbortController();
        try {
          const m = await loadPhotoModule();
          const waitMs = m.hintsModelReady() ? HINT_WAIT_MS : HINT_WAIT_COLD_MS;
          photoMatches = (await wait(m.photoHints(photo.photo.jpeg, stop.signal), waitMs, [] as string[])).slice(0, 8);
        } catch {
          photoMatches = [];
        } finally {
          stop.abort(); // a late result is not wanted: no model run on the main thread after this
        }
      }
      if (epoch !== epochRef.current) return;

      /** Nothing was answered: the photo and its words back in the composer, so one tap retries. */
      const putBack = () => {
        if (!photo) return;
        if (!pendingRef.current) {
          photoRunRef.current += 1;
          setPending({ ...photo, run: photoRunRef.current });
        }
        if (fromInput && message && !(inputRef.current?.value ?? '').trim()) setInput(message);
      };

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
          // With a photo: "#plimit" shows the 2-photos-per-chat refusal.
          const photoNote = photo
            ? `(mock) Got your photo: ${photo.photo.width}×${photo.photo.height}, ${Math.round(photo.photo.bytes / 1024)} KB. ` +
              `Photo search hints: ${photoMatches.length ? photoMatches.join(', ') : 'none'}.\n\n`
            : '';
          if (/#err/i.test(message)) {
            data = null;
          } else if (photo && /#plimit/i.test(message)) {
            data = {
              ok: false,
              code: 'photo_limit',
              sessionId: sid,
              handoff,
              reply: 'You can send up to 2 photos in one chat. Please WhatsApp more photos to +91 98903 52455, or tap "New chat".',
            };
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
                photoNote +
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
              // Photo (contract: chatbot-mic-camera-notes.md "Contract"). '' message = photo only.
              ...(photo ? { image: { mediaType: 'image/jpeg', data: photo.photo.data } } : {}),
              ...(photo && photoMatches.length ? { photoMatches } : {}),
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
        // The photo may never have reached us.
        putBack();
        return;
      }
      if (photo && r.ok) {
        setChat((c) => ({ ...c, messages: c.messages.map((m) => (m.id === userMsgId ? { ...m, photoOk: true } : m)) }));
      }
      if (!r.ok && RETRY_CODES.has(r.code)) putBack();
      if (!r.ok && r.code === 'photo_limit') setPhotoLimitSid(r.sessionId ?? sessionId ?? NO_SESSION);
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
    // Keys from the voice sheet (portaled to <body>) still bubble through the
    // React tree: its Escape closes only the sheet, never the chat.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      // The photo menu first: Escape closes only the menu, back on its button.
      if (photoMenu) {
        setPhotoMenu(false);
        cameraRef.current?.focus();
        return;
      }
      onClose(true);
    }
  };

  /** Spoken words join whatever is already typed; the customer checks them, then sends. */
  const onVoice = useCallback((t: string) => {
    setInput((p) => ((p.trim() ? p.trimEnd() + ' ' : '') + t).slice(0, MAX_CHARS));
    setVoiceTick((n) => n + 1);
  }, []);

  /** The voice sheet's "Type instead" (after a microphone error). */
  const onTypeInstead = useCallback(() => setTypeTick((n) => n + 1), []);

  const chatFull = photosInChat(chat.messages) >= MAX_CHAT_PHOTOS;
  // photo_limit can also be the server's per-network / daily photo cap - and
  // can come before the chat has a session.
  const serverRefused = photoLimitSid !== null && photoLimitSid === (chat.sessionId ?? NO_SESSION);
  const photoAllowed = !chatFull && !serverRefused;

  // One language for everything the panel itself says about photos and the
  // mic: Devanagari being typed, else the customer's last typed message.
  const lastScript = lastUserScript(chat.messages);
  const typingHindi = DEVANAGARI.test(input);
  const hindiUi = typingHindi || lastScript === 'hi';
  /** The chat mic's language until the customer picks one: English only once
   *  they have typed English (hi-IN also hears English, written in Devanagari). */
  const voiceDefault: VoiceLang = typingHindi || lastScript !== 'en' ? 'hi-IN' : 'en-IN';

  const onCamera = () => {
    // Not `disabled` while a photo waits (the focused button would drop focus
    // to <body>); a tap simply does nothing then.
    if (pendingRef.current || sendingRef.current) return;
    if (!photoAllowed) {
      setPhotoMenu(false);
      setPhotoErrorKey(chatFull ? 'limit' : 'limit_server');
      return;
    }
    setPhotoErrorKey(null);
    if (touch) {
      setPhotoMenu((v) => !v);
      return;
    }
    fileRef.current?.click();
  };

  /** A choice in the photo menu: focus back on the camera button first (the
   *  menu item is about to unmount), then the system picker. */
  const pickFrom = (source: 'camera' | 'gallery') => {
    cameraRef.current?.focus();
    setPhotoMenu(false);
    (source === 'camera' ? captureRef : fileRef).current?.click();
  };

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (at + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (at - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Tab') setPhotoMenu(false);
    if (next >= 0) {
      e.preventDefault();
      items[next].focus();
    }
  };

  const onPhotoPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the same photo again must fire again
    if (!file) return;
    const run = ++photoRunRef.current;
    setPhotoErrorKey(null);
    setPending({ state: 'preparing', run });
    let key: PhotoTextKey = 'failed';
    try {
      const m = await loadPhotoModule();
      const photo = await m.preparePhoto(file);
      if (run !== photoRunRef.current) return;
      // Only shrunk here; the photo search runs when it is sent.
      setPending({ state: 'ready', run, photo });
      return;
    } catch (err) {
      const code = (err as { code?: unknown } | null)?.code;
      if (code === 'not_image' || code === 'decode' || code === 'too_big') key = code;
    }
    if (run !== photoRunRef.current) return;
    setPending(null);
    setPhotoErrorKey(key);
  };

  const removePhoto = () => {
    photoRunRef.current += 1;
    setPending(null);
    setPhotoErrorKey(null);
    cameraRef.current?.focus();
  };

  const showRemaining = remaining !== null && remaining <= 5;
  const showCounter = input.length > COUNTER_FROM;
  const canSend = !sending && pending?.state !== 'preparing' && (!!input.trim() || pending?.state === 'ready');
  const photoError = photoErrorKey ? photoText(photoErrorKey, hindiUi) : null;
  /** Read out by screen readers (a region that is always on the page). */
  const photoStatus = photoError ?? (pending?.state === 'preparing' ? photoUi('preparing', hindiUi) : '');
  const cameraOn = photos !== false;

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
        {chat.messages.length === 0 && !sending && !pending && (
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
              {m.photo && (
                // A tiny data-URL thumbnail - next/image has nothing to optimise.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.photo}
                  alt={m.text ? 'Your photo' : ''}
                  className={`block max-w-[160px] max-h-[200px] w-auto h-auto rounded-lg bg-white ${m.text ? 'mb-1.5' : 'mb-1'}`}
                />
              )}
              {m.text || (m.photo ? <span className="text-[12px] text-white/90">{photoUi('bubble', hindiUi)}</span> : null)}
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
      <form onSubmit={onSubmit} className="relative border-t border-line p-2">
        {/* Screen readers: photo progress and errors, in a region that is always
            on the page (a live region inserted already filled is often not read). */}
        <p className="sr-only" role="status" aria-live="polite">
          {photoStatus}
        </p>
        {/* The photo waiting to be sent (or why it could not be added). */}
        {(pending || photoError) && (
          <div className="flex items-start gap-3 px-1 pt-1 pb-2">
            {pending && (
              <div className="relative shrink-0">
                {pending.state === 'ready' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pending.photo.thumb}
                    alt="Photo to send"
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-lg border border-line object-cover bg-white"
                  />
                ) : (
                  <span className="w-14 h-14 rounded-lg border border-line bg-bg-soft grid place-items-center" aria-hidden="true">
                    <span className="w-5 h-5 rounded-full border-2 border-line border-t-brand animate-spin motion-reduce:animate-none" />
                  </span>
                )}
                {/* A 40 px tap target around the small dark circle. */}
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="Remove photo"
                  className={`absolute -top-3 -right-3 w-10 h-10 grid place-items-center rounded-full ${FOCUS_RING} focus-visible:outline-brand`}
                >
                  <span className="w-7 h-7 rounded-full bg-ink text-white grid place-items-center shadow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="6" y1="18" x2="18" y2="6" />
                    </svg>
                  </span>
                </button>
              </div>
            )}
            <div className="flex-1 min-w-0 pt-0.5 text-[11.5px] leading-snug text-muted">
              <p>
                {photoError ? (
                  <span className="text-red-600">{photoError}</span>
                ) : pending?.state === 'preparing' ? (
                  photoUi('preparing', hindiUi)
                ) : (
                  photoUi('privacy', hindiUi)
                )}
              </p>
              {(photoErrorKey === 'limit' || photoErrorKey === 'limit_server') && (
                <a
                  href={PHOTO_WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="chatbot_whatsapp"
                  className={`mt-1.5 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full bg-[#25D366] text-white text-[12px] font-semibold hover:brightness-95 transition ${FOCUS_RING} focus-visible:outline-[#25D366]`}
                >
                  {photoUi('whatsapp', hindiUi)}
                </a>
              )}
            </div>
          </div>
        )}
        {/* Phones / tablets: the camera button's two choices, above the composer. */}
        {cameraOn && photoMenu && (
          <div
            ref={menuRef}
            id="kk-chat-photo-menu"
            role="menu"
            aria-label="Add a photo"
            onKeyDown={onMenuKey}
            className="absolute left-2 bottom-full mb-2 z-10 min-w-[210px] rounded-xl border border-line bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => pickFrom('camera')}
              className={`w-full min-h-[44px] px-4 flex items-center gap-3 text-left text-[14px] text-ink hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand`}
            >
              <CameraIcon size={18} />
              {photoUi('take', hindiUi)}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => pickFrom('gallery')}
              className={`w-full min-h-[44px] px-4 flex items-center gap-3 text-left text-[14px] text-ink hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand`}
            >
              <GalleryIcon size={18} />
              {photoUi('gallery', hindiUi)}
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          {cameraOn && (
            // Disabled only while a reply is coming: while a photo waits the
            // button stays focusable (aria-disabled) so focus never drops to <body>.
            <button
              ref={cameraRef}
              type="button"
              onClick={onCamera}
              disabled={sending}
              aria-disabled={pending ? true : undefined}
              aria-haspopup={touch ? 'menu' : undefined}
              aria-expanded={touch ? photoMenu : undefined}
              aria-controls={touch && photoMenu ? 'kk-chat-photo-menu' : undefined}
              aria-label={photoAllowed ? 'Add a photo' : 'Add a photo (limit reached for this chat)'}
              title={touch ? 'Add a photo (camera or gallery)' : 'Add a photo'}
              className={`${ICON_BTN} disabled:opacity-50 disabled:cursor-not-allowed ${
                pending ? 'opacity-50 cursor-not-allowed' : photoAllowed ? '' : 'opacity-50'
              }`}
            >
              <CameraIcon />
            </button>
          )}
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
            // Short, so it fits on one line beside three buttons on a 320 px phone.
            placeholder={pending ? 'Add a message…' : 'Type your question…'}
            enterKeyHint="send"
            className="form-input flex-1 min-w-0 resize-none text-base md:text-sm"
          />
          {/* Hidden where the browser has no speech recognition (e.g. Firefox). */}
          <VoiceSearchButton
            onResult={onVoice}
            texts={CHAT_VOICE_TEXTS}
            cancelSignal={voiceCancel}
            defaultLang={voiceDefault}
            langKey="kk:chat-voice-lang"
            onTypeInstead={onTypeInstead}
            iconSize={18}
            className={ICON_BTN}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            className={`shrink-0 bg-brand text-white rounded-full w-10 h-10 grid place-items-center hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition ${FOCUS_RING} focus-visible:outline-brand`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
        {cameraOn && (
          <>
            {/* Gallery / file picker: phones offer their own chooser, computers a file dialog. */}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" tabIndex={-1} onChange={(e) => void onPhotoPicked(e)} />
            {/* "Take a photo" on a phone: straight to the back camera. */}
            <input
              ref={captureRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              tabIndex={-1}
              onChange={(e) => void onPhotoPicked(e)}
            />
          </>
        )}
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
