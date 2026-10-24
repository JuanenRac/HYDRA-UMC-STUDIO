// =============================================================================
// HYDRA-UMC STUDIO - src/lib/modelCatalog.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The catalogue of the models that the editors (HYDRA-UMC-EDITOR-URDF, HYDRA-UMC-EDITOR-STL) submitted to the server:
// GET /api/models lists them and GET /api/models/:category/:slug/download gives the URDF and the meshes of one. STUDIO
// only ever sent submissions; this reads what the server holds. Everything that comes from the server is read
// defensively: an entry that is not a model is skipped, a name that would be a path is never used as a file name.

export interface SubmittedModel {
  slug: string;
  name: string;
  category: string;
  /** ISO text of the submission, or null when the server did not say. */
  submittedAt: string | null;
}

export type CatalogError = 'login_required' | 'server' | 'network';

const PLAIN_NAME = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}$/;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** The models of a GET /api/models answer, newest first, then by name. Anything that is not a list of models is an empty list. */
export function parseModelCatalog(data: unknown): SubmittedModel[] {
  const list = typeof data === 'object' && data !== null ? (data as { models?: unknown }).models : null;
  if (!Array.isArray(list)) return [];
  const models: SubmittedModel[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as Record<string, unknown>;
    const slug = text(entry.slug);
    const category = text(entry.category);
    if (!slug || !category) continue;
    models.push({ slug, category, name: text(entry.name) ?? slug, submittedAt: text(entry.submittedAt) });
  }
  return models.sort((a, b) => {
    if (a.submittedAt !== b.submittedAt) return (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
    return a.name.localeCompare(b.name);
  });
}

export async function fetchModelCatalog(
  fetchImpl: (input: string) => Promise<Response>,
  url: string,
): Promise<{ models: SubmittedModel[]; error: CatalogError | null }> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    return { models: [], error: 'network' };
  }
  if (response.status === 401 || response.status === 403) return { models: [], error: 'login_required' };
  if (!response.ok) return { models: [], error: 'server' };
  try {
    return { models: parseModelCatalog(await response.json()), error: null };
  } catch {
    return { models: [], error: 'server' };
  }
}

/** The path of the download of one model (every part is encoded, so a slug cannot add a segment). */
export function modelDownloadPath(model: Pick<SubmittedModel, 'category' | 'slug'>): string {
  return `/api/models/${encodeURIComponent(model.category)}/${encodeURIComponent(model.slug)}/download`;
}

/** The name the URDF is saved under: the one the server gave when it is one plain name, otherwise `<slug>.urdf`. */
export function urdfDownloadName(answer: unknown, slug: string): string {
  const given = typeof answer === 'object' && answer !== null ? (answer as { urdfFilename?: unknown }).urdfFilename : null;
  const base = typeof given === 'string' ? given.split(/[\\/]/).pop() ?? '' : '';
  if (PLAIN_NAME.test(base) && base.toLowerCase().endsWith('.urdf')) return base;
  const safeSlug = PLAIN_NAME.test(slug) ? slug : 'model';
  return `${safeSlug}.urdf`;
}

/** The URDF text of a download answer, or null when it has none. */
export function urdfTextOf(answer: unknown): string | null {
  const xml = typeof answer === 'object' && answer !== null ? (answer as { urdfXml?: unknown }).urdfXml : null;
  return typeof xml === 'string' && xml.trim() !== '' ? xml : null;
}
