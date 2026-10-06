/**
 * Hindi / Hinglish → English search query.
 *
 * The catalogue is written in English, and `normalize()` in lib/search.ts keeps
 * only a–z/0–9, so a Hindi query ("वफ़ल मेकर", "स्टील की कड़ाही") used to match
 * nothing. Voice search makes this common: Chrome's Hindi recogniser writes
 * English product words in Devanagari ("मिक्सर", "फ्रायर", "चाफिंग डिश").
 *
 * Each query word is turned into an English catalogue word by, in order:
 *   1. dropping filler ("मुझे … चाहिए", "dikhao", "कीमत", "कब", Marathi "पाहिजे");
 *   2. Hindi number words + units → "8l" / "500ml" / "2000w" style tokens the
 *      catalogue uses, and counts the way listings write them ("दो बर्नर" → "2 burner");
 *   3. a dictionary of genuinely Hindi kitchen words (कड़ाही → wok, छलनी →
 *      strainer, chaku → knife …) and of short loan-words a sound can't settle;
 *   4. for Devanagari loan-words, a SOUND match against the catalogue's own
 *      vocabulary: both scripts are reduced to a consonant skeleton
 *      (मिक्सर → "mksr" ← mixer, वफ़ल → "vfl" ← waffle, फ्रायर → "frr" ← fryer)
 *      and the closest-sounding catalogue word wins — but only when it really
 *      sounds the same (SOUND_LIMIT, and for short words the same vowels too).
 *      A Hindi word with no such match is dropped: matching nothing beats
 *      matching a random word (फ्रिज ≠ fryer, कर ≠ chair).
 * Then the English words are checked against the listings: a generic word that
 * no listing shares with the rest ("tea machine", "big strainer") is dropped.
 * English queries pass through untouched, so existing search is unaffected —
 * including romanised Hindi that is also English ("chai" while typing
 * "chair", "pani" → panini, "pani puri").
 * Zero dependencies; runs in the API route and in the browser.
 */

/**
 * Letters with a nukta (ड़ ज़ फ़ …) exist both as one code point and as base + ़,
 * and NFC turns the one-code-point form into the two-code-point form. Every key
 * is normalised the same way as the query, so either spelling matches.
 */
function nfcKeys<T>(o: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(o)) out[k.normalize('NFC')] = v;
  return out;
}

/**
 * Words → English. The first target in the catalogue vocabulary wins — or, when
 * there are several, the one a listing shares with the word before it
 * ("ब्रेड काटने" → slicer, "सब्ज़ी काटने" → cutter).
 */
const HI_DICT: Record<string, string[]> = nfcKeys({
  // vessels & tools
  'कड़ाही': ['wok', 'kadai'], 'कढ़ाई': ['wok', 'kadai'], 'कढ़ाही': ['wok', 'kadai'], 'कड़ाई': ['wok', 'kadai'], 'कड़ाइ': ['wok', 'kadai'], 'कढ़ई': ['wok', 'kadai'], 'कड़ई': ['wok', 'kadai'],
  'तवा': ['tawa', 'griddle'], 'चाकू': ['knife'], 'छुरी': ['knife'], 'छलनी': ['strainer'], 'चलनी': ['strainer'], 'छन्नी': ['strainer'],
  'चम्मच': ['spoon'], 'चमच': ['spoon'], 'करछी': ['ladle'], 'करछुल': ['ladle'], 'कलछी': ['ladle'], 'कटोरी': ['bowl'], 'कटोरा': ['bowl'],
  'थाली': ['plate', 'thali'], 'गिलास': ['glass'], 'भट्टी': ['oven'], 'तंदूर': ['oven'], 'तन्दूर': ['oven'], 'चिमटा': ['tong', 'tongs'],
  'कैंची': ['scissor'], 'पतीला': ['pot'], 'पतीली': ['pot'], 'भगोना': ['pot'], 'देगची': ['pot'], 'हांडी': ['pot'], 'हंडी': ['pot'], 'पातेले': ['pot'], 'पातेला': ['pot'],
  'टोकरी': ['basket'], 'झाड़ू': ['broom'], 'झाडू': ['broom'], 'बाल्टी': ['bucket'], 'डिब्बा': ['box', 'container'], 'डब्बा': ['box', 'container'],
  'ढक्कन': ['lid'], 'बेलन': ['rolling', 'belan'], 'चूल्हा': ['burner', 'stove'], 'अंगीठी': ['grill'], 'सिगड़ी': ['grill'],
  'मिक्सी': ['mixer'], 'चक्की': ['grinder'], 'आटा': ['dough'], 'भाप': ['steamer'], 'तराजू': ['scale'], 'कांटा': ['fork'],
  'केतली': ['kettle'], 'कुर्सी': ['chair'], 'मेज़': ['table'], 'नल': ['tap'], 'घंटी': ['bell'], 'घण्टी': ['bell'], 'कद्दूकस': ['grater'],
  'साँचा': ['mould'], 'सांचे': ['mould'], 'साबुन': ['soap'], 'लोहा': ['iron'], 'लोहे': ['iron'], 'आयरन': ['iron'],
  // food & drink
  'बर्फ': ['ice'], 'बर्फ़': ['ice'], 'चाय': ['tea'], 'रस': ['juice'], 'गन्ना': ['sugarcane'], 'गन्ने': ['sugarcane'], 'दूध': ['milk'],
  'पानी': ['water'], 'सब्जी': ['vegetable'], 'सब्ज़ी': ['vegetable'], 'आलू': ['potato', 'french'], 'प्याज': ['onion'], 'प्याज़': ['onion'],
  'मक्खन': ['butter'], 'शहद': ['honey'], 'मक्का': ['corn'], 'भुट्टा': ['corn'], 'मसाला': ['masala'], 'तेल': ['oil'], 'चाट': ['chaat'],
  'संतरा': ['orange'], 'संतरे': ['orange'], 'मौसमी': ['lime'], 'मोसंबी': ['lime'], 'नमक': ['salt'], 'मिर्च': ['pepper', 'chilli'], 'मिर्ची': ['pepper', 'chilli'],
  'कीमा': ['mincer'], 'अंडा': ['egg'], 'अंडे': ['egg'], 'फल': ['fruit'], 'शक्कर': ['sugar'], 'चीनी': ['sugar'], 'लहसुन': ['garlic'], 'बिस्कुट': ['cookie', 'biscuit'],
  'गोला': ['snowflakes', 'slush'], 'चिकन': ['chicken'], 'तंदूरी': ['tandoori'],
  // describing words
  'गरम': ['hot'], 'गर्म': ['hot'], 'ठंडा': ['cold'], 'ठंडी': ['cold'], 'ठंडे': ['cold'], 'बिजली': ['electric'], 'भारी': ['heavy'], 'स्टील': ['ss', 'steel'],
  'स्टेनलेस': ['ss', 'stainless'], 'लकड़ी': ['wooden'], 'लकड़ि': ['wooden'], 'बांस': ['bamboo'], 'कांच': ['glass'], 'शीशा': ['glass'],
  'पीतल': ['brass'], 'तांबा': ['copper'], 'बड़ा': ['big'], 'बड़ी': ['big'], 'बड़े': ['big'], 'छोटा': ['small'], 'छोटी': ['small'], 'छोटे': ['small'],
  'काला': ['black'], 'काली': ['black'], 'लाल': ['red'], 'सफेद': ['white'], 'सफ़ेद': ['white'], 'भूरा': ['brown'], 'सुनहरा': ['golden'],
  'गोल': ['round'], 'चौकोर': ['square'], 'आयताकार': ['rectangle'], 'पुर्जा': ['spares'], 'पुर्जे': ['spares'], 'स्पेयर': ['spares'], 'हाथ': ['hand'],
  // short loan-words a sound match can't settle on its own (several English words share the sound)
  'आइस': ['ice'], 'कप': ['cup'], 'मग': ['mug'], 'जग': ['jug'], 'पैन': ['pan'], 'पॉट': ['pot'], 'ट्रे': ['tray'], 'लिड': ['lid'],
  'बॉक्स': ['box'], 'सेट': ['set'], 'बेस': ['base'], 'गैस': ['gas'], 'बार': ['bar'], 'हॉट': ['hot'], 'कोल्ड': ['cold'], 'ऑयल': ['oil'],
  'टैप': ['tap'], 'केक': ['cake'], 'टी': ['tea'], 'बीबीक्यू': ['bbq'], 'एलईडी': ['led'], 'एसएस': ['ss'], 'जीएन': ['gn'], 'पीसी': ['pc'],
  'एमएस': ['ms'], 'यूएफओ': ['ufo'], 'कोन': ['cone'], 'आइसक्रीम': ['ice cream'], 'पॉपकॉर्न': ['popcorn'], 'सॉफ्टी': ['softy'], 'सोफ्टी': ['softy'],
  'सॉस': ['sauce'], 'सोस': ['sauce'], 'क्यू': ['queue'], 'बियर': ['beer'], 'बीयर': ['beer'], 'बेन': ['bain'], 'रैक': ['rack'], 'जार': ['jar'], 'मैट': ['mat'], 'बिन': ['bin'], 'ऐश': ['ash'],
  'मीट': ['meat'], 'बाउल': ['bowl'], 'बाउल्स': ['bowl'], 'कैप': ['cap'], 'चेयर': ['chair'], 'शेक': ['shake'], 'सोडा': ['soda'], 'कूलर': ['cooler'], 'चिलर': ['chiller'],
  'शेल्फ': ['shelf', 'rack'], 'अप': ['up'], 'डाउन': ['down'], 'बुफे': ['buffet'], 'स्लश': ['slush'], 'बार्बेक्यू': ['barbeque', 'bbq'], 'बारबेक्यू': ['barbeque', 'bbq'],
  'चीज़': ['cheese'], 'मेयोनेज़': ['mayonnaise', 'mayo'], 'स्ट्रॉ': ['straw'], 'हाफ': ['half'], 'बिल': ['bill'],
  'सूप': ['soup'], 'व्हाइट': ['white'], 'वाइट': ['white'], 'बैग': ['bag'], 'मिनी': ['mini'], 'बेल': ['bell'], 'ब्लो': ['blow'], 'बन': ['bun'],
  'पॉलिश': ['polish'], 'शॉट': ['shot'], 'लेदर': ['leather'], 'रॉड': ['rod'], 'फ्लोर': ['floor'], 'फुल': ['full'], 'ग्रे': ['grey'],
  'इको': ['eco'], 'येलो': ['yellow'], 'कुकी': ['cookie'], 'कुकीज़': ['cookie'], 'शू': ['shoe'], 'ग्लव्स': ['gloves'], 'ग्लव': ['gloves'], 'वाइपर': ['wiper'],
  'न्यू': ['new'], 'ऑटो': ['auto'], 'पाइप': ['pipe'], 'बेबी': ['baby'], 'हार्ट': ['heart'], 'रॉयल': ['royal'], 'सेफ्टी': ['safety'], 'टफन्ड': ['toughened'],
  'ब्लोअर': ['blower'], 'तार': ['wire'], 'जूता': ['shoe'], 'जूते': ['shoe'], 'रतन': ['polyrattan'], 'रैटन': ['polyrattan'], 'पोछा': ['mop'], 'पोंछा': ['mop'],
  'बच्चों': ['baby'], 'बच्चे': ['baby'], 'बच्चा': ['baby'], 'डो': ['dough'],
  // asked for by name, and either sold under another word or not sold at all — the plain English
  // word then finds nothing, where a sound-alike found the wrong thing (फ्रिज → fryer, बेकरी → battery)
  'प्रेशर': ['pressure'], 'कुकर': ['cooker'], 'चपाती': ['chapati'], 'रोटी': ['roti'], 'नूडल्स': ['noodle'], 'नूडल': ['noodle'],
  'बेकरी': ['bakery', 'baking'], 'दस्ताने': ['gloves'], 'दस्ताना': ['gloves'], 'चिमनी': ['chimney'], 'माइक्रोवेव': ['microwave'],
  'फ्रिज': ['fridge'], 'फ्रीज': ['fridge'], 'रेफ्रिजरेटर': ['refrigerator'], 'गोलगप्पे': ['pani puri'], 'गोलगप्पा': ['pani puri'],
  'प्यूरीफायर': ['purifier'], 'डिशवॉशर': ['dishwasher'],
  // verbs people use for machines ("सब्ज़ी काटने की मशीन", "बर्फ तोड़ने की मशीन")
  'काटने': ['cutter', 'slicer'], 'काटना': ['cutter', 'slicer'], 'कटिंग': ['cutter'], 'तोड़ने': ['crusher'], 'तोड़ना': ['crusher'], 'क्रश': ['crusher'],
  'पीसने': ['grinder'], 'पीसना': ['grinder'], 'तलने': ['fryer'], 'तलना': ['fryer'], 'सेंकने': ['toaster'],
  'भूनने': ['roaster', 'grill'], 'उबालने': ['boiler'], 'धोने': ['washer'], 'रखने': ['holder'], 'परोसने': ['serving'],
  'गूंधने': ['kneader', 'mixer'], 'गूंधना': ['kneader', 'mixer'], 'गूंथने': ['kneader', 'mixer'], 'गूंथना': ['kneader', 'mixer'],
  'सुखाने': ['dryer'], 'सुखाना': ['dryer'], 'फेंटने': ['whisk'], 'फेंटना': ['whisk'],
});

/**
 * Romanised Hindi (what an English recogniser or a typing customer produces). Never used when the
 * word is itself a catalogue word; when it only starts one ("chai" → chair, "gol" → golden), only
 * inside a plainly Hindi query or before the name of a machine — see translateQuery.
 */
const HINGLISH: Record<string, string[]> = {
  kadhai: ['wok', 'kadai'], kadahi: ['wok', 'kadai'], karahi: ['wok', 'kadai'], kadhaai: ['wok', 'kadai'], kadai: ['wok', 'kadai'], kadhayi: ['wok', 'kadai'],
  tava: ['tawa'], chaku: ['knife'], chaaku: ['knife'], chhuri: ['knife'], churi: ['knife'], chalni: ['strainer'], chhalni: ['strainer'], channi: ['strainer'], chhanni: ['strainer'],
  chammach: ['spoon'], chamach: ['spoon'], chamcha: ['spoon'], karchi: ['ladle'], kalchul: ['ladle'], kadchi: ['ladle'], karchhi: ['ladle'], katori: ['bowl'], katora: ['bowl'],
  thali: ['plate', 'thali'], gilas: ['glass'], bhatti: ['oven'], tandoor: ['oven'], tandur: ['oven'], chimta: ['tong', 'tongs'], kainchi: ['scissor'], kenchi: ['scissor'],
  patila: ['pot'], patili: ['pot'], bhagona: ['pot'], degchi: ['pot'], handi: ['pot'], tokri: ['basket'], jhadu: ['broom'], jharu: ['broom'], jhaadu: ['broom'],
  balti: ['bucket'], dibba: ['box', 'container'], dabba: ['box', 'container'], dhakkan: ['lid'], dhakan: ['lid'], chulha: ['burner', 'stove'], angithi: ['grill'], sigdi: ['grill'],
  mixie: ['mixer'], mixi: ['mixer'], chakki: ['grinder'], atta: ['dough'], aata: ['dough'], bhaap: ['steamer'], bhap: ['steamer'], taraju: ['scale'], kanta: ['fork'],
  baraf: ['ice'], barf: ['ice'], chai: ['tea'], chay: ['tea'], ras: ['juice'], ganna: ['sugarcane'], ganne: ['sugarcane'], doodh: ['milk'], dudh: ['milk'],
  pani: ['water'], paani: ['water'], sabji: ['vegetable'], sabzi: ['vegetable'], aloo: ['potato', 'french'], pyaz: ['onion'], pyaaz: ['onion'],
  makkhan: ['butter'], shahad: ['honey'], makka: ['corn'], bhutta: ['corn'], tel: ['oil'], dastane: ['gloves'], golgappa: ['pani puri'], golgappe: ['pani puri'],
  sabun: ['soap'], santra: ['orange'], santre: ['orange'], namak: ['salt'], mirch: ['pepper', 'chilli'], mirchi: ['pepper', 'chilli'], ghanti: ['bell'],
  kaddukas: ['grater'], haath: ['hand'], gola: ['snowflakes', 'slush'], keema: ['mincer'], kheema: ['mincer'], sancha: ['mould'], saancha: ['mould'],
  anda: ['egg'], ande: ['egg'], loha: ['iron'], lohe: ['iron'], pocha: ['mop'], pochha: ['mop'], joota: ['shoe'], juta: ['shoe'],
  garam: ['hot'], garm: ['hot'], thanda: ['cold'], thandi: ['cold'], thande: ['cold'], bijli: ['electric'], lakdi: ['wooden'], lakadi: ['wooden'], baans: ['bamboo'],
  kanch: ['glass'], sheesha: ['glass'], shisha: ['glass'], peetal: ['brass'], pital: ['brass'], tamba: ['copper'], bada: ['big'], badi: ['big'], bara: ['big'], bari: ['big'],
  chhota: ['small'], chhoti: ['small'], chota: ['small'], choti: ['small'], kala: ['black'], kaala: ['black'], kali: ['black'], kaali: ['black'], lal: ['red'], laal: ['red'],
  safed: ['white'], bhura: ['brown'], sunehra: ['golden'], gol: ['round'], chaukor: ['square'], purja: ['spares'], purje: ['spares'],
  // the catalogue writes stainless steel as "SS" (only applied inside a Hindi/Hinglish query)
  steel: ['ss'], stainless: ['ss'], istil: ['ss'], stil: ['ss'],
  katne: ['cutter', 'slicer'], katna: ['cutter', 'slicer'], kaatne: ['cutter', 'slicer'], kaatna: ['cutter', 'slicer'], todne: ['crusher'], peesne: ['grinder'], pisne: ['grinder'],
  talne: ['fryer'], ubalne: ['boiler'], goondhne: ['kneader', 'mixer'], gundhne: ['kneader', 'mixer'], goondhna: ['kneader', 'mixer'], gundhna: ['kneader', 'mixer'],
  gunthne: ['kneader', 'mixer'], goonthne: ['kneader', 'mixer'], sukhane: ['dryer'], fentne: ['whisk'], phentne: ['whisk'],
};

const STOP = new Set<string>([
  // Devanagari
  'का', 'की', 'के', 'को', 'में', 'मे', 'से', 'पर', 'और', 'या', 'वाला', 'वाली', 'वाले', 'चाहिए', 'चाहिये', 'दिखाओ', 'दिखाइए', 'दिखाइये', 'दिखा', 'दिखाना',
  'ढूंढो', 'ढूँढो', 'खोजो', 'बताओ', 'मुझे', 'मुझको', 'हमें', 'हमको', 'लिए', 'लिये', 'है', 'हैं', 'हो', 'प्लीज़', 'प्लीज', 'कृपया', 'कोई', 'कुछ', 'ये', 'यह', 'वो', 'वह',
  'मेरे', 'मेरा', 'मेरी', 'एक', 'भी', 'तो', 'ना', 'न', 'जी', 'चाहता', 'चाहती', 'सर्च', 'करो', 'करें', 'कीजिए', 'दीजिए', 'दे', 'दें', 'दो',
  'मैं', 'मै', 'हम', 'आप', 'क्या', 'कहाँ', 'कहां', 'कैसे', 'कौन', 'सा', 'सी', 'नहीं', 'अपने', 'अपना', 'अपनी', 'इस', 'उस', 'लिया', 'लेना', 'चलेगा', 'मिलेगा', 'मिलेगी',
  'खरीदना', 'खरीदनी', 'बेचते', 'साथ', 'बहुत', 'ज्यादा', 'ज़्यादा', 'नया', 'नई', 'नए', 'घर', 'किराया', 'किराये', 'किराए', 'खाना', 'खाने',
  // "पॉपकॉर्न बनाने की मशीन" = popcorn machine (and बनाना is not a banana)
  'बनाने', 'बनाना', 'बनाता', 'बनाती', 'बनाओ', 'बनता', 'बनती', 'बनते', 'बोलो', 'बोलिए', 'देखो', 'सुनो', 'लाओ', 'भेजो', 'बताइए', 'बताइये',
  // everyday verbs, time and question words — a spoken sentence is full of them ("मिक्सर सर्च कर", "डिलीवरी कब होगी")
  'कर', 'करके', 'करना', 'करने', 'करता', 'करती', 'करते', 'करिए', 'करिये', 'किया', 'होगा', 'होगी', 'होंगे', 'होना', 'होता', 'होती', 'होते', 'था', 'थी', 'थे',
  'गया', 'गई', 'गए', 'रहा', 'रही', 'रहे', 'जाएगा', 'जायेगा', 'जाएगी', 'जायेगी', 'जाएंगे', 'जाए', 'सकता', 'सकती', 'सकते', 'मिल', 'मिलता', 'मिलती', 'मिलना',
  'पता', 'जानकारी', 'लेने', 'देना', 'देने', 'भेजना', 'भेज', 'बताना', 'लगाना', 'लगाने', 'चलाने', 'चलने', 'जलाने', 'पकाने', 'बेचना', 'खरीदने', 'मंगवाना', 'मंगाना',
  'निकालने', 'निकालना', 'करवाना', 'जो', 'जिस', 'जिसमें', 'जैसा', 'जैसी', 'जैसे', 'अब', 'फिर', 'सही', 'ठीक', 'हाँ', 'हां', 'तरह', 'कम',
  'कब', 'कल', 'आज', 'अभी', 'तक', 'जल्दी', 'तुरंत', 'बाद', 'पहले', 'सुबह', 'शाम', 'रात', 'परसों', 'क्यों', 'किस', 'किसका', 'किसकी', 'किसके', 'कौनसा', 'कौनसी', 'कैसा', 'कैसी',
  'नमस्ते', 'नमस्कार', 'धन्यवाद', 'शुक्रिया', 'भाई', 'भैया', 'साहब', 'सर', 'मैडम', 'सेठ', 'दीदी', 'अंकल', 'आंटी', 'मालिक', 'कॉलेज',
  'ऑर्डर', 'डिलीवरी', 'कैश', 'ऑन', 'ऑफर', 'डिस्काउंट', 'जीएसटी', 'कंपनी', 'ब्रांड', 'क्वालिटी', 'गारंटी', 'वारंटी', 'दुकान', 'सामान', 'बर्तन', 'भांडी',
  // dishes (the store sells the machines, not the food) — so a dish name never sounds like a product (गुलाब ≠ globe)
  'गुलाब', 'जामुन', 'भटूरे', 'छोले', 'कचौरी', 'पकौड़ा', 'पकौड़े', 'जलेबी', 'रसगुल्ला', 'लड्डू', 'हलवा', 'खीर', 'बिरयानी', 'पुलाव', 'खिचड़ी', 'पोहा', 'उपमा',
  'सांभर', 'चटनी', 'अचार', 'पापड़', 'नमकीन', 'भुजिया', 'मटन', 'मछली', 'दाल', 'चावल', 'मखनी', 'समोसा', 'कुल्फी', 'पनीर', 'दही', 'घी', 'छाछ', 'मिठाई', 'रसमलाई',
  // price / quality words ("मिक्सर की कीमत", "सस्ता फ्रायर") — not part of any product name
  'कीमत', 'क़ीमत', 'दाम', 'रेट', 'प्राइस', 'मूल्य', 'कितना', 'कितने', 'कितनी', 'सस्ता', 'सस्ती', 'सस्ते', 'अच्छा', 'अच्छी', 'अच्छे', 'बढ़िया', 'महंगा', 'महंगी',
  // Marathi (a Pune store): "मला पिझ्झा ओव्हन पाहिजे", "वॅफल मेकर हवा आहे", "डीप फ्रायर दाखवा"
  'पाहिजे', 'पाहिजेत', 'हवा', 'हवी', 'हवे', 'आहे', 'आहेत', 'मला', 'आम्हाला', 'आम्हांला', 'दाखवा', 'दाखव', 'किंमत', 'किती', 'ची', 'चा', 'चे', 'च्या', 'साठी', 'आणि', 'पण', 'नको', 'द्या', 'सांगा', 'बघा', 'महाग',
  // romanised Hindi
  'ka', 'ki', 'ke', 'ko', 'me', 'mein', 'mai', 'se', 'par', 'aur', 'ya', 'wala', 'wali', 'wale', 'vala', 'vali', 'chahiye', 'chaiye', 'chahie', 'dikhao', 'dikhaiye',
  'dikha', 'mujhe', 'muje', 'hame', 'hamein', 'liye', 'hai', 'hain', 'ek', 'bhi', 'karo', 'kijiye', 'dijiye', 'do',
  'kimat', 'keemat', 'daam', 'kitna', 'kitne', 'kitni', 'sasta', 'sasti', 'saste', 'accha', 'achha', 'acha', 'badhiya', 'badiya', 'banane', 'banaane',
  'karne', 'karna', 'karke', 'kar', 'batao', 'bataiye', 'bata', 'rate', 'kab', 'kal', 'tak', 'kahan', 'kaha', 'kya', 'kaun', 'kaise', 'milega', 'milegi', 'hoga', 'hogi',
  'mera', 'meri', 'mere', 'abhi', 'jaldi', 'nikalne', 'rakhne', 'chahta', 'chahti', 'khana', 'khane',
  // English filler
  'please', 'show', 'i', 'want', 'need', 'find', 'search', 'for', 'the', 'a', 'an', 'buy', 'price', 'of', 'my', 'some', 'looking', 'with', 'and',
].map((w) => w.normalize('NFC')));

const NUM: Record<string, string> = nfcKeys({
  'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5', 'छह': '6', 'छः': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
  'ग्यारह': '11', 'बारह': '12', 'तेरह': '13', 'चौदह': '14', 'पंद्रह': '15', 'पन्द्रह': '15', 'सोलह': '16', 'सत्रह': '17', 'अठारह': '18', 'उन्नीस': '19', 'बीस': '20',
  'इक्कीस': '21', 'बाईस': '22', 'तेईस': '23', 'चौबीस': '24', 'पच्चीस': '25', 'छब्बीस': '26', 'तीस': '30', 'पैंतीस': '35', 'चालीस': '40', 'पैंतालीस': '45', 'पचास': '50',
  'साठ': '60', 'सत्तर': '70', 'अस्सी': '80', 'नब्बे': '90', 'सौ': '100', 'डेढ़': '1.5', 'ढाई': '2.5', 'हज़ार': '1000',
  ek: '1', do: '2', teen: '3', char: '4', paanch: '5', panch: '5', chhe: '6', saat: '7', aath: '8', nau: '9', das: '10', gyarah: '11', barah: '12', terah: '13',
  chaudah: '14', pandrah: '15', solah: '16', satrah: '17', atharah: '18', bees: '20', pachees: '25', pachis: '25', tees: '30', chalis: '40', chaalis: '40',
  pachas: '50', pachaas: '50', sau: '100',
});
/** Number words that are also ordinary words ("दो" = give, "char", "das", "sau") — numbers only right before a unit or a counted thing. */
const AMBIGUOUS_NUM = new Set(['दो', 'एक', 'do', 'ek', 'char', 'das', 'nau', 'saat', 'tees', 'bees', 'teen', 'chhe', 'sau']);
/** English words rewritten only when the query is already Hindi/Hinglish ("steel ki kadhai"); plain English stays as typed. */
const INSIDE_HINDI_ONLY = new Set(['steel', 'stainless', 'istil', 'stil']);
/** Romanised-Hindi filler that marks a spoken/typed Hinglish sentence ("pizza oven dikhao", "fryer kitne ka hai"). */
const HINGLISH_FILLER = new Set(['chahiye', 'chaiye', 'chahie', 'dikhao', 'dikhaiye', 'dikha', 'mujhe', 'muje', 'hame', 'hamein', 'liye', 'wala', 'wali', 'wale', 'vala', 'vali',
  'karo', 'kijiye', 'dijiye', 'mein', 'kitne', 'kitna', 'kitni', 'hai', 'hain', 'batao', 'bataiye', 'karne', 'karna', 'karke', 'banane', 'banaane', 'chahta', 'chahti']);
/** Hindi postpositions ("chai ki machine", "fryer ka price"): in a query of two or more words they mark it as Hinglish. */
const HINDI_LINK = new Set(['ka', 'ki', 'ke', 'ko', 'se']);
/** "X वाली Y", "X का Y": the words after are the thing, the words before describe it. */
const OF = new Set(['का', 'की', 'के', 'वाला', 'वाली', 'वाले', 'चा', 'ची', 'चे', 'च्या', 'ka', 'ki', 'ke', 'wala', 'wali', 'wale', 'vala', 'vali'].map((w) => w.normalize('NFC')));
/** What a romanised Hindi word may be the thing for ("chai machine" = a tea machine, not a chair machine). */
const MACHINE_WORD = new Set(['machine', 'machines', 'maker', 'dispenser', 'urn', 'boiler', 'warmer']);
/** "बनाने" = making: "पास्ता बनाने की मशीन" is a pasta maker, when the catalogue has one. */
const MAKE = new Set(['बनाने', 'बनाना', 'banane', 'banaane'].map((w) => w.normalize('NFC')));
/**
 * Two-word names → what the catalogue calls them ("" drops the pair). "pani puri" is kept as two
 * words: the English ranker already finds Tea/Coffee/Panipuri Urns from it, and one word would carry
 * half the score of "pani puri machine". "kali mirch" is pepper, not a black anything.
 */
const PHRASES: Record<string, string> = nfcKeys({
  'pani puri': 'pani puri', 'paani puri': 'pani puri', 'पानी पूरी': 'pani puri', 'पानी पुरी': 'pani puri', 'डिम सम': 'dimsum',
  'garam masala': 'masala', 'garm masala': 'masala', 'गरम मसाला': 'masala', 'masala chai': 'tea', 'मसाला चाय': 'tea',
  'kali mirch': 'pepper', 'kaali mirch': 'pepper', 'काली मिर्च': 'pepper', 'lal mirch': 'chilli', 'laal mirch': 'chilli', 'लाल मिर्च': 'chilli',
  'hari mirch': 'chilli', 'हरी मिर्च': 'chilli', 'mixie jar': 'blender jar', 'mixi jar': 'blender jar', 'मिक्सी जार': 'blender jar',
  'ras malai': '', 'रस मलाई': '', 'हॉर्स पावर': 'hp', 'horse power': 'hp', 'आइसक्रीम मशीन': 'softy machine',
  'atta goondhne': 'dough mixer', 'atta gundhne': 'dough mixer', 'aata goondhne': 'dough mixer', 'aata gundhne': 'dough mixer', 'atta gunthne': 'dough mixer',
  // verb phrases for machines: picked by what the object word is sold with ("दूध गरम करने" → milk boiler, "खाना गरम रखने" → warmer)
  'गरम करने': '=boiler warmer', 'गर्म करने': '=boiler warmer', 'garam karne': '=boiler warmer', 'garm karne': '=boiler warmer',
  'गरम रखने': '=warmer', 'गर्म रखने': '=warmer', 'garam rakhne': '=warmer', 'ठंडा करने': '=cooler chiller', 'thanda karne': '=cooler chiller',
  'तेज करने': '=sharpener sharpening', 'तेज़ करने': '=sharpener sharpening', 'tez karne': '=sharpener sharpening', 'tej karne': '=sharpener sharpening',
  'जूस निकालने': '=juicer', 'रस निकालने': '=juicer', 'juice nikalne': '=juicer', 'ras nikalne': '=juicer', 'साफ करने': '=cleaning cleaner', 'saaf karne': '=cleaning cleaner',
});
/** First words of PHRASES — enough for the cheap pre-check to look further. */
const PHRASE_FIRST = new Set(Object.keys(PHRASES).map((k) => k.split(' ')[0]));
/** Units written straight after the number in listings ("8L", "500ml", "3500W", "12kg", "6pcs"); a unit with no number is dropped. */
const GLUED_UNIT: Record<string, string> = nfcKeys({
  'लीटर': 'l', 'लिटर': 'l', 'लीटर्स': 'l', litre: 'l', liter: 'l', litres: 'l', liters: 'l', ltr: 'l', l: 'l',
  'किलो': 'kg', 'किलोग्राम': 'kg', 'केजी': 'kg', kilo: 'kg', kg: 'kg', kgs: 'kg', 'ग्राम': 'g', gram: 'g', grams: 'g', gm: 'g', gms: 'g',
  'एमएल': 'ml', 'मिलीलीटर': 'ml', 'मिली': 'ml', ml: 'ml', 'वाट': 'w', 'वॉट': 'w', watt: 'w', watts: 'w', w: 'w', 'किलोवाट': 'kw', kw: 'kw',
  'सेमी': 'cm', 'सेंटीमीटर': 'cm', cm: 'cm', 'एमएम': 'mm', 'मिलीमीटर': 'mm', mm: 'mm', 'पीस': 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs', 'एचपी': 'hp', hp: 'hp',
});
/**
 * Things listings count ("2 Burner", "4 Slot", "4 Slice", "3 Layers", "1 Deck 2 Tray") → their English word. A number
 * word right before one is a count, even an ambiguous one: "दो बर्नर" → "2 burner", not "do burner".
 */
const COUNTED: Record<string, string> = nfcKeys({
  'बर्नर': 'burner', 'टियर': 'tier', 'डेक': 'deck', 'स्लॉट': 'slot', 'स्लोट': 'slot', 'ट्रे': 'tray', 'लेयर': 'layer', 'डोर': 'door', 'दरवाजे': 'door', 'दरवाज़े': 'door',
  'टैप': 'tap', 'नल': 'tap', 'जार': 'jar', 'प्लेट': 'plate', 'बास्केट': 'basket', 'टोकरी': 'basket', 'बाउल': 'bowl', 'कटोरी': 'bowl', 'खाने': 'compartment',
  'कम्पार्टमेंट': 'compartment', 'कंपार्टमेंट': 'compartment', 'हेड': 'head', 'नोज़ल': 'nozzle', 'नोजल': 'nozzle', 'ब्लेड': 'blade', 'टैंक': 'tank', 'स्लाइस': 'slice',
  'इंच': 'inch', khane: 'compartment',
  ...Object.fromEntries(['burner', 'tier', 'deck', 'slot', 'tray', 'layer', 'door', 'tap', 'jar', 'plate', 'basket', 'bowl', 'compartment', 'head', 'nozzle', 'blade', 'tank', 'slice', 'inch']
    .flatMap((w) => [[w, w], [`${w}s`, `${w}s`]])),
});
/** Counts the catalogue spells out instead ("Single Head", "Double Plate", "Triple Blade"). */
const SPELLED_COUNT = new Set(['head', 'plate', 'blade']);
const COUNT_WORD: Record<string, string> = { 1: 'single', 2: 'double', 3: 'triple' };
/**
 * Describing words a translated query may lose when no listing has them together with the rest:
 * "tea machine" → tea (the urns aren't called machines), "बड़ी छलनी" → strainer, "गरम खाने का शोकेस"
 * → showcase. Tried in this order; "machine" first becomes "maker" where that is what is sold.
 */
const SOFT = ['machine', 'big', 'small', 'heavy', 'hot', 'cold', 'electric', 'black', 'red', 'white', 'brown', 'golden', 'gold', 'silver', 'green', 'blue',
  'yellow', 'round', 'square', 'ss', 'steel', 'wooden', 'glass', 'brass', 'copper', 'iron', 'bamboo', 'plastic'];
/** Longest query worth translating: a spoken sentence is rarely longer, and each word costs a sound match. */
const MAX_TOKENS = 16;

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

const DEVANAGARI = /[ऀ-ॿ]/;
export function hasDevanagari(s: string): boolean {
  return DEVANAGARI.test(s);
}

// --- sound skeletons -------------------------------------------------------

const DEV_MATRA: Record<string, string> = { 'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ॉ': 'o', 'ॅ': 'e', 'ो': 'o', 'ौ': 'au', 'ॆ': 'e', 'ॊ': 'o' };
const DEV_VOWEL: Record<string, string> = { 'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ऍ': 'e' };
const DEV_LATIN: Record<string, string> = nfcKeys({
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n', 'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n', 'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'ळ': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'क़': 'k', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f', 'य़': 'y',
});
const NUKTA = '़', VIRAMA = '्', ANUSVARA = 'ं', CHANDRA = 'ँ', VISARGA = 'ः';
/** Lips-closed consonants: a nasal before them is "m" (लैंप = lamp, पंप = pump, जंबो = jumbo). */
const LABIAL = new Set(['प', 'फ', 'ब', 'भ', 'म']);

/** Split a Devanagari word into base letters with the nukta folded in (ज + ़ → ज़). */
function devChars(w: string): string[] {
  const out: string[] = [];
  for (const ch of w.normalize('NFC')) {
    if (ch === NUKTA && out.length) out[out.length - 1] += NUKTA;
    else out.push(ch);
  }
  return out;
}

function collapse(s: string): string {
  return s.replace(/(.)\1+/g, '$1');
}

/** Consonant skeleton of a Devanagari word (same classes as latinSkeleton). */
export function devSkeleton(w: string): string {
  return strip(devForm(w));
}

/** Rough romanisation with vowels — only used to rank sound-alike candidates. */
export function devLatin(w: string): string {
  const cs = devChars(w);
  let s = '';
  for (let i = 0; i < cs.length; i++) {
    const ch = cs[i];
    if (ch in DEV_LATIN) {
      s += DEV_LATIN[ch];
      const nx = cs[i + 1];
      // inherent "a" unless a vowel sign / virama follows, or it is the last letter (कं = "kan", not "kn")
      if (nx !== undefined && !(nx in DEV_MATRA) && nx !== VIRAMA && nx !== VISARGA) s += 'a';
    } else if (ch in DEV_MATRA) s += DEV_MATRA[ch];
    else if (ch in DEV_VOWEL) s += DEV_VOWEL[ch];
    else if (ch === ANUSVARA || ch === CHANDRA) s += LABIAL.has(cs[i + 1]) ? 'm' : 'n';
  }
  return s;
}

/**
 * Sound form shared by both scripts: consonants folded into classes that
 * Hindi and English spell alike (ph/फ → f, w/व → v, z/ज़ → j, x → ks, ch/च → c …)
 * and every vowel run folded to "a" ("rice" → "ras", romanised "राइस" = "rais" → "ras").
 * English-only rules (silent k/w/b/g, silent final e, tch = ch, w after a vowel
 * is part of the vowel: "show", "brown") apply when `english`; `softG` reads g
 * before e/i/y as j ("manager" ↔ "मैनेजर").
 */
function soundForm(s: string, english: boolean, softG = false): string {
  const orig = s.toLowerCase().replace(/[^a-z]/g, '');
  let w = orig;
  if (english) {
    w = w.replace(/^kn/, 'n').replace(/^wr/, 'r').replace(/mb$/, 'm').replace(/gn$/, 'n')
      .replace(/tch/g, 'ch').replace(/ture/g, 'chur').replace(/sch/g, 'sk').replace(/chr/g, 'kr').replace(/([aeiou])w(?![aeiouy])/g, '$1u');
  }
  // "ch" (च, छ) is its own sound — not the s or k an English c can be (किचन = kitchen, not "kikan")
  w = w
    .replace(/[ts]ion/g, 'sn')
    .replace(/ph/g, 'f').replace(/gh(?=t|$)/g, '').replace(/ck/g, 'k').replace(/qu/g, 'kv').replace(/x/g, 'ks')
    .replace(/ch/g, 'C').replace(/sh/g, 's').replace(/th/g, 't').replace(/dh/g, 'd').replace(/bh/g, 'b').replace(/kh/g, 'k').replace(/gh/g, 'g')
    .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/C/g, 'c').replace(/q/g, 'k').replace(/z/g, 'j').replace(/w/g, 'v');
  if (softG) w = w.replace(/g(?=[eiy])/g, 'j');
  // a leftover "h" is silent ("whisk", "chh"), except at the start: "hand" must not sound like "and"
  w = collapse((w.slice(0, 1) + w.slice(1).replace(/h/g, '')).replace(/[aeiouy]+/g, 'a'));
  if (english && /[^aeiouy]e$/.test(orig) && w.length > 2 && w.endsWith('a')) w = w.slice(0, -1); // silent final e
  return w;
}
const strip = (form: string) => collapse(form.replace(/a/g, ''));

/** Consonant skeleton of an English word, built to line up with devSkeleton. */
export function latinSkeleton(word: string): string {
  return strip(soundForm(word, true));
}
/**
 * Sound forms of an English word: as written, with a soft g, and with the sounds
 * English spells one way and Hindi writes as heard — a voiced "th" (frother =
 * फ्रोदर, leather = लेदर), an "s" heard as z (design = डिज़ाइन, laser = लेज़र),
 * and a French "ch" heard as sh (chef = शेफ, machine = मशीन).
 */
function englishForms(word: string): string[] {
  const spellings = [word];
  for (const v of [
    word.replace(/([aeiou])th(?=[aeiouy])/g, '$1dh'),
    word.replace(/([aeiou])s(?=[aeiouy])/g, '$1z'),
    word.replace(/ch(?=[ei])/g, 'sh'),
  ]) if (v !== word) spellings.push(v);
  const forms = new Set<string>();
  for (const s of spellings) { forms.add(soundForm(s, true)); forms.add(soundForm(s, true, true)); }
  return [...forms];
}
/** Sound form of a Devanagari word. */
function devForm(w: string): string {
  return soundForm(devLatin(w), false);
}

function osa(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

/**
 * Edit distance between two sound forms, weighted for how the two scripts
 * spell one word: a vowel gained or lost inside the word costs ½ (Hindi
 * writes the short "a" that English drops, and the other way round: सैंडविच
 * "sandavak" ↔ sandwich "sandvak"), two consonants swapped cost 1, and a
 * consonant gained, lost or heard as another costs 1½ — more than SOUND_LIMIT,
 * so प्रेशर "prasar" never becomes crusher "krasar", nor फ्रिज "fraj" fryer
 * "frar". So does a vowel gained or lost at either END: a spoken final vowel
 * makes another word (शादी "sada" ≠ side "sad", खाना "kana" ≠ cone "kan").
 */
function soundDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const gap = (s: string, i: number) => (s[i] === 'a' && i > 0 && i < s.length - 1 ? 0.5 : 1.5);
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) d[i][0] = d[i - 1][0] + gap(a, i - 1);
  for (let j = 1; j <= n; j++) d[0][j] = d[0][j - 1] + gap(b, j - 1);
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + gap(a, i - 1), d[i][j - 1] + gap(b, j - 1), d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1.5));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && a[i - 1] !== 'a' && a[i - 2] !== 'a') d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
/** Most a sound match may differ from its catalogue word (soundDistance): two vowels, or one swap. */
const SOUND_LIMIT = 1;

// --- vowel quality ----------------------------------------------------------
// The sound form folds every vowel to "a", so "with"/"white", "soap"/"soup", "big"/"bag" sound
// alike. Short words (two consonants, or one vowel) have little else to go on, so there the vowels
// must agree too (कर ≠ chair, कब ≠ cube, स्कूल ≠ scale) — and for every word they break ties before
// frequency. Classes: a e i o u, plus E for ै, which Hindi writes for the English "a" of bag/cap/pan
// (and sometimes the "e" of heavy), O for ॉ, the "o" of pot/shot/ball as against ो of dosa/cone, and I / U
// for the long ी / ू (meal = मील, mill = मिल; soup = सूप, full = फुल).

const MATRA_CLASS: Record<string, string> = { 'ा': 'a', 'ि': 'i', 'ी': 'I', 'ु': 'u', 'ू': 'U', 'ृ': 'i', 'े': 'e', 'ै': 'E', 'ॉ': 'O', 'ॅ': 'E', 'ो': 'o', 'ौ': 'O', 'ॆ': 'e', 'ॊ': 'o' };
const VOWEL_CLASS: Record<string, string> = { 'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'I', 'उ': 'u', 'ऊ': 'U', 'ऋ': 'i', 'ए': 'e', 'ऐ': 'E', 'ओ': 'o', 'औ': 'O', 'ऑ': 'O', 'ऍ': 'E' };

/**
 * Vowel classes of a Devanagari word, one per sounded vowel — without the unspoken medial "a"
 * (इडली = idli, not idali). Not collapsed, so कवर (a, a) still counts as two syllables.
 */
function devVowels(w: string): string {
  const cs = devChars(w);
  const units: { c: string | null; v: string | null; inherent: boolean }[] = [];
  for (let i = 0; i < cs.length; i++) {
    const ch = cs[i], nx = cs[i + 1];
    if (ch in DEV_LATIN) {
      if (nx !== undefined && nx in MATRA_CLASS) { units.push({ c: ch, v: MATRA_CLASS[nx], inherent: false }); i++; }
      else if (nx === undefined || nx === VIRAMA) { units.push({ c: ch, v: null, inherent: false }); i++; }
      else units.push({ c: ch, v: 'a', inherent: nx !== ANUSVARA && nx !== CHANDRA }); // कं: the "a" is sounded
    } else if (ch in VOWEL_CLASS) units.push({ c: null, v: VOWEL_CLASS[ch], inherent: false });
  }
  // schwa deletion: the "a" of a consonant between two sounded vowels is not spoken (कॉकटेल = kokṭel)
  for (let i = 1; i < units.length - 1; i++) {
    const u = units[i], nx = units[i + 1];
    if (u.inherent && units[i - 1].v && nx.c && nx.v) u.v = null;
  }
  let s = '';
  for (let i = 0; i < units.length; i++) {
    // य after a/o is the second half of a diphthong (वायर = wire, फ्रायर = fryer, बॉयलर = boiler); after e/i it is
    // only a glide (चेयर = chair, गियर = gear)
    if (units[i].c === 'य' && i > 0 && units[i - 1].v && !/[ei]/.test(units[i - 1].v!)) s += 'i';
    s += units[i].v ?? '';
  }
  return s;
}

const DIGRAPH = new Set(['ee', 'ea', 'ie', 'ei', 'ey', 'ai', 'ay', 'oo', 'ou', 'oa', 'oe', 'oi', 'oy', 'au', 'aw', 'ow', 'ue', 'ui', 'ew', 'eu']);
const MAGIC: Record<string, string> = { a: 'e', e: 'e', i: 'ai', o: 'o', u: 'U' };
const isVowel = (c: string | undefined) => !!c && 'aeiou'.includes(c);

/**
 * Vowel classes of an English word as Hindi writes it, guessed from the spelling — a silent final e
 * lengthens the vowel before it (cake = केक, white = व्हाइट, cone = कोन), "er"/"ur"/"ir" and an
 * unstressed final "en"/"on"/"el" are Hindi "a" (mixer = मिक्सर, burner = बर्नर, oven = ओवन), a closed
 * "u" is "a" (bun = बन, cup = कप) and digraphs read as one vowel (soup = सूप, tray = ट्रे).
 */
function englishVowels(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, '').replace(/^y/, 'j').replace(/qu/g, 'kv').replace(/gu(?=[aeiou])/g, 'g');
  const units: { r: string; s: number; e: number }[] = [];
  for (let i = 0; i < w.length;) {
    const c = w[i], two = w.slice(i, i + 2);
    if (isVowel(c)) {
      if (two === 'ow' && isVowel(w[i + 2])) units.push({ r: 'ow+', s: i, e: i + 2 }); // tower, power, flower
      else if (DIGRAPH.has(two) && !(/[wy]/.test(two[1]) && isVowel(w[i + 2]))) units.push({ r: two, s: i, e: i + 2 });
      else units.push({ r: c, s: i, e: i + 1 });
      i = units[units.length - 1].e;
    } else {
      if (c === 'y' && i > 0) units.push({ r: 'y', s: i, e: i + 1 });
      i++;
    }
  }
  // a silent final e ("cake"), and the e of "-es"/"-ed" after one consonant ("cones", "baked")
  let syllabicL = false;
  const last = units[units.length - 1];
  if (units.length > 1 && last.r === 'e') {
    const tail = w.slice(last.e), before = w.slice(0, last.s);
    if (tail === '' || ((tail === 's' || tail === 'd') && /[^aeiouy]$/.test(before))) {
      syllabicL = tail === '' && /[^aeiouyl]l$/.test(before); // table = टेबल, bottle = बॉटल
      units.pop();
    }
  }
  const end = units.length ? w.slice(units[units.length - 1].e).replace(/e[sd]?$/, '') : '';
  let out = '';
  for (let k = 0; k < units.length; k++) {
    const { r, s, e } = units[k];
    const isLast = k === units.length - 1;
    const after = isLast ? end : w.slice(e, units[k + 1].s);
    const rest = w.slice(e);
    const poly = units.length > 1;
    const rColour = /^r+([^aeiouyr]|$)/.test(isLast ? after : rest); // not "mirror", "carry"
    let c: string;
    if (r === 'y') c = units.length === 1 || isVowel(w[e]) ? 'ai' : isLast ? 'I' : 'i';
    else if (r === 'ow+') c = 'a';
    else if (r.length === 2) {
      if (r === 'ee' || r === 'ie' || r === 'ei') c = rColour ? 'Ia' : 'I';
      else if (r === 'ey') c = poly ? 'I' : 'e';
      else if (r === 'ea') c = rColour ? 'Ia' : /^(d|th|v|s)/.test(after) ? 'e' : 'I';
      else if (r === 'ai' || r === 'ay') c = rColour ? 'ea' : 'e';
      else if (r === 'oo') c = after.startsWith('r') ? 'O' : 'U';
      else if (r === 'ou') c = /^p/.test(after) ? 'U' : /^(bl|pl|ch|ntr)/.test(after) ? 'a' : /^(ld|gh)/.test(after) ? 'o' : /^r/.test(after) ? 'O' : 'au';
      else if (r === 'oi' || r === 'oy') c = 'Oi';
      else if (r === 'oa' || r === 'oe') c = 'o';
      else if (r === 'au' || r === 'aw') c = 'O';
      else if (r === 'ow') c = /^n/.test(after) ? 'au' : 'o';
      else c = 'U'; // ue ui ew eu
    } else if (/^[^aeiouwxy]$/.test(after.slice(0, 1)) && ((isLast && /^[^aeiouwxy]e[sd]?$/.test(rest)) || /^[^aeiouwxy](er|ers|ing|ings)$/.test(rest)) && !(r === 'a' && w[s - 1] === 'w')) {
      c = MAGIC[r];
    } else if (r === 'a') c = rColour ? 'a' : /^l[lk]/.test(after) || w[s - 1] === 'w' ? 'O' : 'a';
    else if (r === 'e') c = rColour || (poly && isLast && /^[nl]$/.test(after)) ? 'a' : 'e';
    else if (r === 'i') c = rColour ? 'a' : /^(nd|ld|gh|gn)/.test(after) ? 'ai' : isLast && !after ? 'I' : 'i'; // mini = मिनी
    else if (r === 'o') {
      // o: unstressed final "or"/"on", and the "o" of front/other, are Hindi a (motor = मोटर, cotton = कॉटन,
      // front = फ्रंट); closed it is ॉ (pot = पॉट), open ो (dosa = डोसा)
      const closed = after.length >= 2 || (after.length === 1 && isLast);
      c = (poly && isLast && (after === 'r' || after === 'n')) || /^(nt|ther)/.test(rest) ? 'a' : rColour || closed ? 'O' : 'o';
    }
    else {
      // u: "u" in an open syllable (tube, menu, sugar), "a" in a closed one (bun, cup, butter) — but full, push, put
      const closed = after.length >= 2 || (after.length === 1 && isLast);
      c = rColour ? 'a' : /[pbf]/.test(w[s - 1] ?? '') && /^(ll|sh|t$)/.test(after) ? 'u' : closed ? 'a' : 'U';
    }
    out += c;
  }
  if (syllabicL) out += 'a';
  return collapse(out);
}

/**
 * Edit distance over vowel classes: another vowel costs 1 (but ै vs a 0; ै vs e, ॉ vs ो, ि vs ी, ु vs ू ½), an "a"
 * gained or lost ½ (Hindi writes the schwa English drops: वायर = wire, आयरन = iron), any other vowel 1.
 */
function vowelDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const sub = (x: string, y: string) => {
    if (x === y) return 0;
    const p = [x, y].sort().join('');
    return p === 'Ea' ? 0 : p === 'Ee' || p === 'Oo' || p === 'Ii' || p === 'Uu' ? 0.5 : 1;
  };
  const gap = (x: string) => (x === 'a' ? 0.5 : 1);
  let prev = [0];
  for (let j = 1; j <= n; j++) prev[j] = prev[j - 1] + gap(b[j - 1]);
  for (let i = 1; i <= m; i++) {
    const cur = [prev[0] + gap(a[i - 1])];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + gap(a[i - 1]), cur[j - 1] + gap(b[j - 1]), prev[j - 1] + sub(a[i - 1], b[j - 1]));
    prev = cur;
  }
  return prev[n];
}
/** Most the vowels of a short sound match (two consonants, or one vowel) may differ: an "a" gained or lost, nothing changed. */
const SHORT_VOWEL_LIMIT = 0.5;

// --- catalogue vocabulary ---------------------------------------------------

export interface Vocab {
  words: Map<string, number>;          // word → how many listings use it
  bySkeleton: Map<string, string[]>;   // skeleton → words (indexed under each sound form)
  forms: Map<string, string[]>;        // word → its sound forms
  vowels: Map<string, string>;         // word → its vowel classes (englishVowels)
  starts: Set<string>;                 // every shorter start of a word ("cha", "chai" ← chair) — what a shopper may still be typing
  rows: Map<string, number[]>;         // word → the listings using it (ascending) — which words a listing has together
  near: Map<string, number[]>;         // word → the listings using it or a longer/shorter form of it (layer ~ layers, chocolate ~ choco); filled on use
  heard: Map<string, string | null>;   // Devanagari word → its sound match (soundMatch), remembered across queries
}

interface Named { name?: string | null; subcategory?: string | null; category?: string | null; metaKeywords?: string | null }

export function buildVocab(items: Named[]): Vocab {
  const words = new Map<string, number>();
  const rows = new Map<string, number[]>();
  items.forEach((it, row) => {
    const seen = new Set<string>();
    // name + subcategory only: broad category names ("BAR & BEVERAGE …") would make
    // "bar" look more common than "beer" and skew sound matches. Model codes with a
    // digit ("cm1y", "hs2s") are never spoken, and their digits vanish from a sound form.
    for (const w of `${it.name ?? ''} ${it.subcategory ?? ''}`.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length < 2 || /\d/.test(w) || seen.has(w)) continue;
      seen.add(w); words.set(w, (words.get(w) ?? 0) + 1);
      const list = rows.get(w); if (list) list.push(row); else rows.set(w, [row]);
    }
  });
  const bySkeleton = new Map<string, string[]>();
  const forms = new Map<string, string[]>();
  const vowels = new Map<string, string>();
  const starts = new Set<string>();
  for (const w of words.keys()) {
    const fs = englishForms(w);
    forms.set(w, fs);
    vowels.set(w, englishVowels(w));
    for (const sk of new Set(fs.map(strip))) {
      if (!sk) continue;
      const list = bySkeleton.get(sk); if (list) list.push(w); else bySkeleton.set(sk, [w]);
    }
    for (let i = 2; i < w.length; i++) starts.add(w.slice(0, i));
  }
  return { words, bySkeleton, forms, vowels, starts, rows, near: new Map(), heard: new Map() };
}

/**
 * The listings using a word in any form the English ranker would also match it in: as written, or
 * as the start of a longer word (layer → layers, roll → roller) or the other way round (chocolate → choco).
 */
function rowsNear(word: string, vocab: Vocab): number[] {
  let rows = vocab.near.get(word);
  if (!rows) {
    const ids = new Set<number>(vocab.rows.get(word) ?? []);
    for (const [w, list] of vocab.rows) {
      if (w !== word && ((word.length >= 3 && w.startsWith(word)) || (w.length >= 4 && word.startsWith(w)))) for (const id of list) ids.add(id);
    }
    rows = [...ids].sort((a, b) => a - b);
    vocab.near.set(word, rows);
  }
  return rows;
}

/** True when a single listing uses every one of these catalogue words (in some form). */
function together(ws: string[], vocab: Vocab): boolean {
  const lists: number[][] = [];
  for (const w of ws) { const l = rowsNear(w, vocab); if (!l.length) return false; lists.push(l); }
  lists.sort((a, b) => a.length - b.length);
  const inList = (l: number[], x: number) => {
    let lo = 0, hi = l.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (l[mid] === x) return true; if (l[mid] < x) lo = mid + 1; else hi = mid - 1; }
    return false;
  };
  return lists[0].some((row) => lists.every((l) => inList(l, row)));
}

/**
 * Pick the catalogue word that sounds like a Devanagari loan-word, or null when none sounds close enough.
 * Remembered per vocabulary (~1 ms a word, and voice queries repeat the same few hundred words); the
 * memo is cleared if it ever grows past any real vocabulary of spoken words.
 */
function soundMatch(dev: string, vocab: Vocab): string | null {
  let hit = vocab.heard.get(dev);
  if (hit === undefined) {
    if (vocab.heard.size >= 20000) vocab.heard.clear();
    hit = hearWord(dev, vocab);
    vocab.heard.set(dev, hit);
  }
  return hit;
}

function hearWord(dev: string, vocab: Vocab): string | null {
  const latin = devLatin(dev);
  const syllables = devVowels(dev);
  const vowels = collapse(syllables);
  const tries: [string, string][] = [[latin, vowels]];
  if (latin.length > 3) {
    // an English final "s" sounded as z, which Hindi writes ज़ (फ्राइज़ → fries)
    if (latin.endsWith('z')) tries.push([`${latin.slice(0, -1)}s`, vowels]);
    // a Hindi plural of a word the catalogue writes in the singular (नूडल्स → noodle, मोमोज़ → momo, डिशेज़ → dish)
    if (latin.endsWith('ez')) tries.push([latin.slice(0, -2), vowels.replace(/e$/, '')]);
    if (/(?:[^aeiou]s|[aeiou]z)$/.test(latin)) tries.push([latin.slice(0, -1), vowels]);
  }
  for (const [l, v] of tries) {
    const w = closestWord(l, v, syllables.length <= 1, vocab);
    if (w) return w;
  }
  return null;
}

/** The catalogue word that sounds closest to a romanised Devanagari word, within SOUND_LIMIT. */
function closestWord(latin: string, vowels: string, oneSyllable: boolean, vocab: Vocab): string | null {
  const form = soundForm(latin, false);
  const sk = strip(form);
  // one consonant is too ambiguous to sound-match — only a word spelt exactly like a catalogue word (मोमो → momo)
  if (sk.length < 2) return latin.length >= 3 && vocab.words.has(latin) ? latin : null;
  // same consonants, plus (longer words) one consonant off, e.g. two swapped — all scored together
  const pool = new Set(vocab.bySkeleton.get(sk) ?? []);
  if (sk.length >= 3) {
    for (const [k, ws] of vocab.bySkeleton) if (k !== sk && Math.abs(k.length - sk.length) <= 1 && osa(k, sk) === 1) for (const w of ws) pool.add(w);
  }
  let best: string | null = null, bestCost = Infinity;
  for (const w of pool) {
    // abbreviations (cm, ss, pc, gn) are spelt out in Hindi — एसएस, जीएन are in the dictionary — never heard as a word
    if ((w.length < 3 && sk.length > 2) || !vocab.vowels.get(w)) continue;
    const dist = Math.min(...(vocab.forms.get(w) ?? [w]).map((f) => soundDistance(form, f)));
    if (dist > SOUND_LIMIT) continue;
    const vd = vowelDistance(vowels, vocab.vowels.get(w) ?? '');
    if ((sk.length <= 2 || oneSyllable) && vd > SHORT_VOWEL_LIMIT) continue;
    // closest sound, then the closest vowels ("white" over "with" for व्हाइट), then the more common
    // catalogue word, then A→Z so the pick never depends on catalogue order
    const cost = dist * 20 + vd * 10 - Math.min(9, Math.log2(1 + (vocab.words.get(w) ?? 0)));
    if (cost < bestCost || (cost === bestCost && best !== null && w < best)) { bestCost = cost; best = w; }
  }
  return best;
}

/**
 * The first target the catalogue knows, preferring one a listing shares with the words already
 * in the query ("पोर्टेबल गैस चूल्हा" → stove, "दूध गरम करने" → boiler, "ब्रेड काटने" → slicer).
 */
function pick(targets: string[], vocab: Vocab | null, before: string[]): string {
  if (!vocab) return targets[0];
  const known = targets.filter((t) => t.split(' ').every((x) => vocab.words.has(x)));
  if (known.length > 1) {
    const ctx = before.filter((w) => vocab.words.has(w));
    for (const n of [ctx.length, 1]) {
      const near = ctx.slice(-n);
      if (near.length) for (const t of known) if (together([...near, ...t.split(' ')], vocab)) return t;
    }
  }
  return known[0] ?? targets[0];
}

/**
 * When no listing has all the query's catalogue words, read "machine" as "maker" where that is what
 * is sold ("पास्ता मशीन" → pasta maker), else drop the describing word that keeps the rest together
 * ("tea machine" → tea, "big strainer" → strainer), else, for "X वाली Y" / "X का Y", keep Y — the thing
 * itself ("काउंटर वाली घंटी" is a bell). The English ranker averages over the words, so a word no
 * listing shares with the others only lets every listing that has that one word tie with the real match.
 * `headFrom`: where the words after the last वाली/का start in `out` (0 = none).
 */
function relax(out: string[], vocab: Vocab, headFrom: number): string[] {
  const content = out.filter((w) => vocab.words.has(w));
  if (content.length < 2 || together(content, vocab)) return out;
  if (content.includes('machine') && vocab.words.has('maker') && together(content.map((w) => (w === 'machine' ? 'maker' : w)), vocab)) {
    return out.map((w) => (w === 'machine' ? 'maker' : w));
  }
  for (const soft of SOFT) {
    if (!content.includes(soft)) continue;
    const rest = content.filter((w) => w !== soft);
    if (together(rest, vocab)) return out.filter((w) => w !== soft);
  }
  const hard = content.filter((w) => !SOFT.includes(w));
  if (hard.length && hard.length < content.length && together(hard, vocab)) return out.filter((w) => !SOFT.includes(w));
  // still apart: keep the thing named after वाली/का ("बर्फ का गोला मशीन" → snowflakes machine), and those of
  // the words before it a listing has with it
  const head = headFrom > 0 ? out.slice(headFrom).filter((w) => vocab.words.has(w)) : [];
  if (!head.length || head.length === content.length || !together(head, vocab)) return out;
  const kept = [...head];
  for (const w of out.slice(0, headFrom).reverse()) if (vocab.words.has(w) && !kept.includes(w) && together([...kept, w], vocab)) kept.push(w);
  return out.filter((w) => !vocab.words.has(w) || kept.includes(w));
}

const noNukta = (w: string) => w.split(NUKTA).join('');
const DICT_BY_PLAIN = new Map(Object.keys(HI_DICT).map((k) => [noNukta(k), k]));
/** HI_DICT key for a Devanagari word: as written, with ँ for ं, or with or without nuktas (फ़्रिज = फ्रिज, मेज = मेज़). */
function dictKey(t: string): string | null {
  for (const k of [t, t.replace(/ँ/g, 'ं')]) if (has(HI_DICT, k)) return k;
  return DICT_BY_PLAIN.get(noNukta(t)) ?? null;
}

/** Endings glued onto a word: Marathi "of/for/in" (मिक्सरची, ओव्हनसाठी) and the Hindi plural (मशीनों, प्लेटें). */
const SUFFIXES = ['च्या', 'ची', 'चा', 'चे', 'साठी', 'मध्ये', 'ों', 'ें'].map((s) => s.normalize('NFC'));

/** A Devanagari word → English: dictionary, then sound, then the same without a glued-on ending. */
function devWord(t: string, vocab: Vocab | null, before: string[]): string | null {
  for (const w of [t, ...SUFFIXES.filter((s) => t.endsWith(s) && t.length > s.length + 1).map((s) => t.slice(0, -s.length))]) {
    const key = dictKey(w);
    if (key) return pick(HI_DICT[key], vocab, before);
    const sound = vocab ? soundMatch(w, vocab) : null;
    if (sound) return sound;
  }
  return null;
}

/** PHRASES by first word, for a name whose second word is still being typed (only ones that change the words). */
const PHRASE_BY_FIRST = new Map<string, [string, string][]>();
for (const [k, v] of Object.entries(PHRASES)) {
  if (v.startsWith('=') || v === k) continue;
  const [first, second] = k.split(' ');
  const list = PHRASE_BY_FIRST.get(first); if (list) list.push([second, v]); else PHRASE_BY_FIRST.set(first, [[second, v]]);
}
/** "garam mas" → "masala" while "garam masala" is being typed; null unless every name it could become reads the same. */
function phraseInProgress(first: string, partial: string): string | null {
  const outs = new Set((PHRASE_BY_FIRST.get(first) ?? []).filter(([second]) => second !== partial && second.startsWith(partial)).map(([, v]) => v));
  return outs.size === 1 ? [...outs][0] : null;
}

/** Zero-width (non-)joiners — typed to force a half letter, or pasted from web text — would split "मिक्<ZWJ>सर" in two. */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g;

/** Query → lowercase words: Devanagari digits read as digits, a number glued to a Hindi unit split off ("10लीटर"). */
function queryTokens(raw: string): string[] {
  const input = raw.slice(0, 300).replace(INVISIBLE, '').normalize('NFC')
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/(\d)(?=[ऀ-ॿ])/g, '$1 ').replace(/([ऀ-ॿ])(?=\d)/g, '$1 ');
  // keep a decimal point inside a number ("3.5 लीटर"); any other punctuation separates words
  return input.toLowerCase().replace(/(\d)\.(?=\d)/g, '$1\u0001').split(/[^\p{L}\p{M}\p{N}\u0001]+/u).filter(Boolean).map((t) => t.replace(/\u0001/g, '.'));
}

/** A number word right before a unit or a counted thing ("do burner", "teen deck", "paanch litre"). */
const countAt = (tokens: string[], i: number) => has(NUM, tokens[i]) && i + 1 < tokens.length && (has(GLUED_UNIT, tokens[i + 1]) || has(COUNTED, tokens[i + 1]));

/** Cheap pre-check so plain English queries never pay for a vocabulary build. */
export function mightNeedTranslation(raw: string): boolean {
  if (hasDevanagari(raw)) return true;
  const tokens = raw.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some((t, i) => (has(HINGLISH, t) && !INSIDE_HINDI_ONLY.has(t)) || PHRASE_FIRST.has(t) || countAt(tokens, i)
    || (tokens.length > 1 && (HINGLISH_FILLER.has(t) || HINDI_LINK.has(t))));
}

export interface QueryTranslation {
  /** Query to rank with (English). Equal to the input when nothing needed translating. */
  query: string;
  /** True when Hindi / Hinglish words were turned into English ones. */
  translated: boolean;
}

/**
 * Turn a Hindi, Hinglish or mixed query into the English words the catalogue
 * uses. Pass the vocabulary of the items being searched (buildVocab) so sound
 * matches land on real catalogue words; without it only the dictionary applies.
 */
export function translateQuery(raw: string, vocab: Vocab | null): QueryTranslation {
  const tokens = queryTokens(raw).slice(0, MAX_TOKENS);
  if (!tokens.length) return { query: raw, translated: false };

  const last = tokens.length - 1;
  const hasDev = tokens.some(hasDevanagari);
  const pairAt = (i: number) => (i < last ? `${tokens[i]} ${tokens[i + 1]}` : '');
  const isWord = (t: string) => !!vocab?.words.has(t);
  // romanised Hindi that is not also English: neither a catalogue word nor the start of one
  const plainHindi = (t: string) => has(HINGLISH, t) && !INSIDE_HINDI_ONLY.has(t) && !isWord(t) && !vocab?.starts.has(t);
  // the last word may be English still being typed ("…mountable hai" → hair, "fryer ke" → kettle)
  const typing = (t: string, i: number) => i === last && (isWord(t) || !!vocab?.starts.has(t));
  const filler = tokens.length > 1 && tokens.some((t, i) => HINGLISH_FILLER.has(t) && !typing(t, i));
  const link = tokens.length > 1 && tokens.some((t, i) => HINDI_LINK.has(t) && !isWord(t) && !typing(t, i));
  // A romanised word that IS a catalogue word ("thali", "atta") stays. One that only starts a catalogue
  // word ("chai" → chair, "pani" → panini, "gol" → golden) may be English, or still being typed — it is
  // rewritten only next to something plainly Hindi ("mujhe chai", "chai ki machine") or before the
  // name of a machine ("chai machine"); "chai cup", "gol tray" and a lone "chai" stay as typed.
  const rewrite = (t: string, i: number) =>
    has(HINGLISH, t) && !INSIDE_HINDI_ONLY.has(t) && !isWord(t)
    && (plainHindi(t) || hasDev || filler || (i < last && (link || MACHINE_WORD.has(tokens[i + 1]))));
  // a two-word name still being typed ("garam mas" → masala, "kali mi" → pepper)
  const typedPhrase = last > 0 ? phraseInProgress(tokens[last - 1], tokens[last]) : null;
  const hit = hasDev || filler || link || typedPhrase !== null
    || tokens.some((t, i) => rewrite(t, i) || has(PHRASES, pairAt(i)) || countAt(tokens, i));
  if (!hit) return { query: raw, translated: false };

  const out: string[] = [];
  const push = (s: string) => { for (const w of s.split(' ')) if (w) out.push(w); };
  let made: string | null = null; // the thing before "बनाने" ("पास्ता बनाने की मशीन")
  let headFrom = 0; // where the words after the last वाली/का start ("काउंटर वाली घंटी")
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i], next = tokens[i + 1];
    const pair = pairAt(i);
    if (pair && has(PHRASES, pair)) {
      const p = PHRASES[pair];
      push(p.startsWith('=') ? pick(p.slice(1).split(' '), vocab, out) : p);
      i++; continue;
    }
    if (typedPhrase !== null && i === last - 1) { push(typedPhrase); break; }
    // numbers: "पांच लीटर" / "8 लीटर" → "5l" / "8l", "500 ग्राम" → "500g", the way the catalogue writes sizes;
    // "दो बर्नर" / "do burner" → "2 burner", "दो हेड" → "double head", the way it writes counts
    let num: string | null = null;
    if (/^\d+(\.\d+)?$/.test(t)) num = t;
    else if (has(NUM, t) && (!AMBIGUOUS_NUM.has(t) || countAt(tokens, i))) num = NUM[t];
    if (num) {
      if (next && has(GLUED_UNIT, next)) { out.push(`${num}${GLUED_UNIT[next]}`); i++; continue; }
      if (next && has(COUNTED, next)) {
        const noun = COUNTED[next];
        out.push(SPELLED_COUNT.has(noun) && has(COUNT_WORD, num) ? COUNT_WORD[num] : num, noun);
        i++; continue;
      }
      out.push(num); continue;
    }
    if (MAKE.has(t)) { made = [...out].reverse().find((w) => isWord(w)) ?? null; continue; }
    if (OF.has(t)) { headFrom = out.length; continue; }
    // a unit with no number ("कितने लीटर") says nothing about the product
    if (STOP.has(t) || has(GLUED_UNIT, t)) continue;
    if (hasDevanagari(t)) {
      // no dictionary entry and nothing in the catalogue sounds like it: drop the word rather than guess
      const w = devWord(t, vocab, out);
      if (w) push(w);
      continue;
    }
    if (rewrite(t, i) || (INSIDE_HINDI_ONLY.has(t) && has(HINGLISH, t))) { push(pick(HINGLISH[t], vocab, out)); continue; }
    out.push(t);
  }
  let words = out;
  if (vocab) {
    // "X बनाने की मशीन" is an X maker when the catalogue sells one ("pasta maker", "ice … maker")
    if (made && vocab.words.has('maker') && together([made, 'maker'], vocab)) {
      words = words.includes('machine') ? words.map((w) => (w === 'machine' ? 'maker' : w)) : words.includes('maker') ? words : [...words, 'maker'];
    }
    words = relax(words, vocab, headFrom);
  }
  // a word said twice ("tandoor oven" → oven oven, "chulha 2 burner" → burner 2 burner) is kept once, in
  // its last place; "kadhai pan" is just a wok
  words = words.filter((w, i) => /^\d/.test(w) || !words.includes(w, i + 1)).filter((w, i, a) => !(w === 'pan' && a[i - 1] === 'wok'));
  const query = words.join(' ').trim();
  // never return an empty query (e.g. the customer only said "दिखाओ")
  if (!query || query === raw.trim().toLowerCase()) return { query: raw, translated: false };
  return { query, translated: true };
}
