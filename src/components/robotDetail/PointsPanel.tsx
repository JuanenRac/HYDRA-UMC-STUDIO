// =============================================================================
// HYDRA-UMC STUDIO - src/components/robotDetail/PointsPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// A part of the robot detail screen, cut out of RobotDetail.tsx unchanged: it draws what the screen hands it and
// changes nothing by itself.
// =============================================================================
import { ArrowUp, ArrowDown, Play, Trash2, Edit2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { RobotState } from '../../store';
import { jointsToCartesianForModel } from '../../examples/robotKinematicsDispatch';
import { cn } from './shared';
import { PointPositionFields } from './PointPositionFields';
import { currentPlaybackStep, playbackProgressPercent } from '../../lib/playbackStep';
import { pointKeyFor } from '../../lib/robotDetailHelpers';

interface PointsPanelProps {
  editingPointData: any;
  editingPointKey: number | null;
  robot: RobotState;
  setEditingPointData: (data: any) => void;
  setEditingPointKey: (key: number | null) => void;
  t: TFunction;
  updateRobot: (id: number, updates: Partial<RobotState>) => void;
}

export function PointsPanel(props: PointsPanelProps) {
  const { editingPointData, editingPointKey, robot, setEditingPointData, setEditingPointKey, t, updateRobot } = props;
  return (
    <div className="flex flex-col flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0">
      <div className="p-3 bg-slate-900 border-b border-slate-800 shrink-0 flex items-center justify-between">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{t('robot_detail.points_table', 'Points Table')}</span>
        <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-md flex items-center gap-2 shadow-inner">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('robot_detail.steps', 'Steps:')}</span>
          <span className="text-xs font-mono font-bold text-emerald-400">{robot.recordedPoints.length}</span>
        </div>
      </div>
            
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
        <div className="space-y-2">
          {robot.recordedPoints.map((pt, i) => {
          const ptKey = pointKeyFor(pt);
          return (
            <div id={`step-${robot.id}-${i}`} key={ptKey} className={cn("bg-slate-900 border rounded p-2 text-xs flex flex-col gap-1 transition-colors", (robot.playbackState?.isPlaying && currentPlaybackStep(robot.playbackState?.activeStep) === i) ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "border-slate-800")}>
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-1 mb-1">
                <div className="flex items-center gap-2">
                  {(robot.playbackState?.isPlaying && currentPlaybackStep(robot.playbackState?.activeStep) === i) ? (
                    <Play size={12} className="text-emerald-400 animate-pulse fill-emerald-400" />
                  ) : (
                    <span className="w-3" />
                  )}
                  <span className={cn("font-mono font-bold", (robot.playbackState?.isPlaying && currentPlaybackStep(robot.playbackState?.activeStep) === i) ? "text-emerald-400" : "text-slate-400")}>{t('robot_detail.step_upper', 'STEP')} {i}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => {
                    if (i === 0) return;
                    const newPts = [...robot.recordedPoints];
                    const temp = newPts[i];
                    newPts[i] = newPts[i - 1];
                    newPts[i - 1] = temp;
                    updateRobot(robot.id, { recordedPoints: newPts });
                  }} className="text-slate-500 hover:text-sky-400 p-1 disabled:opacity-20 transition-colors" disabled={i === 0}>
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => {
                    if (i === robot.recordedPoints.length - 1) return;
                    const newPts = [...robot.recordedPoints];
                    const temp = newPts[i];
                    newPts[i] = newPts[i + 1];
                    newPts[i + 1] = temp;
                    updateRobot(robot.id, { recordedPoints: newPts });
                  }} className="text-slate-500 hover:text-sky-400 p-1 disabled:opacity-20 transition-colors" disabled={i === robot.recordedPoints.length - 1}>
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={() => {
                    setEditingPointKey(ptKey);
                    setEditingPointData(pt);
                  }} className="text-slate-500 hover:text-amber-400 p-1 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => {
                    const newPts = [...robot.recordedPoints];
                    newPts.splice(i, 1);
                    updateRobot(robot.id, { recordedPoints: newPts });
                  }} className="text-slate-500 hover:text-rose-400 p-1 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
                    
              {editingPointKey === ptKey ? (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="grid grid-cols-6 gap-2">
                    {['j1', 'j2', 'j3', 'j4', 'j5', 'j6'].map((jKey) => (
                      <div key={jKey} className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 uppercase">{jKey}</label>
                        <input 
                          type="number"
                          className="bg-slate-950 border border-slate-800 rounded px-1 py-1.5 text-[10px] font-mono text-slate-200 outline-none w-full focus:border-sky-500 transition-colors"
                          value={editingPointData[jKey as keyof typeof editingPointData] ?? 0}
                          onChange={(e) => setEditingPointData({ ...editingPointData, [jKey]: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    ))}
                  </div>
                  <PointPositionFields model={robot.model} point={editingPointData} onMoved={(moved) => setEditingPointData({ ...editingPointData, ...moved })} t={t} />
                  {(pt.tx !== undefined || editingPointData.tx !== undefined) && (
                    <div className="grid grid-cols-6 gap-2">
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-slate-500 uppercase">TX</label>
                        <input 
                          type="number"
                          className="bg-slate-950 border border-slate-800 rounded px-1 py-1.5 text-[10px] font-mono text-slate-200 outline-none w-full focus:border-sky-500 transition-colors"
                          value={editingPointData.tx ?? 0}
                          onChange={(e) => setEditingPointData({ ...editingPointData, tx: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-slate-500 uppercase">TY</label>
                        <input 
                          type="number"
                          className="bg-slate-950 border border-slate-800 rounded px-1 py-1.5 text-[10px] font-mono text-slate-200 outline-none w-full focus:border-sky-500 transition-colors"
                          value={editingPointData.ty ?? 0}
                          onChange={(e) => setEditingPointData({ ...editingPointData, ty: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-2 border-t border-slate-800/50 pt-2">
                    <button onClick={() => setEditingPointKey(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => {
                      const newPts = [...robot.recordedPoints];
                      // Locate the point by stable identity (ptKey), not by `i` - if the
                      // list was reordered/edited elsewhere while this form was open, `i`
                      // may no longer point at the same object. This is exactly what
                      // `i` still correctly resolves to inside a fresh render where this
                      // row matched editingPointKey, but re-deriving defensively here
                      // keeps Save correct even if that assumption ever changes.
                      const targetIndex = newPts.findIndex(p => pointKeyFor(p) === ptKey);
                      if (targetIndex === -1) { setEditingPointKey(null); return; }
                      const merged = { ...newPts[targetIndex], ...editingPointData };
                      // j1..j6 just changed above - re-derive x/y/z/a/b/c from the edited
                      // joints (via this robot's own FK) so they don't go stale and get
                      // preferred over the edit by PathVisualizer/playback (both read
                      // pt.x first when present - see robotKinematicsDispatch.ts).
                      const cart = jointsToCartesianForModel(robot.model, merged);
                      newPts[targetIndex] = { ...merged, x: cart.x, y: cart.y, z: cart.z, a: cart.a, b: cart.b, c: cart.c };
                      updateRobot(robot.id, { recordedPoints: newPts });
                      setEditingPointKey(null);
                    }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-lg shadow-emerald-900/20 transition-colors">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-6 gap-x-2 gap-y-1 font-mono text-[10px]">
                    <span className="text-slate-500 flex justify-between"><span>J1:</span><span className="text-indigo-400">{pt.j1 !== undefined ? pt.j1.toFixed(1) : '0.0'}</span></span>
                    <span className="text-slate-500 flex justify-between"><span>J2:</span><span className="text-indigo-400">{pt.j2 !== undefined ? pt.j2.toFixed(1) : '0.0'}</span></span>
                    <span className="text-slate-500 flex justify-between"><span>J3:</span><span className="text-indigo-400">{pt.j3 !== undefined ? pt.j3.toFixed(1) : '0.0'}</span></span>
                    <span className="text-slate-500 flex justify-between"><span>J4:</span><span className="text-indigo-400">{pt.j4 !== undefined ? pt.j4.toFixed(1) : '0.0'}</span></span>
                    <span className="text-slate-500 flex justify-between"><span>J5:</span><span className="text-indigo-400">{pt.j5 !== undefined ? pt.j5.toFixed(1) : '0.0'}</span></span>
                    <span className="text-slate-500 flex justify-between"><span>J6:</span><span className="text-indigo-400">{pt.j6 !== undefined ? pt.j6.toFixed(1) : '0.0'}</span></span>
                  </div>
                  {pt.tx !== undefined && pt.ty !== undefined && (
                    <div className="grid grid-cols-6 gap-x-2 gap-y-1 font-mono text-[10px] mt-1 border-t border-slate-800/50 pt-1">
                      <span className="text-slate-500 flex justify-between col-start-1"><span>TX:</span><span className="text-amber-400">{pt.tx.toFixed(1)}</span></span>
                      <span className="text-slate-500 flex justify-between col-start-2"><span>TY:</span><span className="text-amber-400">{pt.ty.toFixed(1)}</span></span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
          })}
          {robot.recordedPoints.length === 0 && (
            <div className="text-center text-slate-500 py-4 text-sm">
              {t('robot_detail.no_points')}
            </div>
          )}
        </div>
      </div>

      {/* Playback Progress Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
        <div className="bg-slate-950 rounded-lg p-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-slate-800 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex justify-between items-end relative z-10">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('robot_detail.progress', 'Progress')}</span>
            <span className="text-emerald-400 font-mono font-bold text-sm drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              {Math.round(playbackProgressPercent(robot.playbackState?.activeStep, robot.recordedPoints.length, robot.playbackState?.isFinished))}{'%'}
            </span>
          </div>
          <div className="bg-slate-900/50 rounded-full h-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] overflow-hidden relative border border-slate-800 z-10">
            <div 
              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out relative"
              style={{ width: `${playbackProgressPercent(robot.playbackState?.activeStep, robot.recordedPoints.length, robot.playbackState?.isFinished)}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
