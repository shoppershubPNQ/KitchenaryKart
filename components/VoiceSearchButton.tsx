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
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackdropClose, useModal } from './useModal';

type Lang = 'hi-IN' | 'en-IN';
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

export function VoiceSearchButton({
  onResult,
  className = '',
  iconSize = 20,
}: {
  /** Called with the final words heard. */
  onResult: (text: string) => void;
  className?: string;
  iconSize?: number;
}) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('hi-IN');
  const recRef = useRef<Recognition | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const deliveredRef = useRef(false);
  const heardRef = useRef('');

  useEffect(() => {
    setSupported(!!getRecognition());
  }, []);

  /** The remembered language — read each time, as the other search box's mic may have changed it. */
  const savedLang = (): Lang => {
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === 'hi-IN' || saved === 'en-IN') return saved;
    } catch { /* storage blocked — keep the default */ }
    return lang;
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
      if (shown) { heardRef.current = shown; setHeard(shown); }
      if (finalText.trim()) deliver(finalText);
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      const key = e.error === 'network' && navigator.onLine && !isGoogleChrome() ? 'no-service' : e.error;
      setError(ERRORS[key] ?? 'Voice search stopped. Please try again.');
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      // Some browsers (iOS Safari) end without marking a result final — use what was heard.
      if (!deliveredRef.current && heardRef.current) deliver(heardRef.current);
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setError('Could not start the microphone. Please try again.'); }
  }, [deliver, stopRec]);

  const openAndListen = () => {
    const l = savedLang();
    setLang(l);
    setOpen(true);
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
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    start(l);
  };

  // Focus, Escape and Back close; the recogniser is always released when the panel goes away.
  useModal(open, dialogRef, close);
  const backdrop = useBackdropClose(close);
  useEffect(() => () => stopRec(), [stopRec]);

  if (!supported) return null;

  const text = LISTEN_TEXT[lang];
  const panel = open ? (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" {...backdrop}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Voice search" tabIndex={-1} className="outline-none w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-8 text-center">
        <div className="flex justify-end -mt-2 -mr-2">
          <button type="button" onClick={close} aria-label="Close voice search" className="w-9 h-9 rounded-full grid place-items-center text-muted hover:bg-bg-soft hover:text-ink">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleListening}
          aria-label={listening ? (heard ? 'Search now' : 'Stop listening') : 'Start listening'}
          className={`relative mx-auto w-20 h-20 rounded-full grid place-items-center text-white transition ${listening ? 'bg-brand' : 'bg-ink-soft hover:bg-brand'}`}
        >
          {listening && <span className="absolute inset-0 rounded-full bg-brand/40 animate-ping" aria-hidden />}
          <MicIcon size={34} />
        </button>

        <p className="mt-4 text-lg font-semibold text-ink" aria-live="polite">
          {error ? 'Voice search' : listening ? text.title : heard ? 'Searching…' : 'Tap the mic to speak'}
        </p>
        <p className="mt-1 min-h-[1.5rem] text-base text-ink-soft break-words" aria-live="polite">
          {error ? <span className="text-red-600 text-sm">{error}</span> : heard ? `“${heard}”` : <span className="text-sm text-muted">{text.hint}</span>}
        </p>

        <div className="mt-5 inline-flex rounded-full border border-line p-1 text-sm" role="radiogroup" aria-label="Voice search language">
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
      <button type="button" onClick={openAndListen} aria-label="Search by voice" title="Search by voice (Hindi or English)" className={className}>
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
