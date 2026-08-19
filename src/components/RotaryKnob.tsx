// =============================================================================
// HYDRA-UMC STUDIO - UI Control Component: RotaryKnob.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';

interface RotaryKnobProps {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  size?: number;
  /** Snaps dragged values to the nearest multiple of this (relative to min) - e.g. the Robot module's own jogStep combobox. Undefined/0 keeps the old continuous, 1-decimal behavior. */
  step?: number;
}

export function RotaryKnob({ min, max, value, onChange, size = 48, step }: RotaryKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const onChangeRef = useRef(onChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);
  useEffect(() => { onChangeRef.current = onChange; minRef.current = min; maxRef.current = max; stepRef.current = step; }, [onChange, min, max, step]);

  // Clamp value
  const clampedValue = Math.min(max, Math.max(min, value || 0));

  const valueToAngle = (v: number) => {
    const pct = (v - min) / (max - min);
    return -135 + (pct * 270);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValueFromEvent(e);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    updateValueFromEvent(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateValueFromEvent = (e: React.PointerEvent | PointerEvent) => {
    if (!knobRef.current) return;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    
    angle = angle + 90;
    if (angle > 180) angle -= 360;
    
    if (angle > 135) angle = 135;
    if (angle < -135) angle = -135;

    const pct = (angle + 135) / 270;
    let newVal = minRef.current + pct * (maxRef.current - minRef.current);
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
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const currentAngle = valueToAngle(clampedValue);

  return (
    <div 
      ref={knobRef}
      className="relative rounded-full cursor-pointer touch-none group flex-shrink-0"
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
    >
      {/* Outer rim */}
      <div className="absolute inset-0 rounded-full bg-slate-900 border border-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.05)] group-hover:border-sky-500/30 transition-colors" />
      
      {/* Inner Metallic Knob */}
      <div 
        className="absolute inset-[10%] rounded-full bg-slate-800 flex items-center justify-center transition-transform duration-75"
        style={{ 
          transform: `rotate(${currentAngle}deg)`,
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.2) 100%)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 2px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.7)'
        }}
      >
        {/* Indicator Line */}
        <div className="absolute top-[8%] w-[10%] h-[30%] rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
        
        {/* Center indentation */}
        <div className="absolute inset-[30%] rounded-full bg-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-slate-700/50" />
      </div>
    </div>
  );
}
