// =============================================================================
// HYDRA-UMC STUDIO - limiting how often held input becomes commands: inputThrottle.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The gamepad is read once per screen frame (60 per second) and a held stick used to send a command on each one -
// up to three per frame for a diagonal - without waiting for the previous answer, so after the stick was let go the
// queue of requests still arriving kept the robot moving. A held input is now sent at a fixed rate, and not at all
// while too many earlier commands are still unanswered.
// =============================================================================

export interface RateLimiter {
  /** True when something keyed `key` may be sent at `nowMs`; the time is recorded when it is. */
  allow(key: string, nowMs: number): boolean;
  /** Forgets every key (the gamepad was unplugged, the page was hidden). */
  reset(): void;
}

export function createRateLimiter(minIntervalMs: number): RateLimiter {
  const lastSent = new Map<string, number>();
  return {
    allow(key, nowMs) {
      const previous = lastSent.get(key);
      if (previous !== undefined && nowMs - previous < minIntervalMs) return false;
      lastSent.set(key, nowMs);
      return true;
    },
    reset() {
      lastSent.clear();
    },
  };
}

/** A counter of commands that were sent and not yet answered. */
export interface InFlightCounter {
  /** Counts a command until the promise settles; returns the same promise. */
  track<T>(promise: Promise<T>): Promise<T>;
  count(): number;
  reset(): void;
}

export function createInFlightCounter(): InFlightCounter {
  let pending = 0;
  return {
    track(promise) {
      pending += 1;
      const release = () => { pending = Math.max(0, pending - 1); };
      promise.then(release, release);
      return promise;
    },
    count: () => pending,
    reset() { pending = 0; },
  };
}
