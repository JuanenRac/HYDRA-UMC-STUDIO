// =============================================================================
// HYDRA-UMC STUDIO - tests/ecosystemMap.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { groupByFamily, parseMapProject, parseMapReading, searchProjects, stateOf, summarize, type MapProject } from '../src/lib/ecosystemMap';

const project = (over: Partial<MapProject> & { name: string }): MapProject => ({
  role: null, stack: null, maturity: null, family: null, version: null, servicePort: null, activeState: null, live: null, ...over,
});

describe('the state of a project on the map', () => {
  it('a failed unit and an active unit whose port does not answer are errors', () => {
    expect(stateOf({ activeState: 'failed', live: true })).toBe('error');
    expect(stateOf({ activeState: 'active', live: false })).toBe('error');
  });
  it('an active unit or a port that answers is up; a stopped unit or a silent port is down', () => {
    expect(stateOf({ activeState: 'active', live: null })).toBe('up');
    expect(stateOf({ activeState: null, live: true })).toBe('up');
    expect(stateOf({ activeState: 'inactive', live: null })).toBe('down');
    expect(stateOf({ activeState: null, live: false })).toBe('down');
  });
  it('without any signal it is unknown', () => {
    expect(stateOf({ activeState: null, live: null })).toBe('unknown');
  });
});

describe('the families, the totals and the search', () => {
  const projects = [
    project({ name: 'HYDRA-UMC-TWIN', family: 'Simulation', live: true }),
    project({ name: 'HYDRA-UMC-ANDROID-CONTROL', family: 'Clients' }),
    project({ name: 'HYDRA-UMC-HIL-BRIDGE', family: 'Simulation', activeState: 'failed' }),
    project({ name: 'HYDRA-UMC-SDK', family: null, stack: 'python', live: false }),
  ];
  it('counts every state', () => {
    expect(summarize(projects)).toEqual({ total: 4, up: 1, error: 1, down: 1, unknown: 1 });
  });
  it('groups by family in alphabetical order, the ones without family last, and sorts the projects by name', () => {
    const groups = groupByFamily(projects);
    expect(groups.map((g) => g.family)).toEqual(['Clients', 'Simulation', null]);
    expect(groups[1].projects.map((p) => p.name)).toEqual(['HYDRA-UMC-HIL-BRIDGE', 'HYDRA-UMC-TWIN']);
  });
  it('searches every word in the name, family, role and stack', () => {
    expect(searchProjects(projects, '').length).toBe(4);
    expect(searchProjects(projects, 'sim twin').map((p) => p.name)).toEqual(['HYDRA-UMC-TWIN']);
    expect(searchProjects(projects, 'python').map((p) => p.name)).toEqual(['HYDRA-UMC-SDK']);
    expect(searchProjects(projects, 'nothing')).toEqual([]);
  });
});

describe('reading the answer of the server', () => {
  it('keeps the valid fields and drops what is not a project', () => {
    expect(parseMapProject({ name: 'X', version: '1.0.0', servicePort: 8080, live: true, extra: 1 })).toEqual(project({ name: 'X', version: '1.0.0', servicePort: 8080, live: true }));
    expect(parseMapProject({ name: '' })).toBeNull();
    expect(parseMapProject(null)).toBeNull();
    expect(parseMapProject({ name: 'X', servicePort: 1.5, live: 'yes', version: '' })).toEqual(project({ name: 'X' }));
  });
  it('reads the list, the availability and the time of the scan', () => {
    expect(parseMapReading({ available: false, projects: [{ name: 'A' }, 5, {}], scannedAt: '2026-01-01T00:00:00Z' })).toEqual({ available: false, projects: [project({ name: 'A' })], scannedAt: '2026-01-01T00:00:00Z' });
    expect(parseMapReading({ projects: [] })).toEqual({ available: true, projects: [], scannedAt: null });
    expect(parseMapReading({})).toBeNull();
    expect(parseMapReading('x')).toBeNull();
  });
});
