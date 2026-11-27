// =============================================================================
// HYDRA-UMC STUDIO - UI Component: StopGuard.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The global STOP is always on screen and can always be pressed. The STOP buttons of the header, the footer and the robot screen carry
// `data-stop-global`; while NONE of them can be pressed (a window, a dialog, a tour, the mascot or a notice covers them, or a narrow screen
// leaves them outside) one more STOP is drawn at the top centre, above everything. It looks at what is really on screen, so a new window needs
// nothing of its own. A window that fills the screen marks its backdrop with `data-stop-clear`, which keeps that top strip free (index.css).
// =============================================================================
import { useEffect, useState } from 'react';
import { StopAllButton } from './StopAll';

/** The points of a button that must all be reachable: the centre and four points half way to its sides. */
const SAMPLES: ReadonlyArray<readonly [number, number]> = [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.5, 0.2], [0.5, 0.8]];
export const STOP_GUARD_INTERVAL_MS = 150;

/** True when the whole button is inside the window and a press on it reaches it. */
export function isPressable(button: Element): boolean {
  const box = button.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return false;
  if (box.left < -0.5 || box.top < -0.5 || box.right > window.innerWidth + 0.5 || box.bottom > window.innerHeight + 0.5) return false;
  return SAMPLES.every(([x, y]) => {
    const hit = document.elementFromPoint(box.left + box.width * x, box.top + box.height * y);
    return hit !== null && button.contains(hit);
  });
}

export function StopGuard() {
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    // a page without layout (a test in jsdom) cannot say what covers what
    if (typeof document.elementFromPoint !== 'function') return;
    const check = () => setNeeded(!Array.from(document.querySelectorAll('[data-stop-global]')).some(isPressable));
    check();
    const timer = setInterval(check, STOP_GUARD_INTERVAL_MS);
    window.addEventListener('resize', check);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', check);
    };
  }, []);

  if (!needed) return null;
  return (
    <div className="stop-floating" data-testid="stop-guard">
      <StopAllButton variant="floating" />
    </div>
  );
}
