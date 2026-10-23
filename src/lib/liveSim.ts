// =============================================================================
// HYDRA-UMC STUDIO - Live or Sim mode of each robot: liveSim.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A robot can be put in Sim from the robot panel. In Sim, this window sends nothing that moves or switches
// something on: jogs, play, reset, tool changes, valves, pumps, loading a trajectory and changing the speed are refused before they leave the browser and
// the interface says so. STOP, pause and the harmless settings (step, camera, vision) still
// go through, so a robot in Sim can always be stopped. The default is Live (what the app always did); the choice
// is kept in this browser, per robot, and a browser can also start every robot it has not chosen for in Sim.
// =============================================================================

export type RobotMode = 'live' | 'sim';

export const MODES_KEY = 'hydra.robotModes';
export const DEFAULT_MODE_KEY = 'hydra.defaultRobotMode';

/** The commands that move a robot or switch something on: refused while the robot is in Sim. */
export const REAL_COMMANDS: ReadonlySet<string> = new Set(['jog', 'play', 'reset', 'tool', 'valve', 'pump', 'trajectory', 'speed']);

export const isRealCommand = (command: string): boolean => REAL_COMMANDS.has(command);

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
export function blockedBySim(state: ModeState, robotIds: number[], command: string): boolean {
  return isRealCommand(command) && robotIds.some((id) => modeOf(state, id) === 'sim');
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
