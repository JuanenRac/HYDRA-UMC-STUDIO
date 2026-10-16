/**
 * How the assistant answers a question typed in words, with no server and no model: the question is normalised (capitals, accents and punctuation gone, so "¿Cómo MUEVO el robot?"
 * and "como muevo el robot" are the same), matched against the words of every task in knowledge.ts in every language at once (so a question in another language than the interface's
 * still finds its task, and the answer comes in the interface's language), and, when no task fits, against the paragraphs of the Help of every menu. It says plainly when it found nothing.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0
 */
import { TOPICS, type Locale, type Topic } from "./knowledge";

export const ORDER: readonly Locale[] = ["en", "es", "de", "fr", "it", "ja", "zh", "pt"];

/** The language of the interface as one of the eight the assistant knows (anything else is English). */
export function localeOf(code: string | undefined): Locale {
  const base = (code ?? "en").toLowerCase().slice(0, 2);
  return (ORDER as readonly string[]).includes(base) ? (base as Locale) : "en";
}

/** Lower case, no accents, no punctuation, single spaces. Kana and ideographs are kept as they are. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss").replace(/[^\p{L}\p{N}\p{M}]+/gu, " ").trim();
}

const CJK = /[⺀-鿿豈-﫿]/;
const hasCjk = (text: string): boolean => CJK.test(text);

type Term = { text: string; weight: number };
type Prepared = { topic: Topic; terms: Term[]; questions: string[] };
let prepared: Prepared[] | null = null;
function prepare(): Prepared[] {
  if (prepared) return prepared;
  prepared = TOPICS.map(topic => {
    const terms = new Map<string, number>();
    // the words that say the task, each worth its length ...
    for (const term of topic.kw.flatMap(list => list.split("|")).map(normalize)) if (term.length >= 2) terms.set(term, Math.min(Math.max(term.length, 4), 12));
    // ... and the content words of its sample question, each worth half: a question phrased like the sample finds it even when the keywords did not foresee the phrasing
    for (const question of topic.q) for (const word of contentWords(question)) if (!terms.has(word)) terms.set(word, Math.max(2, Math.min(word.length, 12) / 2));
    return { topic, terms: Array.from(terms, ([text, weight]) => ({ text, weight })), questions: topic.q.map(normalize) };
  });
  return prepared;
}

const HIRAGANA_ONLY = /^[぀-ゟ]+$/;

/** The words of a sample question that carry its meaning: alphabetic words of four letters or more that are not stop words, and the pairs of characters of Japanese and Chinese that are not only particles. */
function contentWords(question: string): string[] {
  const out: string[] = [];
  for (const word of normalize(question).split(" ")) {
    if (!word) continue;
    if (hasCjk(word)) { for (let i = 0; i < word.length - 1; i += 1) { const pair = word.slice(i, i + 2); if (!HIRAGANA_ONLY.test(pair) && hasCjk(pair)) out.push(pair); } }
    else if (word.length >= 4 && !STOP.has(word)) out.push(word);
  }
  return out;
}

/** Two alphabetic words are the same word when they are equal or when they differ only by the end of the longer one (conecta, conectar; aktualisiere, aktualisieren; but not sensor and sensibilidad). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const shortest = Math.min(a.length, b.length);
  if (shortest < 4 || Math.abs(a.length - b.length) > 3) return false;
  let common = 0;
  while (common < shortest && a[common] === b[common]) common += 1;
  return common >= shortest - 1 && common >= 3;
}

/** Where a term is in the (normalised) question, as the keys of the words (or characters) it covers; null when it is not there. Whole words in order for alphabetic languages (a word may be another form of the same word), anywhere for Japanese and Chinese. */
function coverage(query: string, term: string): string[] | null {
  if (hasCjk(term)) {
    const at = query.indexOf(term);
    return at < 0 ? null : Array.from({ length: term.length }, (_, k) => `c${at + k}`);
  }
  const wanted = term.split(" "), words = query.split(" ");
  for (let i = 0; i + wanted.length <= words.length; i += 1) {
    if (wanted.every((word, k) => sameWord(words[i + k]!, word))) return wanted.map((_, k) => `w${i + k}`);
  }
  return null;
}

export type Scored = { topic: Topic; score: number };

/** The tasks that fit the question, best first. A longer matching phrase counts for more than a short word. */
export function rankTopics(question: string, useExact = true): Scored[] {
  const query = normalize(question);
  if (!query) return [];
  const scored: Scored[] = [];
  for (const item of prepared ?? prepare()) {
    let score = useExact && item.questions.includes(query) ? 100 : 0;
    // each word of the question counts once, for the best term that covers it: the same idea said in four languages is not four hits
    const found: Array<{ weight: number; keys: string[] }> = [];
    for (const term of item.terms) { const keys = coverage(query, term.text); if (keys) found.push({ weight: term.weight, keys }); }
    const used = new Set<string>();
    for (const hit of found.sort((a, b) => b.weight - a.weight)) {
      if (hit.keys.some(key => used.has(key))) continue;
      for (const key of hit.keys) used.add(key);
      score += hit.weight;
    }
    if (score > 0) scored.push({ topic: item.topic, score });
  }
  return scored.sort((a, b) => b.score - a.score);
}

/** For the tests and for finding out why a question went where it went: the terms of a task that the question hit, with their weights. */
export function explain(question: string, id: string): Array<{ term: string; weight: number }> {
  const query = normalize(question);
  const item = (prepared ?? prepare()).find(entry => entry.topic.id === id);
  return item ? item.terms.filter(term => coverage(query, term.text)).map(term => ({ term: term.text, weight: term.weight })) : [];
}

// ---- the Help of every menu, as a second source ----
const STOP = new Set([
  "the", "and", "for", "how", "can", "does", "what", "where", "when", "with", "this", "that", "from", "into", "you", "your", "are", "was", "will", "have", "has",
  "como", "que", "donde", "cuando", "con", "para", "por", "una", "uno", "los", "las", "del", "mis", "tus", "hay", "esta", "este", "puedo", "quiero",
  "wie", "was", "wo", "wann", "und", "der", "die", "das", "ein", "eine", "ich", "kann", "mit", "für", "von", "ist",
  "comment", "quoi", "pour", "avec", "une", "des", "les", "est", "sont", "puis", "peux", "dans", "sur",
  "come", "cosa", "dove", "quando", "con", "per", "una", "uno", "gli", "del", "sono", "posso",
  "como", "onde", "quando", "com", "para", "uma", "dos", "das", "pode", "posso", "quero",
]);

function tokens(question: string): string[] {
  const query = normalize(question);
  const out: string[] = [];
  for (const word of query.split(" ")) {
    if (!word) continue;
    if (hasCjk(word)) {
      for (let i = 0; i < word.length - 1; i += 1) out.push(word.slice(i, i + 2));   // bigrams: there are no spaces between words
    } else if (word.length >= 3 && !STOP.has(word)) out.push(word);
  }
  return Array.from(new Set(out));
}

export type HelpHit = { view: string; paragraph: string; score: number };

/** The paragraph of the Help that fits the question best (null when none does). `sections` are the ids of the Help tabs and `paragraphsOf` gives the paragraphs of one in the language of the interface. */
export function searchHelp(question: string, sections: readonly string[], paragraphsOf: (view: string) => string[]): HelpHit | null {
  const wanted = tokens(question);
  if (wanted.length === 0) return null;
  const paragraphs: Array<{ view: string; text: string; normal: string }> = [];
  for (const view of sections) {
    for (const text of paragraphsOf(view)) {
      if (text.trim().length > 20) paragraphs.push({ view, text: text.trim(), normal: ` ${normalize(text)}` });
    }
  }
  if (paragraphs.length === 0) return null;
  const has = (normal: string, word: string): boolean => (hasCjk(word) ? normal.includes(word) : normal.includes(` ${word}`));
  const weight = new Map<string, number>();
  for (const word of wanted) {
    const containing = paragraphs.filter(item => has(item.normal, word)).length;
    weight.set(word, containing === 0 ? 0 : Math.log(1 + paragraphs.length / containing));
  }
  let best: HelpHit | null = null;
  for (const item of paragraphs) {
    let score = 0, matched = 0;
    for (const word of wanted) if (has(item.normal, word)) { score += weight.get(word) ?? 0; matched += 1; }
    if (matched >= Math.min(2, wanted.length) && (!best || score > best.score)) best = { view: item.view, paragraph: item.text, score };
  }
  return best && best.score >= 2.2 ? best : null;
}

// ---- small talk ----
const HELLO = ["hello", "hi", "hey", "hola", "buenas", "buenos dias", "hallo", "guten tag", "bonjour", "salut", "ciao", "buongiorno", "こんにちは", "你好", "您好", "ola", "oi", "bom dia"].map(normalize);
const THANKS = ["thanks", "thank you", "gracias", "danke", "merci", "grazie", "ありがとう", "谢谢", "謝謝", "obrigado", "obrigada"].map(normalize);
const startsWith = (query: string, list: string[]): boolean => list.some(word => (hasCjk(word) ? query.includes(word) : query === word || query.startsWith(`${word} `)));

export type Answer =
  | { kind: "hello" | "thanks" | "none" }
  | { kind: "topic"; topic: Topic; text: string; others: Topic[] }
  | { kind: "help"; view: string; text: string };

/** The answer to a question, in the interface's `language`. `sections` and `paragraphsOf` are for the search in the Help. */
export function answer(question: string, language: Locale, sections: readonly string[], paragraphsOf: (view: string) => string[]): Answer {
  const query = normalize(question);
  if (!query) return { kind: "none" };
  const ranked = rankTopics(question);
  const first = ranked[0];
  if (first && first.score >= 4) {
    const index = Math.max(0, ORDER.indexOf(language));
    const close = ranked.slice(1, 3).filter(item => item.score >= first.score * 0.7).map(item => item.topic);
    return { kind: "topic", topic: first.topic, text: first.topic.a[index] ?? first.topic.a[0], others: close };
  }
  const hit = searchHelp(question, sections, paragraphsOf);
  if (hit) return { kind: "help", view: hit.view, text: hit.paragraph };
  if (startsWith(query, THANKS)) return { kind: "thanks" };
  if (startsWith(query, HELLO)) return { kind: "hello" };
  return { kind: "none" };
}

/** Sample questions in a language, for the suggestions: spread over the tasks and different each time `seed` changes. */
export function suggestions(language: Locale, count: number, seed = 0): string[] {
  const index = Math.max(0, ORDER.indexOf(language));
  const picks: string[] = [];
  for (let i = 0; i < TOPICS.length && picks.length < count; i += 1) picks.push(TOPICS[(seed * count + i * 7) % TOPICS.length]!.q[index]!);
  return Array.from(new Set(picks));
}
