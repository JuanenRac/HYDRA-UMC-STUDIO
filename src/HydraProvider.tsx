// =============================================================================
// HYDRA-UMC STUDIO - Global state provider: HydraProvider.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { publishClaimsEvent } from './lib/claimsFeed';
import React, { useMemo, useRef } from 'react';
import { saveFailureText } from './lib/serverErrors';
import { type CommandResult } from './lib/commandResult';
import { createCommandSequence } from './lib/commandSequence';
import { guardCommand } from './lib/motionGuard';
import { settingsLocalOnly, settingsSaveAllowed } from './lib/settingsSave';
import { getModeState, getSafetyState } from './lib/accessStore';
import { isUnknownCommand } from './lib/tableMove';
import { createEditQueue, markEditCommands, planRobotEdits, serverHasEditCommands, type RobotEditCommand } from './lib/robotEdits';
import { HydraStoreProviders } from './storeContexts';
import { useAuthSession } from './hooks/useAuthSession';
import { useCommandIssues } from './hooks/useCommandIssues';
import { useSafetyLimitsSync } from './hooks/useSafetyLimitsSync';
import { useSceneFiles } from './hooks/useSceneFiles';
import { useLiveStatus } from './hooks/useLiveStatus';
import { useSettingsPreferences } from './hooks/useSettingsPreferences';
import { useSettingsSocket } from './hooks/useSettingsSocket';
import { useDeferredSettingsSave } from './hooks/useDeferredSettingsSave';
import { useSharedConfig } from './hooks/useSharedConfig';
import { useRobotCommandSender } from './hooks/useRobotCommandSender';
import { useEmergencyStop } from './hooks/useEmergencyStop';
import { type CameraState, type HydraController, type RobotState, defaultControllers } from './store';

/**
 * Renders the  hydra provider component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const HydraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The live status of the link with the server (reachable, last save, first read refused, CAN flash progress, log clear mark)
  // lives in hooks/useLiveStatus.ts.
  const {
    serverReachable, setServerReachable, settingsSaveError, setSettingsSaveError, operatorEdited, setOperatorEdited,
    settingsLoadError, setSettingsLoadError, canotaProgress, setCanotaProgress, logsClearedAt, setLogsClearedAt,
  } = useLiveStatus();

  // The problem of the last command and the answer of the global STOP live in hooks/useCommandIssues.ts.
  const {
    commandIssue, setCommandIssue, reportCommandIssue, dismissCommandIssue,
    stopAllReport, setStopAllReport, stopAllInFlight, setStopAllInFlight, dismissStopAllReport,
  } = useCommandIssues();

  // The session (token, sign-in, silent renewal, sign-out) lives in hooks/useAuthSession.ts.
  const { authToken, setAuthToken, loginError, loginNeedsCode, accountRef, role, login, attemptTokenRefresh, logout } = useAuthSession();
  const isAdmin = role === 'admin';
  const localOnly = settingsLocalOnly(role, operatorEdited);


  // The shared configuration (settings tree, controllers, active controller; the first read, the live messages and the save of the whole
  // tree with its ETag) lives in hooks/useSharedConfig.ts.
  const {
    controllers, setControllers, activeControllerId, setActiveControllerId, settings, setSettings, isLoaded,
    lastPayloadJsonRef, settingsEtagRef, skipNextSaveRef, controllersRef, activeControllerIdRef, settingsRef,
    applyServerData, persistTree, applyRobotDelta,
  } = useSharedConfig({ authToken, accountRef, setServerReachable, setSettingsLoadError, setSettingsSaveError, attemptTokenRefresh, logout });

  // The safety limits come from the server: hooks/useSafetyLimitsSync.ts.
  useSafetyLimitsSync(authToken);

  // Live sync: any client that writes the settings or a robot is broadcast back to every connected client
  // (hooks/useSettingsSocket.ts). Without a token the socket is not opened at all.
  useSettingsSocket({
    authToken, applyRobotDelta, applyServerData, publishClaims: publishClaimsEvent, setCanotaProgress, setServerReachable,
    attemptTokenRefresh, logout,
  });

  // The deferred save of the tree (500 ms after a local edit): hooks/useDeferredSettingsSave.ts.
  useDeferredSettingsSave({
    isLoaded, watch: [settings, controllers, activeControllerId], role, skipNextSaveRef, lastPayloadJsonRef,
    buildPayloadJson: () => JSON.stringify({
      settings: settingsRef.current,
      controllers: controllersRef.current,
      activeControllerId: activeControllerIdRef.current,
    }),
    persistTree, setOperatorEdited, setSettingsSaveError, reportCommandIssue,
  });

  const activeController = useMemo(() => controllers.find(c => c.id === activeControllerId) || controllers[0] || defaultControllers[0], [controllers, activeControllerId]);
  const robots = activeController?.robots || [];
  const cameras = activeController?.cameras || [];

  const updateController = (id: string, updates: Partial<HydraController>) => {
    setControllers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const updateRobot = (id: number, updates: Partial<RobotState>) => {
    const before = controllersRef.current.find((c) => c.id === activeControllerIdRef.current)?.robots.find((r) => r.id === id);
    setControllers((prev) => prev.map((c) => {
      if (c.id !== activeControllerId) return c;
      return { ...c, robots: c.robots.map(r => (r.id === id ? { ...r, ...updates } : r)) };
    }));
    sendRobotEdits(id, before, updates, false);
  };

  // The edits an operator makes on one robot (points, repeat, model, role, combination, XY table layout, joints of the
  // sliders) go to the server as commands (src/lib/robotEdits.ts): they are not lost for an account that may not save the
  // settings tree, and two windows no longer overwrite each other's edit. What no command covers still travels in the
  // tree, as before. A robot in Sim keeps the edits that would move it in this window, and a server that does not know the
  // commands gets the tree again.
  const editQueue = useRef(createEditQueue<CommandResult>(async (robotId, edit) => {
    const result = await sendRobotCommandRef.current!(robotId, edit.command, edit.params);
    if (isUnknownCommand(result)) {
      markEditCommands(false);
      editFallbackRef.current();
    } else if (!result.ok) {
      // What this window shows was changed before the server answered: read the robot again so the screen shows what it is.
      void refreshRobotFromServerRef.current(robotId);
    }
    return result;
  })).current;
  // One counter for this window: the server orders the numbered motion commands (lib/commandSequence.ts).
  const commandSequence = useRef(createCommandSequence()).current;
  const sendRobotCommandRef = useRef<null | ((id: number, command: string, params?: Record<string, unknown>) => Promise<CommandResult>)>(null);
  const refreshRobotFromServerRef = useRef<(robotId: number) => Promise<boolean>>(async () => false);
  const editFallbackRef = useRef<() => void>(() => undefined);

  const sendRobotEdits = (id: number, before: RobotState | undefined, updates: Partial<RobotState>, withJoints: boolean) => {
    if (!serverHasEditCommands() || (role !== null && role === 'viewer')) return;
    const plan = planRobotEdits(before, updates, { joints: withJoints });
    if (plan.commands.length === 0) return;
    const sent: RobotEditCommand[] = [];
    const heldBack: string[] = [];
    for (const edit of plan.commands) {
      if (!guardCommand({ command: edit.command, robotIds: [id], limits: getSafetyState().limits, modes: getModeState() }).ok) heldBack.push(edit.command);
      else sent.push(edit);
    }
    // Nothing is left for the tree when every changed field went out as a command.
    if (plan.rest.length === 0 && heldBack.length === 0) skipNextSaveRef.current = true;
    for (const edit of sent) void editQueue.enqueue(id, edit);
  };

  // The POST of a robot command, the command with its optimistic change and rollback, and the reading of one robot again live in
  // hooks/useRobotCommandSender.ts; the global STOP in hooks/useEmergencyStop.ts.
  const { postRobotCommand, sendRobotCommand, refreshRobotFromServer } = useRobotCommandSender({
    attemptTokenRefresh, commandSequence, controllersRef, activeControllerIdRef, setControllers, skipNextSaveRef, applyRobotDelta, reportCommandIssue,
  });
  const { emergencyStop } = useEmergencyStop({
    controllersRef, settingsEtagRef, postRobotCommand, attemptTokenRefresh, applyServerData, reportCommandIssue, setCommandIssue,
    setStopAllReport, setStopAllInFlight,
  });

  // The joint values of a slider: shown at once and sent as a command (the newest of the ones sent while an earlier is on its way).
  const setRobotJoints = (id: number, joints: RobotState['joints']) => {
    const before = controllersRef.current.find((c) => c.id === activeControllerIdRef.current)?.robots.find((r) => r.id === id);
    setControllers((prev) => prev.map((c) => {
      if (c.id !== activeControllerId) return c;
      return { ...c, robots: c.robots.map((r) => (r.id === id ? { ...r, joints } : r)) };
    }));
    sendRobotEdits(id, before, { joints }, true);
  };

  const updateCamera = (id: number, updates: Partial<CameraState>) => {
    setControllers((prev) => prev.map((c) => {
      if (c.id !== activeControllerId) return c;
      return { ...c, cameras: c.cameras.map(cam => (cam.id === id ? { ...cam, ...updates } : cam)) };
    }));
  };

  // Real, immediate POST /api/settings - same exact payload shape and
  // same lastPayloadJsonRef dedup the ordinary 500ms debounced save
  // effect above uses (so this doesn't cause a redundant second POST
  // once that timer's own tick runs a moment later and finds nothing
  // changed since). Kept as a real function (not just "wait less") so
  // an "Apply Now" button gets a real, awaitable completion rather than
  // firing a request into the void.
  const flushSettingsSave = async () => {
    const payload = { settings, controllers, activeControllerId };
    const payloadJson = JSON.stringify(payload);
    if (payloadJson === lastPayloadJsonRef.current) return; // already in sync, nothing to send
    if (!settingsSaveAllowed(role)) {
      setOperatorEdited(true);
      return;
    }
    const outcome = await persistTree(payloadJson, false);
    if (outcome.kind === 'failed') {
      // Real failure - see the debounced save effect's own comment for
      // why lastPayloadJsonRef is deliberately NOT updated here either.
      setSettingsSaveError(saveFailureText('save', outcome.status));
      return;
    }
    if (outcome.kind === 'conflict') return;
    lastPayloadJsonRef.current = payloadJson;
    setSettingsSaveError(null);
  };

  // The change of a setting by the person (shared for an administrator, local for any other account): hooks/useSettingsPreferences.ts.
  const { updateSettings } = useSettingsPreferences({ role, authToken, settingsRef, setSettings, skipNextSaveRef, reportCommandIssue });

  const addController = (controller: HydraController) => {
    setControllers(prev => [...prev, controller]);
  };

  const removeController = (id: string) => {
    if (controllers.length <= 1) return;
    const newControllers = controllers.filter(c => c.id !== id);
    setControllers(newControllers);
    if (activeControllerId === id) {
      setActiveControllerId(newControllers[0].id);
    }
  };

  // Save and load of the trajectory and the scene: hooks/useSceneFiles.ts.
  const { saveKinematics, loadKinematics, exportScene, importScene } = useSceneFiles({
    robots, worksPaths: settings.worksPaths, activeControllerId, sendRobotCommand, updateRobot, updateController, reportCommandIssue,
  });

  const factoryReset = async () => {
    // POST /api/settings requires auth like every other write, so the answer is checked: reloading unconditionally
    // afterward would present the UNCHANGED settings as if the reset had actually happened.
    // A deliberate replacement: a stale revision is refreshed and the reset sent again whatever the server holds.
    const outcome = await persistTree('{}', true);
    if (outcome.kind !== 'saved') {
      setSettingsSaveError(saveFailureText('reset', outcome.kind === 'failed' ? outcome.status : null));
      return;
    }
    window.location.reload();
  };

  // The edit queue reaches these through refs: it is created before they are defined.
  sendRobotCommandRef.current = sendRobotCommand;
  refreshRobotFromServerRef.current = refreshRobotFromServer;
  editFallbackRef.current = () => {
    if (!settingsSaveAllowed(role)) setOperatorEdited(true);
    else void flushSettingsSave();
  };

  return (
    <HydraStoreProviders value={{
      controllers, activeControllerId, activeController, setActiveControllerId,
      robots, cameras, settings,
      updateController, updateRobot, setRobotJoints, sendRobotCommand, refreshRobotFromServer, emergencyStop, stopAllReport, dismissStopAllReport, stopAllPending: stopAllInFlight > 0, updateCamera, flushSettingsSave, updateSettings,
      commandIssue, dismissCommandIssue, reportCommandIssue,
      saveKinematics, loadKinematics, addController, removeController,
      exportScene, importScene, factoryReset,
      authToken, role, isAdmin, login, logout, loginError, loginNeedsCode,
      canotaProgress,
      logsClearedAt, setLogsClearedAt,
      serverReachable, settingsSaveError, settingsLocalOnly: localOnly, settingsLoadError
    }}>
      {children}
    </HydraStoreProviders>
  );
};
