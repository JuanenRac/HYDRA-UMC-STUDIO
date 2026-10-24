import { describe, expect, it } from 'vitest';
import { fetchModelCatalog, modelDownloadPath, parseModelCatalog, urdfDownloadName, urdfTextOf } from '../src/lib/modelCatalog';

const answer = (status: number, body: unknown) => async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

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
    expect(models[2]).toEqual({ slug: 'c', name: 'c', category: 'tools', submittedAt: null });
  });

  it('is an empty list for anything that is not a list of models', () => {
    for (const bad of [null, undefined, 3, 'x', [], {}, { models: 'many' }, { models: {} }]) expect(parseModelCatalog(bad)).toEqual([]);
  });

  it('tells a refusal that asks for a sign-in from a server error and from no answer', async () => {
    expect(await fetchModelCatalog(answer(200, { models: [{ slug: 'a', name: 'A', category: 'c' }] }), '/api/models')).toEqual({
      models: [{ slug: 'a', name: 'A', category: 'c', submittedAt: null }], error: null,
    });
    expect((await fetchModelCatalog(answer(401, { error: 'x' }), '/api/models')).error).toBe('login_required');
    expect((await fetchModelCatalog(answer(403, {}), '/api/models')).error).toBe('login_required');
    expect((await fetchModelCatalog(answer(500, {}), '/api/models')).error).toBe('server');
    expect((await fetchModelCatalog(answer(200, '<html>proxy page</html>'), '/api/models')).error).toBe('server');
    expect((await fetchModelCatalog(async () => { throw new Error('offline'); }, '/api/models')).error).toBe('network');
  });

  it('encodes every part of the download path, so a name cannot add a segment', () => {
    expect(modelDownloadPath({ category: 'robots', slug: 'ar3' })).toBe('/api/models/robots/ar3/download');
    expect(modelDownloadPath({ category: 'a/b', slug: '../x?y' })).toBe('/api/models/a%2Fb/..%2Fx%3Fy/download');
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
