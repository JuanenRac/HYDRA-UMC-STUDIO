// =============================================================================
// HYDRA-UMC STUDIO - src/lib/ecosystemMap.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The map of the ecosystem: the projects that GET /api/ecosystem/status reports (a scan of the manifests next to the server plus a probe of the ones
// that declare a service), grouped by family, each one reduced to the state a person needs to see on a map: up, down, in error or unknown. Pure
// functions, so the screen only draws. The version drift comes from the health of the ecosystem when an administrator turned that on; without it the
// map simply shows no drift.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export type MapState = 'up' | 'down' | 'error' | 'unknown';
export const MAP_STATES: readonly MapState[] = ['up', 'error', 'down', 'unknown'];

export interface MapProject {
  name: string;
  role: string | null;
  stack: string | null;
  maturity: string | null;
  family: string | null;
  version: string | null;
  servicePort: number | null;
  activeState: string | null;
  live: boolean | null;
}

export interface MapFamily {
  family: string | null;
  projects: MapProject[];
}

export interface MapSummary {
  total: number;
  up: number;
  error: number;
  down: number;
  unknown: number;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);

export function parseMapProject(raw: any): MapProject | null {
  if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string' || raw.name === '') return null;
  return {
    name: raw.name,
    role: text(raw.role),
    stack: text(raw.stack),
    maturity: text(raw.maturity),
    family: text(raw.family),
    version: text(raw.version),
    servicePort: typeof raw.servicePort === 'number' && Number.isInteger(raw.servicePort) ? raw.servicePort : null,
    activeState: text(raw.activeState),
    live: typeof raw.live === 'boolean' ? raw.live : null,
  };
}

/** The state of one project: a failed unit, or an active one whose own port does not answer, is an error; otherwise the probe or the unit decide. */
export function stateOf(project: Pick<MapProject, 'activeState' | 'live'>): MapState {
  if (project.activeState === 'failed') return 'error';
  if (project.activeState === 'active') return project.live === false ? 'error' : 'up';
  if (project.activeState) return 'down';
  if (project.live === true) return 'up';
  if (project.live === false) return 'down';
  return 'unknown';
}

export function summarize(projects: readonly MapProject[]): MapSummary {
  const summary: MapSummary = { total: projects.length, up: 0, error: 0, down: 0, unknown: 0 };
  for (const project of projects) summary[stateOf(project)] += 1;
  return summary;
}

/** The families in alphabetical order with the projects without family last, and the projects of each by name. */
export function groupByFamily(projects: readonly MapProject[]): MapFamily[] {
  const groups = new Map<string | null, MapProject[]>();
  for (const project of projects) {
    const list = groups.get(project.family) ?? [];
    list.push(project);
    groups.set(project.family, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
    .map(([family, list]) => ({ family, projects: [...list].sort((x, y) => x.name.localeCompare(y.name)) }));
}

/** Only the projects whose name, family, role or stack contains the words (case-insensitive); an empty search keeps all. */
export function searchProjects(projects: readonly MapProject[], query: string): MapProject[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...projects];
  return projects.filter((project) => {
    const haystack = [project.name, project.family, project.role, project.stack].filter(Boolean).join(' ').toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export interface MapReading {
  available: boolean;
  projects: MapProject[];
  scannedAt: string | null;
}

export function parseMapReading(raw: any): MapReading | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.projects)) return null;
  const projects = raw.projects.map(parseMapProject).filter((project: MapProject | null): project is MapProject => project !== null);
  return { available: raw.available !== false, projects, scannedAt: text(raw.scannedAt) };
}

export type MapResult = { ok: true; value: MapReading } | { ok: false; failure: 'unavailable' | 'error' };

export async function loadEcosystemMap(): Promise<MapResult> {
  try {
    const response = await authFetch(apiUrl('/api/ecosystem/status'));
    if (!response.ok) return { ok: false, failure: 'error' };
    const reading = parseMapReading(await response.json());
    return reading ? { ok: true, value: reading } : { ok: false, failure: 'error' };
  } catch {
    return { ok: false, failure: 'error' };
  }
}
