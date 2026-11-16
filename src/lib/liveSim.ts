// =============================================================================
// HYDRA-UMC STUDIO - Live or Sim mode of each robot: liveSim.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A robot can be put in Sim from the robot panel. In Sim, this window sends nothing that moves or switches
// something on: jogs, table moves, play, reset, tool changes, valves, pumps, loading a trajectory, setting the joints and changing the speed are refused before they leave the browser and
// the interface says so. STOP, pause and the harmless settings (step, camera, vision) still
// go through, so a robot in Sim can always be stopped. The default is Live (what the app always did); the choice
// is kept in this browser, per robot, and a browser can also start every robot it has not chosen for in Sim.
// Sim belongs to this window only: the server knows nothing about it, so another window, the SUITE or a phone still move the robot.
// =============================================================================

export type RobotMode = 'live' | 'sim';

export const MODES_KEY = 'hydra.robotModes';
export const DEFAULT_MODE_KEY = 'hydra.defaultRobotMode';

/** The commands that move a robot or switch something on: refused while the robot is in Sim. */
export const REAL_COMMANDS: ReadonlySet<string> = new Set(['jog', 'table', 'play', 'reset', 'tool', 'valve', 'pump', 'trajectory', 'speed', 'joints']);

/**
 * Whether a command moves the robot or switches something on. Resuming a paused playback (`pause` with `paused: false`) makes the robot move again,
 * so it counts as real; pausing never does.
 */
export const isRealCommand = (command: string, params?: Record<string, unknown>): boolean =>
  REAL_COMMANDS.has(command) || (command === 'pause' && params?.paused === false);

/** The commands the server applies to one robot only; every other command reaches the robot and the robots combined with it. */
const SINGLE_ROBOT_COMMANDS: ReadonlySet<string> = new Set(['trajectory', 'table', 'enable', 'disable']);

/**
 * The robots a command reaches, worked out the way the server does it: the target alone for a trajectory, a table move, enable and disable, and the
 * target with the robots combined with it for everything else. `listed` are the robots the caller already named; they are kept.
 */
export function affectedRobotIds(command: string, targetId: number, combinedWith: readonly number[] | undefined, listed?: readonly number[]): number[] {
  const ids = new Set<number>(listed && listed.length > 0 ? listed : [targetId]);
  ids.add(targetId);
  if (!SINGLE_ROBOT_COMMANDS.has(command)) for (const other of combinedWith ?? []) ids.add(other);
  return [...ids];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface ModeState {
  /** Robots with an explicit choice. */
  modes: Record<number, RobotMode>;
  /** The mode of a robot with no explicit choice. */
  defaultMode: RobotMode;
}

export const INITIAL_MODE_STATE: ModeState = { modes: {}, defaultMode: 'live' };

export function modeOf(state: ModeState, robotId: number): RobotMode {
  return state.modes[robotId] ?? state.defaultMode;
}

/** Whether a command is refused for a robot: a real command while the robot is in Sim. */
export function blockedBySim(state: ModeState, robotIds: number[], command: string, params?: Record<string, unknown>): boolean {
  return isRealCommand(command, params) && robotIds.some((id) => modeOf(state, id) === 'sim');
}

export function withMode(state: ModeState, robotId: number, mode: RobotMode): ModeState {
  return { ...state, modes: { ...state.modes, [robotId]: mode } };
}

export function withDefaultMode(state: ModeState, mode: RobotMode): ModeState {
  return { ...state, defaultMode: mode };
}

export function loadModes(storage: StorageLike | null | undefined): ModeState {
  try {
    const defaultRaw = storage?.getItem(DEFAULT_MODE_KEY);
    const defaultMode: RobotMode = defaultRaw === 'sim' ? 'sim' : 'live';
    const raw = storage?.getItem(MODES_KEY);
    const modes: Record<number, RobotMode> = {};
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          const id = Number(key);
          if (Number.isInteger(id) && (value === 'live' || value === 'sim')) modes[id] = value;
        }
      }
    }
    return { modes, defaultMode };
  } catch {
    return INITIAL_MODE_STATE;
  }
}

export function saveModes(storage: StorageLike | null | undefined, state: ModeState): void {
  try {
    storage?.setItem(MODES_KEY, JSON.stringify(state.modes));
    storage?.setItem(DEFAULT_MODE_KEY, state.defaultMode);
  } catch {
    /* the choice simply does not persist */
  }
}
