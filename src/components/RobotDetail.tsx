// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: RobotDetail.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motionSource } from '../motionSource';
import { type RobotState } from '../store';
import { RotateCcw, Home, AlertOctagon, ArrowUp, Play, Square, Pause, Crosshair, RefreshCw, Maximize2, Minimize2, Camera as CameraIcon, Trash2, Repeat, Grid3x3, Plus } from 'lucide-react';
import { cn } from './robotDetail/shared';
import { ConfigPanel } from './robotDetail/ConfigPanel';
import { PointsPanel } from './robotDetail/PointsPanel';
import { CameraPIP } from './robotDetail/CameraPIP';
import { VirtualKinematics } from './VirtualKinematics';
import { JointControlsOverlay, JoystickOverlay, XYTableOverlay } from './robotDetail/FloatingJogOverlays';
import { jointLimitsFor } from '../examples/robotKinematicsDispatch';
import { ConfirmDialog } from './ConfirmDialog';
import { usePanelLayout } from '../hooks/usePanelLayout';
import { useRobotCommands } from '../hooks/useRobotCommands';
import { TrajectoryPreview } from './TrajectoryPreview';
import { useReachGate } from '../hooks/useReachGate';
import { usePlayback } from '../hooks/usePlayback';
import { useTrajectoryLoading } from '../hooks/useTrajectoryLoading';
import { RobotAccessBar } from './RobotAccessBar';
import { useCommandFeedback, useFleet, useSession, useSettingsStore } from '../storeContexts';
import { useWorkFiles } from '../hooks/useWorkFiles';
import { buildGCode, gcodeFileName } from '../lib/gcodeExport';

/**
 * Executes the  robot detail logic.
 * This function handles the necessary computations and state updates.
 */
export function RobotDetail({ robot, viewportOnly = false, onNavigateToRobot }: { robot: RobotState, viewportOnly?: boolean, onNavigateToRobot?: (robotId: number) => void }) {
  const { t } = useTranslation();
  const { authToken } = useSession();
  const { emergencyStop, reportCommandIssue } = useCommandFeedback();
  const { settings, updateSettings } = useSettingsStore();
  const { updateRobot, setRobotJoints, sendRobotCommand, loadKinematics, robots, cameras } = useFleet();
  // Real bug this fixes, reported live: a robot's Camera PIP still showed
  // in the 3D viewport with every camera actually disconnected. `visionEnabled`
  // is a robot-level flag MEANT to mirror its assigned camera's own
  // `connected` state (CamerasView.tsx's toggleConnection/retryConnection
  // both write both together) - but it also has its own `true` seed default
  // (store.tsx) independent of any camera ever really connecting, and can
  // drift from the real camera state if a camera gets reassigned to a
  // different robot (see CamerasView.tsx's own assignedRobotId comment) or
  // toggled through a path that only touches one of the two fields.
  // `cam?.connected` (looked up the same assignedRobotId way Dashboard.tsx's
  // own OverviewPanel already does, not a positional id match) is the
  // actually-authoritative signal - requiring BOTH true is the safe
  // direction to fix this in: it can only ever hide a PIP that
  // visionEnabled alone would have wrongly shown, never show one that's
  // genuinely supposed to be hidden.
  const isVisionActive = (bot: RobotState) => bot.visionEnabled && (cameras.find(c => c.assignedRobotId === bot.id)?.connected ?? false);
  // Real request from live device testing: condense the viewportOnly action
  // row (E-STOP/START/PAUSE/HOME/HOME XY/RESET/RESET 3D/REPEAT/Add-Delete
  // Point) to icon-only buttons on Android specifically, to free up
  // vertical space for the 3D view - explicitly NOT for STUDIO's own
  // desktop/tablet browser UI, where the text labels stay exactly as they
  // are. ThreeDScreen.kt's WebView appends a real, distinctive token to its
  // own User-Agent string precisely so this page could tell the two apart
  // without a URL flag that any other embedder (a future iOS WebView,
  // say) would also trip - see that file's own comment on why it's
  // appended rather than replacing the UA outright.
  const isAndroidApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('HYDRA-UMC-ANDROID-CONTROL');
  const robotsRef = useRef(robots);
  useEffect(() => { robotsRef.current = robots; }, [robots]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadWorkFileRef = useRef<HTMLInputElement>(null);
  // Real, server-synced setting (robot.jogStep) rather than component-local
  // state - real feedback from live multi-client testing: the jog step
  // shown/used on one client (Android) never matched another (STUDIO
  // desktop), since each had always kept its own independent default. Kept
  // as the same `jogStep`/`setJogStep` names every sub-panel below already
  // reads/calls, so only this definition needed to change - `?? 1` covers
  // any already-saved settings.json from before this field existed.
  //
  // Routed through the atomic 'jogStep' command (sendRobotCommand), not
  // updateRobot - updateRobot's optimistic-local + 500ms-debounced-
  // full-tree save never broadcasts to any OTHER connected client (see
  // handleReset's own comment below for the full reasoning, same gap),
  // which would have meant a step chosen on one client still silently
  // never appeared on another - the exact bug this field exists to fix.
  const jogStep = robot.jogStep ?? 1;
  const setJogStep = (v: number) => sendRobotCommand(robot.id, 'jogStep', { value: v }, () => ({ jogStep: v }));
  const [selectedExample, setSelectedExample] = useState<string>(robot.selectedExample || '');
  const [selectedWorkFile, setSelectedWorkFile] = useState<string>(robot.selectedWorkFile || '');
  // Real "adjust state during render" pattern (React's own recommended
  // replacement for a reset-only effect): both selectedExample and
  // selectedWorkFile are just local edit buffers seeded from THIS robot's
  // own saved fields, and both need resetting together the instant the
  // panel starts showing a different robot - tracking the robot.id we
  // last reset for is what tells "switched robot" apart from "this robot's
  // own field changed underneath us" without an effect.
  const [resetForRobotId, setResetForRobotId] = useState(robot.id);
  if (robot.id !== resetForRobotId) {
    setResetForRobotId(robot.id);
    setSelectedExample(robot.selectedExample || '');
    setSelectedWorkFile(robot.selectedWorkFile || '');
  }
  const [editingPointKey, setEditingPointKey] = useState<number | null>(null);
  const [editingPointData, setEditingPointData] = useState<any>({});

  // The listing of this robot's WORKS folder, saving a trajectory to it and the G-code export live in hooks/useWorkFiles.ts and lib/gcodeExport.ts.
  const { workFiles, fetchWorks, saveWorkFile: handleSaveWorkFile } = useWorkFiles({
    robotId: robot.id,
    robotName: robot.name,
    worksPaths: settings.worksPaths,
    authToken,
    recordedPoints: robot.recordedPoints,
    selectedWorkFile,
    t,
    onSaved: (fileName) => {
      setSelectedWorkFile(fileName);
      updateRobot(robot.id, { selectedWorkFile: fileName });
    },
  });

  const handleExportGCode = () => {
    if (robot.recordedPoints.length === 0) return;
    const blob = new Blob([buildGCode(robot.name, robot.recordedPoints)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = gcodeFileName(robot.name);
    a.click();
    URL.revokeObjectURL(url);
  };



  // The E-STOP button is the GLOBAL stop (the same as the STOP in the header): every robot of every controller, one
  // click, no confirmation, valves and pumps off, every answer checked - a stop the server never received is shown,
  // not swallowed. The `online` flag is telemetry and is left alone. The per-robot STOP/START control is handleStop.
  const handleEmergencyStop = () => {
    void emergencyStop();
  };

  
  // Play, stop, the preview before Play, speed and acceleration and the correction of the joints while it plays:
  // hooks/usePlayback.ts.
  const {
    handleStop, handlePlay, previewOn, changePreviewOn, pendingPreview, runPendingPreview, cancelPreview,
    playbackSpeed, playbackAcceleration, handleSpeedChange, handleAccelerationChange,
  } = usePlayback({ robot, sendRobotCommand, updateRobot });

  const { rightPanelWidth, beginResizeRightPanel, threeDHeight, beginResizeThreeD } = usePanelLayout(settings.uiLayout, updateSettings);

      const [rightTab, setRightTab] = useState<'trajectories' | 'config' | 'io'>('trajectories');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlMode, setControlMode] = useState<'translate' | 'rotate' | 'scale' | 'none'>('none');
  const toggleControl = (mode: 'translate' | 'rotate' | 'scale') => setControlMode(prev => prev === mode ? 'none' : mode);

  const hasXYTable = robot.hasXYTable;

  const combinedBotsInfo = (robot.combinedWith || []).map(id => robots.find(r => r.id === id)).filter(Boolean) as RobotState[];
  const isStartAll = combinedBotsInfo.length > 0;

  const [reset3DKey, setReset3DKey] = useState(0);
  // Cross-client RESET 3D sync - watches robot.reset3DTrigger (bumped by
  // handleReset3D on ANY client via the atomic 'reset3D' command, this
  // client's own press included) and remounts VirtualKinematics locally
  // whenever it changes, so this camera-only reset now really reaches
  // every other connected client instead of just the one pressed. Skips
  // the very first render (a ref, not state) so loading a robot that
  // already has a `reset3DTrigger` from a past session doesn't remount the
  // freshly-mounted 3D view a second time for nothing.
  const sawReset3DTrigger = useRef(false);
  useEffect(() => {
    if (robot.reset3DTrigger === undefined) return;
    if (sawReset3DTrigger.current) setReset3DKey(k => k + 1);
    sawReset3DTrigger.current = true;
  }, [robot.reset3DTrigger]);


  // HOME and RESET send the robot to an absolute pose in one jump, and "delete points" empties the whole trajectory:
  // none of them is undone by pressing again, so each asks first.
  const [pendingAction, setPendingAction] = useState<'home' | 'reset' | 'delete_points' | null>(null);
  // Changing the tool changes what the robot does with the following moves, so it asks first too.
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  // Same for the model: kinematics, joint limits and the 3D view all follow it.
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  // The reach check of a trajectory before it is sent: hooks/useReachGate.ts.
  const { pendingReach, reachTolerance, setReachTolerance, sendUnlessUnreachable, runPendingReach, cancelPendingReach } = useReachGate();
  // Loading a saved Work or an example into a robot and uploading a Work file: hooks/useTrajectoryLoading.ts.
  const { handleUploadWorkFile, loadWorkFile, loadExample, loadExampleForRobot } = useTrajectoryLoading({
    robot, robots, worksPaths: settings.worksPaths, authToken, sendRobotCommand, updateRobot, sendUnlessUnreachable,
    fetchWorks, setSelectedWorkFile, setSelectedExample, uploadWorkFileRef,
  });
  const { handleAddPoint, handleXYZJog, handleJ1Jog, resetPose, handleResetXY, handleReset3D, handleXYAxisChange, toggleValve, togglePump } = useRobotCommands({ robot, jogStep, sendRobotCommand, updateRobot, reportCommandIssue, stopPlayback: handleStop });
  const handleHome = () => setPendingAction('home');
  const handleReset = () => setPendingAction('reset');
  const runPendingTool = () => {
    const tool = pendingTool;
    setPendingTool(null);
    if (tool) sendRobotCommand(robot.id, 'tool', { tool }, () => ({ tool: tool as any }));
  };
  const runPendingModel = () => {
    const model = pendingModel;
    setPendingModel(null);
    if (model) updateRobot(robot.id, { model: model as any });
  };
  const runPendingAction = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'home') resetPose(false);
    else if (action === 'reset') resetPose(true);
    else if (action === 'delete_points') updateRobot(robot.id, { recordedPoints: [] });
  };


  return (
    <div className="relative flex flex-col h-full bg-slate-950 text-slate-200">
      <ConfirmDialog
        open={pendingAction !== null}
        message={pendingAction ? t(`robot_detail.confirm_${pendingAction}`) : ''}
        danger={pendingAction === 'delete_points'}
        onConfirm={runPendingAction}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingPreview !== null}
        title={t('trajectory_preview.title')}
        message={pendingPreview ? (pendingPreview.clean ? t('trajectory_preview.ask_clean') : t('trajectory_preview.ask_issues', { count: pendingPreview.issues.length })) : ''}
        details={pendingPreview && <TrajectoryPreview report={pendingPreview} />}
        confirmLabel={pendingPreview && !pendingPreview.clean ? t('trajectory_preview.play_anyway') : t('trajectory_preview.play')}
        danger={pendingPreview ? !pendingPreview.clean : false}
        onConfirm={runPendingPreview}
        onCancel={cancelPreview}
      />
      <ConfirmDialog
        open={pendingReach !== null}
        title={t('robot_detail.reach_title')}
        message={pendingReach ? t('robot_detail.reach_rejected', { count: pendingReach.report.count, model: robot.model, worst: Number.isFinite(pendingReach.report.worstMm) ? Math.round(pendingReach.report.worstMm) : '-', threshold: pendingReach.report.toleranceMm }) : ''}
        details={pendingReach && (
          <div className="flex flex-col gap-2 text-xs text-slate-400">
            <ul data-testid="reach-offenders" className="max-h-32 overflow-y-auto font-mono">
              {pendingReach.report.offenders.slice(0, 12).map((o) => (
                <li key={o.index}>{t('robot_detail.reach_point', { point: o.index + 1, mm: Number.isFinite(o.mm) ? Math.round(o.mm) : '-' })}</li>
              ))}
              {pendingReach.report.offenders.length > 12 && <li>{t('robot_detail.reach_more', { count: pendingReach.report.offenders.length - 12 })}</li>}
            </ul>
            {pendingReach.sendScaled && pendingReach.fit && (
              <p>{pendingReach.fit.fits
                ? t('robot_detail.reach_scale_fits', { percent: Math.round(pendingReach.fit.scale * 100) })
                : t('robot_detail.reach_scale_partial', { percent: Math.round(pendingReach.fit.scale * 100), remaining: pendingReach.fit.remaining })}</p>
            )}
          </div>
        )}
        hideConfirm={!pendingReach?.sendScaled}
        confirmLabel={t('robot_detail.reach_scale_button')}
        cancelLabel={t('robot_detail.reach_reject_button')}
        danger={false}
        onConfirm={runPendingReach}
        onCancel={cancelPendingReach}
      />
      <ConfirmDialog
        open={pendingTool !== null}
        message={t('robot_detail.confirm_tool', { tool: pendingTool ?? '' })}
        danger={false}
        onConfirm={runPendingTool}
        onCancel={() => setPendingTool(null)}
      />
      <ConfirmDialog
        open={pendingModel !== null}
        message={t('robot_detail.confirm_model', { model: pendingModel ?? '' })}
        danger={false}
        onConfirm={runPendingModel}
        onCancel={() => setPendingModel(null)}
      />
      {!viewportOnly && (
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", robot.online ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]")} />
              {robot.name}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-md uppercase font-bold tracking-wider">{robot.model}</span>
              <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-md uppercase font-bold tracking-wider">{robot.tool}</span>
              <span data-testid="motion-source" className={cn("text-xs px-2 py-1 rounded-md uppercase font-bold tracking-wider", motionSource(robot) === 'live' ? "bg-emerald-950 text-emerald-400" : motionSource(robot) === 'simulated' ? "bg-amber-950 text-amber-400" : "bg-rose-950 text-rose-400")}>{t(`motion_source.${motionSource(robot)}`)}</span>
            </div>
          </div>
        </div>
      )}

      {!viewportOnly && (
        <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <RobotAccessBar robot={robot} />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden pt-2 px-2 pb-0 gap-2 min-h-0">
        {/* Left Panel: 3D View */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <div
            // min-h-0 defensively added on the viewportOnly flex-1 chain
            // (here and its two ancestors above) while chasing the Android
            // 3D-viewport bug - turned out NOT to be the actual cause (that
            // was HYDRA-UMC-ANDROID-CONTROL's own WebView never getting real
            // LayoutParams from Compose, see ThreeDScreen.kt), confirmed by
            // this exact chain rendering with real height in a real desktop
            // browser even without it. Left in anyway: it's the correct,
            // standard defensive class for a flex-1 child nested this many
            // levels deep (avoids the well-known min-height:auto-wins-over-
            // flex-grow gotcha regardless of what content ever ends up
            // inside), not just dead weight from a wrong guess.
            className={cn("relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col group shrink-0", viewportOnly ? "flex-1 min-h-0" : "min-h-[200px]")}
            style={!viewportOnly ? { flex: threeDHeight ? `0 0 ${threeDHeight}px` : '1 1 0%' } : {}}
          >
            <VirtualKinematics key={reset3DKey} robot={robot} controlMode={controlMode} onSelectRobot={onNavigateToRobot} lowPower={viewportOnly} />

            {!viewportOnly && (
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
                      updateRobot(robot.id, {
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
            )}

            {!viewportOnly && (
              <JointControlsOverlay
                robot={robot}
                jogStep={jogStep}
                onJogStepChange={setJogStep}
                playbackSpeed={playbackSpeed}
                playbackAcceleration={playbackAcceleration}
                onSpeedChange={handleSpeedChange}
                onAccelerationChange={handleAccelerationChange}
                onJointChange={(j, val) => setRobotJoints(robot.id, { ...robot.joints, [j]: val })}
                t={t}
              />
            )}

            {!viewportOnly && (
              <JoystickOverlay
                jogStep={jogStep}
                onXYZJog={handleXYZJog}
                onJ1Jog={handleJ1Jog}
                j1Value={robot.joints.j1}
                j1Limits={jointLimitsFor(robot.model, 'j1')}
                t={t}
              />
            )}

            {!viewportOnly && hasXYTable && (
              <XYTableOverlay
                robot={robot}
                jogStep={jogStep}
                onAxisChange={handleXYAxisChange}
                t={t}
              />
            )}

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
            
            {/* Horizontal Resize Handle for 3D View */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center z-20 hover:bg-white/5 transition-colors"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                beginResizeThreeD(e.currentTarget.parentElement?.offsetHeight || 0, e.clientY);
              }}
            >
              <div className="w-12 h-1 rounded-full bg-slate-500/50" />
            </div>

            {/* Real per-orientation redesign requested live for the
                Android embedded viewport (viewportOnly): a translucent
                overlay INSIDE the 3D viewport itself (not a second flex
                sibling below it, see this file's own comment on the now-
                removed classic panel above) so the 3D view genuinely
                fills the screen in both orientations. Portrait shows only
                E-STOP/START-STOP/PAUSE-CONTINUE - the same 3 controls the
                classic row always led with; landscape (more width, less
                height to spare) folds every other control back in at a
                smaller size instead of hiding them, replacing their old
                solid colored backgrounds with the same uniform translucent
                style already used for the move/rotate/resize/center
                buttons above - real per the operator's own request. */}
            {viewportOnly && (
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
            )}
          </div>

          {/* This action-row/joint-controls panel is not rendered on the embedded Android viewport (viewportOnly): as a second flex-1 sibling of the 3D
              viewport it would split the available height roughly in half and the 3D view would not fill the screen. The overlay panel inside the 3D viewport
              div above covers the same controls without taking a share of the layout. */}
          {!viewportOnly && (
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
          )}
        </div>

        {!isFullscreen && !viewportOnly && (
          <div 
            className="hidden lg:flex w-2 cursor-col-resize hover:bg-slate-700/50 rounded mx-[-12px] z-10 shrink-0 items-center justify-center transition-colors touch-none"
            onPointerDown={(e) => {
              e.preventDefault();
              beginResizeRightPanel(e.clientX);
            }}
          >
            <div className="w-0.5 h-12 bg-slate-600 rounded-full" />
          </div>
        )}

        {/* Right Panel */}
        {!viewportOnly && (
          <div
            className={cn("w-full lg:w-auto flex flex-col shrink-0 min-h-0 gap-2 transition-all duration-75", isFullscreen && "hidden")}
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? rightPanelWidth : '100%' }}
          >
          {/* Top Panel: Config, I/O, Points */}
          <ConfigPanel combinedBotsInfo={combinedBotsInfo} handleExportGCode={handleExportGCode} handleSaveWorkFile={handleSaveWorkFile} handleUploadWorkFile={handleUploadWorkFile} loadExample={loadExample} loadExampleForRobot={loadExampleForRobot} loadWorkFile={loadWorkFile} reachTolerance={reachTolerance} previewOn={previewOn} setPreviewOn={changePreviewOn} rightTab={rightTab} robot={robot} robots={robots} selectedExample={selectedExample} selectedWorkFile={selectedWorkFile} setPendingModel={setPendingModel} setPendingTool={setPendingTool} setReachTolerance={setReachTolerance} setRightTab={setRightTab} settings={settings} t={t} togglePump={togglePump} toggleValve={toggleValve} updateRobot={updateRobot} uploadWorkFileRef={uploadWorkFileRef} workFiles={workFiles} />
          
          {/* Bottom Panel: Points & Trajectories Table */}
          <PointsPanel editingPointData={editingPointData} editingPointKey={editingPointKey} robot={robot} setEditingPointData={setEditingPointData} setEditingPointKey={setEditingPointKey} t={t} updateRobot={updateRobot} />
        </div>
      )}
    </div>
  </div>
);
}
