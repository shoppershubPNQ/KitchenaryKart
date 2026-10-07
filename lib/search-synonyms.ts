/**
 * What customers call a product → the words our listings use.
 *
 * A buyer looking for a pest controller may type or say "mosquito killer",
 * "machhar machine", "मच्छर मारने की मशीन" or "bug zapper" — none of which is in
 * a listing name. Each entry maps those everyday names (English, Hinglish and
 * Hindi) to the catalogue phrase that finds the right products; the search then
 * runs with that phrase (and /shop says "Showing results for …").
 *
 * Safe for English search by construction:
 *   - a name only fires as whole words ("fly" never matches "butterfly");
 *   - a Latin-script name that appears in any listing's name or subcategory is
 *     switched off automatically, so a product that really is called "Mosquito
 *     Killer" one day is found by its own name, not rewritten (a one-word name
 *     that merely starts a catalogue word is off too — it may be that word
 *     half-typed);
 *   - after a match, generic words that follow it ("… machine", "… की मशीन",
 *     "… wala") are absorbed, so "मच्छर की मशीन" doesn't drift to every machine.
 *
 * Adding an entry (in search-synonyms-data.ts): `to` must be words our listings use (check that searching it
 * shows the right products); `say` holds the other names, lowercase. Plurals
 * ("mosquitoes", "flies") are handled; Hindi spellings with and without the
 * nukta dot match each other. Run the search test suite after editing.
 */
import { SYNONYM_DATA } from './search-synonyms-data';

export interface Synonym {
  /** Catalogue words to search with. */
  to: string;
  /** What customers call it (any script). */
  say: string[];
}

/** The table itself lives in search-synonyms-data.ts (324 product types, ~2,900 names). */
export const SYNONYMS: Synonym[] = SYNONYM_DATA;

/** Generic words that follow a name and add nothing ("mosquito machine", "मच्छर की मशीन", "machhar wala"). */
const TAIL = new Set([
  'machine', 'mashin', 'mashine', 'machin', 'device', 'yantra', 'मशीन', 'यंत्र',
  'wala', 'wali', 'wale', 'वाला', 'वाली', 'वाले', 'ki', 'ka', 'ke', 'की', 'का', 'के',
  'marne', 'maarne', 'maar', 'mar', 'मारने', 'मार', 'bhagane', 'भगाने',
]);

/** Lowercase, NFC, no nukta or zero-width marks, singular for Latin words. */
function norm(token: string): string {
  const t = token.normalize('NFC').toLowerCase().replace(/[़​-‍⁠﻿]/g, '');
  if (!/^[a-z]+$/.test(t) || t.length < 4) return t;
  if (t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.endsWith('oes')) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

/** Words of a query; a decimal point inside a number ("3.5l") stays. */
const tokens = (s: string) =>
  s.normalize('NFC').replace(/(\d)\.(?=\d)/g, '$1\u0001').split(/[^\p{L}\p{M}\p{N}\u0001]+/u).filter(Boolean).map((t) => t.replace(/\u0001/g, '.'));

interface Phrase { words: string[]; to: string; latin: boolean }
/** Customer names by their first word, longest first. */
export type SynonymIndex = Map<string, Phrase[]>;

export function compileSynonyms(list: Synonym[]): SynonymIndex {
  const index: SynonymIndex = new Map();
  for (const s of list) {
    for (const say of s.say) {
      const words = tokens(say).map(norm);
      if (!words.length) continue;
      const phrases = index.get(words[0]) ?? [];
      phrases.push({ words, to: s.to, latin: /^[a-z0-9 .]+$/.test(words.join(' ')) });
      index.set(words[0], phrases);
    }
  }
  index.forEach((phrases) => phrases.sort((a, b) => b.words.length - a.words.length));
  return index;
}

const DEFAULT_INDEX = compileSynonyms(SYNONYMS);

/** True when any listing's name or subcategory already contains the phrase as whole words. */
export type InCatalogue = (phrase: string) => boolean;

/** " lowercase singular words " of a listing's name + subcategory, for InCatalogue checks. */
export function catalogueText(name: string | null | undefined, subcategory: string | null | undefined): string {
  return ` ${tokens(`${name ?? ''} ${subcategory ?? ''}`).map(norm).join(' ')} `;
}

/** Cheap check before any catalogue work: could this query contain a customer name at all? */
export function mightHaveSynonym(raw: string, index: SynonymIndex = DEFAULT_INDEX): boolean {
  return tokens(raw).some((t) => index.has(norm(t)));
}

/**
 * Replace customer names in `raw` with catalogue words. Returns the new query,
 * or null when nothing matched (the caller keeps the original untouched).
 */
export function applySynonyms(raw: string, inCatalogue: InCatalogue, index: SynonymIndex = DEFAULT_INDEX): string | null {
  const words = tokens(raw);
  const keys = words.map(norm);
  const out: string[] = [];
  let changed = false;
  for (let i = 0; i < words.length; i++) {
    const match = (index.get(keys[i]) ?? []).find(
      (p) => p.words.every((w, k) => keys[i + k] === w) && !(p.latin && inCatalogue(p.words.join(' '))),
    );
    if (!match) { out.push(words[i]); continue; }
    if (!out.includes(match.to)) out.push(match.to);
    changed = true;
    i += match.words.length - 1;
    while (i + 1 < words.length && TAIL.has(keys[i + 1])) i++;
  }
  return changed ? out.join(' ') : null;
}
