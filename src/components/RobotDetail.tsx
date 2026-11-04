// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: RobotDetail.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { RotaryKnob } from "./RotaryKnob";
import { FuturisticSlider } from "./FuturisticSlider";
import { useTranslation } from 'react-i18next';
import { motionSource } from '../motionSource';
import { type RobotState } from '../store';
import { apiUrl } from '../lib/apiBase';
import { RotateCcw, Home, AlertOctagon, ArrowUp, Play, Square, Pause, Crosshair, RefreshCw, Maximize2, Minimize2, Camera as CameraIcon, Trash2, Repeat, Grid3x3, Plus } from 'lucide-react';
import { cn } from './robotDetail/shared';
import { ConfigPanel } from './robotDetail/ConfigPanel';
import { PointsPanel } from './robotDetail/PointsPanel';
import { CameraPIP } from './robotDetail/CameraPIP';
import { VirtualKinematics } from './VirtualKinematics';
import { JointControlsOverlay, JoystickOverlay, XYTableOverlay } from './robotDetail/FloatingJogOverlays';
import { examples } from '../examples/kinematics';
import { jointLimitsFor, resolveTargetJoints } from '../examples/robotKinematicsDispatch';
import { ConfirmDialog } from './ConfirmDialog';
import { usePanelLayout } from '../hooks/usePanelLayout';
import { useRobotCommands } from '../hooks/useRobotCommands';
import { TrajectoryPreview } from './TrajectoryPreview';
import { analyzeTrajectory, previewEnabled, savePreviewEnabled, type PreviewReport } from '../lib/trajectoryPreview';
import { buildReachReport, findReachScale, loadReachTolerance, reachNeedsConfirmation, scalePortablePoints, type ReachReport, type ReachScale } from '../lib/reachCheck';
import { RobotAccessBar } from './RobotAccessBar';
import { currentPlaybackStep } from '../lib/playbackStep';
import { withCartesian, browserStorage, normalizeTrajectoryForRobot } from '../lib/robotDetailHelpers';
import { useCommandFeedback, useFleet, useSession, useSettingsStore } from '../storeContexts';

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
  const [workFiles, setWorkFiles] = useState<string[]>([]);
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

  // Guards against an out-of-order response: fetchWorks() is called both from
  // the effect below (whenever worksFolderPath changes) and manually after
  // save/upload - nothing stopped an OLDER in-flight request from resolving
  // AFTER a newer one and overwriting workFiles with stale data. Bumping this
  // ref on every call and checking it's still the latest call before each
  // setState turns a superseded response into a no-op instead of a race.
  const worksFetchIdRef = useRef(0);

  // Depends on the resolved PATH STRING for this one robot, not the whole
  // settings.worksPaths object - that object is a fresh reference every
  // time ANY setting anywhere changes (see store.tsx's own applyServerData,
  // which used to make this worse by reshaping settings on every WebSocket
  // broadcast), so depending on it directly re-ran this real network fetch
  // (GET /${folderPath}/index.json) on every single jog tick from ANY
  // connected client the instant a robot panel was open - the concrete
  // mechanism behind this panel specifically (not other module panels,
  // which have no such fetch) being far slower than everything else in
  // the app. A plain string only changes reference (and re-triggers
  // fetchWorks's own identity, and thus the effect below) when this
  // robot's OWN folder path value actually changes.
  const worksFolderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
  const fetchWorks = useCallback(async () => {
    const fetchId = ++worksFetchIdRef.current;
    try {
      const res = await fetch(apiUrl(`/${worksFolderPath}/index.json`));
      if (fetchId !== worksFetchIdRef.current) return;
      if (res.ok) {
        const files = await res.json();
        if (fetchId !== worksFetchIdRef.current) return;
        setWorkFiles(Array.isArray(files) ? files.filter((f): f is string => typeof f === "string") : []);
      } else {
        setWorkFiles([]);
      }
    } catch {
      if (fetchId === worksFetchIdRef.current) setWorkFiles([]);
    }
  }, [worksFolderPath]);

  // Genuine "synchronize with an external system" effect (a real fetch of
  // this robot's WORKS folder listing) - the sanctioned use the lint
  // rule's own text carves out, not the "derive local state" case it's
  // meant to catch.
  useEffect(() => {
    fetchWorks(); // eslint-disable-line -- real fetch, not a derived-state reset
  }, [fetchWorks]);

  const handleSaveWorkFile = async () => {
    if (robot.recordedPoints.length === 0) return;
    const defaultName = selectedWorkFile ? selectedWorkFile.replace('.json', '') : 'trayectoria_1';
    let fileName = window.prompt(t('robot_detail.save_filename', 'Nombre del archivo (sin .json):'), defaultName);
    if (!fileName) return;
    if (!fileName.endsWith('.json')) fileName += '.json';
    
    try {
      const folderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
      // Server now requires a bearer token on this route (see server.ts's
      // own comment on POST /api/upload-work) - without this header every
      // save silently 401s for a logged-in user.
      const res = await fetch(apiUrl('/api/upload-work'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          folderPath,
          fileName: fileName,
          content: robot.recordedPoints
        })
      });
      if (res.ok) {
        await fetchWorks();
        setSelectedWorkFile(fileName);
        updateRobot(robot.id, { selectedWorkFile: fileName });
      } else {
        console.error('Failed to save work file');
      }
    } catch (err) {
      console.error('Error saving file', err);
    }
  };

  // Exports robot.recordedPoints as standard G-code (review note:
  // "Permitir la exportaciÃ³n de trayectorias a archivos G-Code estÃ¡ndar").
  // Uses each point's own Cartesian pose (x/y/z/a/b/c, deriving it via the
  // same withCartesian() every example/upload already goes through - a
  // point recorded from the live 3D view already carries it, one loaded
  // from an older WORKS/ file predating this might not) rather than joint
  // angles: G-code is a Cartesian TOOL-PATH format, not a joint-space one,
  // and every existing G-code consumer (CAM viewers, most CNC post-
  // processors) expects X/Y/Z/(A/B/C) words, not J1-J6. A/B/C are emitted
  // as the rotary-axis words several real G-code dialects (RepRap-derived
  // firmware, 5/6-axis mill posts) already use for exactly this - not a
  // universal standard for 6-DOF orientation, so the header comment below
  // says so explicitly rather than implying this is a validated post for
  // any specific downstream machine/viewer.
  const handleExportGCode = () => {
    if (robot.recordedPoints.length === 0) return;
    const points = robot.recordedPoints.map(withCartesian);
    const fmt = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3) : undefined);
    const lines = [
      `; HYDRA-UMC STUDIO - G-code export`,
      `; Robot: ${robot.name}`,
      `; Points: ${points.length}`,
      `; NOTE: A/B/C are this robot's own tool orientation (degrees), following the`,
      `;       same A/B/C convention several real G-code dialects use for rotary`,
      `;       axes - not a universal 6-DOF standard. Verify against your actual`,
      `;       downstream machine/viewer before running this on real hardware.`,
      `G21 ; millimeters`,
      `G90 ; absolute positioning`,
    ];
    points.forEach((pt, i) => {
      const words = [`G1`];
      const x = fmt(pt.x), y = fmt(pt.y), z = fmt(pt.z), a = fmt(pt.a), b = fmt(pt.b), c = fmt(pt.c);
      if (x !== undefined) words.push(`X${x}`);
      if (y !== undefined) words.push(`Y${y}`);
      if (z !== undefined) words.push(`Z${z}`);
      if (a !== undefined) words.push(`A${a}`);
      if (b !== undefined) words.push(`B${b}`);
      if (c !== undefined) words.push(`C${c}`);
      lines.push(`${words.join(' ')} ; point ${i + 1}`);
    });
    lines.push(`M2 ; end of program`);

    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${robot.name.replace(/\s+/g, '_')}.gcode`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadWorkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = JSON.parse(ev.target?.result as string);
        const folderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;

        // Same bearer-token requirement as handleSaveWorkFile above.
        const res = await fetch(apiUrl('/api/upload-work'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({
            folderPath,
            fileName: file.name,
            content
          })
        });

        if (res.ok) {
          await fetchWorks();
          loadWorkFile(file.name);
        } else {
          console.error('Failed to upload work file');
        }
      } catch (err) {
        console.error('Error parsing or uploading file', err);
      }
    };
    reader.readAsText(file);
    if (uploadWorkFileRef.current) uploadWorkFileRef.current.value = '';
  };

  const loadWorkFile = async (fileName: string) => {
    setSelectedWorkFile(fileName);
    if (!fileName) {
      updateRobot(robot.id, { selectedWorkFile: fileName });
      return;
    }
    try {
      const folderPath = settings.worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
      const res = await fetch(apiUrl(`/${folderPath}/${fileName}`));
      if (res.ok) {
        const rawPoints = await res.json();
        // Resolve every portable Work into this robot's actual joints before
        // it enters state or Server. Legacy generic files and compact native
        // joint files therefore share one explicit, testable loading path.
        const residuals: Array<number | null> = [];
        const points = normalizeTrajectoryForRobot(rawPoints, robot, residuals);
        // A Work must reach Server before the operator can press Play. The
        // former updateRobot() path waited for the general 500 ms settings
        // debounce, so Server often replayed the previous Work even though
        // this panel already displayed the newly loaded points. The atomic
        // trajectory command persists, resets the cursor and broadcasts the
        // same points as one operation.
        const sendPoints = (pts: any[]) => sendRobotCommand(
          robot.id,
          'trajectory',
          { points: pts, selectedWorkFile: fileName },
          () => ({
            selectedWorkFile: fileName,
            recordedPoints: pts,
            playbackState: {
              ...(robot.playbackState || {}),
              isPlaying: false,
              playing: false,
              isPaused: false,
              paused: false,
              activeStep: -1,
              isFinished: false,
              finished: false,
            },
          }),
        );
        await sendUnlessUnreachable(residuals, () => setSelectedWorkFile(robot.selectedWorkFile || ''), () => sendPoints(points), { raw: rawPoints as unknown[], target: robot, sendPoints });
      } else {
        updateRobot(robot.id, { selectedWorkFile: fileName });
      }
    } catch (e) {
      console.error(e);
      updateRobot(robot.id, { selectedWorkFile: fileName });
    }
  };

  const loadExample = async (id: string) => {
    console.log("Loading example:", id);
    setSelectedExample(id);
    const ex = examples.find(e => e.id === id);
    if (!ex) {
      updateRobot(robot.id, { selectedExample: id });
      return;
    }
    try {
      const residuals: Array<number | null> = [];
      const points = normalizeTrajectoryForRobot(ex.points.map(withCartesian), robot, residuals);
      const sendPoints = (pts: any[]) => sendRobotCommand(
        robot.id,
        'trajectory',
        { points: pts, selectedExample: id },
        () => ({
          selectedExample: id,
          recordedPoints: pts,
          playbackState: {
            ...(robot.playbackState || {}),
            isPlaying: false, playing: false, isPaused: false, paused: false,
            activeStep: -1, isFinished: false, finished: false,
          },
        }),
      );
      await sendUnlessUnreachable(residuals, () => setSelectedExample(robot.selectedExample || ''), () => sendPoints(points), { raw: ex.points.map(withCartesian), target: robot, sendPoints });
    } catch (error) {
      console.error('Unable to prepare example trajectory', error);
      updateRobot(robot.id, { selectedExample: id });
    }
  };

  const loadExampleForRobot = async (botId: number, exId: string) => {
    const ex = examples.find(e => e.id === exId);
    const targetRobot = robots.find((candidate) => candidate.id === botId);
    if (!ex || !targetRobot) return;
    try {
      const residuals: Array<number | null> = [];
      const points = normalizeTrajectoryForRobot(ex.points.map(withCartesian), targetRobot, residuals);
      const sendPoints = (pts: any[]) => sendRobotCommand(
        botId,
        'trajectory',
        { points: pts, selectedExample: exId },
        () => ({
          selectedExample: exId,
          recordedPoints: pts,
          playbackState: {
            ...(targetRobot.playbackState || {}),
            isPlaying: false, playing: false, isPaused: false, paused: false,
            activeStep: -1, isFinished: false, finished: false,
          },
        }),
      );
      await sendUnlessUnreachable(residuals, () => undefined, () => sendPoints(points), { raw: ex.points.map(withCartesian), target: targetRobot, sendPoints });
    } catch (error) {
      console.error('Unable to prepare combined robot example trajectory', error);
    }
  };


  // stop/play fire the atomic command (server-side fans out to
  // combinedWith itself via affectedIds - see server.ts's own switch) with
  // a matching localMutate covering self + combinedWith locally too, so
  // the UI reflects it instantly instead of waiting on the WS round-trip -
  // see store.tsx's own sendRobotCommand comment. Mirrors exactly what
  // server.ts's own "stop"/"play" case now does (isFinished/finished reset
  // included - see that case's own comment) so the optimistic mutation and
  // the real delta that follows agree, instead of one silently overwriting
  // the other's own isFinished value moments later.
  const handleStop = () => {
    sendRobotCommand(
      robot.id,
      'stop',
      undefined,
      (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false } }),
      [robot.id, ...(robot.combinedWith || [])]
    );
  };

  // The E-STOP button is the GLOBAL stop (the same as the STOP in the header): every robot of every controller, one
  // click, no confirmation, valves and pumps off, every answer checked - a stop the server never received is shown,
  // not swallowed. The `online` flag is telemetry and is left alone. The per-robot STOP/START control is handleStop.
  const handleEmergencyStop = () => {
    void emergencyStop();
  };

  // With the check switched on (Config tab, off by default) Play first shows the path and what is wrong with it.
  const [previewOn, setPreviewOn] = useState<boolean>(() => previewEnabled(browserStorage()));
  const [pendingPreview, setPendingPreview] = useState<PreviewReport | null>(null);
  const changePreviewOn = (on: boolean) => setPreviewOn(savePreviewEnabled(browserStorage(), on));
  const handlePlay = async () => {
    if (robot.recordedPoints.length === 0) return;
    if (previewOn) {
      setPendingPreview(analyzeTrajectory(robot.recordedPoints, robot.model));
      return;
    }
    startPlay();
  };
  const runPendingPreview = () => {
    setPendingPreview(null);
    startPlay();
  };
  const startPlay = () => {
    // Only THIS robot mutated optimistically here, matching the original
    // scope of this local update - a combined sibling's own playbackState
    // still lands correctly (the server always fans "play" out to
    // combinedWith - see server.ts's own affectedIds), it just does so via
    // that sibling's own component reacting to ITS OWN
    // robot.playbackState.isPlaying changing once the delta arrives (the
    // effect just below watching that exact field), same propagation path
    // this app already relied on before sendRobotCommand existed.
    sendRobotCommand(
      robot.id,
      'play',
      undefined,
      (r) => ({ playbackState: { ...(r.playbackState || {}), isPlaying: true, activeStep: 0, isPaused: false, paused: false, isFinished: false } })
    );
    // playRobotTrajectory (the ~215-line local interpolation loop that
    // used to live here, recorded-point by recorded-point with a real
    // velocity/acceleration curve) is removed:
    // server.ts's own V0 playback engine (see its own header comment) is
    // now the SOLE driver of playback motion, for every client including
    // this one - it replays this robot's recordedPoints itself and
    // broadcasts a real delta on every step, which this component
    // already renders reactively via robot.pos/robot.joints/
    // robot.playbackState like any other incoming state. Two independent
    // drivers writing the same robot's position (this loop AND the
    // server, both real, both timed) would be a real problem on physical
    // hardware, not just a UI glitch - see the "Started from outside"
    // effect this same change also removed below, which existed only to
    // start this loop when another client's own 'play' command arrived.
    // The server's engine is deliberately a linear point-to-point
    // replay, not yet this loop's own smooth curve - see server.ts's own
    // comment on that scope boundary. Full history in git.
  };

  
  const { rightPanelWidth, beginResizeRightPanel, threeDHeight, beginResizeThreeD } = usePanelLayout(settings.uiLayout, updateSettings);

      const [rightTab, setRightTab] = useState<'trajectories' | 'config' | 'io'>('trajectories');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlMode, setControlMode] = useState<'translate' | 'rotate' | 'scale' | 'none'>('none');
  const toggleControl = (mode: 'translate' | 'rotate' | 'scale') => setControlMode(prev => prev === mode ? 'none' : mode);

  // Was scoped to robot A1 only as a proof of concept; it now applies to every robot.
  // Speed/Acceleration/Step/J1-J6 live in JointControlsOverlay, XYZ jog in
  // JoystickOverlay, and (when hasXYTable) the XY table controls in
  // XYTableOverlay - all three float ON the 3D viewport instead of the
  // classic panel below it, which is why this used to be a per-robot flag
  // rather than a constant: none of those 3 components have anything A1-
  // specific baked in (robot/jogStep/handlers are plain props), so turning
  // this into `true` for every robot needed no other change.
  const isFloatingLayout = true;

  const hasXYTable = robot.hasXYTable;

  const combinedBotsInfo = (robot.combinedWith || []).map(id => robots.find(r => r.id === id)).filter(Boolean) as RobotState[];
  const isStartAll = combinedBotsInfo.length > 0;

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(robot.playbackState?.speed || 100);
  const [playbackAcceleration, setPlaybackAcceleration] = useState<number>(robot.playbackState?.acceleration || 100);

  // Real "adjust state during render" pattern: playbackSpeed/Acceleration
  // are optimistic local buffers (handleSpeedChange/handleAccelerationChange
  // below set them immediately, ahead of the server round-trip), but they
  // also need to pick up a value that arrived from elsewhere (another
  // client, or the server's own confirmation) once robot.playbackState
  // catches up - same condition the effects used, just evaluated every
  // render instead of only on a dependency change, so it also covers a
  // robot switch without needing robot.id listed separately.
  if (robot.playbackState?.speed !== undefined && robot.playbackState.speed !== playbackSpeed) {
    setPlaybackSpeed(robot.playbackState.speed);
  }
  if (robot.playbackState?.acceleration !== undefined && robot.playbackState.acceleration !== playbackAcceleration) {
    setPlaybackAcceleration(robot.playbackState.acceleration);
  }

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    // Atomic 'speed' command - see toggleValve's own comment above.
    sendRobotCommand(robot.id, 'speed', { speed: newSpeed }, (r) => ({ playbackState: { ...(r.playbackState || {}), speed: newSpeed } }));
  };

  // We'd always had a speed control here but never one for acceleration -
  // same 10-500% scale as speed, same RotaryKnob+FuturisticSlider pair.
  const handleAccelerationChange = (newAcceleration: number) => {
    setPlaybackAcceleration(newAcceleration);
    sendRobotCommand(robot.id, 'speed', { acceleration: newAcceleration }, (r) => ({ playbackState: { ...(r.playbackState || {}), acceleration: newAcceleration } }));
  };
  const playbackPausedRef = useRef(false);
  useEffect(() => {
    playbackPausedRef.current = robot.playbackState?.isPaused || false;
  }, [robot.playbackState?.isPaused]);


  // Removed: this effect used to call handlePlay()/
  // handleStop() locally whenever robot.playbackState.isPlaying toggled
  // from an external source (another client's own play/stop command),
  // so that THIS tab's own local playRobotTrajectory loop would start
  // driving motion too. Now that server.ts's own V0 playback engine is
  // the sole driver (see handlePlay's own comment above), that call would
  // be actively harmful, not just redundant: handlePlay() still sends a
  // real 'play' command, and server.ts's 'play' case always resets
  // activeStep to 0 - so this effect reacting to the server's OWN
  // broadcast by resending 'play' would restart the trajectory from the
  // beginning in a loop, never actually progressing. No replacement is
  // needed: this component already renders robot.pos/robot.joints/
  // robot.playbackState reactively from whatever the server broadcasts,
  // same as every other client.

  useEffect(() => {
    const current = currentPlaybackStep(robot.playbackState?.activeStep);
    if (robot.playbackState?.isPlaying && current >= 0) {
      const el = document.getElementById(`step-${robot.id}-${current}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [robot.playbackState?.activeStep, robot.playbackState?.isPlaying, robot.id]);

  // Real regression fix, live-reproduced: server.ts's own V0 playback engine
  // (startServerPlayback) broadcasts each recordedPoints[] entry's {j1..j6}
  // AS-IS, unmodified - correct only for the truly generic model, where
  // those numbers ARE the robot's real joints. For every model with its own
  // real kinematics (Parol6/Faze4/AR3/AR4/UR*/xArm6/... - resolveTargetJoints's
  // own long dispatch above), a loaded example's {j1..j6} was computed
  // against the shared GENERIC 160mm/200mm formula instead (see withCartesian's
  // own comment) - applying those numbers directly as this robot's real
  // joints is what made played-back examples/WORKS files move the arm
  // through incoherent, nonsensical poses instead of the intended path.
  // STUDIO's OWN removed client-side playback loop used to re-solve this
  // exact way (see resolveTargetJoints's header comment: "re-solve the
  // resolved Cartesian target... against that robot's own real kinematics
  // instead, so recorded/played trajectories move it sensibly") - moving
  // playback server-side dropped that step, since server.ts has no access
  // to any of these per-model IK solvers (they're pure three.js-dependent
  // TS, not a quick port). Re-deriving it here, purely client-side, restores the exact same
  // correctness for every connected client (STUDIO's browser tab AND
  // Android's WebView-embedded copy of this same page) without needing
  // server.ts to know anything about per-model kinematics at all -
  // `robot.pos`'s x/y/z/a/b/c is already the real, robot-agnostic Cartesian
  // target this point means to reach, exactly like a live jog. Scoped to
  // ONLY fire during active playback (not every robot.pos change) so a
  // direct joint-slider edit (onJointChange, which never touches
  // robot.pos) is never fought with a stale re-derivation.
  // useLayoutEffect, not useEffect: fires before the browser paints the
  // just-arrived (wrong) broadcast joints, so the correction lands in the
  // very next commit instead of one extra visible frame of the wrong pose.
  const playbackTrajectoryMode = (robot.playbackState as any)?.trajectoryMode;
  useLayoutEffect(() => {
    if (!robot.playbackState?.isPlaying) return;
    if (playbackTrajectoryMode === 'model-joints') return;
    const target = playbackTrajectoryMode === 'legacy-generic'
      ? withCartesian(robot.joints)
      : robot.pos;
    if (typeof target?.x !== 'number') return;
    const resolved = resolveTargetJoints(
      robot.model, target.x, target.y, target.z,
      target.a ?? 0, target.b ?? 0, target.c ?? 0,
      robot.joints,
      robot.joints,
    );
    const changed = (['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).some(
      (k) => Math.abs((resolved[k] ?? 0) - (robot.joints[k] ?? 0)) > 0.01
    );
    if (changed) {
      updateRobot(robot.id, { joints: resolved });
    }
  }, [
    robot.pos, robot.pos?.x, robot.pos?.y, robot.pos?.z, robot.pos?.a, robot.pos?.b, robot.pos?.c,
    robot.joints, robot.playbackState?.isPlaying, robot.model, robot.id, updateRobot,
    playbackTrajectoryMode,
  ]);

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
  // A trajectory with points the arm cannot reach asks first (see src/lib/reachCheck.ts).
  const [pendingReach, setPendingReach] = useState<{ report: ReachReport; fit: ReachScale | null; sendScaled: (() => Promise<unknown>) | null; decline: () => void } | null>(null);
  const [reachTolerance, setReachTolerance] = useState<number>(() => loadReachTolerance(browserStorage()));
  // A trajectory with points the arm cannot reach is refused, with the list of those points. The operator can
  // accept the same trajectory scaled to the reach of this model (about the base of the robot), or cancel.
  // `scaling` carries what is needed to build the scaled trajectory; without it only the refusal is offered.
  const sendUnlessUnreachable = async (
    residuals: Array<number | null>,
    decline: () => void,
    send: () => Promise<unknown>,
    scaling?: { raw: unknown[]; target: Pick<RobotState, 'model' | 'joints'>; sendPoints: (points: any[]) => Promise<unknown> },
  ) => {
    const tolerance = loadReachTolerance(browserStorage());
    const report = buildReachReport(residuals, tolerance);
    if (!reachNeedsConfirmation(report)) {
      await send();
      return;
    }
    let fit: ReachScale | null = null;
    let sendScaled: (() => Promise<unknown>) | null = null;
    if (scaling) {
      const scaledAt = (scale: number) => scalePortablePoints(scaling.raw, scale, withCartesian);
      fit = findReachScale((scale) => {
        const measured: Array<number | null> = [];
        try { normalizeTrajectoryForRobot(scaledAt(scale), scaling.target, measured); } catch { return [Number.POSITIVE_INFINITY]; }
        return measured;
      }, tolerance, scaling.raw.length > 500 ? 0.1 : 0.05);
      if (fit.scale < 1 && fit.remaining < report.count) {
        const chosen = fit.scale;
        sendScaled = () => scaling.sendPoints(normalizeTrajectoryForRobot(scaledAt(chosen), scaling.target));
      }
    }
    setPendingReach({ report, fit, sendScaled, decline });
  };
  const runPendingReach = () => {
    const pending = pendingReach;
    setPendingReach(null);
    if (pending?.sendScaled) void pending.sendScaled();
  };
  const cancelPendingReach = () => {
    const pending = pendingReach;
    setPendingReach(null);
    pending?.decline();
  };
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
        onCancel={() => setPendingPreview(null)}
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

            {isFloatingLayout && !viewportOnly && (
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

            {isFloatingLayout && !viewportOnly && (
              <JoystickOverlay
                jogStep={jogStep}
                onXYZJog={handleXYZJog}
                onJ1Jog={handleJ1Jog}
                j1Value={robot.joints.j1}
                j1Limits={jointLimitsFor(robot.model, 'j1')}
                t={t}
              />
            )}

            {isFloatingLayout && !viewportOnly && hasXYTable && (
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

          {/* This whole action-row/joint-controls panel used to be a
              second flex-1 sibling of the 3D viewport above, splitting
              the available height roughly in half regardless of
              orientation - the real cause of "the 3D view doesn't fill
              the screen" reported live on the Android embedded viewport
              (viewportOnly). Gone entirely there now; its own real
              replacement (RobotDetail-*.tsx has none rendered outside of
              it - see the overlay panel inside the 3D viewport div
              above, gated on viewportOnly the other way around) covers
              the same controls without taking a share of the layout. */}
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

            {/* RESET 3D Button - RotateCcw instead of the old Video icon
                (a camera/record glyph, which read as unrelated to what
                this button actually does: remount the 3D viewport). */}
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

            {/* Add/Delete Point mini-frame - floating layout only (see
                isFloatingLayout's own header comment). Non-floating robots
                keep these 2 buttons in the classic Joint Controls panel
                below, unchanged - this is purely a layout move, same
                handlers either way. */}
            {isFloatingLayout && (
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

          {/* Joint Controls - classic layout only (isFloatingLayout puts
              Step/Speed/Acceleration/Joints in JointControlsOverlay, XYZ
              jog in JoystickOverlay, XY table in XYTableOverlay, and
              Add/Delete Point in the button row above - nothing left to
              show here, so the whole panel goes away and the 3D view above
              expands to fill the freed vertical space via its own existing
              flex:1 sizing). */}
          {!isFloatingLayout && (
          <div className={cn("bg-slate-900 border border-slate-800 rounded-xl p-4 shrink-0 shadow-sm", isFullscreen && "hidden")}>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <div className="flex flex-wrap items-center gap-3">
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAddPoint}
                    className="px-4 py-2 min-h-[44px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    {t('robot_detail.add_point', '+ Add Point')}
                  </button>
                  <button 
                    onClick={() => setPendingAction('delete_points')}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {!isFloatingLayout && (
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-h-[44px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('robot_detail.speed', 'Speed:')}</span>
                  <RotaryKnob
                    min={10}
                    max={500}
                    value={playbackSpeed}
                    onChange={handleSpeedChange}
                    size={40}
                    step={jogStep}
                  />
                  <div className="w-32 ml-2">
                    <FuturisticSlider
                      min={10}
                      max={500}
                      value={playbackSpeed}
                      onChange={handleSpeedChange}
                      step={jogStep}
                    />
                  </div>
                  <span className="text-xs font-mono text-sky-400 w-10 text-right">{playbackSpeed}%</span>
                </div>
                )}

                {!isFloatingLayout && (
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-h-[44px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('robot_detail.acceleration', 'Acceleration:')}</span>
                  <RotaryKnob
                    min={10}
                    max={500}
                    value={playbackAcceleration}
                    onChange={handleAccelerationChange}
                    size={40}
                    step={jogStep}
                  />
                  <div className="w-32 ml-2">
                    <FuturisticSlider
                      min={10}
                      max={500}
                      value={playbackAcceleration}
                      onChange={handleAccelerationChange}
                      step={jogStep}
                    />
                  </div>
                  <span className="text-xs font-mono text-amber-400 w-10 text-right">{playbackAcceleration}%</span>
                </div>
                )}

                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-h-[44px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('robot_detail.step', 'Step:')}</span>
                  <select value={jogStep} onChange={e => setJogStep(Number(e.target.value))} className="bg-transparent border-none text-sm outline-none font-mono text-slate-200">
                    <option value={0.1}>0.1</option>
                    <option value={1}>1</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={22.5}>22.5</option>
                    <option value={25}>25</option>
                    <option value={45}>45</option>
                    <option value={50}>50</option>
                    <option value={90}>90</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>

            {/* No isFloatingLayout hint paragraph here anymore - this whole
                panel is now wrapped in `{!isFloatingLayout && (...)}` above,
                so a floating-layout hint inside it could never actually
                render; the floating windows (JointControlsOverlay,
                JoystickOverlay, XYTableOverlay) are self-explanatory on
                their own. */}

            {!isFloatingLayout && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).map(j => {
                  // Parol6/AR4 have real, narrower per-joint limits (from their own URDF/
                  // config) than the generic +/-180 range every other model uses - clamping
                  // the sliders to them keeps jogging from wandering into unreachable/
                  // self-colliding angles. Faze4/AR3 declare every joint "continuous" in
                  // their own URDFs (genuinely no limit), so they keep the generic range.
                  const [jMin, jMax] = jointLimitsFor(robot.model, j);
                  return (
                  <div key={j} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">{j}</span>
                      <span className="text-xs font-mono text-sky-400">{robot.joints[j as keyof typeof robot.joints]?.toFixed(2)}Â°</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <RotaryKnob
                        min={jMin}
                        max={jMax}
                        value={robot.joints[j as keyof typeof robot.joints]}
                        onChange={val => setRobotJoints(robot.id, { ...robot.joints, [j]: val })}
                        size={44}
                        step={jogStep}
                      />
                      <FuturisticSlider min={jMin} max={jMax} value={robot.joints[j as keyof typeof robot.joints]} onChange={val => setRobotJoints(robot.id, { ...robot.joints, [j]: val })} className="flex-1" step={jogStep} />
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {hasXYTable && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider"><Crosshair size={16} /> {t('robot_detail.xy_table_controls', 'XY Table Controls')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['tx', 'ty'] as const).map(axis => {
                    const maxVal = axis === 'tx' ? (robot.xyTable?.tableSize?.width || 500) : (robot.xyTable?.tableSize?.length || 500);
                    return (
                    <div key={axis} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase">{axis}</span>
                        <span className="text-xs font-mono text-sky-400">{robot.pos[axis]?.toFixed(2) || 0}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <RotaryKnob
                          min={0}
                          max={maxVal}
                          value={robot.pos[axis] || 0}
                          onChange={val => handleXYAxisChange(axis, val)}
                          size={44}
                          step={jogStep}
                        />
                        <FuturisticSlider
                          min={0}
                          max={maxVal}
                          value={robot.pos[axis] || 0}
                          onChange={val => handleXYAxisChange(axis, val)}
                          className="flex-1"
                          step={jogStep}
                        />
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
          )}
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
