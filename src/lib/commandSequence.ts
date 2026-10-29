// =============================================================================
// HYDRA-UMC-STUDIO - src/lib/commandSequence.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The number this window puts on its motion commands (`seq`). The server refuses a jog whose number is not above
// the highest one it has seen from the same account and controller, and a stop raises that mark, so a jog sent
// before a stop can never move the robot after it. The number grows by at least one with every command and
// follows the clock, so a window that was reloaded (or a second window with the same controller id) starts
// above everything an earlier one sent.

/** The commands the server orders by number: the motion commands and the stop that must overtake them. */
const NUMBERED = new Set(['jog', 'table', 'joints', 'stop']);

export function isNumberedCommand(command: string): boolean {
  return NUMBERED.has(command);
}

export interface CommandSequence {
  /** The next number: above the previous one and not below the clock. */
  next(): number;
}

export function createCommandSequence(clock: () => number = Date.now): CommandSequence {
  let last = 0;
  return {
    next() {
      last = Math.max(last + 1, Math.floor(clock()));
      return last;
    },
  };
}
