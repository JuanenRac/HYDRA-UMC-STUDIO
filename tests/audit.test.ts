// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../src/lib/sha256';
import { auditQueryString, checkChain, detailLine, parseAudit, type AuditEntry } from '../src/lib/audit';
import { fetchAudit, fetchAuditJsonl } from '../src/lib/auditApi';

const GENESIS = '0'.repeat(64);

/** A chain written the way the server writes it: the hash is the SHA-256 of the line without `hash`. */
function chain(count: number, start = 1): Array<Record<string, unknown>> {
  const lines: Array<Record<string, unknown>> = [];
  let prev = GENESIS;
  for (let i = 0; i < count; i += 1) {
    const body = { seq: start + i, ts: `2030-01-01T00:00:0${i}.000Z`, type: 'claim', outcome: 'ok', username: 'ana', controllerId: 'w1', ip: '10.0.0.5', robotId: 1, detail: { ttlMs: 60000 }, prev };
    const hash = sha256Hex(new TextEncoder().encode(JSON.stringify(body)));
    lines.push({ ...body, hash });
    prev = hash;
  }
  return lines;
}

const entriesOf = (lines: Array<Record<string, unknown>>): AuditEntry[] => parseAudit({ entries: lines }).entries;

describe('reading GET /api/audit', () => {
  it('reads the entries and drops what is not one', () => {
    const read = parseAudit({ enabled: true, lockedOff: false, entries: [...chain(2), { seq: 'x' }, null, 5] });
    expect(read.entries).toHaveLength(2);
    expect(read.entries[0]).toMatchObject({ seq: 1, type: 'claim', username: 'ana', controllerId: 'w1', ip: '10.0.0.5', robotId: 1 });
    expect(read.verification).toBeNull();
  });

  it('reads the verification of the server', () => {
    const ok = parseAudit({ entries: [], verification: { ok: true, entries: 12 } });
    expect(ok.verification).toEqual({ ok: true, entries: 12, brokenAtSeq: null, reason: null });
    const broken = parseAudit({ entries: [], verification: { ok: false, entries: 3, brokenAtSeq: 4, reason: 'a line was changed' } });
    expect(broken.verification).toMatchObject({ ok: false, brokenAtSeq: 4, reason: 'a line was changed' });
  });

  it('knows when the record is off', () => {
    expect(parseAudit({ enabled: false, lockedOff: true, entries: [] })).toMatchObject({ enabled: false, lockedOff: true });
    expect(parseAudit(null)).toMatchObject({ enabled: true, lockedOff: false, entries: [] });
  });
});

describe('checking the chain in this window', () => {
  it('accepts an intact chain', () => {
    const check = checkChain(entriesOf(chain(5)));
    expect(check).toMatchObject({ ok: true, checked: 5, links: 4, gaps: 0 });
  });

  it('accepts a window that starts in the middle of the record', () => {
    expect(checkChain(entriesOf(chain(4, 100))).ok).toBe(true);
  });

  it('finds a line that was changed', () => {
    const lines = chain(4);
    lines[2] = { ...lines[2], username: 'mallory' };
    expect(checkChain(entriesOf(lines))).toMatchObject({ ok: false, brokenAtSeq: 3, reason: 'changed' });
  });

  it('finds a line that was removed from the middle', () => {
    const lines = chain(5);
    // seq 3 removed and the numbers closed up, as a clumsy edit would: the link no longer matches
    const closed = [lines[0], lines[1], { ...lines[3], seq: 3 }, { ...lines[4], seq: 4 }];
    const check = checkChain(entriesOf(closed));
    expect(check.ok).toBe(false);
  });

  it('does not call a filtered view broken: lines that are not neighbours are only counted as gaps', () => {
    const lines = chain(6);
    const filtered = [lines[0], lines[2], lines[5]];
    expect(checkChain(entriesOf(filtered))).toMatchObject({ ok: true, links: 0, gaps: 2 });
  });

  it('finds a replaced line whose own hash was rewritten but whose successor still names the old one', () => {
    const lines = chain(3);
    const body = { ...lines[1] } as Record<string, unknown>;
    delete body.hash;
    body.username = 'someone-else';
    const rewritten = { ...body, hash: sha256Hex(new TextEncoder().encode(JSON.stringify(body))) };
    const check = checkChain(entriesOf([lines[0], rewritten, lines[2]]));
    expect(check).toMatchObject({ ok: false, brokenAtSeq: 3, reason: 'link' });
  });
});

describe('the screen helpers', () => {
  it('builds the query string with the limit kept in range', () => {
    expect(auditQueryString({})).toBe('');
    expect(auditQueryString({ limit: 5000, type: 'claim', robotId: 2, verify: true })).toBe('?limit=1000&type=claim&robotId=2&verify=1');
    expect(auditQueryString({ limit: 0 })).toBe('?limit=1');
    expect(auditQueryString({ afterSeq: 40 })).toBe('?afterSeq=40');
  });

  it('shortens the detail', () => {
    expect(detailLine(null)).toBe('');
    expect(detailLine({ ttlMs: 60000, reason: 'bench' })).toBe('ttlMs=60000 reason=bench');
    expect(detailLine({ big: 'x'.repeat(300) }, 20).length).toBe(20);
  });
});

describe('the calls', () => {
  type Call = { url: string; init: RequestInit };
  let calls: Call[] = [];
  const answer = (status: number, body: unknown, text = '') => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => text } as Response;
    }));
  };
  afterEach(() => { vi.unstubAllGlobals(); calls = []; });

  it('asks with the filter and the verification', async () => {
    answer(200, { enabled: true, entries: chain(2), verification: { ok: true, entries: 2 } });
    const { result, read } = await fetchAudit({ limit: 50, type: 'release', verify: true });
    expect(calls[0].url).toBe('/api/audit?limit=50&type=release&verify=1');
    expect(result.ok).toBe(true);
    expect(read?.entries).toHaveLength(2);
    expect(read?.verification?.ok).toBe(true);
  });

  it('says why it could not read', async () => {
    answer(403, { error: 'admin only' });
    expect((await fetchAudit()).result.code).toBe('forbidden');
    answer(404, { error: 'the audit record is not available', code: 'audit-unavailable' });
    const missing = await fetchAudit();
    expect(missing.result.status).toBe(404);
    expect(missing.read).toBeNull();
  });

  it('exports the lines as stored', async () => {
    answer(200, null, '{"seq":1}\n');
    expect(await fetchAuditJsonl({ limit: 10 })).toBe('{"seq":1}\n');
    expect(calls[0].url).toBe('/api/audit?limit=10&format=jsonl');
    answer(500, null);
    expect(await fetchAuditJsonl()).toBeNull();
  });
});
