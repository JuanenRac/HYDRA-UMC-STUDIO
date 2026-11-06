// =============================================================================
// HYDRA-UMC STUDIO - the gamepad mode, pure part: lib/gamepadMode.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// What the browser's Gamepad API reports (buttons and sticks, read once per screen frame) becomes a short list of events for the
// component to carry out. Everything that decides is here, with no React and no clock of its own, so it is tested with a made-up pad:
// - The mode is OFF until the operator arms it (the component asks for a confirmation and for a reservation of the robot).
// - STOP always wins: in the frame it is pressed it is the only event, while it is held nothing moves, and what was queued is forgotten.
// - A stick has a dead zone (configurable) and its push scales the step; a speed limit (configurable) caps every step.
// - A pad that disappears is a dead-man stop: one `lost` event, and nothing else until the operator arms the mode again.
// - Nothing is read while the tab has no focus or is hidden.
// The mapping of inputs to actions is the one saved in the settings (gamepadMapping); the numbers are in settings.gamepadMode.
// =============================================================================
import { createRateLimiter } from './inputThrottle';

/** The numbers and switches of the mode; all of them are in the settings (gamepadMode), none in the code that uses them. */
export interface GamepadModeConfig {
  /** A stick below this (0.05 to 0.6) is not pushed. */
  deadzone: number;
  /** The largest step of a held input, as a percentage of the full step (5 to 100). */
  maxSpeedPercent: number;
  /** A held input becomes at most one command per this many milliseconds (30 to 500). */
  heldIntervalMs: number;
  /** No held command is sent while this many earlier ones are unanswered (1 to 8). */
  maxUnanswered: number;
  /** The mode moves only a robot this window has reserved (a safety switch; on by default). */
  requireClaim: boolean;
  /** A pad that disappears stops every robot (a safety switch; on by default). */
  stopOnDisconnect: boolean;
  /** Nothing is read while the tab has no focus (a safety switch; on by default). */
  requireFocus: boolean;
}

export const DEFAULT_GAMEPAD_MODE: Readonly<GamepadModeConfig> = Object.freeze({
  deadzone: 0.2,
  maxSpeedPercent: 50,
  heldIntervalMs: 90,
  maxUnanswered: 4,
  requireClaim: true,
  stopOnDisconnect: true,
  requireFocus: true,
});

/** Limits of every number, as [lowest, highest]; the form uses them for its sliders. */
export const GAMEPAD_MODE_LIMITS = {
  deadzone: [0.05, 0.6],
  maxSpeedPercent: [5, 100],
  heldIntervalMs: [30, 500],
  maxUnanswered: [1, 8],
} as const;

const clampNumber = (value: unknown, [low, high]: readonly [number, number], fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

/** The configuration from whatever the settings hold: anything missing or out of range falls back to the safe default. */
export function parseGamepadMode(raw: unknown): GamepadModeConfig {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_GAMEPAD_MODE;
  return {
    deadzone: clampNumber(source.deadzone, GAMEPAD_MODE_LIMITS.deadzone, d.deadzone),
    maxSpeedPercent: clampNumber(source.maxSpeedPercent, GAMEPAD_MODE_LIMITS.maxSpeedPercent, d.maxSpeedPercent),
    heldIntervalMs: Math.round(clampNumber(source.heldIntervalMs, GAMEPAD_MODE_LIMITS.heldIntervalMs, d.heldIntervalMs)),
    maxUnanswered: Math.round(clampNumber(source.maxUnanswered, GAMEPAD_MODE_LIMITS.maxUnanswered, d.maxUnanswered)),
    requireClaim: flag(source.requireClaim, d.requireClaim),
    stopOnDisconnect: flag(source.stopOnDisconnect, d.stopOnDisconnect),
    requireFocus: flag(source.requireFocus, d.requireFocus),
  };
}

/** The part of the browser's Gamepad that is read. */
export interface PadLike {
  buttons: ReadonlyArray<{ pressed: boolean; value?: number }>;
  axes: readonly number[];
}

/** How far a stick is pushed beyond its dead zone, 0 to 1 (the dead zone itself maps to 0 and a full push to 1). */
export function applyDeadzone(value: number, deadzone: number): number {
  const size = Math.abs(value);
  if (!Number.isFinite(size) || size <= deadzone) return 0;
  return Math.min(1, (size - deadzone) / (1 - deadzone));
}

/** Every input of the pad that is pushed, by the id the mapping uses (B3, AXIS_0_NEG...), with how hard (0 to 1). */
export function readInputs(pad: PadLike, deadzone: number): Map<string, number> {
  const inputs = new Map<string, number>();
  pad.buttons.forEach((button, i) => { if (button.pressed) inputs.set(`B${i}`, 1); });
  pad.axes.forEach((value, i) => {
    const push = applyDeadzone(value, deadzone);
    if (push > 0) inputs.set(value < 0 ? `AXIS_${i}_NEG` : `AXIS_${i}_POS`, push);
  });
  return inputs;
}

/** The actions that stop: they are never held back and never wait. */
export function isStopAction(action: string | undefined): boolean {
  return action === 'E-STOP' || action === 'E-STOP ALL';
}

/** The actions that choose a robot (they do not move anything). */
export function isRobotSelection(action: string): boolean {
  return /^select_robot_\d+$/.test(action) || action === 'NEXT_ROBOT' || action === 'PREV_ROBOT';
}

/** The actions that are held (a step per interval while the input stays down). */
export function isHeldAction(action: string): boolean {
  return action === 'ROT+' || action === 'ROT-' || action === 'SPEED+' || action === 'SPEED-'
    || /^(J[1-6]|T[XY]|[XYZ])[+-]$/.test(action) || /^XY[+-]{2}$/.test(action);
}

/** The opposite of a held action, when it has one (X+ and X- pushed together move nothing). */
export function oppositeAction(action: string): string | null {
  if (/^XY[+-]{2}$/.test(action)) return `XY${action[2] === '+' ? '-' : '+'}${action[3] === '+' ? '-' : '+'}`;
  if (/^[A-Z0-9]+[+-]$/.test(action) && isHeldAction(action)) return `${action.slice(0, -1)}${action.endsWith('+') ? '-' : '+'}`;
  return null;
}

export type GamepadModeEvent =
  /** The global stop. Always the only event of its frame. */
  | { type: 'stop'; input: string }
  /** The pad disappeared: stop everything and show the notice; the mode must be armed again. */
  | { type: 'lost' }
  /** An input is held: one step of `action`, scaled by `scale` (0 to 1, already limited by the speed limit). */
  | { type: 'hold'; input: string; action: string; scale: number }
  /** An input was pressed now (not held): choose a robot, START, STOP, ADD POINT... */
  | { type: 'press'; input: string; action: string };

/** Why a frame produced no motion, for the line on screen. */
export type GamepadModeStatus = 'off' | 'no-pad' | 'unfocused' | 'blocked' | 'ready' | 'stopped';

export interface GamepadFrame {
  /** The pad read this frame (the first connected one), or null when there is none. */
  pad: PadLike | null;
  /** The mode was armed by the operator. */
  armed: boolean;
  /** The tab has focus and is visible. */
  focused: boolean;
  /** This window may move the selected robot (it holds the reservation, or the switch for it is off). */
  canMove: boolean;
  /** Commands sent and not answered yet. */
  unanswered: number;
  nowMs: number;
  /** The mapping of settings.gamepadMapping. */
  mapping: Record<string, string>;
}

export interface GamepadModeEngine {
  step(frame: GamepadFrame): { events: GamepadModeEvent[]; status: GamepadModeStatus };
  /** Forgets what is held and the pace of the commands (the mode was disarmed, or a stop was done). */
  reset(): void;
}

/** The engine keeps only the memory a frame needs from the one before: what was pressed, whether a pad was there. */
export function createGamepadModeEngine(config: GamepadModeConfig): GamepadModeEngine {
  const limiter = createRateLimiter(config.heldIntervalMs);
  let previous = new Set<string>();
  let hadPad = false;
  let stopHeld = false;
  // After arming, after a pad came back and after the tab got its focus back, nothing moves until every input has been let go once.
  let awaitNeutral = true;

  const reset = () => { previous = new Set(); hadPad = false; stopHeld = false; awaitNeutral = true; limiter.reset(); };

  return {
    reset,
    step(frame) {
      if (!frame.armed) { reset(); return { events: [], status: 'off' }; }

      if (!frame.pad) {
        const events: GamepadModeEvent[] = hadPad && config.stopOnDisconnect ? [{ type: 'lost' }] : [];
        previous = new Set(); stopHeld = false; awaitNeutral = true; limiter.reset(); hadPad = false;
        return { events, status: 'no-pad' };
      }
      hadPad = true;

      if (config.requireFocus && !frame.focused) {
        // No events; what was held is forgotten, so a button still down when the tab comes back is not a new press.
        previous = new Set(); stopHeld = false; awaitNeutral = true; limiter.reset();
        return { events: [], status: 'unfocused' };
      }

      const inputs = readInputs(frame.pad, config.deadzone);
      const stopInput = [...inputs.keys()].find((id) => isStopAction(frame.mapping[id]));

      // STOP first and alone: it is never rate limited, never needs a reservation, and what was held is forgotten.
      if (stopInput !== undefined) {
        const justPressed = !stopHeld;
        stopHeld = true;
        previous = new Set(inputs.keys());
        limiter.reset();
        return justPressed
          ? { events: [{ type: 'stop', input: stopInput }], status: 'stopped' }
          : { events: [], status: 'stopped' };
      }
      stopHeld = false;

      if (awaitNeutral) {
        if (inputs.size === 0) awaitNeutral = false;
        previous = new Set(inputs.keys());
        return { events: [], status: 'blocked' };
      }

      const events: GamepadModeEvent[] = [];
      const heldNow = new Map<string, { input: string; push: number }>();
      for (const [input, push] of inputs) {
        const action = frame.mapping[input];
        if (action && isHeldAction(action)) heldNow.set(action, { input, push: Math.max(push, heldNow.get(action)?.push ?? 0) });
      }

      for (const [input] of inputs) {
        const action = frame.mapping[input];
        if (!action || previous.has(input) || isHeldAction(action) || isStopAction(action)) continue;
        // A robot can always be chosen; everything else that acts (START, STOP, ADD POINT...) needs the right to move.
        if (isRobotSelection(action) || frame.canMove) events.push({ type: 'press', input, action });
      }

      if (frame.canMove && frame.unanswered < config.maxUnanswered) {
        const cap = config.maxSpeedPercent / 100;
        for (const [action, { input, push }] of heldNow) {
          const opposite = oppositeAction(action);
          if (opposite && heldNow.has(opposite)) continue;
          if (!limiter.allow(action, frame.nowMs)) continue;
          events.push({ type: 'hold', input, action, scale: Math.min(cap, push * cap) });
        }
      }

      previous = new Set(inputs.keys());
      return { events, status: frame.canMove ? 'ready' : 'blocked' };
    },
  };
}

/** One row of the preview: an input that is pushed right now, how hard, and the action it is given. */
export interface InputPreviewRow { input: string; push: number; action: string }

/** What the pad is doing right now, for the configuration panel (nothing is sent from here). */
export function previewInputs(pad: PadLike | null, mapping: Record<string, string>, deadzone: number): InputPreviewRow[] {
  if (!pad) return [];
  return [...readInputs(pad, deadzone)].map(([input, push]) => ({ input, push, action: mapping[input] ?? '' }));
}

/** The size of a step after the speed limit, in the unit of the full step; never above it, never negative. */
export function limitedStep(fullStep: number, scale: number): number {
  const factor = Number.isFinite(scale) ? Math.min(1, Math.max(0, scale)) : 0;
  return fullStep * factor;
}

/** The answer to "may the mode be armed now?", with the reason when not. */
export type ArmingVerdict = { ok: true } | { ok: false; reason: 'no-robot' | 'no-claim' | 'no-pad' };

export function canArm(input: { robotSelected: boolean; standing: 'free' | 'mine' | 'other-controller' | 'other-account'; padPresent: boolean; config: GamepadModeConfig }): ArmingVerdict {
  if (!input.robotSelected) return { ok: false, reason: 'no-robot' };
  if (input.config.requireClaim && input.standing !== 'mine') return { ok: false, reason: 'no-claim' };
  if (!input.padPresent) return { ok: false, reason: 'no-pad' };
  return { ok: true };
}
