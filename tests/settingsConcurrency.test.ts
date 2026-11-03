import { describe, expect, it } from 'vitest';
import { canonicalJson, sameTree, saveSettingsTree, type FetchLike } from '../src/lib/settingsConcurrency';

type Call = { method: string; ifMatch?: string; body?: string };

/** A fake server: `tree` is what GET answers (with `etag`); `puts` are the statuses PUT answers in order. */
function fakeServer(opts: { tree: unknown; etag: string | null; puts: number[]; legacy?: boolean }) {
  const calls: Call[] = [];
  let tree = opts.tree;
  let etag = opts.etag;
  const puts = [...opts.puts];
  const fetchFn: FetchLike = async (_url, init = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ method, ifMatch: init.headers?.['If-Match'], body: init.body });
    const answer = (status: number, body: unknown, tag: string | null) => ({ ok: status < 400, status, headers: { get: (n: string) => (n === 'ETag' ? tag : null) }, json: async () => body });
    if (method === 'GET') return answer(200, tree, etag);
    if (method === 'PUT') {
      if (opts.legacy) return answer(404, {}, null);
      const status = puts.shift() ?? 200;
      if (status === 200) { tree = JSON.parse(init.body!); etag = '"new"'; return answer(200, { success: true }, '"new"'); }
      return answer(status, { error: 'x' }, null);
    }
    tree = JSON.parse(init.body!);
    return answer(200, { success: true }, null);
  };
  return { fetchFn, calls };
}

const base = { url: '/api/settings', headers: { 'Content-Type': 'application/json' }, body: '{"a":2}' };

describe('canonicalJson / sameTree', () => {
  it('ignores the order of the keys', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(canonicalJson({ a: [{ c: 2, d: 1 }], b: 1 }));
    expect(sameTree('{"b":1,"a":2}', { a: 2, b: 1 })).toBe(true);
    expect(sameTree('{"a":1}', { a: 2 })).toBe(false);
    expect(sameTree(null, {})).toBe(false);
  });
});

describe('saveSettingsTree', () => {
  it('sends the ETag it read as If-Match and answers the new one', async () => {
    const s = fakeServer({ tree: { a: 1 }, etag: '"r1"', puts: [200] });
    const out = await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: '"r1"', lastSyncedJson: '{"a":1}' });
    expect(out).toMatchObject({ kind: 'saved', etag: '"new"' });
    expect(s.calls).toEqual([{ method: 'PUT', ifMatch: '"r1"', body: '{"a":2}' }]);
  });

  it('on 412 with the server tree unchanged since the last sync, sends again with the fresh ETag', async () => {
    const s = fakeServer({ tree: { a: 1 }, etag: '"r2"', puts: [412, 200] });
    const out = await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: '"r1"', lastSyncedJson: '{"a":1}' });
    expect(out.kind).toBe('saved');
    expect(s.calls.map((c) => `${c.method}:${c.ifMatch ?? ''}`)).toEqual(['PUT:"r1"', 'GET:', 'PUT:"r2"']);
  });

  it('on 412 with a different server tree, reports the conflict and sends nothing more', async () => {
    const s = fakeServer({ tree: { a: 9 }, etag: '"r2"', puts: [412] });
    const out = await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: '"r1"', lastSyncedJson: '{"a":1}' });
    expect(out).toEqual({ kind: 'conflict', server: { a: 9 }, etag: '"r2"' });
    expect(s.calls.filter((c) => c.method !== 'GET')).toHaveLength(1);
  });

  it('without an ETag it reads one first (428 is never provoked)', async () => {
    const s = fakeServer({ tree: { a: 1 }, etag: '"r1"', puts: [200] });
    const out = await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: null, lastSyncedJson: '{"a":1}' });
    expect(out.kind).toBe('saved');
    expect(s.calls.map((c) => `${c.method}:${c.ifMatch ?? ''}`)).toEqual(['GET:', 'PUT:"r1"']);
  });

  it('a forced replacement (factory reset) retries with the fresh ETag whatever the server holds', async () => {
    const s = fakeServer({ tree: { a: 9 }, etag: '"r2"', puts: [412, 200] });
    const out = await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: '"r1"', lastSyncedJson: '{"a":1}', force: true });
    expect(out.kind).toBe('saved');
  });

  it('gives up after one retry', async () => {
    const s = fakeServer({ tree: { a: 1 }, etag: '"r2"', puts: [412, 412] });
    const out = await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: '"r1"', lastSyncedJson: '{"a":1}' });
    expect(out).toEqual({ kind: 'failed', status: 412 });
  });

  it('a server without PUT is saved with POST', async () => {
    const s = fakeServer({ tree: { a: 1 }, etag: '"r1"', puts: [], legacy: true });
    const out = await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: '"r1"', lastSyncedJson: '{"a":1}' });
    expect(out.kind).toBe('saved');
    expect(s.calls.map((c) => c.method)).toEqual(['PUT', 'POST']);
  });

  it('other refusals and network failures are reported as failures', async () => {
    const s = fakeServer({ tree: {}, etag: '"r1"', puts: [403] });
    expect(await saveSettingsTree({ ...base, fetchFn: s.fetchFn, etag: '"r1"', lastSyncedJson: null })).toEqual({ kind: 'failed', status: 403 });
    const down: FetchLike = async () => { throw new Error('offline'); };
    expect(await saveSettingsTree({ ...base, fetchFn: down, etag: '"r1"', lastSyncedJson: null })).toEqual({ kind: 'failed', status: null });
  });
});
