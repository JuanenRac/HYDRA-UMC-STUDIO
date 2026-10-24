// =============================================================================
// HYDRA-UMC STUDIO - the edits of one robot as commands: robotEdits.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The recorded points, the repeat flag, the model, the role, the robots it is combined with, the joint values of the
// sliders and the layout of the XY table used to travel only inside the whole settings tree, which the server takes
// from an administrator alone and where the last writer wins. The server now has a command for each of them
// (points, loop, model, role, combine, joints, xyTableConfig). This file decides, from what a panel changed, which
// commands say the same thing, and keeps them in order: one in flight per robot and command, and only the newest
// of the ones that arrive meanwhile (each carries the whole value, so the newest says it all). No React in here.
// =============================================================================
import type { RobotState } from '../store';

export type RobotEditName = 'points' | 'loop' | 'model' | 'role' | 'combine' | 'joints' | 'xyTableConfig';

export interface RobotEditCommand {
  command: RobotEditName;
  params: Record<string, unknown>;
}

export interface RobotEditPlan {
  commands: RobotEditCommand[];
  /** The changed fields no command covers (they still travel in the settings tree, for an account that may save it). */
  rest: string[];
}

const same = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * The commands that say what `updates` changes on `current`. Joints are only planned when asked for: the pose that is
 * worked out from a jog travels with the jog itself, and only the sliders send the joints.
 */
export function planRobotEdits(current: RobotState | undefined, updates: Partial<RobotState>, options: { joints?: boolean } = {}): RobotEditPlan {
  const commands: RobotEditCommand[] = [];
  const rest: string[] = [];
  let table: Record<string, unknown> | null = null;
  for (const [key, value] of Object.entries(updates) as Array<[keyof RobotState, unknown]>) {
    switch (key) {
      case 'recordedPoints':
        if (Array.isArray(value)) commands.push({ command: 'points', params: { points: value } });
        else rest.push(key);
        break;
      case 'model':
        if (typeof value === 'string' && value.trim() !== '') commands.push({ command: 'model', params: { model: value } });
        else rest.push(key);
        break;
      case 'role':
        if (typeof value === 'string') commands.push({ command: 'role', params: { role: value } });
        else rest.push(key);
        break;
      case 'combinedWith':
        if (Array.isArray(value) && value.every((id) => typeof id === 'number')) commands.push({ command: 'combine', params: { with: value } });
        else rest.push(key);
        break;
      case 'joints':
        if (options.joints && value && typeof value === 'object') commands.push({ command: 'joints', params: { joints: value } });
        else rest.push(key);
        break;
      case 'playbackState': {
        const next = (value ?? {}) as Record<string, unknown>;
        const before = (current?.playbackState ?? {}) as unknown as Record<string, unknown>;
        const changed = Object.keys({ ...before, ...next }).filter((field) => !same(before[field], next[field]));
        if (changed.length === 0) break;
        if (changed.length === 1 && changed[0] === 'isLooping' && typeof next.isLooping === 'boolean') commands.push({ command: 'loop', params: { value: next.isLooping } });
        else rest.push(key);
        break;
      }
      case 'hasXYTable':
        if (typeof value === 'boolean') (table ??= {}).enabled = value;
        else rest.push(key);
        break;
      case 'xyTable': {
        const next = (value ?? {}) as Record<string, any>;
        const before = (current?.xyTable ?? {}) as Record<string, any>;
        let covered = true;
        for (const field of Object.keys({ ...before, ...next })) {
          if (same(before[field], next[field])) continue;
          if (field === 'tableSize' || field === 'worldPos' || field === 'worldRot' || field === 'renderScale') {
            if (next[field] !== undefined) (table ??= {})[field] = next[field];
            else covered = false;
          } else {
            covered = false; // the position of the table travels with the table command, not with its layout
          }
        }
        if (!covered) rest.push(key);
        break;
      }
      default:
        rest.push(key);
    }
  }
  if (table) commands.push({ command: 'xyTableConfig', params: table });
  return { commands, rest };
}

let supported = true;

/** Whether the server was last seen to understand the edit commands (true until it says otherwise). */
export function serverHasEditCommands(): boolean { return supported; }
export function markEditCommands(value: boolean): void { supported = value; }

export interface EditQueue<R> {
  /** Sends the command, or keeps it for after the one in flight (replacing an older one waiting). Resolves with the answer of the one that went out last for it. */
  enqueue(robotId: number, edit: RobotEditCommand): Promise<R | null>;
  /** How many commands are in flight (for the checks). */
  inFlight(): number;
}

export function createEditQueue<R>(send: (robotId: number, edit: RobotEditCommand) => Promise<R>): EditQueue<R> {
  interface Slot { running: boolean; waiting: { edit: RobotEditCommand; resolvers: Array<(r: R | null) => void> } | null }
  const slots = new Map<string, Slot>();
  let flying = 0;
  const run = async (key: string, robotId: number, edit: RobotEditCommand, resolvers: Array<(r: R | null) => void>): Promise<void> => {
    const slot = slots.get(key)!;
    slot.running = true;
    flying += 1;
    let result: R | null = null;
    try {
      result = await send(robotId, edit);
    } catch {
      result = null;
    } finally {
      flying -= 1;
      slot.running = false;
      for (const resolve of resolvers) resolve(result);
      const next = slot.waiting;
      slot.waiting = null;
      if (next) void run(key, robotId, next.edit, next.resolvers);
      else slots.delete(key);
    }
  };
  return {
    enqueue(robotId, edit) {
      const key = `${robotId}:${edit.command}`;
      return new Promise<R | null>((resolve) => {
        let slot = slots.get(key);
        if (!slot) {
          slot = { running: false, waiting: null };
          slots.set(key, slot);
        }
        if (slot.running) {
          // Superseded: the older waiting command is answered with null (it never went out), the newest takes its place.
          if (slot.waiting) {
            slot.waiting.resolvers.forEach((r) => r(null));
            slot.waiting.resolvers = [];
          }
          slot.waiting = { edit, resolvers: [resolve] };
          return;
        }
        void run(key, robotId, edit, [resolve]);
      });
    },
    inFlight: () => flying,
  };
}
