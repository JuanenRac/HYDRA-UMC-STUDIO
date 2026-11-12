// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: robotDetail/ViewportControls.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The controls drawn over the 3D view of the robot detail screen: the move/rotate/scale/center buttons and full screen, the buttons that reopen a closed
// camera window, the camera windows themselves, and the compact STOP/START/PAUSE panel of the embedded (viewport-only) screen.
import { RotateCcw, Home, AlertOctagon, ArrowUp, Play, Square, Pause, Crosshair, RefreshCw, Maximize2, Minimize2, Camera as CameraIcon, Trash2, Repeat, Grid3x3, Plus } from 'lucide-react';
import { cn } from './shared';
import { CameraPIP } from './CameraPIP';
import type { RobotState } from '../../store';
import type { useFleet, useSettingsStore } from '../../storeContexts';
import type { useRobotCommands } from '../../hooks/useRobotCommands';
import type { PendingAction } from './RobotDetailDialogs';

type Fleet = ReturnType<typeof useFleet>;
type Commands = ReturnType<typeof useRobotCommands>;
export type ControlMode = 'translate' | 'rotate' | 'scale' | 'none';

export function ViewportToolbars({ t, robotId, controlMode, toggleControl, isFullscreen, setIsFullscreen, updateRobot }: {
  t: any;
  robotId: number;
  controlMode: ControlMode;
  toggleControl: (mode: 'translate' | 'rotate' | 'scale') => void;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
  updateRobot: Fleet['updateRobot'];
}) {
  return (
    <>
      <div className="absolute bottom-4 left-4 z-50 flex gap-2 pointer-events-auto">
        <button
          onClick={() => toggleControl('translate')}
          className={cn("p-2 rounded bg-slate-950/80 border backdrop-blur-sm transition-colors", controlMode === 'translate' ? "border-sky-500 text-sky-400" : "border-slate-800 text-slate-400 hover:text-slate-300")}
          title={t('robot_detail.move', 'Move')} aria-label={t('robot_detail.move', 'Move')}
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={() => toggleControl('rotate')}
          className={cn("p-2 rounded bg-slate-950/80 border backdrop-blur-sm transition-colors", controlMode === 'rotate' ? "border-sky-500 text-sky-400" : "border-slate-800 text-slate-400 hover:text-slate-300")}
          title={t('robot_detail.rotate', 'Rotate')} aria-label={t('robot_detail.rotate', 'Rotate')}
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => toggleControl('scale')}
          className={cn("p-2 rounded bg-slate-950/80 border backdrop-blur-sm transition-colors", controlMode === 'scale' ? "border-sky-500 text-sky-400" : "border-slate-800 text-slate-400 hover:text-slate-300")}
          title={t('robot_detail.resize', 'Resize')} aria-label={t('robot_detail.resize', 'Resize')}
        >
          <Maximize2 size={16} />
        </button>
        <div className="w-px h-6 bg-slate-800 self-center mx-1"></div>
        <button
          onClick={() => {
            updateRobot(robotId, {
              cameraView: undefined,
              centerCameraTrigger: Date.now()
            });
          }}
          className="p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-300 backdrop-blur-sm transition-colors"
          title={t('robot_detail.center_view', 'Center View')} aria-label={t('robot_detail.center_view', 'Center View')}
        >
          <Crosshair size={16} />
        </button>
      </div>

      <div className="absolute top-4 right-4 z-50 flex gap-2 pointer-events-auto">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-300 backdrop-blur-sm transition-colors"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </>
  );
}

/** The buttons that reopen a closed camera window, and the camera windows. */
export function CameraLayer({ t, robot, combinedBotsInfo, isVisionActive, settings, updateSettings }: {
  t: any;
  robot: RobotState;
  combinedBotsInfo: RobotState[];
  isVisionActive: (bot: RobotState) => boolean;
  settings: ReturnType<typeof useSettingsStore>['settings'];
  updateSettings: ReturnType<typeof useSettingsStore>['updateSettings'];
}) {
  return (
    <>
      {/* Closed Camera Icons (Bottom Right) - only for a bot whose
          camera is actually enabled, matching the PIP's own gating
          just below: reopening a PIP for a disabled camera would just
          do nothing, so don't offer a dead "Show Camera" button for
          it. */}
      <div className="absolute bottom-4 right-4 z-50 flex gap-2 pointer-events-auto">
        {[robot, ...combinedBotsInfo].filter(isVisionActive).map(bot => {
          const pipConfig = settings.uiLayout?.cameraPips?.[bot.id];
          if (pipConfig?.isOpen === false) {
            return (
              <button 
                key={bot.id}
                onClick={() => {
                  updateSettings({
                    uiLayout: {
                      ...settings.uiLayout,
                      cameraPips: {
                        ...settings.uiLayout?.cameraPips,
                        [bot.id]: { ...pipConfig, isOpen: true }
                      }
                    }
                  });
                }}
                className="p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-emerald-500/50 backdrop-blur-sm transition-colors flex items-center gap-1"
                title={t('robot_detail.show_camera', { name: bot.name })}
              >
                <CameraIcon size={16} />
                <span className="text-[10px] font-bold max-w-[60px] truncate">{bot.name}</span>
              </button>
            );
          }
          return null;
        })}
      </div>

      {/* Camera PIP Windows - gated on visionEnabled too, not just
          online, so a robot with its camera explicitly turned off
          (OverviewPanel/CamerasView's own vision toggle, which writes
          this same field) doesn't get a PIP window anyway just for
          being online. */}
      {robot.online && isVisionActive(robot) && (
        <CameraPIP
          bot={robot}
          initialX={0}
          initialY={0}
          label={robot.name}
          t={t}
        />
      )}
      {combinedBotsInfo.map((bot, index) => (bot.online && isVisionActive(bot)) ? (
        <CameraPIP
          key={bot.id}
          bot={bot}
          initialX={-200 * (index + 1)}
          initialY={0}
          label={bot.name}
          t={t}
        />
      ) : null)}
    </>
  );
}

/** The compact panel over the 3D view of the embedded Android screen (portrait: STOP/START/PAUSE; landscape: every other control too). */
export function ViewportActionOverlay({ t, robot, isStartAll, handleEmergencyStop, handlePlay, handleStop, handleHome, handleResetXY, handleReset, handleReset3D, handleAddPoint, setPendingAction, sendRobotCommand, updateRobot }: {
  t: any;
  robot: RobotState;
  isStartAll: boolean;
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
    <div className="absolute z-50 pointer-events-auto bottom-2 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center landscape:gap-1 portrait:gap-1.5 bg-slate-950/70 backdrop-blur-md border border-slate-800 rounded-xl landscape:p-1 portrait:p-1.5 max-w-[calc(100%-1rem)]">
      <button
        onClick={() => handleEmergencyStop()}
        className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-lg transition-colors animate-pulse"
        title={t('robot_detail.estop', 'STOP')}
      >
        <AlertOctagon size={18} />
        <span className="ml-1 text-xs font-black uppercase tracking-widest">{t('robot_detail.estop', 'STOP')}</span>
      </button>

      {!robot.playbackState?.isPlaying ? (
        <button
          onClick={() => handlePlay()}
          disabled={robot.recordedPoints.length === 0}
          className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 hover:bg-emerald-950 disabled:opacity-40 border border-slate-800 hover:border-emerald-800 text-emerald-400 rounded-lg transition-colors"
          title={isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START')} aria-label={isStartAll ? t('robot_detail.start_all', 'START ALL') : t('robot_detail.start', 'START')}
        >
          <Play size={18} />
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-lg transition-colors"
          title={isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP')} aria-label={isStartAll ? t('robot_detail.stop_all', 'STOP ALL') : t('robot_detail.stop', 'STOP')}
        >
          <Square size={18} />
        </button>
      )}

      <button
        onClick={() => {
          const isPaused = robot.playbackState?.isPaused || false;
          sendRobotCommand(
            robot.id,
            'pause',
            { paused: !isPaused },
            (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, playing: true, isPaused: !isPaused, paused: !isPaused, requestPause: !isPaused, requestStop: false, isFinished: false, finished: false } }),
            isStartAll ? [robot.id, ...(robot.combinedWith || [])] : [robot.id]
          );
        }}
        disabled={!robot.playbackState?.isPlaying}
        className="flex items-center justify-center landscape:p-1.5 portrait:p-2.5 landscape:min-h-[36px] landscape:min-w-[36px] portrait:min-h-[44px] portrait:min-w-[44px] bg-slate-950/80 disabled:opacity-40 border border-slate-800 hover:border-amber-800 text-amber-400 rounded-lg transition-colors"
        title={robot.playbackState?.isPaused ? t('robot_detail.continue', 'CONTINUE') : (isStartAll ? t('robot_detail.pause_all', 'PAUSE ALL') : t('robot_detail.pause', 'PAUSE'))}
      >
        {robot.playbackState?.isPaused ? <Play size={18} /> : <Pause size={18} />}
      </button>

      {/* Landscape-only: every other control, folded into this
          same translucent panel instead of hidden entirely -
          real per the operator's own request (more width to
          spare once the phone is held sideways). */}
      <div className="hidden landscape:flex items-center gap-1">
        <div className="w-px h-5 bg-slate-700 mx-0.5" />

        <button onClick={handleHome} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title={t('robot_detail.home')} aria-label={t('robot_detail.home')}>
          <Home size={16} />
        </button>

        {robot.hasXYTable && (
          <button onClick={handleResetXY} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title={t('robot_detail.home_xy')} aria-label={t('robot_detail.home_xy')}>
            <Grid3x3 size={16} />
          </button>
        )}

        <button onClick={handleReset} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title={t('robot_detail.reset_pose')} aria-label={t('robot_detail.reset_pose')}>
          <RefreshCw size={16} />
        </button>

        <button onClick={handleReset3D} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors" title={t('robot_detail.reset_3d')} aria-label={t('robot_detail.reset_3d')}>
          <RotateCcw size={16} />
        </button>

        <button onClick={() => updateRobot(robot.id, { playbackState: { ...(robot.playbackState || { isPlaying: false, activeStep: 0, speed: 100 }), isLooping: !robot.playbackState?.isLooping } })} className={cn("flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] border rounded-lg transition-colors", robot.playbackState?.isLooping ? "bg-fuchsia-950 border-fuchsia-800 text-fuchsia-400" : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200")} title={t('robot_detail.repeat', 'Repeat')} aria-label={t('robot_detail.repeat', 'Repeat')}>
          <Repeat size={16} className={cn(robot.playbackState?.isLooping && "animate-spin-slow")} />
        </button>

        <button onClick={handleAddPoint} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-sky-400 rounded-lg transition-colors" title={t('robot_detail.add_point', '+ Add Point')} aria-label={t('robot_detail.add_point', '+ Add Point')}>
          <Plus size={16} />
        </button>
        <button onClick={() => setPendingAction('delete_points')} className="flex items-center justify-center p-1.5 min-h-[36px] min-w-[36px] bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-rose-400 rounded-lg transition-colors" title={t('robot_detail.delete_points', 'Delete points')} aria-label={t('robot_detail.delete_points', 'Delete points')}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
