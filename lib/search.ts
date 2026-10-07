/**
 * Shared "smart search" ranking — used by BOTH the header autocomplete
 * (`/api/search`) and the full shop filter (`ShopView`) so the two surfaces
 * behave identically.
 *
 * Goals (in priority order):
 *   1. Correct spelling -> the most accurate match ranks first.
 *      Exact > prefix > substring matches always outrank fuzzy ones.
 *   2. Misspelled / typo'd query -> still surface *similar* products via
 *      typo-tolerant fuzzy matching (Damerau/OSA edit distance, which also
 *      forgives the most common typo: two adjacent letters swapped —
 *      "kettel" -> "kettle").
 *
 * Zero dependencies and no DB extension (no pg_trgm) required — it runs the
 * same in a Node API route and in the browser. Catalog is ~2k rows so an
 * in-memory rank per query is cheap.
 */

import { buildVocab, mightNeedTranslation, translateQuery, type QueryTranslation, type Vocab } from './hindi-query';
import { applySynonyms, catalogueText, mightHaveSynonym } from './search-synonyms';

/** Fields a rankable item may expose. All optional; missing fields are skipped. */
export interface Searchable {
  name?: string | null;
  sku?: string | null;
  subcategory?: string | null;
  category?: string | null;
  metaKeywords?: string | null;
  /** ALT words set in admin: other names customers search it by, comma-separated, any script. */
  searchAliases?: string | null;
  /** Only used as a tie-breaker (in-stock first), never for matching. */
  stock?: number | null;
}

/** Per-field weight. A strong name match should beat a weak keyword match. */
const FIELD_WEIGHTS: { key: keyof Searchable; weight: number }[] = [
  { key: 'name', weight: 1.0 },
  { key: 'sku', weight: 0.95 },
  // English ALT words also match typo-tolerantly through the normal scorer;
  // any-script ones (दारू) are matched against the customer's own words below.
  { key: 'searchAliases', weight: 0.9 },
  { key: 'subcategory', weight: 0.6 },
  { key: 'category', weight: 0.5 },
  { key: 'metaKeywords', weight: 0.45 },
];

/** Items scoring below this are treated as non-matches and dropped. */
export const MIN_SCORE = 0.33;

/**
 * Longest query we rank. Each extra word costs an edit-distance pass over the
 * catalogue, and a long spoken sentence or a pasted description would otherwise
 * freeze /shop on every keystroke. No product query needs more.
 */
export const MAX_QUERY_CHARS = 120;

/**
 * Lowercase, strip diacritics, collapse punctuation/whitespace to single
 * spaces. "Cafe  Creme!" -> "cafe creme".
 */
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Optimal String Alignment distance (Damerau-Levenshtein restricted to
 * adjacent transpositions). Good enough for query-length strings and treats a
 * single swapped-letter typo as distance 1.
 */
function osaDistance(a: string, b: string, max = 4): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Cheap early-out: if the length gap already exceeds the tolerance the
  // caller will accept, the distance can only be larger — skip the matrix.
  if (Math.abs(m - n) > max) return Math.abs(m - n);

  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[m][n];
}

/**
 * Edit distance we'll forgive for a token of the given length. Deliberately
 * tight: distance 3 on a 7-char word (43% different) let unrelated words match
 * (e.g. query "charger" fuzzy-matching "gear"), which inflated products that
 * only really matched a *different* query word. Capping longer tokens at 2
 * keeps genuine typos (transpositions / one-off letters) while rejecting
 * coincidental near-misses.
 */
function allowedDistance(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

/**
 * Score how well a single query token matches one field word, in [0, 1].
 * Tiered so exact/prefix/substring always beat fuzzy.
 */
function tokenWordScore(token: string, word: string): number {
  if (word === token) return 1.0;
  if (token.length >= 2 && word.startsWith(token)) return 0.85;
  if (token.length >= 3 && word.includes(token)) return 0.65;
  // Fuzzy fallback — forgives typos but always scores below substring.
  const allowed = allowedDistance(token.length);
  const dist = osaDistance(word, token, allowed);
  if (dist <= allowed) {
    const sim = 1 - dist / Math.max(word.length, token.length);
    return 0.45 + 0.3 * sim; // ~0.45 - 0.75
  }
  return 0;
}

/**
 * Score how well the whole query matches one field's text, in [0, 1].
 *
 * We compute BOTH a whole-string score (exact / whole-word / prefix / substring
 * tiers) AND a per-token average (every query word must land somewhere), then
 * return the higher of the two.
 *
 * Taking the max matters for multi-word queries: searching "cream charger",
 * the product "…Cream Chargers…" contains the substring "cream charger" (tier
 * = 0.8) but ALSO matches both words strongly (cream = exact word, charger =
 * prefix of "chargers" → token avg ≈ 0.93). Returning only the substring tier
 * capped it at 0.8, letting a product that matches just ONE word ("Ice Cream
 * Scoop") edge ahead. Taking the max lets the true full match win.
 *
 * The whole-word tier also means an exact keyword outranks a query that merely
 * appears inside a longer word — "pan" ranks "Frying Pan" above "Panini Press".
 */
function fieldScore(fieldText: string, q: PreparedQuery): number {
  const { f, words } = normalizedField(fieldText);
  if (!f) return 0;
  const { qn, qTokens, memo } = q;

  let whole = 0;
  if (f === qn) whole = 1.0; // the whole field is exactly the query
  else if (words.includes(qn)) whole = 0.95; // the query is an exact, whole word
  else if (f.startsWith(qn)) whole = 0.88; // the query is a prefix (possibly mid-word)
  else if (qn.length >= 3 && f.includes(qn)) whole = 0.8; // substring somewhere

  let sum = 0;
  for (let i = 0; i < qTokens.length; i++) {
    const t = qTokens[i];
    const seen = memo[i];
    let best = 0;
    for (const w of words) {
      let s = seen.get(w);
      if (s === undefined) {
        s = tokenWordScore(t, w);
        seen.set(w, s);
      }
      if (s > best) best = s;
      if (best === 1.0) break;
    }
    sum += best;
  }
  const tokenAvg = sum / qTokens.length;

  return Math.max(whole, tokenAvg);
}

/**
 * A query prepared once and reused for every item it is scored against: the
 * normalised text, its tokens, and per token a memo of tokenWordScore. The
 * catalogue repeats a few thousand words across ~2k rows × 5 fields, so each
 * (token, word) pair is scored once per query instead of once per occurrence —
 * the same scores, without re-running the edit distance thousands of times.
 */
interface PreparedQuery {
  qn: string;
  qTokens: string[];
  memo: Map<string, number>[];
}

function prepareQuery(rawQuery: string): PreparedQuery | null {
  const qn = normalize(rawQuery);
  if (!qn) return null;
  const qTokens = qn.split(' ');
  return { qn, qTokens, memo: qTokens.map(() => new Map<string, number>()) };
}

/**
 * normalize() + split of a field's text, cached across queries (field text
 * repeats on every keystroke). Cleared when it grows past any real catalogue's
 * size so a long-running server can't accumulate it without bound.
 */
const fieldCache = new Map<string, { f: string; words: string[] }>();
function normalizedField(text: string): { f: string; words: string[] } {
  let hit = fieldCache.get(text);
  if (!hit) {
    if (fieldCache.size >= 50000) fieldCache.clear();
    const f = normalize(text);
    hit = { f, words: f.split(' ') };
    fieldCache.set(text, hit);
  }
  return hit;
}

function scorePrepared(item: Searchable, q: PreparedQuery): number {
  let best = 0;
  for (const { key, weight } of FIELD_WEIGHTS) {
    const val = item[key];
    if (typeof val !== 'string' || !val) continue;
    const s = fieldScore(val, q) * weight;
    if (s > best) best = s;
    if (best >= 1.0) break;
  }
  return best;
}

/** Relevance score for an item against the (raw) query. 0 = no match. */
export function scoreItem(item: Searchable, rawQuery: string): number {
  const q = prepareQuery(rawQuery);
  return q ? scorePrepared(item, q) : 0;
}

/**
 * Vocabularies built lately, newest first. Two, so a collection page
 * (/shop?collection=…, a smaller list) doesn't evict the full catalogue's that
 * every /api/search request uses.
 */
interface CatalogueEntry {
  items: readonly Searchable[];
  signature: string;
  /** Built on first need — a query with only customer names never pays for it. */
  vocab?: Vocab;
  /** Every listing's name + subcategory, for the synonym "already a catalogue phrase" check. */
  text?: string;
  inCatalogue: Map<string, boolean>;
  /** Every listing's ALT words by first word, longest first. */
  aliases?: Map<string, string[][]>;
}
const vocabCache: CatalogueEntry[] = [];
const VOCAB_CACHE_SIZE = 2;

/**
 * Fingerprint of the words a vocabulary is built from (every name +
 * subcategory). The catalogue arrives as a fresh array on every request
 * (unstable_cache JSON-parses it), so array identity alone never matched.
 * Summed per-row hashes don't depend on row order, so the shop list and the
 * search index — same rows, different order — share one vocabulary. ~1 ms for
 * the whole catalogue against ~20 ms to rebuild it.
 */
function vocabSignature(items: readonly Searchable[]): string {
  let sum = 0;
  for (const it of items) {
    const s = `${it.name ?? ''}\u0001${it.subcategory ?? ''}\u0001${it.searchAliases ?? ''}`;
    let h = 0x811c9dc5; // FNV-1a
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    sum = (sum + (h >>> 0)) % 0x100000000;
  }
  return `${items.length}:${sum}`;
}

function catalogueEntry(items: readonly Searchable[]): CatalogueEntry {
  let i = vocabCache.findIndex((c) => c.items === items);
  if (i < 0) {
    const signature = vocabSignature(items);
    i = vocabCache.findIndex((c) => c.signature === signature);
    if (i >= 0) vocabCache[i].items = items;
    else i = vocabCache.push({ items, signature, inCatalogue: new Map() }) - 1;
  }
  const [hit] = vocabCache.splice(i, 1);
  vocabCache.unshift(hit);
  vocabCache.length = Math.min(vocabCache.length, VOCAB_CACHE_SIZE);
  return hit;
}

/**
 * Does any listing's name or subcategory already contain this phrase (whole
 * words)? A one-word phrase also counts when it starts a catalogue word: it may
 * be that word still being typed ("mandolin" → Mandoline).
 */
function phraseInCatalogue(entry: CatalogueEntry, phrase: string): boolean {
  let found = entry.inCatalogue.get(phrase);
  if (found === undefined) {
    entry.text ??= entry.items.map((it) => catalogueText(it.name, it.subcategory)).join('\n');
    found = entry.text.includes(phrase.includes(' ') ? ` ${phrase} ` : ` ${phrase}`);
    entry.inCatalogue.set(phrase, found);
  }
  return found;
}

/** Generic words right after an ALT word that add nothing ("दारू की मशीन", "daru wala"). */
const ALIAS_TAIL = new Set(['machine', 'mashin', 'मशीन', 'wala', 'wali', 'wale', 'वाला', 'वाली', 'वाले', 'ki', 'ka', 'ke', 'की', 'का', 'के']);

function aliasIndex(entry: CatalogueEntry): Map<string, string[][]> {
  if (!entry.aliases) {
    const index = new Map<string, string[][]>();
    for (const it of entry.items) {
      for (const phrase of aliasPhrases(it)) {
        const list = index.get(phrase[0]) ?? [];
        if (!list.some((p) => p.join(' ') === phrase.join(' '))) list.push(phrase);
        index.set(phrase[0], list);
      }
    }
    index.forEach((list) => list.sort((a, b) => b.length - a.length));
    entry.aliases = index;
  }
  return entry.aliases;
}

/**
 * Split the customer's ALT words (and the generic words right after them) out
 * of the query. rankEnglish matches them against each product's ALT words
 * itself, so the translator must not see them — it would drop दारू and leave
 * only "machine". An ALT word that is also a phrase in some listing's name
 * stays in the query: that is a product's own name and ranks normally (so a
 * careless ALT word like "glass" can't take over). The last word may still be
 * being typed ("दार" → दारू).
 */
function splitAliasWords(raw: string, entry: CatalogueEntry): { rest: string; aliases: string[][]; aliasWords: number } | null {
  const index = aliasIndex(entry);
  if (!index.size) return null;
  const words = anyScriptWords(raw);
  const last = words.length - 1;
  const rest: string[] = [];
  const aliases: string[][] = [];
  let aliasWords = 0;
  for (let i = 0; i < words.length; i++) {
    const own = (p: string[]) => /^[a-z0-9 ]+$/.test(p.join(' ')) && phraseInCatalogue(entry, p.join(' '));
    let match = (index.get(words[i]) ?? []).find((p) => p.every((w, k) => words[i + k] === w) && !own(p));
    if (!match && i === last && words[i].length >= 3) {
      // half-typed last word: every ALT word it starts
      const typed = [...index.values()].flat().filter((p) => p.length === 1 && p[0].startsWith(words[i]) && !own(p));
      if (typed.length) { aliases.push(...typed); aliasWords++; continue; }
    }
    if (!match) { rest.push(words[i]); continue; }
    aliases.push(match);
    aliasWords += match.length;
    i += match.length - 1;
    while (i + 1 < words.length && ALIAS_TAIL.has(words[i + 1])) i++;
  }
  return aliases.length ? { rest: rest.join(' '), aliases, aliasWords } : null;
}

/** englishQuery's answer: the English words to rank with, plus any ALT words the customer used. */
export interface EnglishQuery extends QueryTranslation {
  /** ALT words found in the customer's query (each as words); products carrying one rank first. */
  aliases: string[][];
  /** How many of the customer's words those ALT words took up. */
  aliasWords: number;
}

/**
 * The English query to rank `items` with. Three steps, all leaving a plain
 * English query untouched:
 *   0. ALT words set on products in admin ("दारू" on the beer towers) come out
 *      of the query — rankEnglish matches them against the customer's own words;
 *   1. names customers use for a product ("mosquito killer", "मच्छर की मशीन")
 *      become the words our listings use ("pest controller") — lib/search-synonyms;
 *   2. Hindi (Devanagari) and Hinglish words — typed, or heard by voice search —
 *      become the catalogue's English words (lib/hindi-query).
 * Pass the whole catalogue, not a filtered slice: the vocabulary decides which
 * English word a Hindi one becomes, and it must not change with the filters.
 * The query can come back empty when it held only ALT words; rank it anyway.
 */
export function englishQuery(items: readonly Searchable[], rawQuery: string): EnglishQuery {
  let query = rawQuery;
  let renamed = false;
  const split = splitAliasWords(rawQuery, catalogueEntry(items));
  if (split) query = split.rest;
  const aliases = split?.aliases ?? [];
  const aliasWords = split?.aliasWords ?? 0;
  if (mightHaveSynonym(query)) {
    const entry = catalogueEntry(items);
    const rewritten = applySynonyms(query, (phrase) => phraseInCatalogue(entry, phrase));
    if (rewritten !== null) {
      query = rewritten;
      renamed = true;
    }
  }
  if (!mightNeedTranslation(query)) return { query, translated: renamed, aliases, aliasWords };
  const entry = catalogueEntry(items);
  entry.vocab ??= buildVocab(items as Searchable[]);
  const t = translateQuery(query, entry.vocab);
  return { query: t.query, translated: t.translated || renamed, aliases, aliasWords };
}

/**
 * Rank items by relevance to `rawQuery`, dropping non-matches. Ties break on
 * in-stock first, then name A->Z, so the order is stable and sensible.
 */
export function rankItems<T extends Searchable>(items: T[], rawQuery: string): T[] {
  return rankEnglish(items, englishQuery(items, rawQuery));
}

/** A query or ALT word as lowercase words in any script (NFC, no nukta / zero-width marks). */
function anyScriptWords(s: string): string[] {
  return s.normalize('NFC').toLowerCase().replace(/[़​-‍⁠﻿]/g, '').split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
}

/** An item's ALT words, each as words. Cached per item object — the lists are reused across queries. */
const aliasCache = new WeakMap<object, string[][]>();
function aliasPhrases(item: Searchable): string[][] {
  if (!item.searchAliases) return [];
  let phrases = aliasCache.get(item as object);
  if (!phrases) {
    phrases = item.searchAliases.split(/[,;\n]+/).map(anyScriptWords).filter((w) => w.length > 0);
    aliasCache.set(item as object, phrases);
  }
  return phrases;
}

/** Does the item carry one of these ALT words? (This is how दारू finds the beer tower — the English ranker never sees Devanagari.) */
function hasAlias(item: Searchable, wanted: string[][]): boolean {
  const own = aliasPhrases(item);
  return own.length > 0 && wanted.some((w) => own.some((p) => p.length === w.length && p.every((x, k) => x === w[k])));
}

/** Score for a product found by one of its ALT words: just under an exact name match. */
const ALIAS_SCORE = 0.95;

/**
 * rankItems for a query already through englishQuery — for a caller that
 * translates once against the whole catalogue and then ranks a filtered slice
 * of it (ShopView). A plain string ranks as English with no ALT words.
 */
export function rankEnglish<T extends Searchable>(items: T[], english: string | EnglishQuery): T[] {
  const { query, aliases, aliasWords } = typeof english === 'string' ? { query: english, aliases: [], aliasWords: 0 } : english;
  const q = prepareQuery(query);
  if (!q && !aliases.length) return [];
  // When the customer used ALT words, a product that matches only the rest of
  // the query matched only part of what they said: "daru glass" → glasses
  // tagged daru first, then the other daru products, then other glass items.
  const restShare = aliases.length && q ? q.qTokens.length / (q.qTokens.length + aliasWords) : 1;
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const base = q ? scorePrepared(item, q) : 0;
    const score = aliases.length && hasAlias(item, aliases) ? ALIAS_SCORE + 0.05 * base : base * restShare;
    if (score >= MIN_SCORE) scored.push({ item, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const as = (a.item.stock ?? 0) > 0 ? 1 : 0;
    const bs = (b.item.stock ?? 0) > 0 ? 1 : 0;
    if (bs !== as) return bs - as;
    return (a.item.name ?? '').localeCompare(b.item.name ?? '');
  });
  return scored.map((s) => s.item);
}
