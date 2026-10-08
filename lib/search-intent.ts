/**
 * "Top selling" / "best seller" / "सबसे ज्यादा बिकने वाले" / "new arrivals" name no product: the customer
 * wants the curated Best Seller or New Arrival list. Word search read the owner's spoken "टॉप सेलर प्रोडक्ट"
 * as "top" and showed 140 chafing dishes and lamp warmers with "Top" in the name (2026-10-08).
 *
 * collectionIntent() answers only when the WHOLE query asks for a list. Any other word keeps it a normal
 * search ("roll top chafing dish", "top selling blender", "new model plunger").
 * Test: cd web && ../admin/node_modules/.bin/tsx C:/kk-ml/hindi-search-tests/intent-test.ts
 */
export type CollectionIntent = 'bestsellers' | 'new-arrivals';

// Nukta dropped (ज़्यादा = ज्यादा), chandrabindu read as anusvara, apostrophes dropped (what's → whats),
// other punctuation and hyphens to spaces.
const norm = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/\u093c/g, '')
    .replace(/\u0901/g, '\u0902')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

// One spelling per word: typos, Devanagari / Gujarati spellings and voice forms → the Latin word the phrase
// lists below use. "टोप सेलिंग", "top seling", "बैस्ट सैलर", "ટોપ સેલિંગ" all become "top selling" / "best seller".
const CANON: Record<string, string> = {};
const canon = (to: string, from: string[]) => { for (const f of from) CANON[f] = to; };
canon('top', ['टॉप', 'टोप', 'टाप', 'ટોપ', 'tops']);
canon('best', ['बेस्ट', 'बैस्ट', 'બેસ્ટ', 'bset', 'besh']);
canon('ten', ['टेन']);
canon('order', ['ऑर्डर', 'आर्डर']);
canon('seller', ['सेलर', 'सैलर', 'સેલર', 'seler', 'sellar', 'saler', 'sallar', 'sellr']);
canon('sellers', ['सेलर्स', 'सैलर्स', 'selers', 'sellars', 'salers', 'sallers']);
canon('selling', ['सेलिंग', 'सैलिंग', 'सेल्लिंग', 'सेलिंग्स', 'સેલિંગ', 'seling', 'saling', 'sellling', 'sellings']);
canon('bestseller', ['बेस्टसेलर', 'bestseler', 'bestsellar']);
canon('bestsellers', ['बेस्टसेलर्स', 'bestselers']);
canon('bestselling', ['बेस्टसेलिंग', 'bestsellings']);
canon('sale', ['सेल']);
canon('sales', ['सेल्स']);
canon('sold', ['सोल्ड']);
canon('most', ['मोस्ट']);
canon('popular', ['पॉपुलर', 'पापुलर', 'लोकप्रिय', 'લોકપ્રિય']);
canon('trending', ['ट्रेंडिंग']);
canon('hot', ['हॉट']);
canon('new', ['न्यू', 'ન્યૂ', 'નવા', 'નવી']);
canon('arrival', ['अराइवल', 'आराइवल', 'अरायवल', 'एराइवल', 'અરાઇવલ', 'arival', 'arraival', 'arrivel']);
canon('arrivals', ['अराइवल्स', 'आराइवल्स', 'अरायवल्स', 'एराइवल्स', 'arivals', 'arraivals', 'arrivels']);
canon('new arrival', ['newarrival']);
canon('new arrivals', ['newarrivals']);
canon('latest', ['लेटेस्ट']);
canon('launch', ['लॉन्च']);
canon('stock', ['स्टॉक']);
canon('sabse', ['सबसे']);
canon('jyada', ['ज्यादा', 'जियादा', 'जादा', 'zyada', 'jada', 'jyda', 'jayada', 'jiyada', 'jyaada', 'zada']);
canon('adhik', ['अधिक']);
canon('bikne', ['बिकने', 'बिकता', 'बिकती', 'बिकते', 'बिका', 'बिकाऊ', 'bikta', 'bikti', 'bikte', 'bika', 'bikau']);
canon('chalne', ['चलने', 'चलता', 'चलते', 'chalta', 'chalte']);
canon('kharidte', ['खरीदते', 'खरीदे', 'kharide']);
canon('log', ['लोग']);
canon('naye', ['नए', 'नये', 'nae', 'nye', 'nai']);
canon('naya', ['नया']);
canon('nayi', ['नई']);
canon('aaye', ['आए', 'आये', 'aye', 'aae']);
canon('aaya', ['आया']);
canon('naveen', ['नवीन', 'नवे']);
canon('aalele', ['आलेले']);
canon('sarvat', ['सर्वात', 'सगळ्यात']);
canon('sarvadhik', ['सर्वाधिक']);
canon('jast', ['जास्त']);
canon('vikle', ['विकले', 'विकली', 'viklya']);
canon('vikri', ['विक्री']);
canon('khapnare', ['खपणारे']);
canon('sauthi', ['સૌથી']);
canon('vadhu', ['વધુ']);
canon('vechati', ['વેચાતી', 'વેચાતા', 'vechata']);

// "Products / items / list" — the words that make "top" or "new" a request for a list.
const LIST_WORDS = new Set([
  'product', 'products', 'prodcut', 'prodcuts', 'prodct', 'produts', 'item', 'items', 'iteam', 'iteams', 'list',
  'saman', 'samaan', 'saaman', 'maal', 'mal', 'cheez', 'cheeze', 'cheezen', 'cheezein', 'chize', 'chije', 'chijen',
  'vastu', 'equipment', 'equipments',
  'प्रोडक्ट', 'प्रोडक्ट्स', 'प्रोडक्टस', 'प्रॉडक्ट', 'प्रॉडक्ट्स', 'प्रोडक्स', 'प्रोडेक्ट', 'आइटम', 'आइटम्स', 'आईटम',
  'आईटम्स', 'आयटम', 'सामान', 'माल', 'लिस्ट', 'चीज', 'चीजें', 'उत्पाद', 'उत्पादने', 'वस्तू', 'इक्विपमेंट',
  'પ્રોડક્ટ', 'પ્રોડક્ટ્સ', 'વસ્તુ', 'વસ્તુઓ', 'ઉત્પાદનો',
]);

// Words a customer wraps around the request: "top selling konse hai", "मुझे बेस्ट सेलर दिखाओ".
const FILLER = new Set([
  ...LIST_WORDS,
  'show', 'me', 'all', 'the', 'our', 'your', 'of', 'in', 'on', 'is', 'what', 'which', 'kitchenary', 'kart',
  'kitchenarykart', 'store', 'shop', 'here', 'please', 'pls', 'plz', 'kitchen', 'commercial', 'ka', 'ke', 'ki',
  'wale', 'wala', 'wali', 'vale', 'vala', 'vali', 'konse', 'kaunse', 'konsa', 'kaunsa', 'kon', 'kaun', 'se', 'sa',
  'si', 'hai', 'hain', 'he', 'kya', 'dikhao', 'dikhaiye', 'dikhaye', 'dikhado', 'batao', 'bataiye', 'sabhi',
  'saare', 'sare', 'chahiye', 'mujhe', 'aapke', 'apke', 'aapka', 'apka', 'hone', 'hote', 'yahan', 'yaha', 'yahaan',
  'hue', 'abhi', 'janare', 'jane', 'india', 'this', 'week', 'month', 'today', 'year',
  'मुझे', 'हमें', 'दिखाओ', 'दिखाइए', 'दिखाइये', 'दिखा', 'बताओ', 'बताइए', 'बताइये', 'कौन', 'कौनसे', 'कौनसा',
  'से', 'सा', 'सी', 'है', 'हैं', 'क्या', 'के', 'की', 'का', 'वाले', 'वाला', 'वाली', 'सभी', 'सारे', 'चाहिए',
  'आपके', 'आपका', 'आपकी', 'हमारे', 'किचनरी', 'कार्ट', 'होने', 'होते', 'यहां', 'स्टोर', 'किचन', 'कमर्शियल',
  'हुए', 'अभी', 'जाने', 'जाणारे', 'जाणारी', 'जाणाऱ्या', 'होणारे', 'दाखवा',
]);

const BEST = new Set([
  'top selling', 'top seller', 'top sellers', 'top sell', 'top sale', 'top sales', 'top sold', 'top 5', 'top 10',
  'top ten', 'top 20', 'top 10 best selling', 'top trending', 'top picks',
  'best seller', 'best sellers', 'bestseller', 'bestsellers', 'bestselling', 'best selling', 'best sale', 'best sell',
  'most selling', 'most sold', 'most popular', 'most bought', 'most ordered', 'most purchased', 'most demanded',
  'most loved', 'highest selling', 'high demand', 'popular', 'popular now', 'trending', 'trending now',
  'hot selling', 'hot seller', 'hot sellers', 'fast selling', 'fast moving', 'customer favourites',
  'customer favorites', 'whats trending', 'whats popular', 'sells most', 'sell most', 'sells the most',
  'sabse jyada bikne', 'jyada bikne', 'sabse adhik bikne', 'sabse jyada sale', 'sabse jyada selling',
  'sabse jyada sell', 'jyada sell', 'sabse popular', 'sabse famous', 'सबसे फेमस', 'sabse hit', 'jyada chalne',
  'sabse jyada chalne', 'log sabse jyada kharidte', 'sabse jyada kharidte', 'sabse jyada order', 'popular picks',
  'sarvat jast vikle', 'jast vikle', 'sarvadhik vikle', 'sarvadhik vikri', 'sarvat jast vikri', 'jast vikri',
  'sarvat jast khapnare', 'sauthi vadhu vechati',
]);
// With a list word only: "top products", "best items", "टॉप प्रोडक्ट". "top" alone stays a word search.
const BEST_WITH_LIST = new Set(['top', 'best', 'popular', 'demand']);

const NEW = new Set([
  'new arrival', 'new arrivals', 'newly arrived', 'just arrived', 'new launch', 'new launches', 'new launched',
  'newly launched', 'just launched', 'latest launch', 'latest launches', 'latest arrival', 'latest arrivals',
  'latest collection', 'new collection', 'new stock', 'newly added', 'recently added', 'fresh arrivals',
  'recent arrivals', 'new additions', 'whats new', 'naye aaye', 'naya aaya', 'new aaye', 'naya kya',
  'हाल ही में aaye', 'naveen aalele', 'nayi launch', 'naya stock', 'naya', 'naye', 'nayi',
]);
// With a list word only: "new products", "naye product", "नए प्रोडक्ट", "latest items", "નવા ઉત્પાદનો".
const NEW_WITH_LIST = new Set(['new', 'latest', 'newest', 'naveen']);
// "this week", "today" ask for a list as product/item do: "new this week", "best sellers this month".
const TIME_WORDS = new Set(['week', 'month', 'today', 'year']);

export function collectionIntent(raw: string): CollectionIntent | null {
  const words = norm(raw)
    .split(' ')
    .flatMap((w) => (CANON[w] ?? w).split(' '))
    .filter(Boolean);
  if (!words.length || words.length > 16) return null;
  const kept = words.filter((w) => !FILLER.has(w));
  if (!kept.length || kept.length > 6) return null;
  const listWord = words.some((w) => LIST_WORDS.has(w) || TIME_WORDS.has(w));
  const phrase = kept.join(' ');
  if (BEST.has(phrase) || (listWord && BEST_WITH_LIST.has(phrase))) return 'bestsellers';
  if (NEW.has(phrase) || (listWord && NEW_WITH_LIST.has(phrase))) return 'new-arrivals';
  return null;
}
