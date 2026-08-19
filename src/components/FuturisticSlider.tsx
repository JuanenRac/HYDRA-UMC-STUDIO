// =============================================================================
// HYDRA-UMC STUDIO - UI Control Component: FuturisticSlider.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface FuturisticSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  className?: string;
  /** Snaps dragged values to the nearest multiple of this (relative to min) - e.g. the Robot module's own jogStep combobox. Undefined/0 keeps the old continuous, 1-decimal behavior. */
  step?: number;
}

export function FuturisticSlider({ min, max, value, onChange, className, step }: FuturisticSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const onChangeRef = useRef(onChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);
  useEffect(() => { onChangeRef.current = onChange; minRef.current = min; maxRef.current = max; stepRef.current = step; }, [onChange, min, max, step]);

  const clampedValue = Math.min(max, Math.max(min, value || 0));
  const pct = (clampedValue - min) / (max - min);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValueFromEvent(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    updateValueFromEvent(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateValueFromEvent = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    
    let newPct = (clientX - rect.left) / rect.width;
    newPct = Math.max(0, Math.min(1, newPct));
    
    let newVal = minRef.current + newPct * (maxRef.current - minRef.current);
    if (stepRef.current) {
      newVal = minRef.current + Math.round((newVal - minRef.current) / stepRef.current) * stepRef.current;
      newVal = Math.min(maxRef.current, Math.max(minRef.current, newVal));
    }
    onChangeRef.current(Number(newVal.toFixed(2)));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <div 
      className={clsx("relative h-6 flex items-center cursor-pointer group touch-none", className)}
      onPointerDown={handlePointerDown}
      ref={trackRef}
    >
      {/* Background Track */}
      <div className="absolute left-0 right-0 h-3 bg-slate-950 rounded-full border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Fill */}
        <div 
          className="absolute top-0 bottom-0 left-0 bg-sky-500 transition-all duration-75"
          style={{ width: `${pct * 100}%`, backgroundImage: 'linear-gradient(90deg, rgba(56, 189, 248, 0.4) 0%, rgba(14, 165, 233, 0.8) 100%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)' }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 opacity-50 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px]" />
        </div>
      </div>
      
      {/* Handle / Thumb */}
      <div 
        className="absolute w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center transition-transform duration-75 group-hover:scale-110"
        style={{ 
          left: `calc(${pct * 100}% - 10px)`,
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.2) 100%)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.7)',
          border: '1px solid rgba(56, 189, 248, 0.5)'
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
      </div>
    </div>
  );
}
