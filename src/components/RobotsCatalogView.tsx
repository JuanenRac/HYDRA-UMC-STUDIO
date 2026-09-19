// =============================================================================
// HYDRA-UMC STUDIO - Robots Catalog: RobotsCatalogView.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// First menu under Industrial - every real robot model this ecosystem has
// kinematics/mesh support for (REAL_ROBOT_MODELS, store.tsx), filterable by
// manufacturer/DOF, with a real 3D preview of the selected model on the
// left (the same RobotArm dispatcher every live robot uses, fed a
// minimal synthetic RobotState at its own real home-adjacent pose rather
// than a placeholder box) and a per-model activate/deactivate toggle
// (settings.enabledRobotModels) that the Config tab's own model picker
// now actually respects (see isModelSelectable() in store.tsx).
// =============================================================================

import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { Bot, CheckCircle2, XCircle } from 'lucide-react';
import { useHydraStore, ROBOT_MANUFACTURERS, REAL_ROBOT_MODELS, robotModelDof, type RobotModel, type RobotState } from '../store';
import { Shared3DEnvironment } from './3d/Shared3DEnvironment';
import RobotArm from './3d/RobotArm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A minimal, valid RobotState for a 3D preview only - zero joints/pose,
 * every module disabled. Never registered anywhere, never sent to the
 * server; RobotArm only reads robot.model/joints/pos for rendering, so
 * every other field just needs to satisfy the type, not be meaningful. */
function previewRobotState(model: RobotModel): RobotState {
  const genericModule = { enabled: false, size: { width: 100, length: 100 } };
  return {
    id: -1,
    name: 'preview',
    online: false,
    model,
    role: 'Idle',
    tool: 'None',
    urtcConnected: false,
    pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
    joints: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 },
    valves: [false, false],
    pumps: [false, false],
    endstops: { x1: false, x2: false, y1: false, y2: false, z0: false },
    recordedPoints: [],
    rackSystem: {
      enabled: false,
      rack1: { type: 'None', capacity: 24, usableSlots: [], basePickupPos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 } },
      rack2: { type: 'None', capacity: 24, usableSlots: [], basePickupPos: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, tx: 0, ty: 0 } },
    },
    hasXYTable: false,
    visionEnabled: false,
    playbackState: { isPlaying: false, activeStep: 0, speed: 100 },
    juanenPnP: { ...genericModule, axisX: 0, axisY: 0, axisZ: 0, nozzle1Rotation: 0, nozzle2Rotation: 0 },
    lumenPnP: { ...genericModule, axisX: 0, axisY: 0, axisZ: 0, nozzle1Rotation: 0, nozzle2Rotation: 0 },
    juanenCNC: genericModule,
    juanenLaser: genericModule,
    vacuumTable: { ...genericModule, pumpActive: false, valveActive: false },
    heatedBed: { ...genericModule, targetTemp: 0, currentTemp1: 0, currentTemp2: 0, ssrActive: false },
    xyTable: { pos: { x: 0, y: 0 }, tableSize: { width: 300, length: 300 } },
  };
}

export function RobotsCatalogView() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useHydraStore();
  const manufacturers = useMemo(() => Array.from(new Set(REAL_ROBOT_MODELS.map(m => ROBOT_MANUFACTURERS[m]))).sort(), []);
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
  const [dofFilter, setDofFilter] = useState<string>('all');
  const [selected, setSelected] = useState<RobotModel>(REAL_ROBOT_MODELS[0]);

  const filtered = useMemo(() => REAL_ROBOT_MODELS.filter(m => {
    if (manufacturerFilter !== 'all' && ROBOT_MANUFACTURERS[m] !== manufacturerFilter) return false;
    if (dofFilter !== 'all' && robotModelDof(m) !== Number(dofFilter)) return false;
    return true;
  }), [manufacturerFilter, dofFilter]);

  const isEnabled = (model: RobotModel) => settings.enabledRobotModels?.[model] !== false;

  const toggleEnabled = (model: RobotModel) => {
    updateSettings({ enabledRobotModels: { ...settings.enabledRobotModels, [model]: !isEnabled(model) } });
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <Bot className="text-sky-400" size={20} /> <span className="glow-text-emerald">{t('robotsCatalog.title', 'Robots')}</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative h-[400px] md:h-auto min-h-[400px]">
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <span className="bg-slate-950/80 backdrop-blur text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-800">
              {selected}
            </span>
          </div>
          <Canvas camera={{ position: [0.8, 0.8, 0.8], fov: 50 }} shadows className="w-full h-full outline-none">
            <Shared3DEnvironment />
            <RobotArm robot={previewRobotState(selected)} />
            <OrbitControls makeDefault target={[0, 0.2, 0]} />
          </Canvas>
        </div>

        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={manufacturerFilter}
              onChange={e => setManufacturerFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            >
              <option value="all">{t('robotsCatalog.all_manufacturers', 'All manufacturers')}</option>
              {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={dofFilter}
              onChange={e => setDofFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none"
            >
              <option value="all">{t('robotsCatalog.all_dof', 'All DOF')}</option>
              <option value="5">5-DOF</option>
              <option value="6">6-DOF</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
            {filtered.map(model => {
              const enabled = isEnabled(model);
              return (
                <button
                  key={model}
                  onClick={() => setSelected(model)}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all border',
                    selected === model ? 'bg-sky-500/10 border-sky-500/30' : 'border-slate-800 hover:bg-slate-800/60',
                    !enabled && 'opacity-50',
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-200 truncate">{model}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">{ROBOT_MANUFACTURERS[model]} · {robotModelDof(model)}-DOF</div>
                  </div>
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); toggleEnabled(model); }}
                    className={cn('shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border', enabled ? 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10' : 'text-slate-500 border-slate-700 hover:bg-slate-800')}
                  >
                    {enabled ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {enabled ? t('robotsCatalog.enabled', 'Enabled') : t('robotsCatalog.disabled', 'Disabled')}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-sm text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-xl">
                {t('robotsCatalog.empty', 'No robot models match these filters.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
