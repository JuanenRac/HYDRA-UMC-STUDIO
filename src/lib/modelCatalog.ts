// =============================================================================
// HYDRA-UMC STUDIO - src/lib/modelCatalog.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The catalogue of the models that the editors (HYDRA-UMC-EDITOR-URDF, HYDRA-UMC-EDITOR-STL) submitted to the server:
// GET /api/models lists them and GET /api/models/:category/:slug/download gives the URDF and the meshes of one. STUDIO
// only ever sent submissions; this reads what the server holds. Everything that comes from the server is read
// defensively: an entry that is not a model is skipped, a name that would be a path is never used as a file name.
import { makeClient, settle } from './serverClient';

export interface SubmittedModel {
  slug: string;
  name: string;
  category: string;
  /** ISO text of the submission, or null when the server did not say. */
  submittedAt: string | null;
  /** The licence and credit the submitter gave, or null when there is none. */
  attribution: string | null;
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
    models.push({ slug, category, name: text(entry.name) ?? slug, submittedAt: text(entry.submittedAt), attribution: text(entry.attribution) });
  }
  return models.sort((a, b) => {
    if (a.submittedAt !== b.submittedAt) return (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
    return a.name.localeCompare(b.name);
  });
}

/** Reads GET /api/models through the typed client; `send` is the fetch function of the session by default. */
export async function fetchModelCatalog(
  send?: (url: string, init: RequestInit) => Promise<Response>,
): Promise<{ models: SubmittedModel[]; error: CatalogError | null }> {
  let answer: { status: number; data: unknown };
  try {
    answer = await settle(() => makeClient(send).getModels());
  } catch {
    return { models: [], error: 'network' };
  }
  if (answer.status === 401 || answer.status === 403) return { models: [], error: 'login_required' };
  // a refusal, or an answer that is not JSON (a page of a proxy), is a server error
  if (answer.status !== 200 || answer.data === null) return { models: [], error: 'server' };
  return { models: parseModelCatalog(answer.data), error: null };
}

/** GET /api/models/:category/:slug/download through the typed client (every part of the path is encoded, so a slug cannot add a segment): the answer of the server, or null when it was a refusal or not JSON. */
export async function fetchModelDownload(model: Pick<SubmittedModel, 'category' | 'slug'>, send?: (url: string, init: RequestInit) => Promise<Response>): Promise<unknown> {
  const { status, data } = await settle(() => makeClient(send).getModelsByCategoryBySlugDownload({ path: { category: model.category, slug: model.slug } }));
  return status === 200 ? data : null;
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
