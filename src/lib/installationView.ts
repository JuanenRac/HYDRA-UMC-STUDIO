// =============================================================================
// HYDRA-UMC STUDIO - src/lib/installationView.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The first-run checklist of an installation, drawn only from what the server reports about itself (GET /api/hydra-info) and from the
// second factor of the signed-in account. The server has no route that installs or repairs anything, so the list tells what is
// done and what the next step is; it never does the step.
import type { ServerInfo } from './updatesView';

export type StepId = 'server' | 'controller' | 'robot' | 'second_factor';
export type StepState = 'done' | 'todo' | 'unknown';
export interface InstallStep { id: StepId; state: StepState; count?: number }

const yes = (done: boolean): StepState => (done ? 'done' : 'todo');

/** The steps in the order they are done. A step whose answer is not known (the server could not be read) is `unknown`, never `todo`. */
export function installSteps(info: ServerInfo | null, secondFactorOn: boolean | null): InstallStep[] {
  return [
    { id: 'server', state: yes(info !== null) },
    { id: 'controller', state: info ? yes(info.controllerCount > 0) : 'unknown', count: info?.controllerCount ?? 0 },
    { id: 'robot', state: info ? yes(info.robotCount > 0) : 'unknown', count: info?.robotCount ?? 0 },
    { id: 'second_factor', state: secondFactorOn === null ? 'unknown' : yes(secondFactorOn) },
  ];
}

/** The first step that is still to do, or null when all are done. */
export function nextStep(steps: readonly InstallStep[]): InstallStep | null {
  return steps.find((step) => step.state === 'todo') ?? null;
}

/** How many of the steps are done. */
export function doneCount(steps: readonly InstallStep[]): number {
  return steps.filter((step) => step.state === 'done').length;
}
