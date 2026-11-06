// =============================================================================
// HYDRA-UMC STUDIO - Global state provider: HydraProvider.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { publishClaimsEvent } from './lib/claimsFeed';
import React, { useMemo, useRef, useCallback } from 'react';
import { apiUrl } from './lib/apiBase';
import { saveFailureText } from './lib/serverErrors';
import { applyRobotCommandMutation, rollbackRobotCommand } from './robotCommandTransition';
import { type CommandResult } from './lib/commandResult';
import { createCommandSequence } from './lib/commandSequence';
import { authHeaders } from './lib/session';
import { guardCommand } from './lib/motionGuard';
import { settingsLocalOnly, settingsSaveAllowed } from './lib/settingsSave';
import { getModeState, getSafetyState } from './lib/accessStore';
import { fetchRobot } from './lib/accessApi';
import { isUnknownCommand, markTableCommand, serverHasTableCommand } from './lib/tableMove';
import { createEditQueue, markEditCommands, planRobotEdits, serverHasEditCommands, type RobotEditCommand } from './lib/robotEdits';
import { type StopAllReport, requestStopAllWithRetry, stopRobotByRobot } from './lib/stopAll';
import { HydraStoreProviders } from './storeContexts';
import { useAuthSession } from './hooks/useAuthSession';
import { useCommandIssues } from './hooks/useCommandIssues';
import { useSafetyLimitsSync } from './hooks/useSafetyLimitsSync';
import { useSceneFiles } from './hooks/useSceneFiles';
import { useLiveStatus } from './hooks/useLiveStatus';
import { useSettingsPreferences } from './hooks/useSettingsPreferences';
import { useSettingsSocket } from './hooks/useSettingsSocket';
import { useDeferredSettingsSave } from './hooks/useDeferredSettingsSave';
import { rememberSettingsEtag, useSharedConfig } from './hooks/useSharedConfig';
import { postRobotCommand as postRobotCommandRequest, tableThroughJogs as tableThroughJogsRequest, type PostRobotCommand } from './lib/robotCommandPost';
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

  // Per-robot generation counter guarding sendRobotCommand()'s own
  // rollback-on-failure - see that function's own comment and its
  // HYDRA-UMC-IOS-CONTROL/ANDROID-CONTROL/DSI equivalents for the full
  // reasoning (a held jog button/rapid clicks can have several commands
  // for the same robot in flight at once; an early one failing after a
  // later one already applied must not roll back over that newer state).
  const commandGenerationRef = useRef<Record<number, number>>({});

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

  // One POST of a robot command, answered as a typed result (lib/robotCommandPost.ts).
  const postRobotCommand: PostRobotCommand = (id, command, params) => postRobotCommandRequest({ attemptTokenRefresh, commandSequence }, id, command, params);
  const tableThroughJogs = (id: number, params: Record<string, unknown>) => tableThroughJogsRequest(postRobotCommand, id, params);

  // Reads one robot again (GET /api/robot/:id, which also gives the revision to use next) and puts it on screen.
  // Called after a 412: the robot changed under this window, and what is shown may be behind.
  const refreshRobotFromServer = useCallback(async (robotId: number): Promise<boolean> => {
    const read = await fetchRobot(robotId);
    if (!read) return false;
    const owner = controllersRef.current.find((c) => c.robots.some((r) => r.id === robotId));
    if (!owner) return false;
    applyRobotDelta({ controllerId: owner.id, robotId, patch: read.robot });
    return true;
  }, [applyRobotDelta]);

  const sendRobotCommand = async (
    id: number,
    command: string,
    params?: Record<string, unknown>,
    localMutate?: (robot: RobotState) => Partial<RobotState>,
    affectedIds?: number[]
  ): Promise<CommandResult> => {
    const ids = affectedIds && affectedIds.length > 0 ? affectedIds : [id];
    // The guard of every motion command (lib/motionGuard.ts): Sim mode, the size of a jog and of a table move. A STOP is
    // never refused. A refused command is not sent and the interface says which rule stopped it.
    const target = command === 'jog' || command === 'table' ? controllersRef.current.flatMap((c) => c.robots).find((r) => r.id === id) : undefined;
    const verdict = guardCommand({
      command, params, robotIds: ids, model: target?.model, limits: getSafetyState().limits, modes: getModeState(),
      tablePosition: { x: target?.xyTable?.pos?.x, y: target?.xyTable?.pos?.y, rz: target?.pos?.trz },
    });
    if (!verdict.ok) {
      reportCommandIssue(verdict.issue);
      return { ok: false, status: 0, code: 'rejected', detail: null, serverCode: verdict.serverCode, warnings: [] };
    }
    // Snapshot (for rollback) and this call's own generation number for
    // every affected robot - captured BEFORE the optimistic mutation
    // below, so a failed send can restore exactly what was there. See this
    // function's own interface-level comment for the full reasoning.
    let snapshots: Record<number, RobotState> = {};
    let myGeneration: Record<number, number> = {};

    if (localMutate) {
      setControllers(prev => {
        const next = prev.map((c) => {
          if (c.id !== activeControllerIdRef.current) return c;
          const result = applyRobotCommandMutation(c.robots, ids, localMutate, commandGenerationRef.current);
          snapshots = { ...snapshots, ...result.snapshots };
          myGeneration = { ...myGeneration, ...result.myGeneration };
          return { ...c, robots: result.robots };
        });
        // Same echo-guard flag as applyRobotDelta() above - an optimistic
        // local mutation changes `controllers` just as much as an applied
        // delta does, and would trigger the exact same needless full-tree
        // POST (and its full-tree JSON.stringify) 500ms later without this.
        skipNextSaveRef.current = true;
        return next;
      });
    }

    let result: CommandResult;
    if (command === 'table' && !serverHasTableCommand()) {
      result = await tableThroughJogs(id, params ?? {});
    } else {
      result = await postRobotCommand(id, command, params);
      // A server that predates the table command: remember it and do the same with the jogs it understands.
      if (command === 'table' && isUnknownCommand(result)) {
        markTableCommand(false);
        result = await tableThroughJogs(id, params ?? {});
      }
    }
    if (!result.ok) {
      // Roll back the optimistic mutation - but only for a robot whose
      // generation counter still matches what THIS call incremented it to;
      // a mismatch means a newer command for that same robot already
      // started (and possibly already succeeded) since this one's
      // snapshot was taken, and restoring this stale snapshot now would
      // erase that newer state instead of this failed one's own.
      if (localMutate) {
        setControllers(prev => {
          const next = prev.map((c) => {
            if (c.id !== activeControllerIdRef.current) return c;
            const robots = rollbackRobotCommand(c.robots, snapshots, myGeneration, commandGenerationRef.current);
            return { ...c, robots };
          });
          // Same echo-guard flag as the optimistic mutate above - the
          // rollback itself is just another `controllers` change that the
          // save-effect shouldn't re-POST full-tree.
          skipNextSaveRef.current = true;
          return next;
        });
      }
      // The robot changed since this window read it (412): read it again so the screen shows what it is now, then say so.
      if (result.code === 'revision_changed') void refreshRobotFromServer(id);
      // And say it: a command that did not reach the robot is never silent (a STOP above all).
      reportCommandIssue({ code: result.code ?? 'rejected', command, robotIds: ids, detail: result.detail });
    } else if (result.warnings.length > 0) {
      // A jog the server did not apply (beyond the limit of the model, or without a valid axis) has its own sentence.
      reportCommandIssue({ code: result.warningFields?.includes('jog') ? 'jog_server_limit' : 'warnings', command, robotIds: ids, detail: result.warnings.join('; ') });
    }
    return result;
  };

  // The per-robot stop of every robot (and its valves and pumps off), used only when the global route is rate
  // limited (429) or missing (404, an older server). Same report shape as the global answer.
  const stopEachRobot = (): Promise<StopAllReport> => stopRobotByRobot(
    controllersRef.current.flatMap((c) => c.robots.map((robot) => ({ controllerId: c.id, robot }))),
    postRobotCommand,
  );

  // The emergency stop is GLOBAL: one call stops every robot of every controller, whichever one is selected, with
  // no confirmation (POST /api/stop-all; lib/stopAll.ts). It does not wait for any refresh. A network failure is
  // retried once; an expired session is renewed once; a 429 or a 404 falls back to the per-robot stop; and when
  // nothing answers the "stop not confirmed" issue stays on screen until a later stop gets an answer.
  const emergencyStop = async (): Promise<void> => {
    setStopAllInFlight((n) => n + 1);
    try {
      let attempt = await requestStopAllWithRetry();
      if (attempt.kind === 'failed' && attempt.sessionExpired && (await attemptTokenRefresh())) {
        attempt = await requestStopAllWithRetry();
      }
      const report = attempt.kind === 'report'
        ? attempt.report
        : attempt.kind === 'fallback'
          ? await stopEachRobot()
          : null;
      if (!report) {
        const everyId = [...new Set(controllersRef.current.flatMap((c) => c.robots.map((r) => r.id)))];
        reportCommandIssue({
          code: 'estop_failed',
          command: 'stop',
          robotIds: everyId,
          detail: attempt.kind === 'failed' ? [attempt.code, attempt.detail].filter(Boolean).join(': ') || null : null,
        });
        return;
      }
      setCommandIssue((current) => (current?.code === 'estop_failed' ? null : current));
      setStopAllReport(report);
      // The socket's per-robot deltas usually arrive first; the settings are read again to be sure.
      const refreshHeaders = authHeaders();
      fetch(apiUrl('/api/settings'), { headers: refreshHeaders })
        .then((r) => { rememberSettingsEtag(settingsEtagRef, r); return r.ok ? r.json() : null; })
        .then((data) => { if (data) applyServerData(data); })
        .catch(() => {});
    } finally {
      setStopAllInFlight((n) => n - 1);
    }
  };

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
    // POST /api/settings requires auth like every other write - without this
    // header it would 401/no-op silently since the response used to never
    // be checked (same root cause described in authToken's own comment
    // above for why the login screen exists) - reloading unconditionally
    // afterward would then present the UNCHANGED settings as if the reset
    // had actually happened. Checked now, same as every other save path.
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
