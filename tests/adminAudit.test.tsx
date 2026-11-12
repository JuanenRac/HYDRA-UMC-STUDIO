// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/adminAudit.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The audit record screen: nothing is asked of the server for an account that is not an administrator, the lines come newest first with their account, window,
// address and robot, every filter narrows the table (the ones the server knows are sent to it), the chain is checked by the server and in this window (and a line
// that was changed, or that no longer names its predecessor, is told), each way the read can fail has its own sentence, the record that is switched off says so,
// the record is read again by itself only when asked, and the lines can be saved to a file.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { AdminAudit } from '../src/components/AdminAudit';
import { parseAudit } from '../src/lib/audit';
import { sha256Hex } from '../src/lib/sha256';

const api = vi.hoisted(() => ({ fetchAudit: vi.fn(), fetchAuditJsonl: vi.fn() }));
vi.mock('../src/lib/auditApi', () => api);

const okResult = { ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] };
const failure = (status: number, code: string | null) => ({ ok: false, status, code, detail: null, serverCode: null, warnings: [] });

type Fields = { type?: string; outcome?: string; username?: string | null; controllerId?: string | null; ip?: string | null; robotId?: number | null; detail?: Record<string, unknown> | null; ts?: string };

/** A line as the server stores it: its hash is the SHA-256 of the line without the hash. */
function line(seq: number, prev: string, fields: Fields = {}) {
  const base = {
    seq,
    ts: fields.ts ?? `2026-03-0${seq}T10:20:3${seq}.456Z`,
    type: fields.type ?? 'claim',
    outcome: fields.outcome ?? 'ok',
    username: fields.username === undefined ? 'boss' : fields.username,
    controllerId: fields.controllerId === undefined ? 'win-1' : fields.controllerId,
    ip: fields.ip === undefined ? '10.0.0.5' : fields.ip,
    robotId: fields.robotId === undefined ? 1 : fields.robotId,
    detail: fields.detail === undefined ? null : fields.detail,
    prev,
  };
  const hash = sha256Hex(new TextEncoder().encode(JSON.stringify(base)));
  return { ...base, hash };
}

const GENESIS = '0'.repeat(64);

function chain() {
  const first = line(1, GENESIS, { type: 'claim', username: 'boss', controllerId: 'win-1', ip: '10.0.0.5', robotId: 1 });
  const second = line(2, first.hash, { type: 'stop-all', outcome: 'refused', username: 'oper', controllerId: 'phone-9', ip: '10.0.0.9', robotId: null });
  const third = line(3, second.hash, { type: 'robot-motion', outcome: 'failed', username: null, controllerId: null, ip: null, robotId: 77, detail: { command: 'play', foo: 'bar' } });
  return [first, second, third];
}

/** What the screen is given: the answer of the server as the app parses it (it keeps the line as sent, which the check of the chain needs). */
const read = (entries: unknown[], over: Record<string, unknown> = {}) => parseAudit({ enabled: true, lockedOff: false, entries, verification: null, ...over });
const serve = (answer: unknown) => api.fetchAudit.mockResolvedValue({ result: okResult, read: answer });

const token = (username: string) => `h.${btoa(JSON.stringify({ username })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`;

function renderAudit(over: Record<string, unknown> = {}) {
  const value = { authToken: token('boss'), isAdmin: true, robots: [{ id: 1, name: 'Arm One' }], ...over };
  return render(<HydraStoreProviders value={value as never}><AdminAudit /></HydraStoreProviders>);
}

const rows = () => within(screen.getByTestId('audit-table')).getAllByRole('row').slice(1);
const loaded = () => screen.findByTestId('audit-table');

beforeEach(() => { api.fetchAudit.mockReset(); api.fetchAuditJsonl.mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('who may read it', () => {
  it('says that only administrators can, and asks the server for nothing', () => {
    renderAudit({ isAdmin: false });
    expect(screen.getByText('Only administrators can read the audit record.')).toBeTruthy();
    expect(screen.queryByTestId('admin-audit')).toBeNull();
    expect(api.fetchAudit).not.toHaveBeenCalled();
  });
});

describe('the table', () => {
  it('reads the newest 100 lines when it opens and shows them newest first', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    expect(api.fetchAudit).toHaveBeenCalledWith({ limit: 100, verify: false });
    const cells = rows().map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
    expect(cells.map((c) => c?.[0])).toEqual(['3', '2', '1']);
    expect(cells[2]).toEqual(['1', '2026-03-01 10:20:31', 'Reservation', 'done', 'boss', 'win-1', '10.0.0.5', 'Arm One', '']);
    expect(cells[1].slice(2, 8)).toEqual(['Global STOP', 'refused', 'oper', 'phone-9', '10.0.0.9', '-']);
  });

  it('shows a dash for what the line does not say, #id for a robot the window does not know, and the detail with its translated names', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    const newest = within(rows()[0]).getAllByRole('cell').map((cell) => cell.textContent);
    expect(newest.slice(2, 8)).toEqual(['Robot motion', 'failed', '-', '-', '-', '#77']);
    expect(newest[8]).toBe('command=play foo=bar');
  });

  it('shows a type it does not know as it came, and a detail of a type without translated names with the keys as they are', async () => {
    const odd = line(1, GENESIS, { type: 'brand-new-type', detail: { command: 'x' } });
    serve(read([odd]));
    renderAudit();
    await loaded();
    const cells = within(rows()[0]).getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells[2]).toBe('brand-new-type');
    expect(cells[8]).toBe('command=x');
  });

  it('says that there are no lines when the record is empty or the filter keeps none', async () => {
    serve(read([]));
    renderAudit();
    expect(await screen.findByText('No lines for this filter.')).toBeTruthy();
    expect(screen.queryByTestId('audit-table')).toBeNull();
  });

  it('drops the milliseconds, and the zone with them, from the time', async () => {
    serve(read([line(1, GENESIS, { ts: '2026-12-31T23:59:58.9Z' }), line(2, 'x'.repeat(64), { ts: '2026-12-31T23:59:59Z' })]));
    renderAudit();
    await loaded();
    expect(rows().map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual(['2026-12-31 23:59:59Z', '2026-12-31 23:59:58']);
  });
});

describe('the filters', () => {
  it('sends the type, the robot and the number of lines to the server and reads again', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    fireEvent.change(screen.getByTestId('audit-type'), { target: { value: 'stop-all' } });
    await waitFor(() => expect(api.fetchAudit).toHaveBeenLastCalledWith({ limit: 100, type: 'stop-all', verify: false }));
    fireEvent.change(screen.getByTestId('audit-robot'), { target: { value: '1' } });
    await waitFor(() => expect(api.fetchAudit).toHaveBeenLastCalledWith({ limit: 100, type: 'stop-all', robotId: 1, verify: false }));
    fireEvent.change((screen.getByText('Lines').querySelector('select') as HTMLSelectElement), { target: { value: '250' } });
    await waitFor(() => expect(api.fetchAudit).toHaveBeenLastCalledWith({ limit: 250, type: 'stop-all', robotId: 1, verify: false }));
    fireEvent.change(screen.getByTestId('audit-type'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('audit-robot'), { target: { value: '' } });
    await waitFor(() => expect(api.fetchAudit).toHaveBeenLastCalledWith({ limit: 250, verify: false }));
  });

  it('narrows what was read, in this window only, by account, window, address and text', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    const calls = api.fetchAudit.mock.calls.length;
    fireEvent.change(screen.getByTestId('audit-account'), { target: { value: 'oper' } });
    expect(rows().length).toBe(1);
    expect(within(rows()[0]).getAllByRole('cell')[0].textContent).toBe('2');
    fireEvent.change(screen.getByTestId('audit-account'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('audit-window'), { target: { value: 'win-1' } });
    expect(rows().length).toBe(1);
    fireEvent.change(screen.getByTestId('audit-window'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('audit-address'), { target: { value: '10.0.0.9' } });
    expect(rows().length).toBe(1);
    fireEvent.change(screen.getByTestId('audit-address'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('audit-search'), { target: { value: 'FOO=bar' } });
    expect(rows().length).toBe(1);
    expect(within(rows()[0]).getAllByRole('cell')[0].textContent).toBe('3');
    fireEvent.change(screen.getByTestId('audit-search'), { target: { value: 'nothing matches this' } });
    expect(screen.getByText('No lines for this filter.')).toBeTruthy();
    expect(api.fetchAudit.mock.calls.length).toBe(calls);
  });

  it('lists only the accounts, windows and addresses that are in the lines, in the order they appear', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    const options = (id: string) => within(screen.getByTestId(id)).getAllByRole('option').map((o) => o.textContent);
    expect(options('audit-account')).toEqual(['All accounts', 'boss', 'oper']);
    expect(options('audit-window')).toEqual(['All windows', 'win-1', 'phone-9']);
    expect(options('audit-address')).toEqual(['All addresses', '10.0.0.5', '10.0.0.9']);
    expect(options('audit-robot')).toEqual(['All robots', 'Arm One']);
  });

  it('shows only my lines with one button and gives them all back with the next click', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    fireEvent.click(screen.getByTestId('audit-mine'));
    expect(rows().length).toBe(1);
    expect((screen.getByTestId('audit-account') as HTMLSelectElement).value).toBe('boss');
    fireEvent.click(screen.getByTestId('audit-mine'));
    expect(rows().length).toBe(3);
  });

  it('has no button for my lines when the session does not say who I am', async () => {
    serve(read(chain()));
    renderAudit({ authToken: 'not-a-token' });
    await loaded();
    expect(screen.queryByTestId('audit-mine')).toBeNull();
  });
});

describe('the chain', () => {
  it('is not checked until it is asked for, and then the server and this window both say it is intact', async () => {
    api.fetchAudit.mockImplementation(async (query: { verify: boolean }) => ({
      result: okResult,
      read: read(chain(), query.verify ? { verification: { ok: true, entries: 3, brokenAtSeq: null, reason: null } } : {}),
    }));
    renderAudit();
    await loaded();
    expect(screen.queryByTestId('audit-chain')).toBeNull();
    fireEvent.click(screen.getByTestId('audit-verify'));
    expect(await screen.findByTestId('audit-chain')).toBeTruthy();
    expect(api.fetchAudit).toHaveBeenLastCalledWith({ limit: 100, verify: true });
    expect(screen.getByTestId('audit-server-chain').textContent).toBe('Server: the whole chain is intact (3 lines).');
    expect(screen.getByTestId('audit-local-chain').textContent).toBe('This window: 3 lines read, every hash matches, 2 links between neighbours checked, 0 gaps not comparable.');
  });

  it('tells a chain the server found broken, with the line and the reason', async () => {
    api.fetchAudit.mockResolvedValue({ result: okResult, read: read(chain(), { verification: { ok: false, entries: 3, brokenAtSeq: 2, reason: 'hash mismatch' } }) });
    renderAudit();
    await loaded();
    fireEvent.click(screen.getByTestId('audit-verify'));
    const text = (await screen.findByTestId('audit-server-chain')).textContent;
    expect(text).toBe('Server: the chain is BROKEN at line 2 (hash mismatch).');
  });

  it('tells a line that was changed after it was written', async () => {
    const [first, second, third] = chain();
    serve(read([first, { ...second, username: 'someone-else' }, third]));
    renderAudit();
    await loaded();
    fireEvent.click(screen.getByTestId('audit-verify'));
    expect((await screen.findByTestId('audit-local-chain')).textContent).toBe('This window: line 2 does not match its own hash - it was changed.');
  });

  it('tells a line that does not name the one before it, even when its own hash is right', async () => {
    const [first] = chain();
    const orphan = line(2, 'f'.repeat(64), { type: 'release' });
    serve(read([first, orphan]));
    renderAudit();
    await loaded();
    fireEvent.click(screen.getByTestId('audit-verify'));
    expect((await screen.findByTestId('audit-local-chain')).textContent).toBe('This window: line 2 does not name the line before it - a line is missing or was replaced.');
  });

  it('counts the lines that are not neighbours as gaps and not as a failure', async () => {
    const [first] = chain();
    const far = line(9, 'a'.repeat(64), { type: 'release' });
    serve(read([first, far]));
    renderAudit();
    await loaded();
    fireEvent.click(screen.getByTestId('audit-verify'));
    expect((await screen.findByTestId('audit-local-chain')).textContent).toBe('This window: 2 lines read, every hash matches, 0 links between neighbours checked, 1 gaps not comparable.');
  });

  it('keeps the lines that are on the screen while it checks, and reading again without checking removes the verdict', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    fireEvent.click(screen.getByTestId('audit-verify'));
    await screen.findByTestId('audit-chain');
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.queryByTestId('audit-chain')).toBeNull());
    expect(rows().length).toBe(3);
  });
});

describe('when it cannot be read', () => {
  const cases: Array<[string, ReturnType<typeof failure>, string]> = [
    ['no network', failure(0, 'network'), 'The server could not be reached.'],
    ['not an administrator', failure(403, 'forbidden'), 'This account is not an administrator: the server does not give it the audit record.'],
    ['the session ended', failure(401, 'session_expired'), 'Your session ended. Sign in again.'],
    ['an older server', failure(404, 'not_found'), 'This server has no audit record (an older version, or it is not available).'],
    ['anything else', failure(500, null), 'The server did not give the audit record.'],
  ];
  for (const [name, result, sentence] of cases) {
    it(`says so when ${name} and shows no old lines`, async () => {
      api.fetchAudit.mockResolvedValueOnce({ result: okResult, read: read(chain()) });
      renderAudit();
      await loaded();
      api.fetchAudit.mockResolvedValue({ result, read: null });
      fireEvent.click(screen.getByText('Refresh'));
      expect((await screen.findByTestId('audit-failure')).textContent).toBe(sentence);
      expect(screen.queryByTestId('audit-table')).toBeNull();
    });
  }

  it('treats an answer that is ok but empty as a failure of the other kind', async () => {
    api.fetchAudit.mockResolvedValue({ result: okResult, read: null });
    renderAudit();
    expect((await screen.findByTestId('audit-failure')).textContent).toBe('The server did not give the audit record.');
  });

  it('takes the sentence away when the next read works', async () => {
    api.fetchAudit.mockResolvedValueOnce({ result: failure(0, 'network'), read: null });
    renderAudit();
    await screen.findByTestId('audit-failure');
    serve(read(chain()));
    fireEvent.click(screen.getByText('Refresh'));
    await loaded();
    expect(screen.queryByTestId('audit-failure')).toBeNull();
  });
});

describe('a record that is switched off', () => {
  it('says that the environment of the server locks it off', async () => {
    serve(read(chain(), { enabled: false, lockedOff: true }));
    renderAudit();
    expect(await screen.findByText('The audit record is locked off by the environment of the server: nothing new is written.')).toBeTruthy();
  });

  it('says that the safety limits switch it off, and still shows what was written before', async () => {
    serve(read(chain(), { enabled: false, lockedOff: false }));
    renderAudit();
    expect(await screen.findByText('The audit record is switched off in the safety limits: nothing new is written.')).toBeTruthy();
    expect(rows().length).toBe(3);
  });

  it('says nothing about it while it is on', async () => {
    serve(read(chain()));
    renderAudit();
    await loaded();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('reading again by itself', () => {
  it('is off until switched on, reads every ten seconds while on and stops when switched off', async () => {
    serve(read(chain()));
    const set = vi.spyOn(window, 'setInterval');
    const clear = vi.spyOn(window, 'clearInterval');
    renderAudit();
    await loaded();
    expect((screen.getByTestId('audit-auto') as HTMLInputElement).checked).toBe(false);
    const auto = () => set.mock.calls.filter((call) => call[1] === 10000);
    expect(auto().length).toBe(0);
    fireEvent.click(screen.getByTestId('audit-auto'));
    expect(auto().length).toBe(1);
    const before = api.fetchAudit.mock.calls.length;
    await act(async () => { (auto()[0][0] as () => void)(); });
    expect(api.fetchAudit.mock.calls.length).toBe(before + 1);
    expect(api.fetchAudit).toHaveBeenLastCalledWith({ limit: 100, verify: false });
    fireEvent.click(screen.getByTestId('audit-auto'));
    expect(clear).toHaveBeenCalled();
  });
});

describe('saving the lines', () => {
  beforeEach(() => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:audit'), revokeObjectURL: vi.fn() });
  });

  it('saves the lines as the server stores them, in a file called audit.jsonl, for the filter that is on', async () => {
    serve(read(chain()));
    api.fetchAuditJsonl.mockResolvedValue('{"seq":1}\n{"seq":2}\n');
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) { clicked.push(`${this.download}|${this.href}`); });
    renderAudit();
    await loaded();
    fireEvent.change(screen.getByTestId('audit-type'), { target: { value: 'claim' } });
    await waitFor(() => expect(api.fetchAudit).toHaveBeenLastCalledWith({ limit: 100, type: 'claim', verify: false }));
    fireEvent.click(screen.getByText('Export (.jsonl)'));
    await waitFor(() => expect(clicked.length).toBe(1));
    expect(api.fetchAuditJsonl).toHaveBeenCalledWith({ limit: 100, type: 'claim' });
    expect(clicked[0].startsWith('audit.jsonl|blob:audit')).toBe(true);
    const blob = (URL.createObjectURL as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/x-ndjson');
    expect(await blob.text()).toBe('{"seq":1}\n{"seq":2}\n');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:audit');
  });

  it('says so, and saves nothing, when the lines could not be read', async () => {
    serve(read(chain()));
    api.fetchAuditJsonl.mockResolvedValue(null);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderAudit();
    await loaded();
    fireEvent.click(screen.getByText('Export (.jsonl)'));
    expect((await screen.findByTestId('audit-failure')).textContent).toBe('The server did not give the audit record.');
    expect(click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
