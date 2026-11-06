// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/maturityLedger.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The maturity ledger on the map of the ecosystem: how the file is read, that the copy that ships with Studio is the one the
// documentation hub generates (when that checkout is at hand), and that the evidence line is off until a person turns it on.
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { EcosystemMap } from '../src/components/EcosystemMap';
import { LEDGER, evidenceLabel, labelIn, parseLedger } from '../src/lib/maturityLedger';
import ledgerFile from '../src/data/maturityLedger.json';

beforeEach(() => { try { window.localStorage.removeItem('hydra.map.showEvidence'); } catch { /* no storage */ } });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const KIND = { id: 'bench', colour: 'ok_soft', label: { en: 'Tried on the bench', es: 'Probado en el banco' } };

describe('reading the ledger', () => {
  it('keeps what is well formed and drops the rest', () => {
    const ledger = parseLedger({
      evidence_kinds: [KIND, { id: 'x', colour: 'purple', label: {} }, 'nope'],
      gaps: [{ id: 'g', label: { en: 'A gap' } }],
      repos: [
        { name: 'A', maturity: 'functional', evidence: 'bench', hardware_bound: false, gaps: ['g', 3] },
        { name: 'B', evidence: 'unknown-kind' },
        { evidence: 'bench' },
      ],
    });
    expect(ledger.kinds.map((kind) => kind.id)).toEqual(['bench']);
    expect([...ledger.entries.keys()]).toEqual(['A']);
    expect(ledger.entries.get('A')).toMatchObject({ colour: 'ok_soft', hardwareBound: false, gaps: ['g'] });
  });

  it('a document that is not a ledger is an empty one', () => {
    expect(parseLedger(null).entries.size).toBe(0);
    expect(parseLedger([]).kinds).toEqual([]);
  });

  it('labels in the language of the interface, falling back to English and then to the identifier', () => {
    expect(labelIn(KIND.label, 'es', 'bench')).toBe('Probado en el banco');
    expect(labelIn(KIND.label, 'es-ES', 'bench')).toBe('Probado en el banco');
    expect(labelIn(KIND.label, 'ja', 'bench')).toBe('Tried on the bench');
    expect(labelIn(undefined, 'ja', 'bench')).toBe('bench');
  });

  it('the shipped ledger has a label for every kind in the eight languages', () => {
    expect(LEDGER.entries.size).toBeGreaterThan(10);
    for (const kind of LEDGER.kinds) for (const lang of ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt']) expect(typeof kind.label[lang]).toBe('string');
    const entry = [...LEDGER.entries.values()][0];
    expect(evidenceLabel(LEDGER, entry, 'en').length).toBeGreaterThan(3);
  });

  it('the copy that ships is the one of the documentation hub when its checkout is at hand', () => {
    const dir = process.env.HYDRA_UMC_DOCS_DIR;
    const file = dir ? join(dir, 'data', 'maturity_ledger.json') : '';
    if (!file || !existsSync(file)) return;
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(ledgerFile);
  });
});

describe('the map', () => {
  const project = (name: string) => ({ name, role: null, stack: null, maturity: 'functional', family: 'Core', version: '0.1.0', servicePort: null, activeState: 'active', live: true });
  const serve = () => vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/api/ecosystem/status') ? { available: true, projects: [project('HYDRA-UMC-SERVER'), project('NOT-IN-THE-LEDGER')] } : {};
    return { ok: url.includes('/api/ecosystem/status'), status: 200, json: async () => body } as unknown as Response;
  }));

  it('shows no evidence until it is turned on, only for projects the ledger knows, and remembers the choice', async () => {
    serve();
    render(<EcosystemMap />);
    await waitFor(() => screen.getByTestId('map-tile-HYDRA-UMC-SERVER'));
    expect(screen.queryAllByTestId('map-evidence')).toHaveLength(0);
    fireEvent.click(screen.getByTestId('map-evidence-toggle'));
    const lines = screen.getAllByTestId('map-evidence');
    expect(lines).toHaveLength(1);
    expect(screen.getByTestId('map-tile-HYDRA-UMC-SERVER').contains(lines[0])).toBe(true);
    expect(window.localStorage.getItem('hydra.map.showEvidence')).toBe('1');
  });
});
