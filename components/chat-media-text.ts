/**
 * Wording for the chat panel's mic and camera (components/ChatPanel). Pure
 * data: part of the panel's own chunk, loaded only when the chat opens.
 */
import type { VoiceTextsByLang } from './VoiceSearchButton';

const VOICE_EN = {
  button: 'Speak your message',
  buttonTitle: 'Speak your message (Hindi or English)',
  sheet: 'Speak your message',
  close: 'Close voice input',
  idle: 'Tap the mic to speak',
  delivering: 'Adding to your message…',
  errorTitle: 'Voice input',
  finishAria: 'Add to my message',
  stopAria: 'Stop listening',
  startAria: 'Start listening',
  langGroup: 'Voice language',
  startError: 'Could not start the microphone. Please try again.',
  typeInstead: 'Type instead',
};

const ERRORS_EN: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.',
  'service-not-allowed':
    'Voice input is turned off in this browser. Allow speech recognition / the microphone, then try again. On iPhone: turn on Siri & Dictation in Settings.',
  'no-speech': "We didn't hear anything. Tap the mic and speak, or type your message.",
  'audio-capture': 'No microphone found on this device.',
  network: "Voice input couldn't connect. Please check your internet connection, or type your message.",
  'no-service': "Voice input isn't working in this browser. Please try Google Chrome, or type your message.",
  'language-not-supported': 'Hindi voice input isn\'t available in this browser. Tap "English", or try Google Chrome.',
};
const FALLBACK_EN = 'Voice input stopped. Please try again, or type your message.';

/** Hindi first, then the English line (the Hindi mode is everyone's default). */
const ERRORS_HI: Record<string, string> = {
  'not-allowed': 'माइक्रोफ़ोन की अनुमति बंद है। ब्राउज़र की सेटिंग में इस साइट के लिए माइक्रोफ़ोन चालू करें, फिर दोबारा कोशिश करें।',
  'service-not-allowed':
    'इस ब्राउज़र में बोलकर लिखना बंद है। माइक्रोफ़ोन की अनुमति दें, फिर दोबारा कोशिश करें। iPhone पर: Settings में Siri & Dictation चालू करें।',
  'no-speech': 'कुछ सुनाई नहीं दिया। माइक दबाकर बोलिए, या संदेश टाइप करें।',
  'audio-capture': 'इस डिवाइस में माइक्रोफ़ोन नहीं मिला।',
  network: 'इंटरनेट से जुड़ नहीं पाया। कृपया इंटरनेट देखें, या संदेश टाइप करें।',
  'no-service': 'इस ब्राउज़र में बोलकर लिखना काम नहीं कर रहा। Google Chrome आज़माएँ, या संदेश टाइप करें।',
  'language-not-supported': 'इस ब्राउज़र में हिंदी में बोलना उपलब्ध नहीं है। "English" दबाएँ, या Google Chrome आज़माएँ।',
};
const FALLBACK_HI = 'बोलना रुक गया। कृपया फिर कोशिश करें, या संदेश टाइप करें।';

const both = (hi: string, en: string) => `${hi}\n${en}`;

export const CHAT_VOICE_TEXTS: VoiceTextsByLang = {
  'hi-IN': {
    ...VOICE_EN,
    hint: 'जैसे "पिज़्ज़ा ओवन की कीमत बताइए"',
    errors: Object.fromEntries(Object.keys(ERRORS_EN).map((k) => [k, both(ERRORS_HI[k] ?? '', ERRORS_EN[k])])),
    fallbackError: both(FALLBACK_HI, FALLBACK_EN),
    startError: both('माइक्रोफ़ोन शुरू नहीं हो पाया। कृपया फिर कोशिश करें।', VOICE_EN.startError),
  },
  'en-IN': {
    ...VOICE_EN,
    hint: 'Say your question, e.g. "Is the pizza oven in stock?"',
    errors: ERRORS_EN,
    fallbackError: FALLBACK_EN,
  },
};

/** `limit`: this chat already sent 2 photos. `limit_server`: the server said photo_limit, which can
 *  also be its per-network or daily photo cap, so the text does not promise that "New chat" helps. */
export type PhotoTextKey = 'not_image' | 'decode' | 'too_big' | 'failed' | 'limit' | 'limit_server';

const PHOTO_EN: Record<PhotoTextKey, string> = {
  not_image: 'Please choose a photo (JPG or PNG).',
  decode: "We couldn't open this photo. Please try another photo (JPG or PNG).",
  too_big: 'This photo is too large. Please try another photo.',
  failed: "Couldn't add the photo. Please check your connection and try again.",
  limit: 'You can send up to 2 photos in one chat. Tap "New chat", or WhatsApp more photos to +91 98903 52455.',
  limit_server: 'No more photos can be sent in this chat right now. Please WhatsApp your photos to +91 98903 52455.',
};
const PHOTO_HI: Record<PhotoTextKey, string> = {
  not_image: 'कृपया एक फ़ोटो चुनें (JPG या PNG)।',
  decode: 'यह फ़ोटो खुल नहीं पाई। कृपया दूसरी फ़ोटो (JPG या PNG) आज़माएँ।',
  too_big: 'यह फ़ोटो बहुत बड़ी है। कृपया दूसरी फ़ोटो आज़माएँ।',
  failed: 'फ़ोटो जोड़ी नहीं जा सकी। कृपया इंटरनेट देखें और फिर कोशिश करें।',
  limit: 'एक चैट में 2 फ़ोटो तक भेज सकते हैं। "New chat" दबाएँ, या ज़्यादा फ़ोटो +91 98903 52455 पर WhatsApp करें।',
  limit_server: 'इस चैट में अभी और फ़ोटो नहीं भेजी जा सकतीं। कृपया अपनी फ़ोटो +91 98903 52455 पर WhatsApp करें।',
};

/** Hindi when the customer writes in Devanagari (as the server's replies do), otherwise English. */
export const photoText = (key: PhotoTextKey, hindi: boolean): string => (hindi ? PHOTO_HI : PHOTO_EN)[key];

/** The other photo wording in the panel, English / Hindi. */
const PHOTO_UI = {
  /** Shown beside a photo waiting to be sent (the photo search's "not uploaded" line does not apply here). */
  privacy: ['Photos go to our AI assistant and are saved with this chat.', 'फ़ोटो हमारे AI असिस्टेंट को जाती है और इस चैट के साथ सेव होती है।'],
  preparing: ['Getting your photo ready…', 'फ़ोटो तैयार हो रही है…'],
  /** Label under a photo sent without words. */
  bubble: ['Photo', 'फ़ोटो'],
  /** The camera button's choices on a phone / tablet. */
  take: ['Take a photo', 'फ़ोटो खींचें'],
  gallery: ['Choose from gallery', 'गैलरी से चुनें'],
  /** Under a photo-limit error: the tappable WhatsApp chip. */
  whatsapp: ['WhatsApp your photo', 'फ़ोटो WhatsApp करें'],
} as const;
export type PhotoUiKey = keyof typeof PHOTO_UI;
export const photoUi = (key: PhotoUiKey, hindi: boolean): string => PHOTO_UI[key][hindi ? 1 : 0];
