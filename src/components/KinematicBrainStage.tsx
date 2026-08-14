// =============================================================================
// HYDRA-UMC STUDIO - React Component: KinematicBrainStage.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Control panel for the Kinematic Brain's OWN local 6-axis stage (STM32H745
// - HYDRA-UMC's docs/PINOUT_STM32H745_KINEMATIC_BRAIN.TXT section 3,
// docs/CANBUS_STM32H745.TXT section 4). CONFIRMED job per axis (project
// owner): X/Y1/Y2 = dual-Y XY gantry table, Z = table/head height, E0 = ATC
// revolver/turret index (rotary), E1 = future conveyor belt (wired, not yet
// installed). This is CONTROLLER-level state (store.tsx's own
// KinematicBrainStage on HydraController), unlike every other module
// component in this folder (XYTableConfig.tsx etc.) which is per-robot -
// there is exactly one Kinematic Brain per controller, not one per robot.
//
// Talks to the real hardware the same way every other module here does
// today: nothing yet - this is a live UI over local component/store state,
// same "usable/demoable ahead of real hardware" status as the rest of this
// dashboard (see src/lib/canOta.ts's own header for the parallel on the
// Flasher/Tester side). Wiring this to the real SPI1 link
// (docs/CANBUS_STM32H745.TXT section 1) is a real follow-up, not done here.
// =============================================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Thermometer, RotateCw, RotateCcw, Wind, Fan, Droplets, GitBranch, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useHydraStore, type KinematicBrainStage as KinematicBrainStageState } from '../store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AxisKey = 'x' | 'y1' | 'y2' | 'z';

export function KinematicBrainStage() {
  const { t } = useTranslation();
  const { activeController, updateController } = useHydraStore();
  const [jogStep, setJogStep] = useState<number>(10);

  const stage = activeController?.kinematicBrainStage;

  function patch(updates: Partial<KinematicBrainStageState>) {
    if (!activeController || !stage) return;
    updateController(activeController.id, { kinematicBrainStage: { ...stage, ...updates } });
  }

  if (!activeController || !stage) return null;

  function handleJog(axis: AxisKey, direction: number) {
    if (!stage) return;
    const clampToTable = axis !== 'z';
    let next = stage.xyTable[axis] + direction * jogStep;
    if (clampToTable) {
      const bound = axis === 'x' ? stage.xyTable.tableSize.width : stage.xyTable.tableSize.length;
      next = Math.max(0, Math.min(next, bound));
    } else {
      next = Math.max(0, Math.min(next, stage.xyTable.tableSize.height));
    }
    patch({ xyTable: { ...stage.xyTable, [axis]: next } });
  }

  function handleAtcRevolverStep(direction: number) {
    const n = stage.atcRevolver.toolCount;
    const next = ((stage.atcRevolver.targetIndex + direction) % n + n) % n;
    patch({ atcRevolver: { ...stage.atcRevolver, targetIndex: next, currentIndex: next, homed: true } });
  }

  const endstopEntries: { key: keyof KinematicBrainStageState['endstops']; label: string }[] = [
    { key: 'xMin', label: 'X MIN' }, { key: 'xMax', label: 'X MAX' },
    { key: 'y1Min', label: 'Y1 MIN' }, { key: 'y1Max', label: 'Y1 MAX' },
    { key: 'y2Min', label: 'Y2 MIN' }, { key: 'y2Max', label: 'Y2 MAX' },
    { key: 'zMin', label: 'Z MIN' }, { key: 'zMax', label: 'Z MAX' },
    { key: 'e0Min', label: 'E0 MIN' }, { key: 'e0Max', label: 'E0 MAX' },
    { key: 'e1Min', label: 'E1 MIN' }, { key: 'e1Max', label: 'E1 MAX' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-position-[bottom_1px_center] pointer-events-none" />

      <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Crosshair size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">{t('kbstage.title', 'Kinematic Brain Stage')}</h2>
            <p className="text-xs text-slate-400">{t('kbstage.subtitle', 'STM32H745 local 6-axis stage: XY table, heated bed, ATC revolver, conveyor')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10 space-y-6">
        {/* XY Table + Z jog */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('kbstage.gantry', 'XY Gantry (X, Y1, Y2, Z)')}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{t('modules.step', 'Step:')}</span>
              <select
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 min-h-[36px] text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                value={jogStep}
                onChange={e => setJogStep(Number(e.target.value))}
              >
                {[0.01, 0.1, 1, 2, 5, 10, 100].map(v => <option key={v} value={v}>{v} mm</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['x', 'y1', 'y2', 'z'] as AxisKey[]).map(axis => (
              <div key={axis} className="bg-slate-900 border border-slate-800 rounded p-3 flex flex-col items-center gap-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">{axis.toUpperCase()}</div>
                <div className="text-lg font-mono text-amber-400">{stage.xyTable[axis].toFixed(2)}</div>
                <div className="flex gap-2 mt-1 w-full justify-center">
                  <button onClick={() => handleJog(axis, -1)} className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded text-slate-300">
                    {axis === 'z' ? <ArrowDown size={16} /> : <ArrowLeft size={16} />}
                  </button>
                  <button onClick={() => handleJog(axis, 1)} className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 hover:glow-border-sky border border-slate-700 transition-all rounded text-slate-300">
                    {axis === 'z' ? <ArrowUp size={16} /> : <ArrowRight size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('modules.width_x', 'Width (X mm)')}</label>
              <input type="number" min="100" max="5000" step="10" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 min-h-[36px] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                value={stage.xyTable.tableSize.width}
                onChange={e => patch({ xyTable: { ...stage.xyTable, tableSize: { ...stage.xyTable.tableSize, width: Number(e.target.value) } } })} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('modules.length_y', 'Length (Y mm)')}</label>
              <input type="number" min="100" max="5000" step="10" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 min-h-[36px] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                value={stage.xyTable.tableSize.length}
                onChange={e => patch({ xyTable: { ...stage.xyTable, tableSize: { ...stage.xyTable.tableSize, length: Number(e.target.value) } } })} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('kbstage.height_z', 'Height (Z mm)')}</label>
              <input type="number" min="10" max="1000" step="5" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 min-h-[36px] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                value={stage.xyTable.tableSize.height}
                onChange={e => patch({ xyTable: { ...stage.xyTable, tableSize: { ...stage.xyTable.tableSize, height: Number(e.target.value) } } })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Heated bed */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Thermometer size={14} className="text-rose-400" /> {t('modules.heated_bed_title', 'Heated Bed')}
              <span className="ml-auto text-[9px] font-normal text-slate-600 normal-case">{t('kbstage.ssr_230vac', 'SSR, 230VAC mains')}</span>
            </h3>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('kbstage.therm1', 'Thermistor 1')}</span>
              <span className="font-mono text-slate-200">{stage.heatedBed.currentTemp1.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('kbstage.therm2', 'Thermistor 2')}</span>
              <span className="font-mono text-slate-200">{stage.heatedBed.currentTemp2.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[11px] text-slate-400 shrink-0">{t('kbstage.target_temp', 'Target °C')}</label>
              <input type="number" min="0" max="150" className="w-24 bg-slate-900 border border-slate-700 rounded px-3 py-2 min-h-[36px] text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                value={stage.heatedBed.targetTemp}
                onChange={e => patch({ heatedBed: { ...stage.heatedBed, targetTemp: Number(e.target.value) } })} />
              <button
                onClick={() => patch({ heatedBed: { ...stage.heatedBed, ssrActive: !stage.heatedBed.ssrActive } })}
                className={cn('ml-auto px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors', stage.heatedBed.ssrActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700')}
              >
                {stage.heatedBed.ssrActive ? t('modules.on', 'ON') : t('modules.off', 'OFF')}
              </button>
            </div>
          </div>

          {/* ATC Revolver */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <RotateCw size={14} className="text-violet-400" /> {t('kbstage.atc_revolver', 'ATC Revolver (E0)')}
            </h3>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => handleAtcRevolverStep(-1)} className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300">
                <RotateCcw size={16} />
              </button>
              <div className="text-center">
                <div className="text-2xl font-mono text-violet-400">{stage.atcRevolver.currentIndex + 1}</div>
                <div className="text-[10px] text-slate-500 uppercase">{t('kbstage.of_slots', 'of {{count}} slots', { count: stage.atcRevolver.toolCount })}</div>
              </div>
              <button onClick={() => handleAtcRevolverStep(1)} className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300">
                <RotateCw size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('kbstage.tool_count', 'Tool slots')}</span>
              <input type="number" min="2" max="16" className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center focus:outline-none focus:border-violet-500"
                value={stage.atcRevolver.toolCount}
                onChange={e => patch({ atcRevolver: { ...stage.atcRevolver, toolCount: Math.max(2, Number(e.target.value)) } })} />
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              {stage.atcRevolver.homed ? <CheckCircle2 size={12} className="text-emerald-400" /> : <AlertCircle size={12} className="text-amber-400" />}
              <span className={stage.atcRevolver.homed ? 'text-emerald-400' : 'text-amber-400'}>
                {stage.atcRevolver.homed ? t('kbstage.homed', 'Homed') : t('kbstage.not_homed', 'Not homed')}
              </span>
            </div>
          </div>
        </div>

        {/* Conveyor (future) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <GitBranch size={14} className="text-sky-400 rotate-90" /> {t('kbstage.conveyor', 'Conveyor Belt (E1)')}
            <span className="ml-auto text-[9px] font-normal text-slate-600 normal-case">{t('kbstage.conveyor_future', 'Wired + pinned out, not yet a built feature')}</span>
          </h3>
          {!stage.conveyor.installed ? (
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>{t('kbstage.conveyor_not_installed', 'No conveyor installed on this machine')}</span>
              <button
                onClick={() => patch({ conveyor: { ...stage.conveyor, installed: true } })}
                className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/40 text-sky-400 rounded text-[10px] font-bold uppercase transition-colors"
              >
                {t('kbstage.conveyor_mark_installed', 'Mark as installed')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => patch({ conveyor: { ...stage.conveyor, running: !stage.conveyor.running } })}
                className={cn('px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors', stage.conveyor.running ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700')}
              >
                {stage.conveyor.running ? t('kbstage.running', 'Running') : t('kbstage.stopped', 'Stopped')}
              </button>
              <input type="range" min="0" max="100" className="flex-1 accent-sky-500" value={stage.conveyor.speedPercent}
                onChange={e => patch({ conveyor: { ...stage.conveyor, speedPercent: Number(e.target.value) } })} />
              <span className="text-xs font-mono text-slate-300 w-10 text-right">{stage.conveyor.speedPercent}%</span>
            </div>
          )}
        </div>

        {/* Endstops */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('kbstage.endstops', 'Endstops (2 per axis)')}</h3>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {endstopEntries.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => patch({ endstops: { ...stage.endstops, [key]: !stage.endstops[key] } })}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-2 rounded border text-[10px] font-mono transition-colors',
                  stage.endstops[key] ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                )}
              >
                <span>{label}</span>
                <span className="text-[9px] uppercase">{stage.endstops[key] ? t('kbstage.triggered', 'Triggered') : t('kbstage.open', 'Open')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fans / Pumps / Valves */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Fan size={14} className="text-sky-400" /> {t('kbstage.fans', 'Fans (3x)')}</h3>
            <div className="grid grid-cols-3 gap-2">
              {stage.fans.map((on, i) => (
                <button key={i} onClick={() => patch({ fans: stage.fans.map((v, j) => j === i ? !v : v) as [boolean, boolean, boolean] })}
                  className={cn('px-2 py-2 rounded text-[10px] font-bold uppercase border transition-colors', on ? 'bg-sky-500/20 border-sky-500/40 text-sky-400' : 'bg-slate-900 border-slate-800 text-slate-500')}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Wind size={14} className="text-amber-400" /> {t('kbstage.pumps', 'Pumps (8+2)')}</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {stage.pumps.map((on, i) => (
                <button key={i} onClick={() => patch({ pumps: stage.pumps.map((v, j) => j === i ? !v : v) })}
                  className={cn('px-1 py-2 rounded text-[9px] font-bold border transition-colors', on ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500', i >= 8 && 'ring-1 ring-slate-700')}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Droplets size={14} className="text-emerald-400" /> {t('kbstage.valves', 'Valves (8+2)')}</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {stage.valves.map((on, i) => (
                <button key={i} onClick={() => patch({ valves: stage.valves.map((v, j) => j === i ? !v : v) })}
                  className={cn('px-1 py-2 rounded text-[9px] font-bold border transition-colors', on ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500', i >= 8 && 'ring-1 ring-slate-700')}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
