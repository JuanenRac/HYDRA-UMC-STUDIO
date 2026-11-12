// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: robotDetail/ActionRow.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The row of action buttons under the 3D view of the robot detail screen: STOP, START/STOP, PAUSE/CONTINUE, HOME, HOME XY, RESET, RESET 3D, the kinematics
// file input, REPEAT and the add/delete point pair. On the Android app the labels are dropped and the buttons are smaller.
import type { Ref } from 'react';
import { RotateCcw, Home, AlertOctagon, Play, Square, Pause, RefreshCw, Trash2, Repeat, Grid3x3, Plus } from 'lucide-react';
import { cn } from './shared';
import type { RobotState } from '../../store';
import type { useFleet } from '../../storeContexts';
import type { useRobotCommands } from '../../hooks/useRobotCommands';
import type { PendingAction } from './RobotDetailDialogs';

type Fleet = ReturnType<typeof useFleet>;
type Commands = ReturnType<typeof useRobotCommands>;

export function ActionRow({ t, robot, isStartAll, isAndroidApp, fileInputRef, loadKinematics, handleEmergencyStop, handlePlay, handleStop, handleHome, handleResetXY, handleReset, handleReset3D, handleAddPoint, setPendingAction, sendRobotCommand, updateRobot }: {
  t: any;
  robot: RobotState;
  isStartAll: boolean;
  isAndroidApp: boolean;
  fileInputRef: Ref<HTMLInputElement>;
  loadKinematics: Fleet['loadKinematics'];
  handleEmergencyStop: () => void;
  handlePlay: () => void;
  handleStop: () => void;
  handleHome: () => void;
  handleResetXY: Commands['handleResetXY'];
  handleReset: () => void;
  handleReset3D: Commands['handleReset3D'];
  handleAddPoint: Commands['handleAddPoint'];
  setPendingAction: (action: PendingAction) => void;
  sendRobotCommand: Fleet['sendRobotCommand'];
  updateRobot: Fleet['updateRobot'];
}) {
  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-2 pb-2">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pointer-events-auto shrink-0">
      {/* E-STOP Button (First, Glowing, Blinking) */}
      <button
        onClick={() => handleEmergencyStop()}
        className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-500 animate-pulse", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
        title={t('robot_detail.estop', 'STOP')}
      >
        <AlertOctagon size={16} /> {!isAndroidApp && t('robot_detail.estop', 'STOP')}
      </button>

      {/* START/STOP Button */}
      {!robot.playbackState?.isPlaying ? (
        <button
          onClick={() => handlePlay()}
          disabled={robot.recordedPoints.length === 0}
          className={cn("flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-green-400", isAndroidApp ? "px-3 py-2 min-h-[40px] flex-initial" : "px-4 py-3")}
          title={isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START')}
        >
          <Play size={16} /> {!isAndroidApp && (isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START'))}
        </button>
      ) : (
        <button
          onClick={handleStop}
          className={cn("flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(220,38,38,0.6)] border border-red-500", isAndroidApp ? "px-3 py-2 min-h-[40px] flex-initial" : "px-4 py-3")}
          title={isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP')}
        >
          <Square size={16} /> {!isAndroidApp && (isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP'))}
        </button>
      )}

      {/* PAUSE / CONTINUE Button */}
      <button
        onClick={() => {
          const isPaused = robot.playbackState?.isPaused || false;
          // Atomic 'pause' command - server.ts's own case already
          // fans this out to combinedWith via affectedIds on its
          // own, so one call covers the whole group server-side;
          // localMutate's own affectedIds list below only controls
          // which robots get the INSTANT optimistic update (matches
          // this button's original isStartAll-gated scope - a
          // sibling not included here still ends up paused once its
          // own delta arrives, same as PLAY's own comment above).
          sendRobotCommand(
            robot.id,
            'pause',
            { paused: !isPaused },
            (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, playing: true, isPaused: !isPaused, paused: !isPaused, requestPause: !isPaused, requestStop: false, isFinished: false, finished: false } }),
            isStartAll ? [robot.id, ...(robot.combinedWith || [])] : [robot.id]
          );
        }}
        disabled={!robot.playbackState?.isPlaying}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 min-h-[48px] text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border disabled:opacity-50 disabled:cursor-not-allowed",
          isAndroidApp ? "px-3 py-2 min-h-[40px] flex-initial" : "px-4 py-3",
          robot.playbackState?.isPaused ? 'bg-blue-500 hover:bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-400' : 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] border-amber-400'
        )}
        title={robot.playbackState?.isPaused ? t('robot_detail.continue', 'CONTINUE') : (isStartAll ? t('robot_detail.pause_all', 'PAUSE ALL') : t('robot_detail.pause', 'PAUSE'))}
      >
        {robot.playbackState?.isPaused ? (
          <><Play size={16} /> {!isAndroidApp && t('robot_detail.continue', 'CONTINUE')}</>
        ) : (
          <><Pause size={16} /> {!isAndroidApp && (isStartAll ? t('robot_detail.pause_all', 'PAUSE ALL') : t('robot_detail.pause', 'PAUSE'))}</>
        )}
      </button>

      {/* HOME Button */}
      <button
        onClick={handleHome}
        className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
        title={t('robot_detail.home')}
      >
        <Home size={16} /> {!isAndroidApp && t('robot_detail.home')}
      </button>

      {/* HOME XY Button - a distinct Grid3x3 icon from plain HOME
          (both used the same Home icon before - reported live as
          confusing on Android's now icon-only layout, but the
          mismatch existed for STUDIO's own text+icon buttons too;
          fixed for both). */}
      {robot.hasXYTable && (
        <button
          onClick={handleResetXY}
          className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
          title={t('robot_detail.home_xy')}
        >
          <Grid3x3 size={16} /> {!isAndroidApp && t('robot_detail.home_xy')}
        </button>
      )}

      {/* RESET Button */}
      <button
        onClick={handleReset}
        className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.3)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
        title={t('robot_detail.reset_pose')}
      >
        <RefreshCw size={16} /> {!isAndroidApp && t('robot_detail.reset_pose')}
      </button>

      {/* RESET 3D Button - a rotate icon, because a camera/record glyph would read as unrelated to what this button
          does: remount the 3D viewport. */}
      <button
        onClick={handleReset3D}
        className={cn("flex items-center justify-center gap-2 min-h-[48px] bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border border-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.3)]", isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3")}
        title={t('robot_detail.reset_3d')}
      >
        <RotateCcw size={16} /> {!isAndroidApp && t('robot_detail.reset_3d')}
      </button>

      {/* LOAD Button only (EXPORT removed) */}
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={(e) => loadKinematics(robot.id, e)}
      />
      <button
        onClick={() => updateRobot(robot.id, { playbackState: { ...(robot.playbackState || { isPlaying: false, activeStep: 0, speed: 100 }), isLooping: !robot.playbackState?.isLooping } })}
        className={cn(
          "flex items-center justify-center gap-2 min-h-[48px] text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all border",
          isAndroidApp ? "px-3 py-2 min-h-[40px]" : "px-4 py-3",
          robot.playbackState?.isLooping
            ? "bg-fuchsia-700 border-fuchsia-400 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),0_0_10px_rgba(217,70,239,0.5)] translate-y-[2px]"
            : "bg-fuchsia-500 hover:bg-fuchsia-400 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:-translate-y-[1px]"
        )}
        title={t('robot_detail.repeat', 'Repeat')}
      >
        <Repeat size={16} className={cn(robot.playbackState?.isLooping && "animate-spin-slow")} /> {!isAndroidApp && t('robot_detail.repeat', 'Repeat')}
      </button>

      {/* Add/Delete Point mini-frame */}
      {(
        <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1">
          <button
            onClick={handleAddPoint}
            className={cn("bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center", isAndroidApp ? "p-2 min-h-[40px] min-w-[40px]" : "px-4 py-2 min-h-[44px]")}
            title={t('robot_detail.add_point', '+ Add Point')}
          >
            {isAndroidApp ? <Plus size={16} /> : t('robot_detail.add_point', '+ Add Point')}
          </button>
          <button
            onClick={() => setPendingAction('delete_points')}
            className={cn("flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors", isAndroidApp ? "p-2 min-h-[40px] min-w-[40px]" : "p-2 min-h-[44px] min-w-[44px]")}
            title={t('robot_detail.delete_points', 'Delete points')} aria-label={t('robot_detail.delete_points', 'Delete points')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>

    </div>
  );
}
