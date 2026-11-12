// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: RobotDetail.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motionSource } from '../motionSource';
import { type RobotState } from '../store';
import { cn } from './robotDetail/shared';
import { ConfigPanel } from './robotDetail/ConfigPanel';
import { PointsPanel } from './robotDetail/PointsPanel';
import { VirtualKinematics } from './VirtualKinematics';
import { JointControlsOverlay, JoystickOverlay, XYTableOverlay } from './robotDetail/FloatingJogOverlays';
import { jointLimitsFor } from '../examples/robotKinematicsDispatch';
import { ActionRow } from './robotDetail/ActionRow';
import { RobotDetailDialogs } from './robotDetail/RobotDetailDialogs';
import { CameraLayer, ViewportActionOverlay, ViewportToolbars, type ControlMode } from './robotDetail/ViewportControls';
import { usePanelLayout } from '../hooks/usePanelLayout';
import { useRobotCommands } from '../hooks/useRobotCommands';
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
  // A camera window is shown only when the robot's own `visionEnabled` flag AND its assigned camera's `connected` state are both true: the flag has
  // its own default and can drift from the camera (reassigned camera, a toggle that writes only one of the two), so the camera decides.
  const isVisionActive = (bot: RobotState) => bot.visionEnabled && (cameras.find(c => c.assignedRobotId === bot.id)?.connected ?? false);
  // The Android app's WebView adds a distinctive token to its user agent; the action row shows icons only there and keeps its text labels in a browser.
  const isAndroidApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('HYDRA-UMC-ANDROID-CONTROL');
  const robotsRef = useRef(robots);
  useEffect(() => { robotsRef.current = robots; }, [robots]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadWorkFileRef = useRef<HTMLInputElement>(null);
  // The jog step is a server-synced setting of the robot (`?? 1` covers settings saved before the field existed). It goes through the atomic 'jogStep'
  // command, not updateRobot, because updateRobot's debounced save never reaches the other connected clients.
  const jogStep = robot.jogStep ?? 1;
  const setJogStep = (v: number) => sendRobotCommand(robot.id, 'jogStep', { value: v }, () => ({ jogStep: v }));
  const [selectedExample, setSelectedExample] = useState<string>(robot.selectedExample || '');
  const [selectedWorkFile, setSelectedWorkFile] = useState<string>(robot.selectedWorkFile || '');
  // Both edit buffers are seeded from this robot's saved fields and reset together when the panel shows another robot; the robot id last reset for tells
  // a switch of robot from a change of the same robot's field (React's "adjust state during render" pattern, no effect needed).
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
  const [controlMode, setControlMode] = useState<ControlMode>('none');
  const toggleControl = (mode: 'translate' | 'rotate' | 'scale') => setControlMode(prev => prev === mode ? 'none' : mode);

  const hasXYTable = robot.hasXYTable;

  const combinedBotsInfo = (robot.combinedWith || []).map(id => robots.find(r => r.id === id)).filter(Boolean) as RobotState[];
  const isStartAll = combinedBotsInfo.length > 0;

  const [reset3DKey, setReset3DKey] = useState(0);
  // RESET 3D reaches every client: `reset3DTrigger` is bumped through the atomic 'reset3D' command and each client remounts its 3D view when it changes.
  // The first render is skipped (a ref, not state) so a robot loaded with an old trigger does not remount the view for nothing.
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
      <RobotDetailDialogs
        t={t} robotModel={robot.model} pendingAction={pendingAction} setPendingAction={setPendingAction} runPendingAction={runPendingAction}
        pendingPreview={pendingPreview} runPendingPreview={runPendingPreview} cancelPreview={cancelPreview}
        pendingReach={pendingReach} runPendingReach={runPendingReach} cancelPendingReach={cancelPendingReach}
        pendingTool={pendingTool} setPendingTool={setPendingTool} runPendingTool={runPendingTool}
        pendingModel={pendingModel} setPendingModel={setPendingModel} runPendingModel={runPendingModel}
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
            // min-h-0 on this flex-1 chain avoids the min-height:auto-wins-over-flex-grow trap of a deeply nested flex child
            className={cn("relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col group shrink-0", viewportOnly ? "flex-1 min-h-0" : "min-h-[200px]")}
            style={!viewportOnly ? { flex: threeDHeight ? `0 0 ${threeDHeight}px` : '1 1 0%' } : {}}
          >
            <VirtualKinematics key={reset3DKey} robot={robot} controlMode={controlMode} onSelectRobot={onNavigateToRobot} lowPower={viewportOnly} />

            {!viewportOnly && (
              <ViewportToolbars
                t={t} robotId={robot.id} controlMode={controlMode} toggleControl={toggleControl}
                isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} updateRobot={updateRobot}
              />
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

            <CameraLayer t={t} robot={robot} combinedBotsInfo={combinedBotsInfo} isVisionActive={isVisionActive} settings={settings} updateSettings={updateSettings} />
            
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
              <ViewportActionOverlay
                t={t} robot={robot} isStartAll={isStartAll} handleEmergencyStop={handleEmergencyStop} handlePlay={handlePlay} handleStop={handleStop}
                handleHome={handleHome} handleResetXY={handleResetXY} handleReset={handleReset} handleReset3D={handleReset3D} handleAddPoint={handleAddPoint}
                setPendingAction={setPendingAction} sendRobotCommand={sendRobotCommand} updateRobot={updateRobot}
              />
            )}
          </div>

          {/* This action-row/joint-controls panel is not rendered on the embedded Android viewport (viewportOnly): as a second flex-1 sibling of the 3D
              viewport it would split the available height roughly in half and the 3D view would not fill the screen. The overlay panel inside the 3D viewport
              div above covers the same controls without taking a share of the layout. */}
          {!viewportOnly && (
            <ActionRow
              t={t} robot={robot} isStartAll={isStartAll} isAndroidApp={isAndroidApp} fileInputRef={fileInputRef} loadKinematics={loadKinematics}
              handleEmergencyStop={handleEmergencyStop} handlePlay={handlePlay} handleStop={handleStop} handleHome={handleHome} handleResetXY={handleResetXY}
              handleReset={handleReset} handleReset3D={handleReset3D} handleAddPoint={handleAddPoint} setPendingAction={setPendingAction}
              sendRobotCommand={sendRobotCommand} updateRobot={updateRobot}
            />
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
