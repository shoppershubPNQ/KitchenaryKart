'use client';

/**
 * Microphone button for the search bar — voice search in Hindi or English.
 *
 * Uses the browser's own speech recogniser (Web Speech API: Chrome, Edge,
 * Android, Safari 14.5+). Nothing is recorded or sent to our servers; the
 * browser turns speech into text and we search with that text like a typed
 * query. Hindi speech comes back in Devanagari ("वफ़ल मेकर") and lib/search
 * turns it into the catalogue's English words, so both languages find the
 * same products.
 *
 * Two listening modes because a recogniser takes one language at a time:
 *   "हिंदी + English" (hi-IN, default) — Hindi and mixed Hinglish speech;
 *     English product names said in it still match.
 *   "English" (en-IN) — sharpest for all-English speech.
 * The choice is remembered on this device. Browsers without speech
 * recognition (e.g. Firefox) simply don't show the button.
 *
 * Also used by the chat panel (components/ChatPanel) to speak a message into
 * the chat box: it passes its own wording (`texts`), a `cancelSignal`, its own
 * remembered language (`langKey`, `defaultLang` - a chat must not inherit the
 * search's Hindi mode, which writes English speech in Devanagari) and a "Type
 * instead" way out of an error (`onTypeInstead`). Without those props the
 * button behaves and reads exactly as the search mic.
 *
 * A blocked microphone (the browser's site permission, or a 'not-allowed' /
 * 'service-not-allowed' error earlier on this page) is remembered: opening
 * the sheet again shows the error straight away instead of failing again;
 * the big mic still retries on purpose.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackdropClose, useModal } from './useModal';

export type VoiceLang = 'hi-IN' | 'en-IN';
type Lang = VoiceLang;
const LANG_KEY = 'kk:voice-lang';

/* Minimal typing for the (still vendor-prefixed) Web Speech API. */
interface RecResult { isFinal: boolean; 0: { transcript: string } }
interface RecEvent { resultIndex: number; results: ArrayLike<RecResult> }
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.',
  'service-not-allowed': 'Voice search is turned off in this browser. Allow speech recognition / the microphone, then try again.',
  'no-speech': 'We didn\'t hear anything. Tap the mic and say a product name.',
  'audio-capture': 'No microphone found on this device.',
  network: 'Voice search couldn\'t connect. Please check your internet connection and try again, or type your search.',
  // Browsers that expose the API without Google's recogniser behind it (e.g.
  // Brave) fail every time with 'network' — only those are told to switch.
  'no-service': 'Voice search isn\'t working in this browser. Please try Google Chrome, or type your search.',
  'language-not-supported': 'Hindi voice search isn\'t available in this browser. Tap "English", or try Google Chrome.',
};

/** Google Chrome itself (whose speech service a 'network' error just means unreachable), not a Chromium cousin. */
function isGoogleChrome(): boolean {
  const ua = navigator.userAgent;
  return /Chrome\/|CriOS\//.test(ua) && !/Edg\/|OPR\/|SamsungBrowser|YaBrowser|Vivaldi/.test(ua) && !('brave' in navigator);
}

const LISTEN_TEXT: Record<Lang, { title: string; hint: string }> = {
  'hi-IN': { title: 'बोलिए…', hint: 'जैसे "वफ़ल मेकर" या "स्टील की कड़ाही"' },
  'en-IN': { title: 'Listening…', hint: 'Say a product, e.g. "pizza oven"' },
};

/** Every word the button and its sheet show. */
export type VoiceTexts = {
  /** Mic button: aria-label and tooltip. */
  button: string;
  buttonTitle: string;
  /** The sheet's dialog label and its close button. */
  sheet: string;
  close: string;
  /** Line under the big mic. */
  listening: string;
  idle: string;
  delivering: string;
  errorTitle: string;
  /** Smaller line: example, or the words heard, or the error. */
  hint: string;
  /** Big mic aria-label: words heard / listening / stopped. */
  finishAria: string;
  stopAria: string;
  startAria: string;
  langGroup: string;
  /** By Web Speech error code (plus 'no-service'). */
  errors: Record<string, string>;
  fallbackError: string;
  startError: string;
  /** The error state's way back to typing (shown only with onTypeInstead). */
  typeInstead: string;
};
/** Other wording per listening language; unset fields keep the search wording. */
export type VoiceTextsByLang = Partial<Record<Lang, Partial<VoiceTexts>>>;

/** The search mic's own wording (the default). */
function searchTexts(lang: Lang): VoiceTexts {
  return {
    button: 'Search by voice',
    buttonTitle: 'Search by voice (Hindi or English)',
    sheet: 'Voice search',
    close: 'Close voice search',
    listening: LISTEN_TEXT[lang].title,
    idle: 'Tap the mic to speak',
    delivering: 'Searching…',
    errorTitle: 'Voice search',
    hint: LISTEN_TEXT[lang].hint,
    finishAria: 'Search now',
    stopAria: 'Stop listening',
    startAria: 'Start listening',
    langGroup: 'Voice search language',
    errors: ERRORS,
    fallbackError: 'Voice search stopped. Please try again.',
    startError: 'Could not start the microphone. Please try again.',
    typeInstead: 'Type instead',
  };
}

/** Error "code" for a recogniser that would not start. */
const START_FAILED = '__start';
/** Errors that repeat until the customer changes a browser / phone setting. */
const BLOCKED_ERRORS = new Set(['not-allowed', 'service-not-allowed']);

export function VoiceSearchButton({
  onResult,
  className = '',
  iconSize = 20,
  texts,
  cancelSignal,
  defaultLang,
  langKey,
  onTypeInstead,
}: {
  /** Called with the final words heard. */
  onResult: (text: string) => void;
  className?: string;
  iconSize?: number;
  /** Optional other wording (the chat's "Speak your message"); defaults to the search wording. */
  texts?: VoiceTextsByLang;
  /** Changing this number closes the sheet and stops listening (e.g. the chat sent its message). */
  cancelSignal?: number;
  /** Listening language until the customer picks one (default hi-IN). */
  defaultLang?: VoiceLang;
  /** localStorage key that remembers the customer's pick (default: the search mic's). */
  langKey?: string;
  /** Shows a "Type instead" button in the error state; called after the sheet closes. */
  onTypeInstead?: () => void;
}) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  /** The error's code (shown in the wording of the current language). */
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(defaultLang ?? 'hi-IN');
  const recRef = useRef<Recognition | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const deliveredRef = useRef(false);
  const heardRef = useRef('');
  /** The language the customer picked in this sheet (when storage is blocked). */
  const pickedRef = useRef<Lang | null>(null);
  /** A blocked-microphone error code, remembered for this page. */
  const blockedRef = useRef<string | null>(null);
  const storeKey = langKey ?? LANG_KEY;

  useEffect(() => {
    setSupported(!!getRecognition());
  }, []);

  // The browser's microphone permission, where it can be read without
  // prompting (Chrome, Edge, Safari 16+): 'denied' means the recogniser would
  // fail at once. Followed while the button is on the page, so a customer who
  // allows the mic in settings can try again.
  useEffect(() => {
    if (!getRecognition()) return;
    let status: PermissionStatus | null = null;
    let alive = true;
    const apply = (state: PermissionState) => {
      if (state === 'denied') blockedRef.current = blockedRef.current ?? 'not-allowed';
      else if (blockedRef.current === 'not-allowed') blockedRef.current = null;
    };
    try {
      const q = navigator.permissions?.query({ name: 'microphone' as PermissionName });
      q?.then(
        (p) => {
          if (!alive) return;
          status = p;
          apply(p.state);
          p.onchange = () => apply(p.state);
        },
        () => { /* 'microphone' not queryable in this browser */ },
      );
    } catch { /* no Permissions API */ }
    return () => {
      alive = false;
      if (status) status.onchange = null;
    };
  }, []);

  /** The remembered language — read each time, as the other search box's mic may have changed it. */
  const savedLang = (): Lang => {
    try {
      const saved = window.localStorage.getItem(storeKey);
      if (saved === 'hi-IN' || saved === 'en-IN') return saved;
    } catch { /* storage blocked — keep the default */ }
    return pickedRef.current ?? defaultLang ?? lang;
  };

  const stopRec = useCallback(() => {
    const r = recRef.current;
    recRef.current = null;
    if (r) { r.onresult = null; r.onerror = null; r.onend = null; try { r.abort(); } catch { /* already stopped */ } }
    setListening(false);
  }, []);

  const close = useCallback(() => { stopRec(); setOpen(false); }, [stopRec]);

  const deliver = useCallback((text: string) => {
    const t = text.trim();
    if (!t || deliveredRef.current) return;
    deliveredRef.current = true;
    stopRec();
    setOpen(false);
    onResult(t);
  }, [onResult, stopRec]);

  const start = useCallback((useLang: Lang) => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    stopRec();
    deliveredRef.current = false;
    heardRef.current = '';
    setHeard(''); setError(null);
    const rec = new Ctor();
    rec.lang = useLang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let finalText = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      const shown = (finalText || interim).trim();
      if (shown) { heardRef.current = shown; setHeard(shown); blockedRef.current = null; }
      if (finalText.trim()) deliver(finalText);
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      const key = e.error === 'network' && navigator.onLine && !isGoogleChrome() ? 'no-service' : e.error;
      if (BLOCKED_ERRORS.has(key)) blockedRef.current = key;
      setError(typeof key === 'string' && key ? key : 'unknown');
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      // Some browsers (iOS Safari) end without marking a result final — use what was heard.
      if (!deliveredRef.current && heardRef.current) deliver(heardRef.current);
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setError(START_FAILED); }
  }, [deliver, stopRec]);

  const openAndListen = () => {
    const l = savedLang();
    setLang(l);
    setOpen(true);
    // Known to be blocked: say so at once (the big mic still retries).
    if (blockedRef.current) {
      stopRec();
      heardRef.current = '';
      setHeard('');
      setError(blockedRef.current);
      return;
    }
    start(l);
  };

  // Tapping the big mic while listening finishes: search with what was heard so far.
  const toggleListening = () => {
    if (!listening) return start(lang);
    if (heardRef.current) deliver(heardRef.current);
    else stopRec();
  };

  const switchLang = (l: Lang) => {
    setLang(l);
    pickedRef.current = l;
    try { window.localStorage.setItem(storeKey, l); } catch { /* ignore */ }
    start(l);
  };

  /** Error state → back to the owner's text box (the sheet closes first). */
  const typeInstead = () => {
    close();
    onTypeInstead?.();
  };

  // Focus, Escape and Back close; the recogniser is always released when the panel goes away.
  useModal(open, dialogRef, close);
  const backdrop = useBackdropClose(close);
  useEffect(() => () => stopRec(), [stopRec]);

  // The owner (the chat) asked to stop: close the sheet and release the mic.
  const cancelRef = useRef(cancelSignal);
  useEffect(() => {
    if (cancelRef.current === cancelSignal) return;
    cancelRef.current = cancelSignal;
    close();
  }, [cancelSignal, close]);

  if (!supported) return null;

  const own = texts?.[lang];
  const text: VoiceTexts = { ...searchTexts(lang), ...own, errors: { ...ERRORS, ...own?.errors } };
  const errorText =
    error === null
      ? null
      : error === START_FAILED
        ? text.startError
        : Object.prototype.hasOwnProperty.call(text.errors, error)
          ? text.errors[error]
          : text.fallbackError;
  const panel = open ? (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" {...backdrop}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={text.sheet} tabIndex={-1} className="outline-none w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-8 text-center">
        <div className="flex justify-end -mt-2 -mr-2">
          <button type="button" onClick={close} aria-label={text.close} className="w-9 h-9 rounded-full grid place-items-center text-muted hover:bg-bg-soft hover:text-ink">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleListening}
          aria-label={listening ? (heard ? text.finishAria : text.stopAria) : text.startAria}
          className={`relative mx-auto w-20 h-20 rounded-full grid place-items-center text-white transition ${listening ? 'bg-brand' : 'bg-ink-soft hover:bg-brand'}`}
        >
          {listening && <span className="absolute inset-0 rounded-full bg-brand/40 animate-ping" aria-hidden />}
          <MicIcon size={34} />
        </button>

        <p className="mt-4 text-lg font-semibold text-ink" aria-live="polite">
          {errorText ? text.errorTitle : listening ? text.listening : heard ? text.delivering : text.idle}
        </p>
        <p className="mt-1 min-h-[1.5rem] text-base text-ink-soft break-words" aria-live="polite">
          {errorText ? <span className="text-red-600 text-sm whitespace-pre-line">{errorText}</span> : heard ? `“${heard}”` : <span className="text-sm text-muted">{text.hint}</span>}
        </p>

        {errorText && onTypeInstead && (
          <div className="mt-4">
            <button
              type="button"
              onClick={typeInstead}
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full border-2 border-brand text-brand text-sm font-semibold hover:bg-brand hover:text-white transition"
            >
              {text.typeInstead}
            </button>
          </div>
        )}

        <div className="mt-5 inline-flex rounded-full border border-line p-1 text-sm" role="radiogroup" aria-label={text.langGroup}>
          {([['hi-IN', 'हिंदी + English'], ['en-IN', 'English']] as const).map(([l, label]) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={lang === l}
              onClick={() => switchLang(l)}
              className={`px-4 py-1.5 rounded-full transition ${lang === l ? 'bg-brand text-white' : 'text-ink-soft hover:text-brand'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button type="button" onClick={openAndListen} aria-label={text.button} title={text.buttonTitle} className={className}>
        <MicIcon size={iconSize} />
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  );
}

function MicIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </svg>
  );
}
