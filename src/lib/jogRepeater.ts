// =============================================================================
// HYDRA-UMC STUDIO - repeating a held jog button: jogRepeater.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// A jog button that is held repeats its step. If the browser never delivers the "button released" event (the window
// lost focus with the pointer still, the tab went to the background, a system dialog took the pointer) the repeat
// used to run forever. This repeater has a deadman: it stops by itself after `maxHoldMs` however the button ends,
// and the caller can stop it from any other signal (pointer cancel, blur, the page being hidden).
// =============================================================================

export interface JogRepeater {
  /** Starts repeating: `tick` runs once now and then every `intervalMs` until stopped or `maxHoldMs` passes. */
  start(tick: () => void): void;
  stop(): void;
  isRunning(): boolean;
}

export interface JogRepeaterOptions {
  intervalMs: number;
  maxHoldMs: number;
  /** Called when the deadman, not the user, ended the repeat. */
  onDeadman?: () => void;
}

export function createJogRepeater(options: JogRepeaterOptions): JogRepeater {
  let interval: ReturnType<typeof setInterval> | null = null;
  let deadman: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (interval !== null) { clearInterval(interval); interval = null; }
    if (deadman !== null) { clearTimeout(deadman); deadman = null; }
  };

  return {
    start(tick) {
      stop();
      tick();
      interval = setInterval(tick, options.intervalMs);
      deadman = setTimeout(() => {
        stop();
        options.onDeadman?.();
      }, options.maxHoldMs);
    },
    stop,
    isRunning: () => interval !== null,
  };
}
