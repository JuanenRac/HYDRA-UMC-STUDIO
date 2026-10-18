// =============================================================================
// HYDRA-UMC STUDIO - UI Control Component: Joystick3D.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// A jog-pendant-style directional pad for X/Y/Z, used by the
// Robot module's floating 3D overlay (robot A1 proof of concept). Deliberately a D-pad, not an analog
// stick: real CNC/robot jog pendants (the UI this is modeled after) almost
// always use discrete directional buttons at a chosen step size, not a
// continuous analog joystick - matches how jogStep already works elsewhere
// in this same module.

import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ChevronUp, ChevronDown, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft, Crosshair } from 'lucide-react';
import { clsx } from 'clsx';
import { createJogRepeater } from '../lib/jogRepeater';

interface Joystick3DProps {
  /** Called with the signed step multiplier for each axis pressed - e.g. (1,0,0) for +X. Caller applies its own step size/units. */
  onJog: (dx: number, dy: number, dz: number) => void;
  disabled?: boolean;
  className?: string;
}

const REPEAT_MS = 150;
// A jog held longer than this stops by itself: if the browser never delivers the release (the window lost focus
// with the pointer still, a system dialog took the pointer) the repeat would otherwise run for ever.
const MAX_HOLD_MS = 8000;

export function Joystick3D({ onJog, disabled, className }: Joystick3DProps) {
  const onJogRef = useRef(onJog);
  useEffect(() => { onJogRef.current = onJog; }, [onJog]);
  const repeaterRef = useRef(createJogRepeater({ intervalMs: REPEAT_MS, maxHoldMs: MAX_HOLD_MS }));

  const stop = () => repeaterRef.current.stop();

  const start = (dx: number, dy: number, dz: number) => {
    if (disabled) return;
    repeaterRef.current.start(() => onJogRef.current(dx, dy, dz));
  };

  // Whatever else ends the press - losing the window focus, the page going to the background, leaving the component -
  // ends the repeat too.
  useEffect(() => {
    const repeater = repeaterRef.current;
    const halt = () => repeater.stop();
    const onVisibility = () => { if (document.hidden) repeater.stop(); };
    window.addEventListener('blur', halt);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', halt);
      document.removeEventListener('visibilitychange', onVisibility);
      repeater.stop();
    };
  }, []);

  // The handlers every direction button shares. The pointer is captured, so the release arrives at the button
  // even when the finger or cursor has moved off it; a cancelled or lost pointer stops the jog like a release.
  const hold = (dx: number, dy: number, dz: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a synthetic event has no active pointer */ }
      start(dx, dy, dz);
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
  });

  const padBtn = (dx: number, dy: number, icon: React.ReactNode, extraClass?: string) => (
    <button
      type="button"
      disabled={disabled}
      {...hold(dx, dy, 0)}
      className={clsx(
        "flex items-center justify-center bg-slate-900/80 hover:bg-sky-500/20 active:bg-sky-500/40 border border-slate-700 hover:border-sky-500/50 text-sky-400 rounded-lg transition-colors touch-none select-none disabled:opacity-30 disabled:pointer-events-none",
        extraClass
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className={clsx("flex items-center gap-3", className)}>
      {/* XY pad - 3x3 grid, diagonals only (matches a typical jog pendant layout) plus a center Home-view button */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-24 h-24">
        {padBtn(-1, 1, <ArrowUpLeft size={16} />)}
        {padBtn(0, 1, <ChevronUp size={16} />)}
        {padBtn(1, 1, <ArrowUpRight size={16} />)}
        {padBtn(-1, 0, <ChevronUp size={16} className="-rotate-90" />)}
        <div className="flex items-center justify-center text-slate-700"><Crosshair size={14} /></div>
        {padBtn(1, 0, <ChevronUp size={16} className="rotate-90" />)}
        {padBtn(-1, -1, <ArrowDownLeft size={16} />)}
        {padBtn(0, -1, <ChevronDown size={16} />)}
        {padBtn(1, -1, <ArrowDownRight size={16} />)}
      </div>
      {/* Z column */}
      <div className="grid grid-rows-2 gap-1 w-10 h-24">
        <button
          type="button"
          disabled={disabled}
          {...hold(0, 0, 1)}
          className="flex flex-col items-center justify-center bg-slate-900/80 hover:bg-emerald-500/20 active:bg-emerald-500/40 border border-slate-700 hover:border-emerald-500/50 text-emerald-400 rounded-lg transition-colors touch-none select-none disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronUp size={16} /><span className="text-[8px] font-black">Z</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          {...hold(0, 0, -1)}
          className="flex flex-col items-center justify-center bg-slate-900/80 hover:bg-rose-500/20 active:bg-rose-500/40 border border-slate-700 hover:border-rose-500/50 text-rose-400 rounded-lg transition-colors touch-none select-none disabled:opacity-30 disabled:pointer-events-none"
        >
          <span className="text-[8px] font-black">Z</span><ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}
