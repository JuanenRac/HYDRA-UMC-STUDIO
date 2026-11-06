// =============================================================================
// HYDRA-UMC STUDIO - src/lib/maturityLedger.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The maturity ledger of the ecosystem as the map shows it: for each project, what it has been tried on (nothing recorded, a computer, a
// simulator, the bench, real hardware) and its open gaps. It is a snapshot that ships with Studio (src/data/maturityLedger.json, the same
// file the documentation hub generates); it says what was done, never more, and a project that is not in it simply has no line.
// Pure functions, so the screen only draws.
import ledgerFile from '../data/maturityLedger.json';

export type EvidenceId = 'none' | 'host-test' | 'simulator' | 'bench' | 'hardware' | 'other';
export type EvidenceColour = 'neutral' | 'info' | 'warn' | 'ok_soft' | 'ok';

export interface EvidenceKind {
  id: string;
  colour: EvidenceColour;
  label: Record<string, string>;
}

export interface LedgerEntry {
  name: string;
  maturity: string | null;
  evidence: string;
  colour: EvidenceColour;
  hardwareBound: boolean | null;
  gaps: string[];
}

export interface Ledger {
  kinds: EvidenceKind[];
  gapLabels: Record<string, Record<string, string>>;
  entries: Map<string, LedgerEntry>;
}

const COLOURS: readonly string[] = ['neutral', 'info', 'warn', 'ok_soft', 'ok'];
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const labels = (value: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (isObject(value)) for (const [lang, text] of Object.entries(value)) if (typeof text === 'string') out[lang] = text;
  return out;
};

/** Reads a ledger document; whatever is malformed is dropped, a document that is not a ledger gives an empty one. */
export function parseLedger(raw: unknown): Ledger {
  const ledger: Ledger = { kinds: [], gapLabels: {}, entries: new Map() };
  if (!isObject(raw)) return ledger;
  if (Array.isArray(raw.evidence_kinds)) {
    for (const kind of raw.evidence_kinds) {
      if (!isObject(kind) || typeof kind.id !== 'string' || typeof kind.colour !== 'string' || !COLOURS.includes(kind.colour)) continue;
      ledger.kinds.push({ id: kind.id, colour: kind.colour as EvidenceColour, label: labels(kind.label) });
    }
  }
  if (Array.isArray(raw.gaps)) {
    for (const gap of raw.gaps) if (isObject(gap) && typeof gap.id === 'string') ledger.gapLabels[gap.id] = labels(gap.label);
  }
  const known = new Set(ledger.kinds.map((kind) => kind.id));
  if (Array.isArray(raw.repos)) {
    for (const repo of raw.repos) {
      if (!isObject(repo) || typeof repo.name !== 'string' || typeof repo.evidence !== 'string' || !known.has(repo.evidence)) continue;
      const kind = ledger.kinds.find((candidate) => candidate.id === repo.evidence)!;
      ledger.entries.set(repo.name, {
        name: repo.name,
        maturity: typeof repo.maturity === 'string' ? repo.maturity : null,
        evidence: repo.evidence,
        colour: kind.colour,
        hardwareBound: typeof repo.hardware_bound === 'boolean' ? repo.hardware_bound : null,
        gaps: Array.isArray(repo.gaps) ? repo.gaps.filter((gap): gap is string => typeof gap === 'string') : [],
      });
    }
  }
  return ledger;
}

export const LEDGER: Ledger = parseLedger(ledgerFile);

/** The words of a label in the language of the interface, falling back to English and then to the identifier. */
export function labelIn(label: Record<string, string> | undefined, language: string, fallback: string): string {
  if (!label) return fallback;
  return label[language] ?? label[language.split('-')[0]] ?? label.en ?? fallback;
}

export function evidenceLabel(ledger: Ledger, entry: LedgerEntry, language: string): string {
  return labelIn(ledger.kinds.find((kind) => kind.id === entry.evidence)?.label, language, entry.evidence);
}

export const COLOUR_CLASS: Record<EvidenceColour, string> = {
  neutral: 'text-slate-400',
  info: 'text-sky-300',
  warn: 'text-amber-300',
  ok_soft: 'text-lime-300',
  ok: 'text-emerald-300',
};
