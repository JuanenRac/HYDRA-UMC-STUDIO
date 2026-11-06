// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/ingestSwitches.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switches of what the services hand to the server (all off by default, a confirmation to turn one on, a switch fixed by the
// environment locked) and the screen of the status of the developer node: how the answers are read, what body a change sends, and the
// screens, including the eight languages.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { IngestSwitchesPanel } from '../src/components/IngestSwitchesPanel';
import { DeveloperNodeStatusPanel } from '../src/components/DeveloperNodeStatusPanel';
import { INGEST_KEYS, changedSwitches, developerNodeApi, ingestApi, ingestNeedsConfirmation, ingestPatchBody, parseDeveloperNodeStatus, parseIngestState, validKeysFileName, type IngestState } from '../src/lib/ingestSwitches';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';
import pt from '../src/locales/pt.json';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const answer = (over: Record<string, { value: boolean; source: string }> = {}, extra: Record<string, unknown> = {}) => ({
  ingest: {
    ...Object.fromEntries(INGEST_KEYS.map(key => [key, { value: false, source: 'default' }])),
    proposalKeysFile: { value: '', source: 'default' },
    appliesOnRestart: false,
    ...over,
    ...extra,
  },
});
const off = parseIngestState(answer()) as IngestState;

function serve(handler: (url: string, init: RequestInit | undefined) => { status: number; body: unknown }): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const reply = handler(String(input), init);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}
const puts = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');

describe('the reading and the body', () => {
  it('reads every switch and the keys file, and refuses an answer that does not have the shape', () => {
    expect(off.switches.faultFeed).toEqual({ value: false, source: 'default' });
    expect(off.proposalKeysFile).toEqual({ value: '', source: 'default' });
    expect(off.appliesOnRestart).toBe(false);
    expect(parseIngestState({})).toBeNull();
    expect(parseIngestState(null)).toBeNull();
    expect(parseIngestState(answer({ voiceChain: { value: 'yes' as unknown as boolean, source: 'default' } }))).toBeNull();
    expect(parseIngestState(answer({ scenario: { value: true, source: 'nowhere' } }))).toBeNull();
    expect(parseIngestState(answer({}, { proposalKeysFile: { value: 7, source: 'default' } }))).toBeNull();
  });

  it('asks for the confirmation exactly when a switch goes on or another keys file is chosen', () => {
    expect(ingestNeedsConfirmation(off, { switches: { scenario: true } })).toBe(true);
    expect(ingestNeedsConfirmation(off, { switches: { scenario: false } })).toBe(false);
    expect(ingestNeedsConfirmation(off, { proposalKeysFile: 'operators.json' })).toBe(true);
    expect(ingestNeedsConfirmation(off, { proposalKeysFile: '' })).toBe(false);
    const on = parseIngestState(answer({ scenario: { value: true, source: 'config' } }, { proposalKeysFile: { value: 'a.json', source: 'config' } })) as IngestState;
    expect(ingestNeedsConfirmation(on, { switches: { scenario: true } })).toBe(false);
    expect(ingestNeedsConfirmation(on, { switches: { scenario: false }, proposalKeysFile: '' })).toBe(false);
    expect(ingestNeedsConfirmation(on, { proposalKeysFile: 'b.json' })).toBe(true);
  });

  it('sends only what changes, with confirm: true only when it is needed', () => {
    expect(ingestPatchBody(off, { switches: { faultFeed: true, voiceChain: false } })).toEqual({ ingest: { faultFeed: true, confirm: true } });
    const on = parseIngestState(answer({ faultFeed: { value: true, source: 'config' } })) as IngestState;
    expect(ingestPatchBody(on, { switches: { faultFeed: false } })).toEqual({ ingest: { faultFeed: false } });
    expect(ingestPatchBody(off, { proposalKeysFile: 'operators.json' })).toEqual({ ingest: { proposalKeysFile: 'operators.json', confirm: true } });
    expect(ingestPatchBody(off, {})).toEqual({ ingest: {} });
  });

  it('never sends a switch that the environment of the server fixed', () => {
    const locked = parseIngestState(answer({ faultFeed: { value: true, source: 'env' } })) as IngestState;
    const wanted = Object.fromEntries(INGEST_KEYS.map(key => [key, locked.switches[key].value])) as Record<(typeof INGEST_KEYS)[number], boolean>;
    wanted.faultFeed = false;
    wanted.scenario = true;
    expect(changedSwitches(locked, wanted)).toEqual({ scenario: true });
  });

  it('accepts the same file names as the server', () => {
    for (const ok of ['', 'operators.json', 'a_b-c.2.json']) expect(validKeysFileName(ok)).toBe(true);
    for (const bad of ['../keys.json', 'a/b.json', 'C:keys', '.hidden', 'a..b', 'x'.repeat(65), 'a b']) expect(validKeysFileName(bad)).toBe(false);
  });

  it('tells a missing block, a refused account and a refusal with its reason apart', async () => {
    serve(() => ({ status: 200, body: {} }));
    expect(await ingestApi.read()).toMatchObject({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 403, body: {} }));
    expect(await ingestApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
    serve((_u, init) => (init?.method === 'PUT' ? { status: 409, body: { error: 'HYDRA_UMC_FAULT_FEED is set' } } : { status: 200, body: answer() }));
    expect(await ingestApi.write(off, { switches: { faultFeed: true } })).toMatchObject({ ok: false, failure: 'http', reason: 'HYDRA_UMC_FAULT_FEED is set' });
  });

  it('does not call the server when nothing changes', async () => {
    const spy = serve(() => ({ status: 200, body: answer() }));
    expect(await ingestApi.write(off, { switches: { faultFeed: false } })).toEqual({ ok: true, value: off });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('IngestSwitchesPanel', () => {
  it('shows every switch off by default and keeps Save disabled until something changes', async () => {
    serve(() => ({ status: 200, body: answer() }));
    render(<IngestSwitchesPanel />);
    await waitFor(() => expect(screen.getByTestId('ingest-faultFeed')).toBeTruthy());
    for (const key of INGEST_KEYS) expect((screen.getByTestId(`ingest-${key}`) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('ingest-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('asks for a confirmation before turning one on and sends confirm: true only after it', async () => {
    const spy = serve((_u, init) => (init?.method === 'PUT' ? { status: 200, body: {} } : { status: 200, body: answer() }));
    render(<IngestSwitchesPanel />);
    await waitFor(() => expect(screen.getByTestId('ingest-scenario')).toBeTruthy());
    fireEvent.click(screen.getByTestId('ingest-scenario'));
    fireEvent.click(screen.getByTestId('ingest-save'));
    expect(screen.getByText('Turn on what the server accepts?')).toBeTruthy();
    expect(puts(spy)).toHaveLength(0);
    fireEvent.click(screen.getByText('Turn on'));
    await waitFor(() => expect(puts(spy)).toHaveLength(1));
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ ingest: { scenario: true, confirm: true } });
  });

  it('turning one off does not ask', async () => {
    const spy = serve((_u, init) => (init?.method === 'PUT' ? { status: 200, body: {} } : { status: 200, body: answer({ voiceChain: { value: true, source: 'config' } }) }));
    render(<IngestSwitchesPanel />);
    await waitFor(() => expect((screen.getByTestId('ingest-voiceChain') as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByTestId('ingest-voiceChain'));
    fireEvent.click(screen.getByTestId('ingest-save'));
    await waitFor(() => expect(puts(spy)).toHaveLength(1));
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ ingest: { voiceChain: false } });
  });

  it('locks a switch that the environment fixed and says why', async () => {
    serve(() => ({ status: 200, body: answer({ anomalyFeed: { value: true, source: 'env' } }) }));
    render(<IngestSwitchesPanel />);
    await waitFor(() => expect(screen.getByTestId('ingest-anomalyFeed')).toBeTruthy());
    expect((screen.getByTestId('ingest-anomalyFeed') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByTestId('ingest-anomalyFeed-locked')).toBeTruthy();
    expect((screen.getByTestId('ingest-faultFeed') as HTMLInputElement).disabled).toBe(false);
  });

  it('refuses a keys file name that the server would refuse, without calling it', async () => {
    const spy = serve(() => ({ status: 200, body: answer() }));
    render(<IngestSwitchesPanel />);
    await waitFor(() => expect(screen.getByTestId('ingest-keys-file')).toBeTruthy());
    fireEvent.change(screen.getByTestId('ingest-keys-file'), { target: { value: '../x.json' } });
    expect(screen.getByTestId('ingest-keys-invalid')).toBeTruthy();
    expect((screen.getByTestId('ingest-save') as HTMLButtonElement).disabled).toBe(true);
    expect(puts(spy)).toHaveLength(0);
  });

  it('tells when a restart is needed, and shows nothing for a server that predates the block', async () => {
    serve(() => ({ status: 200, body: answer({}, { appliesOnRestart: true }) }));
    render(<IngestSwitchesPanel />);
    await waitFor(() => expect(screen.getByTestId('ingest-restart')).toBeTruthy());
    cleanup();
    serve(() => ({ status: 200, body: {} }));
    const { container } = render(<IngestSwitchesPanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="ingest-switches-panel"]')).toBeNull();
  });
});

describe('the status of the developer node', () => {
  const status = { nodes: { 'dev-b': { at: 1700000000000, seq: 4, status: { version: '1.2.3', ok: true, count: 7, nested: { a: 1 }, list: [1] } }, 'dev-a': { at: 1700000001000, seq: 9, status: {} } }, chain: { ok: true } };

  it('reads the nodes sorted by id, draws only plain values and drops the rest', () => {
    const parsed = parseDeveloperNodeStatus(status)!;
    expect(parsed.nodes.map(n => n.nodeId)).toEqual(['dev-a', 'dev-b']);
    expect(parsed.nodes[1].fields).toEqual([{ name: 'version', value: '1.2.3' }, { name: 'ok', value: 'true' }, { name: 'count', value: '7' }]);
    expect(parsed.chain).toEqual({ ok: true });
    expect(parseDeveloperNodeStatus({ nodes: [] })).toBeNull();
    expect(parseDeveloperNodeStatus({ nodes: { x: { at: 'now', seq: 1, status: {} } } })!.nodes).toEqual([]);
    expect(parseDeveloperNodeStatus({ nodes: {}, chain: 'ok' })!.chain).toBeNull();
  });

  it('asks for the chain only when told to', async () => {
    const spy = serve(() => ({ status: 200, body: status }));
    await developerNodeApi.read(false);
    await developerNodeApi.read(true);
    expect(String(spy.mock.calls[0][0])).toMatch(/\/api\/developer-node\/status$/);
    expect(String(spy.mock.calls[1][0])).toMatch(/\/api\/developer-node\/status\?verify=1$/);
    serve(() => ({ status: 404, body: {} }));
    expect(await developerNodeApi.read()).toMatchObject({ ok: false, failure: 'unsupported' });
  });

  it('draws the nodes as text, and says so when the switch is off', async () => {
    serve(() => ({ status: 200, body: { nodes: { 'dev-a': { at: 1700000001000, seq: 9, status: { note: '<img src=x onerror=alert(1)>' } } } } }));
    const { container } = render(<DeveloperNodeStatusPanel />);
    await waitFor(() => expect(screen.getByTestId('developer-node-dev-a')).toBeTruthy());
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('developer-node-dev-a').textContent).toContain('<img src=x onerror=alert(1)>');
    cleanup();
    serve(() => ({ status: 404, body: {} }));
    render(<DeveloperNodeStatusPanel />);
    await waitFor(() => expect(screen.getByTestId('developer-node-status-problem')).toBeTruthy());
    expect(screen.getByTestId('developer-node-status-problem').textContent).toContain('Not available');
  });

  it('checks the signed record on demand and reports a broken chain', async () => {
    serve((url) => ({ status: 200, body: url.endsWith('verify=1') ? { nodes: {}, chain: { ok: false } } : { nodes: {} } }));
    render(<DeveloperNodeStatusPanel />);
    await waitFor(() => expect(screen.getByTestId('developer-node-status-none')).toBeTruthy());
    fireEvent.click(screen.getByTestId('developer-node-status-verify'));
    await waitFor(() => expect(screen.getByTestId('developer-node-status-chain').textContent).toContain('broken'));
  });
});

describe('the eight languages', () => {
  const locales = { en, es, de, fr, it: itLocale, ja, zh, pt } as Record<string, any>;
  it('every language has every text of both screens, and the placeholder of the refusal', () => {
    const reference = locales.en;
    for (const [lang, tree] of Object.entries(locales)) {
      for (const section of ['ingestSwitches', 'developerNodeStatus']) {
        expect(Object.keys(tree[section]).sort(), `${lang}.${section}`).toEqual(Object.keys(reference[section]).sort());
        for (const [key, value] of Object.entries(tree[section])) expect(String(value).trim(), `${lang}.${section}.${key}`).not.toBe('');
      }
      expect(tree.ingestSwitches.save_error, lang).toContain('{{reason}}');
    }
  });
  it('every switch has a label and a hint in the interface', () => {
    for (const key of INGEST_KEYS) {
      expect(en.ingestSwitches).toHaveProperty(key);
      expect(en.ingestSwitches).toHaveProperty(`${key}_hint`);
    }
  });
});
