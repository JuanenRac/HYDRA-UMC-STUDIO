// =============================================================================
// HYDRA-UMC STUDIO - src/lib/ptzHold.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// A continuous camera move lasts while a control is held. Only the camera that is held gets a stop, and a stop that did not get there is sent once more,
// because a camera that never receives it goes on turning until its end. `releaseAll` is for the moments the release cannot be seen (the window loses focus,
// the tab is hidden, the panel closes).
// =============================================================================

export interface PtzHold {
  /** Starts a move for the camera: `move` is sent now and `stop` is kept for the release. */
  start(id: number, move: () => Promise<boolean>, stop: () => Promise<boolean>): void;
  /** Ends the move of the camera if one is held; resolves once the stop was sent (and sent again once if the first did not arrive). */
  release(id: number): Promise<void>;
  releaseAll(): void;
  isHeld(id: number): boolean;
}

export function createPtzHold(retryDelayMs = 250): PtzHold {
  const held = new Map<number, () => Promise<boolean>>();
  const release = async (id: number): Promise<void> => {
    const stop = held.get(id);
    if (!stop) return;
    held.delete(id);
    if (await stop()) return;
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    await stop();
  };
  return {
    start(id, move, stop) {
      held.set(id, stop);
      void move();
    },
    release,
    releaseAll() {
      for (const id of [...held.keys()]) void release(id);
    },
    isHeld: id => held.has(id),
  };
}
