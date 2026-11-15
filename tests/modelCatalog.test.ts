import { describe, expect, it } from 'vitest';
import { fetchModelCatalog, fetchModelDownload, parseModelCatalog, urdfDownloadName, urdfTextOf } from '../src/lib/modelCatalog';

const answer = (status: number, body: unknown) => async (_url?: string, _init?: RequestInit) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('the catalogue of submitted models', () => {
  it('reads the models, newest first and then by name, skipping what is not a model', () => {
    const models = parseModelCatalog({
      models: [
        { slug: 'b', name: 'Beta', category: 'robots', submittedAt: '2030-01-01T10:00:00.000Z' },
        { slug: 'a', name: 'Alpha', category: 'robots', submittedAt: '2030-01-02T10:00:00.000Z' },
        { slug: 'c', category: 'tools' },
        { slug: 'd', name: 'Delta', category: 'tools' },
        { name: 'No slug', category: 'robots' },
        { slug: 'x' },
        'junk',
        null,
        42,
      ],
    });
    expect(models.map((m) => m.slug)).toEqual(['a', 'b', 'c', 'd']);
    expect(models[2]).toEqual({ slug: 'c', name: 'c', category: 'tools', submittedAt: null, attribution: null });
  });

  it('keeps the licence and credit the submitter gave and ignores anything that is not text', () => {
    const models = parseModelCatalog({
      models: [
        { slug: 'a', category: 'robots', attribution: 'CC-BY 4.0, by Someone' },
        { slug: 'b', category: 'robots', attribution: 7 },
        { slug: 'c', category: 'robots', attribution: '   ' },
      ],
    });
    expect(models.map((m) => m.attribution).filter((a) => a !== null)).toEqual(['CC-BY 4.0, by Someone']);
    expect(models).toHaveLength(3);
  });

  it('is an empty list for anything that is not a list of models', () => {
    for (const bad of [null, undefined, 3, 'x', [], {}, { models: 'many' }, { models: {} }]) expect(parseModelCatalog(bad)).toEqual([]);
  });

  it('tells a refusal that asks for a sign-in from a server error and from no answer', async () => {
    expect(await fetchModelCatalog(answer(200, { models: [{ slug: 'a', name: 'A', category: 'c' }] }))).toEqual({
      models: [{ slug: 'a', name: 'A', category: 'c', submittedAt: null, attribution: null }], error: null,
    });
    expect((await fetchModelCatalog(answer(401, { error: 'x' }))).error).toBe('login_required');
    expect((await fetchModelCatalog(answer(403, {}))).error).toBe('login_required');
    expect((await fetchModelCatalog(answer(500, {}))).error).toBe('server');
    expect((await fetchModelCatalog(answer(200, '<html>proxy page</html>'))).error).toBe('server');
    expect((await fetchModelCatalog(async () => { throw new Error('offline'); })).error).toBe('network');
  });

  it('encodes every part of the download path, so a name cannot add a segment', async () => {
    const urls: string[] = [];
    const seen = (url: string) => { urls.push(url); return Promise.resolve(new Response(JSON.stringify({ urdfXml: '<robot/>' }), { status: 200 })); };
    expect(await fetchModelDownload({ category: 'robots', slug: 'ar3' }, seen)).toEqual({ urdfXml: '<robot/>' });
    await fetchModelDownload({ category: 'a/b', slug: '../x?y' }, seen);
    expect(urls[0]).toMatch(/\/api\/models\/robots\/ar3\/download$/);
    expect(urls[1]).toMatch(/\/api\/models\/a%2Fb\/\.\.%2Fx%3Fy\/download$/);
  });

  it('gives nothing for a refusal or an answer that is not JSON, and lets a network failure through', async () => {
    expect(await fetchModelDownload({ category: 'c', slug: 's' }, answer(404, { error: 'x' }))).toBeNull();
    expect(await fetchModelDownload({ category: 'c', slug: 's' }, answer(200, '<html/>'))).toBeNull();
    await expect(fetchModelDownload({ category: 'c', slug: 's' }, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  });

  it('saves the URDF under one plain name, never under a path the server chose', () => {
    expect(urdfDownloadName({ urdfFilename: 'ar3.urdf' }, 'ar3')).toBe('ar3.urdf');
    expect(urdfDownloadName({ urdfFilename: '../../etc/evil.urdf' }, 'ar3')).toBe('evil.urdf');
    expect(urdfDownloadName({ urdfFilename: 'C:\\Windows\\evil.urdf' }, 'ar3')).toBe('evil.urdf');
    expect(urdfDownloadName({ urdfFilename: 'evil.exe' }, 'ar3')).toBe('ar3.urdf');
    expect(urdfDownloadName({ urdfFilename: '' }, 'ar3')).toBe('ar3.urdf');
    expect(urdfDownloadName(null, '../x')).toBe('model.urdf');
    expect(urdfDownloadName({ urdfFilename: 7 }, 'ok model')).toBe('ok model.urdf');
  });

  it('takes the URDF text only when the answer has some', () => {
    expect(urdfTextOf({ urdfXml: '<robot/>' })).toBe('<robot/>');
    expect(urdfTextOf({ urdfXml: '  ' })).toBeNull();
    expect(urdfTextOf({ urdfXml: 3 })).toBeNull();
    expect(urdfTextOf(null)).toBeNull();
  });
});
