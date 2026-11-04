// =============================================================================
// HYDRA-UMC STUDIO - Files of trajectories and scenes: sceneFiles.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// What the provider does with a trajectory or scene file, kept apart from the state: the name of the file that is
// saved, the reading of a file that is loaded (a decision, with no state touched) and the download of a JSON text.

import { validateSceneRobots, validateTrajectoryPoints } from './importValidation';

/** The result of reading a trajectory file: points to play, a single pose, or the reason the file is refused. */
export type TrajectoryFile =
  | { kind: 'points'; points: unknown[] }
  | { kind: 'pose'; pose: Record<string, unknown> }
  | { kind: 'error'; detail: string };

/** The name under which the recorded points of a robot are saved; the Works folder, when there is one, leads the name. */
export function kinematicsFileName(robotName: string, worksPath: string | undefined): string {
  const prefix = worksPath ? `${worksPath.replace(/\//g, '_')}_` : '';
  return `${prefix}kinematics_${robotName.replace(/\s+/g, '_')}.json`;
}

/** Reads the text of a trajectory file: a list of points (checked), or one pose with a numeric x. */
export function readTrajectoryFile(text: string): TrajectoryFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: 'error', detail: 'not valid JSON' };
  }
  if (Array.isArray(json)) {
    const checked = validateTrajectoryPoints(json);
    return checked.ok ? { kind: 'points', points: checked.value as unknown[] } : { kind: 'error', detail: checked.error };
  }
  if (json && typeof json === 'object' && typeof (json as { x?: unknown }).x === 'number') {
    return { kind: 'pose', pose: { ...(json as Record<string, unknown>) } };
  }
  return { kind: 'error', detail: 'not a trajectory' };
}

/** Reads the text of a scene file: the robots (checked) or the reason the file is refused. */
export function readSceneFile(text: string): { ok: true; robots: unknown[] } | { ok: false; detail: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, detail: 'not valid JSON' };
  }
  const checked = validateSceneRobots(json);
  return checked.ok ? { ok: true, robots: checked.value as unknown[] } : { ok: false, detail: checked.error };
}

/** What a browser needs to offer a file for download; the tests pass a stand-in. */
export interface DownloadHost {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  createLink(): { href: string; download: string; click(): void };
  attach(link: unknown): void;
  detach(link: unknown): void;
}

/** The real browser as the download host. */
export function browserDownloadHost(): DownloadHost {
  return {
    createObjectURL: blob => URL.createObjectURL(blob),
    revokeObjectURL: url => URL.revokeObjectURL(url),
    createLink: () => document.createElement('a'),
    attach: link => document.body.appendChild(link as Node),
    detach: link => document.body.removeChild(link as Node),
  };
}

/** Offers `data` as a JSON file named `fileName`. */
export function downloadJson(fileName: string, data: unknown, host: DownloadHost = browserDownloadHost()): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = host.createObjectURL(blob);
  const link = host.createLink();
  link.href = url;
  link.download = fileName;
  host.attach(link);
  link.click();
  host.detach(link);
  host.revokeObjectURL(url);
}
