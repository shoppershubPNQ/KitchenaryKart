/**
 * "Top selling" / "best seller" / "सबसे ज्यादा बिकने वाले" / "new arrivals" name no product: the customer
 * wants the curated Best Seller or New Arrival list. Word search read the owner's spoken "टॉप सेलर प्रोडक्ट"
 * as "top" and showed 140 chafing dishes and lamp warmers with "Top" in the name (2026-10-08).
 *
 * collectionIntent() answers only when the WHOLE query asks for a list. Any other word keeps it a normal
 * search ("roll top chafing dish", "top selling blender", "new model plunger").
 */
export type CollectionIntent = 'bestsellers' | 'new-arrivals';

// Nukta dropped (ज़्यादा = ज्यादा), chandrabindu read as anusvara, punctuation and hyphens to spaces.
const norm = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/़/g, '')
    .replace(/ँ/g, 'ं')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

// "Products / items / list" — the words that make "top" or "new" a request for a list.
const LIST_WORDS = new Set([
  'product', 'products', 'item', 'items', 'list', 'saman', 'samaan', 'maal', 'mal', 'cheez', 'cheezen', 'chize',
  'प्रोडक्ट', 'प्रोडक्ट्स', 'प्रोडक्टस', 'प्रॉडक्ट', 'प्रॉडक्ट्स', 'प्रोडक्स', 'आइटम', 'आइटम्स', 'आयटम', 'सामान',
  'माल', 'लिस्ट', 'चीज', 'चीजें', 'उत्पाद', 'उत्पादने', 'वस्तू',
]);

// Words a customer wraps around the request: "top selling konse hai", "मुझे बेस्ट सेलर दिखाओ".
const FILLER = new Set([
  ...LIST_WORDS,
  'show', 'me', 'all', 'the', 'our', 'your', 'of', 'in', 'on', 'kitchenary', 'kart', 'kitchenarykart', 'store',
  'shop', 'here', 'please', 'pls', 'plz', 'ka', 'ke', 'ki', 'wale', 'wala', 'wali', 'vale', 'vala', 'vali',
  'konse', 'kaunse', 'konsa', 'kaunsa', 'kon', 'kaun', 'se', 'sa', 'si', 'hai', 'hain', 'he', 'kya', 'dikhao',
  'dikhaiye', 'dikhado', 'batao', 'bataiye', 'sabhi', 'saare', 'sare', 'chahiye', 'mujhe', 'aapke', 'apke',
  'aapka', 'apka', 'hone', 'hote',
  'मुझे', 'हमें', 'दिखाओ', 'दिखाइए', 'दिखाइये', 'दिखा', 'बताओ', 'बताइए', 'बताइये', 'कौन', 'कौनसे', 'कौनसा',
  'से', 'सा', 'सी', 'है', 'हैं', 'क्या', 'के', 'की', 'का', 'वाले', 'वाला', 'वाली', 'सभी', 'सारे', 'चाहिए',
  'आपके', 'आपका', 'आपकी', 'हमारे', 'किचनरी', 'कार्ट', 'होने', 'होते', 'जाणारे', 'जाणाऱ्या', 'दाखवा',
]);

const BEST = new Set([
  'top selling', 'top seller', 'top sellers', 'top sell', 'top sale', 'top sales', 'top sold', 'top 10', 'top ten',
  'best seller', 'best sellers', 'bestseller', 'bestsellers', 'best selling', 'best sale', 'best sell',
  'most selling', 'most sold', 'most popular', 'most bought', 'most ordered', 'popular', 'trending',
  'top trending', 'hot selling', 'hot seller', 'fast selling', 'fast moving',
  'sabse jyada bikne', 'sabse zyada bikne', 'sabse jada bikne', 'sabse jyada bikta', 'sabse zyada bikta',
  'sabse jyada bikte', 'sabse jyada bikti', 'jyada bikne', 'zyada bikne', 'sabse adhik bikne',
  'sabse jyada sale', 'sabse zyada sale', 'sabse jyada selling', 'sabse popular', 'sabse famous',
  'sarvat jast vikle', 'jast vikle',
  'टॉप सेलिंग', 'टॉप सेलर', 'टॉप सेलर्स', 'टॉप सेल', 'टॉप सेल्स', 'टॉप सोल्ड', 'टॉप 10', 'टॉप टेन',
  'टाप सेलिंग', 'टाप सेलर', 'टॉप सैलर', 'टॉप सैलिंग', 'टॉप सेलिंग्स',
  'बेस्ट सेलर', 'बेस्ट सेलर्स', 'बेस्टसेलर', 'बेस्टसेलर्स', 'बेस्ट सेलिंग', 'बेस्ट सेल', 'बैस्ट सेलर',
  'बेस्ट सैलर', 'मोस्ट सेलिंग', 'मोस्ट पॉपुलर', 'पॉपुलर', 'पापुलर', 'लोकप्रिय', 'सबसे लोकप्रिय', 'ट्रेंडिंग',
  'हॉट सेलिंग', 'सबसे ज्यादा बिकने', 'सबसे ज्यादा बिकता', 'सबसे ज्यादा बिकती', 'सबसे ज्यादा बिकते',
  'सबसे ज्यादा बिका', 'ज्यादा बिकने', 'सबसे जादा बिकने', 'सबसे अधिक बिकने', 'सबसे ज्यादा सेल',
  'सबसे ज्यादा सेलिंग', 'सबसे पॉपुलर', 'सबसे फेमस', 'सबसे ज्यादा बिकने वाले',
  'सर्वात जास्त विकले', 'जास्त विकले', 'सर्वाधिक विक्री', 'सर्वात जास्त विक्री', 'जास्त विक्री', 'सर्वाधिक विकले',
]);
// With a list word only: "top products", "best items", "टॉप प्रोडक्ट". "top" alone stays a word search.
const BEST_WITH_LIST = new Set(['top', 'best', 'popular', 'टॉप', 'टाप', 'बेस्ट', 'पॉपुलर']);

const NEW = new Set([
  'new arrival', 'new arrivals', 'newly arrived', 'just arrived', 'new launch', 'new launches', 'latest arrival',
  'latest arrivals', 'new collection', 'new stock', 'naye aaye', 'naya aaya', 'naye aaye hue',
  'न्यू अराइवल', 'न्यू अराइवल्स', 'न्यू एराइवल', 'न्यू एराइवल्स', 'न्यू अरायवल', 'नए आए', 'नये आये',
  'नया आया', 'नवीन आलेले', 'नवे आलेले', 'न्यू लॉन्च', 'नई लॉन्च', 'नया स्टॉक', 'न्यू स्टॉक',
]);
// With a list word only: "new products", "naye product", "नए प्रोडक्ट", "latest items".
const NEW_WITH_LIST = new Set([
  'new', 'latest', 'naye', 'naya', 'nayi', 'nai', 'नए', 'नये', 'नया', 'नई', 'नवीन', 'नवे', 'न्यू', 'लेटेस्ट',
]);

export function collectionIntent(raw: string): CollectionIntent | null {
  const words = norm(raw).split(' ').filter(Boolean);
  if (!words.length || words.length > 8) return null;
  const kept = words.filter((w) => !FILLER.has(w));
  if (!kept.length) return null;
  const listWord = words.some((w) => LIST_WORDS.has(w));
  const phrase = kept.join(' ');
  if (BEST.has(phrase) || (listWord && BEST_WITH_LIST.has(phrase))) return 'bestsellers';
  if (NEW.has(phrase) || (listWord && NEW_WITH_LIST.has(phrase))) return 'new-arrivals';
  return null;
}
