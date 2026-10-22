// =============================================================================
// HYDRA-UMC STUDIO - Global state provider: HydraProvider.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { apiUrl, wsUrl } from './lib/apiBase';
import { applyRobotCommandMutation, rollbackRobotCommand } from './robotCommandTransition';
import {
  type CommandIssue,
  type CommandResult,
  interpretCommandResponse,
  networkFailure,
} from './lib/commandResult';
import {
  authHeaders,
  clearTokens,
  readRefreshToken,
  readToken,
  replaceToken,
  saveLaunchToken,
  extractLaunchToken,
  saveLoginTokens,
} from './lib/session';
import { type StopAllReport, type StopAllRobot, requestStopAllWithRetry } from './lib/stopAll';
import { validateSceneRobots, validateTrajectoryPoints } from './lib/importValidation';
import { type CameraState, HydraContext, type HydraController, type RobotState, type SystemSettings, decodeJwtRole, defaultControllers } from './store';

/**
 * Renders the  hydra provider component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const HydraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [controllers, setControllers] = useState<HydraController[]>(defaultControllers);
  const [activeControllerId, setActiveControllerId] = useState<string>('192.168.1.100');
  const [settings, setSettings] = useState<SystemSettings>({
    visibleModules: ['Vision/Cameras', 'Robots', 'Macros/Tasks', 'Node Network', 'Settings'],
    integrations: {
      openPnP: { enabled: false, ip: '192.168.1.100', port: 8080 },
      slic3r: { enabled: false, ip: '192.168.1.100', port: 8080 },
      prusaSlicer: { enabled: false, ip: '192.168.1.100', port: 8080 },
      cnc: { software: 'LinuxCNC', enabled: false, ip: '192.168.1.100', port: 8080 },
      laser: { software: 'LightBurn', enabled: false, ip: '192.168.1.100', port: 8080 },
      ros2: { enabled: false, ip: '192.168.1.100', port: 8000 },
      printer3d: { enabled: false, software: 'OrcaSlicer', ip: '192.168.1.100', port: 8080 },
    },
    customModels: [],
    modelSubmissions: {
      enabled: false,
      destinationFolder: 'models/submitted',
    },
    autoConnectRobots: false,
    theme: "HYDRA-UMC Studio Fasion",
    language: "en",
    worksPaths: {},
    canOta: {
      transport: 'mock',
      robotControllerBoardMcu: 'STM32G474RET6',
      firmwarePaths: {},
    },
    aiHailo: {
      visionDevice: 'hailo8',
      cognitiveDevice: 'none',
      modelRegistryPath: 'models/hailo',
    },
    uiLayout: {
      rightPanelWidth: 320,
      pointsTableHeight: 300,
    },
    remoteAccess: {
      enabled: true,
      suite: true,
      android: true,
      ios: true,
      watch: true,
      dsi: true,
    },
    serverName: "HYDRA-UMC TEST",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  // the real, live "have we actually heard from a real Server"
  // signal - starts false (honest: nothing confirmed yet) and is set from
  // the actual fetch/WebSocket lifecycle below, never from a fixture
  // default and never written into `settings`/`controllers` (so it can
  // never persist into settings.json the way controllers[].status used
  // to). Dashboard.tsx's "System Online/Offline" badge reads this, not
  // activeController.status.
  const [serverReachable, setServerReachable] = useState(false);

  // Real, live "did the last POST /api/settings actually persist" signal -
  // caught live in production (STUDIO/SUITE/SERVER, camera streams left
  // running after Vision Center's own stop button): fetch() only rejects
  // on a real network failure, never on a non-2xx response, so a 401
  // (expired session token) or 403 (POST /api/settings requires an admin
  // role - a non-admin session's every save silently 401/403s forever)
  // used to leave the local UI showing the new value while the server -
  // and therefore anything server.ts derives from it, like which camera
  // stream processes should be running - never heard about it at all, with
  // zero feedback anywhere. Null once the most recent save actually
  // succeeded (or none has been attempted yet); a real, human-readable
  // message otherwise. See the debounced save effect, flushSettingsSave()
  // and factoryReset() below - all three share this one signal.
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);

  // Set when the server answered the first read of the settings with a refusal (no session): what is on screen
  // is then the built-in sample, not the system, and the interface says so.
  const [settingsLoadError, setSettingsLoadError] = useState<'login_required' | 'server' | null>(null);

  // The problem the last command ran into, kept on screen until it is dismissed (see lib/commandResult.ts).
  const [commandIssue, setCommandIssue] = useState<CommandIssue | null>(null);
  const issueSequenceRef = useRef(0);
  const reportCommandIssue = useCallback((issue: Omit<CommandIssue, 'id'>) => {
    issueSequenceRef.current += 1;
    setCommandIssue({ ...issue, id: issueSequenceRef.current });
  }, []);
  const dismissCommandIssue = useCallback(() => setCommandIssue(null), []);

  // The newest answer of the global STOP, robot by robot (see lib/stopAll.ts), until it is dismissed; and how many
  // global STOPs are on the wire right now.
  const [stopAllReport, setStopAllReport] = useState<StopAllReport | null>(null);
  const [stopAllInFlight, setStopAllInFlight] = useState(0);
  const dismissStopAllReport = useCallback(() => setStopAllReport(null), []);

  // Session token - lazy-initialized synchronously (not in a useEffect) so the
  // very first render already knows whether we're authenticated, avoiding a
  // flash of a login screen for a WebView launched with a real ?token= (the
  // Android app's embedded 3D view, ThreeDScreen.kt) or a browser tab that
  // already has one saved from a previous login. The login screen
  // (AuthGate.tsx) calls POST /api/login and keeps the session in sessionStorage; the server requires a bearer
  // token on GET/POST /api/settings, POST /api/robot/:id/command and the /ws upgrade, so a tab without a session
  // shows the login screen (or the read-only notice) instead of silently failing.
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const launch = extractLaunchToken(window.location.href);
    if (launch) {
      // A token that came in the address belongs to this view only: it goes to sessionStorage (gone with the
      // view, not shared with other tabs), never to the storage that outlives it - see lib/session.ts.
      saveLaunchToken(launch.token);
      // And it must not stay in the address bar (history, screenshots, a copied link, a proxy log).
      try {
        window.history.replaceState(null, '', launch.cleanedUrl);
      } catch { /* a WebView without the History API keeps the address as it is */ }
      return launch.token;
    }
    return readToken();
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const role = useMemo(() => decodeJwtRole(authToken), [authToken]);
  const isAdmin = role === 'admin';

  // Real, live per-page flash progress from a real POST /api/hardware/
  // canota/flash cycle (server.ts's own comment on its `canota_progress`
  // WS broadcast) - the HTTP response for that request only reports the
  // final outcome, so Flasher.tsx watches this instead of the fetch's own
  // response for live percent/phase. Cleared back to null whenever a
  // `phase: 'done'`/`'error'` message arrives isn't done here - Flasher.tsx
  // owns when to stop showing it, same as it already owns `phase`/`percent`
  // state for the mock transport.
  const [canotaProgress, setCanotaProgress] = useState<Record<string, unknown> | null>(null);
  // See logsClearedAt's own doc comment on the context type above for why
  // this lives here rather than as AdminLogs.tsx's own local state.
  const [logsClearedAt, setLogsClearedAt] = useState<{ anchor: string | null } | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoginError(null);
    try {
      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setLoginError(data.error || 'Login failed');
        return false;
      }
      // The refresh token returned beside the access token lets a later WS 1008 close (or a 401 on a command)
      // recover a fresh access token silently; a server that sends none degrades to a forced re-login.
      saveLoginTokens(data.token, typeof data.refreshToken === 'string' ? data.refreshToken : undefined);
      setAuthToken(data.token);
      return true;
    } catch {
      setLoginError('Cannot reach server');
      return false;
    }
  }, []);

  // called only when the WS reconnect effect below sees a real 1008
  // close - tries to recover silently (no visible interruption, no lost
  // view/robot selection) before falling back to logout()'s own full
  // reload. Deliberately NOT attempted for "no token"/never-logged-in
  // (nothing to refresh) - only when a refresh token is actually on file.
  // Mirrors server.ts's own /api/refresh contract exactly: success
  // rotates both tokens, failure (revoked account, expired refresh token,
  // or the server simply predating this feature) means a real re-login is
  // the only correct next step, same as before this fix existed.
  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(apiUrl('/api/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) return false;
      replaceToken(data.token, typeof data.refreshToken === 'string' ? data.refreshToken : undefined);
      // Updating authToken re-runs the WS-reconnect effect below (it's in
      // that effect's own dependency array) with the fresh token - no
      // separate reconnect call needed here.
      setAuthToken(data.token);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Real bug reported live from the footer's own new Sign Out button
  // (Dashboard.tsx): clearing just authToken did nothing VISIBLE when the
  // session had actually gone through AuthGate's "Continue read-only"
  // path - that flag is separate local state inside AuthGate.tsx, which
  // this function has no reference to and can't reset directly, and
  // AuthGate's own gate is `if (authToken || readOnly)`, so readOnly
  // alone kept the app open regardless of authToken clearing. A full
  // reload resets every component's local state unconditionally (this
  // one included, and any other one on the same class of bug this or a
  // future screen might introduce) rather than trying to track down and
  // individually clear every local flag anything could ever gate on.
  const logout = useCallback(() => {
    // revoke the refresh token server-side too (best-effort - a
    // failed/slow request here must never block or delay the reload below,
    // this tab is logging out either way), not just discard it client-side,
    // which would otherwise leave it silently valid for the rest of its
    // real TTL on server.ts. See refresh_tokens.ts's own revokeRefreshToken().
    const refreshToken = readRefreshToken();
    if (refreshToken) {
      fetch(apiUrl('/api/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearTokens();
    setAuthToken(null);
    window.location.reload();
  }, []);

  // Guards against a feedback loop: the server broadcasts every write to
  // every connected client, sender included (simpler than tracking "who
  // sent this", and harmless for any OTHER client) - but without this
  // guard, THIS tab would treat its own echoed-back write as a fresh
  // external change, call setSettings/setControllers with a fresh object
  // reference even though the content is identical, which re-triggers the
  // save-effect below, POSTs again, gets broadcast again, forever. Storing
  // the last applied/sent payload's own JSON and skipping when the
  // incoming (or outgoing) payload matches it exactly breaks the loop at
  // the source - no state update means no re-render means no re-save.
  const lastPayloadJsonRef = useRef<string | null>(null);

  // Cheaper sibling of lastPayloadJsonRef for the 3 hot paths that fire far
  // more often than a full-tree message ever did: applyRobotDelta() (every
  // incoming server delta) and sendRobotCommand()'s own optimistic mutate +
  // failure rollback (every jog/valve/pump/speed/play/pause/stop click, up
  // to 3x per single jog tick - see RobotDetail.tsx's own handleXYZJog).
  // Those 3 call sites used to each JSON.stringify the ENTIRE
  // {settings, controllers, ...} tree (recordedPoints included - multiple
  // MB, see the delta-sync design) just to pre-fill
  // lastPayloadJsonRef so the save-effect below wouldn't re-POST their own
  // change right back - i.e. every single delta/command was paying the
  // exact full-tree serialization cost Fase 0/3 existed to eliminate,
  // synchronously on the main thread, which is what actually produced the
  // "3D view at turtle speed" symptom (a multi-MB JSON.stringify blocking
  // the render/animation frame on every jog step or every incoming delta -
  // confirmed by direct read of this file, not a guess). A boolean the
  // save-effect below consumes on its very next run does the same job -
  // "this specific state change already came from a delta/command, no need
  // to persist it again" - without ever touching the multi-MB tree. The
  // content-based lastPayloadJsonRef above is untouched and still used
  // exactly as before for actual full-tree messages (applyServerData,
  // the save-effect's own POST) - those are inherently rare (once per real
  // external change or once per debounce window), so their cost was never
  // the problem.
  const skipNextSaveRef = useRef(false);

  // Mirrors of controllers/activeControllerId, kept in sync via the 2
  // useEffects below - read by applyRobotDelta() (does this delta's robot
  // exist locally?) and by sendRobotCommand()'s own optimistic
  // mutate/rollback (which controller is active?), WITHOUT waiting on a
  // setState callback's own timing (a functional setState updater doesn't
  // run synchronously with the call that scheduled it, so checking "did
  // this delta's robot exist" only makes sense against a ref that's
  // already current, not against React state or a value captured inside
  // the updater after the fact). No settingsRef counterpart any more -
  // its only reader used to be the 3 full-tree JSON.stringify calls
  // skipNextSaveRef replaced (see that ref's own header comment).
  const controllersRef = useRef(controllers);
  useEffect(() => { controllersRef.current = controllers; }, [controllers]);
  const activeControllerIdRef = useRef(activeControllerId);
  useEffect(() => { activeControllerIdRef.current = activeControllerId; }, [activeControllerId]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Per-robot generation counter guarding sendRobotCommand()'s own
  // rollback-on-failure - see that function's own comment and its
  // HYDRA-UMC-IOS-CONTROL/ANDROID-CONTROL/DSI equivalents for the full
  // reasoning (a held jog button/rapid clicks can have several commands
  // for the same robot in flight at once; an early one failing after a
  // later one already applied must not roll back over that newer state).
  const commandGenerationRef = useRef<Record<number, number>>({});

  const applyServerData = useCallback((data: any) => {
      if (data && Object.keys(data).length > 0) {
        const dataJson = JSON.stringify(data);
        if (dataJson === lastPayloadJsonRef.current) return;
        lastPayloadJsonRef.current = dataJson;
      }
      let host = '192.168.1.100';
      if (typeof window !== 'undefined' && window.location.hostname) {
        host = window.location.hostname;
      }
      
      if (data && Object.keys(data).length > 0) {
        // Assign data.settings directly rather than merging it onto prev
        // (`{...prev, ...data.settings}`) - the server always sends the
        // FULL settings tree (REMOTE_API.md section 2, never a partial
        // diff), and every field this app reads from settings already
        // falls back gracefully via ?./?? when absent (see e.g.
        // remoteAccess/modelSubmissions above), so there's nothing a
        // merge with the previous value protects against. A merge DOES
        // actively break the echo guard above: `{...prev, ...x}`
        // preserves PREV's own key insertion order, which can differ
        // from data.settings's own order (built server-side, potentially
        // with fields added to the schema at different points) - so
        // JSON.stringify()-ing the merged result never exactly equals
        // the dataJson the guard just recorded, and the debounced save
        // effect below (which serializes settings/controllers again to
        // compare against that same recorded string) sees a false
        // mismatch, POSTs a no-op "change" back, which the server
        // broadcasts again, which lands right back here - a full
        // multi-hundred-KB settings.json bouncing over the WebSocket in
        // a tight loop every time ANYONE's edit (e.g. every single jog
        // tick, since that's what drives this branch continuously)
        // comes back around. Assigning data.settings directly keeps the
        // client's own object graph byte-for-byte identical to what the
        // guard already fingerprinted, so the round-trip actually
        // terminates in one hop like the guard's own comment above
        // assumes it does.
        if (data.settings) setSettings(data.settings);
        else setSettings(prev => ({ ...prev, ...data })); // fallback for a pre-nested-envelope settings.json - genuinely incomplete on its own, so a merge onto known-good defaults is correct here, not the bug described above
        let finalControllers: any[] = [];
        if (data.controllers && data.controllers.length > 0) {
          const parsed = data.controllers;
          parsed.forEach((c: any) => {
            // If the saved controller is from the cloud environment, auto-correct it to the current local host
            if (typeof c.id === 'string' && c.id.includes('.run.app')) {
              c.id = host;
              c.ip = host;
              c.name = `HYDRA-UMC (${host})`;
            }
            c.robots?.forEach((r: any) => {
            if (!r.playbackState) r.playbackState = { isPlaying: false, activeStep: 0, speed: 100 };
            });
          });
          setControllers(parsed);
          finalControllers = parsed;
        } else {
          // Only defaultControllers[0] ("HYDRA-UMC Master") is meant as a
          // real seed here, rewritten below to this actual host - and
          // ONLY that one. defaultControllers[1] ("HYDRA-UMC Node 2",
          // hardcoded at the fixed demo IP 192.168.1.101, never rewritten)
          // used to come along for the ride via JSON.stringify(defaultControllers)
          // wholesale, so a factory reset (which POSTs {} to /api/settings,
          // landing right back in this empty-controllers branch on reload)
          // resurrected that second, fictitious controller every time -
          // exactly the "phantom server entry" a real deployment (which
          // only ever has the one real controller this app is talking to)
          // has no business showing. Slicing to just the one real seed
          // before rewriting fixes that without touching defaultControllers
          // itself (still used elsewhere as a plain not-undefined fallback).
          const def = [JSON.parse(JSON.stringify(defaultControllers[0]))];
          def[0].ip = host;
          def[0].id = host;
          setControllers(def);
          finalControllers = def;
        }
        let actId = data.activeControllerId || host;
        if (!finalControllers.some(c => c.id === actId)) actId = finalControllers[0]?.id || host;
        setActiveControllerId(actId);
      } else {
        setSettings(prev => ({
           ...prev,
           integrations: {
             openPnP: { enabled: false, ip: host, port: 8080 },
             slic3r: { enabled: false, ip: host, port: 8080 },
             prusaSlicer: { enabled: false, ip: host, port: 8080 },
             cnc: { software: 'LinuxCNC', enabled: false, ip: host, port: 8080 },
             laser: { software: 'LightBurn', enabled: false, ip: host, port: 8080 },
             ros2: { enabled: false, ip: host, port: 8000 },
             printer3d: { enabled: false, software: 'OrcaSlicer', ip: host, port: 8080 },
           }
        }));
        // Same fix, same reason as the empty-data.controllers branch above:
        // only the one real seed controller, not the whole defaultControllers
        // demo array (which includes a second, fixed-IP phantom entry).
        const def = [JSON.parse(JSON.stringify(defaultControllers[0]))];
        def[0].ip = host;
        def[0].id = host;
        setControllers(def);
        setActiveControllerId(host);
      }
      setIsLoaded(true);
  }, []);

  /**
   * Applies a real targeted delta (server.ts's own broadcastRobotDelta(),
   * `{type:"delta", schema:2, controllerId, robotId, patch, cameraId?,
   * cameraPatch?}`) - the schema-2 counterpart of applyServerData() above,
   * which stays exactly as-is for the full-tree "settings" message and for
   * a schema-1 "delta" from a client the server hasn't heard declare
   * schema 2 (see server.ts's own per-connection `schema` and
   * the delta-sync design).
   *
   * Validates against controllersRef (never React state directly - see
   * that ref's own comment) before touching anything: if the targeted
   * robot doesn't exist locally yet, the delta is discarded and a full
   * GET /api/settings reload is forced instead of ever creating a "ghost"
   * robot from a partial patch (section 5b's mitigation (b), non-optional).
   */
  const applyRobotDelta = useCallback((msg: any) => {
    const { controllerId, robotId, patch, cameraId, cameraPatch } = msg;
    if (typeof controllerId !== 'string' || typeof robotId !== 'number' || !patch || typeof patch !== 'object') return;
    const controller = controllersRef.current.find(c => c.id === controllerId);
    const robotExists = controller?.robots?.some(r => r.id === robotId);
    if (!controller || !robotExists) {
      const headers: Record<string, string> = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      fetch(apiUrl('/api/settings'), { headers }).then(r => r.json()).then(data => applyServerData(data)).catch(() => {});
      return;
    }
    setControllers(prev => {
      const next = prev.map((c) => {
        if (c.id !== controllerId) return c;
        const robots = c.robots.map((r) => (r.id === robotId ? { ...r, ...patch } : r));
        const cameras = (cameraId !== undefined && cameraPatch) ? c.cameras.map((cam) => (cam.id === cameraId ? { ...cam, ...cameraPatch } : cam)) : c.cameras;
        return { ...c, robots, cameras };
      });
      // Marks the save-effect's very next run as "already in sync, skip" -
      // without this, applying a delta (which necessarily changes the
      // `controllers` reference) would look to that effect like a fresh
      // local edit, and it would POST the FULL tree right back 500ms
      // later, exactly the round-trip Fase 0/3 exist to eliminate. See
      // skipNextSaveRef's own header comment for why this is a flag now
      // rather than a full JSON.stringify of `next` the way it used to be.
      skipNextSaveRef.current = true;
      return next;
    });
  }, [authToken, applyServerData]);

  useEffect(() => {
    let cancelled = false;

    // GET /api/settings needs a session like every other route: without a token the server answers 401 and the
    // dashboard shows the login screen (see settingsLoadError below).
    // Explicit Record<string, string> annotation: without it TS infers the
    // ternary's two branches as distinct object shapes ({Authorization:
    // string} vs {}) and the resulting union doesn't structurally satisfy
    // fetch()'s HeadersInit (which needs a plain Record<string, string> on
    // this branch), even though both are actually valid header objects.
    const headers: Record<string, string> = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

    fetch(apiUrl('/api/settings'), { headers }).then(async (r) => {
      // The server answered. If it refused (401: the settings need a session; 403...) its body is an error
      // object, not settings - applying it would mix {error: ...} into the settings and show the sample
      // robots as if they were the system. Say it needs a session instead.
      if (!r.ok) {
        if (!cancelled) {
          setServerReachable(true);
          setSettingsLoadError(r.status === 401 || r.status === 403 ? 'login_required' : 'server');
          setIsLoaded(true);
        }
        return;
      }
      const data = await r.json();
      // this fetch actually succeeding IS the real evidence a
      // live Server answered - set before applyServerData so even the
      // "server answered but has no saved controllers yet" branch (a
      // genuinely fresh install) still shows System Online, honestly.
      if (!cancelled) { setServerReachable(true); setSettingsLoadError(null); applyServerData(data); }
    }).catch(() => {
      if (!cancelled) { setServerReachable(false); setIsLoaded(true); }
    });

    // Live sync: any client (this tab, another tab, HYDRA-UMC SUITE, a
    // mobile control app) that POSTs /api/settings, POSTs the atomic
    // /api/robot/:id/command, or sends a WS "settings" message gets
    // broadcast back to every connected client, this one included - see
    // server.ts's own broadcastSettings(). Without this, two open tabs (or
    // a native remote client and a tab) silently overwrite each other on
    // their own next unrelated save, since neither ever re-fetches after
    // its initial mount-time load. server.ts's /ws upgrade REQUIRES the
    // token (the hydra.bearer subprotocol; it closes with code 1008
    // otherwise, even for this app's own tab) - skip opening it at all without one rather than
    // reconnect-loop against a server that will keep rejecting it.
    let ws: WebSocket | null = null;
    // The token travels as a WebSocket subprotocol (`hydra.bearer`, <token>) so that it stays out of the address that proxies and logs record. The server refuses
    // `/ws?token=` by default, so there is no second form to fall back to.
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // WS_RECONNECT_MS matches every other client's own fixed 3s reconnect
    // delay (HYDRA-UMC SUITE's own RECONNECT_DELAY_S, the mobile apps' own
    // RECONNECT_DELAY_MS) - this tab previously had NONE at all (a dropped
    // socket - laptop slept, Wi-Fi blipped - just stayed dead until
    // `authToken` happened to change, per the delta-sync design's
    // own finding). That gap matters more now than it used to: Play/Pause/
    // Stop (see RobotDetail.tsx's own handlePlay/handleStop) stopped
    // optimistically mutating local state as of this same change, relying
    // on this same WS round-trip to reflect what the robot is actually
    // doing - a socket that can't reconnect itself would leave the UI
    // showing stale playback state indefinitely, not just missing a live
    // update.
    const WS_RECONNECT_MS = 3000;

    const openWs = () => {
      if (cancelled || !authToken) return;
      try {
        // ?remoteApiVersion=2 declares this connection understands a real
        // targeted delta (see server.ts's own per-connection `schema` and
        // the delta-sync design) - the server only ever sends
        // schema 2 to a connection that asked for it, so an older/other
        // deployment of this same server (schema field absent or ignored)
        // just never exercises that branch and this still behaves exactly
        // like before.
        const socket = new WebSocket(wsUrl('/ws?remoteApiVersion=2'), ['hydra.bearer', authToken]);
        ws = socket;
        // Real diagnostic for a live-reported bug still under investigation:
        // Android's embedded 3D viewport (ThreeDScreen.kt's WebView, this
        // exact page loaded via ?hideUI=true&robotId=...&token=...) was
        // reported as not reflecting play/pause/stop triggered from a
        // separate STUDIO browser tab, and vice versa - console.* here
        // reaches that WebView's own logcat (ThreeDScreenConsole, see
        // ThreeDScreen.kt), so the next real repro attempt can confirm
        // directly whether this embedded session's own WS connection is
        // even opening/staying open and receiving deltas at all, rather
        // than guessing blind. Left in permanently, not stripped after -
        // low-noise (one line per connect + one per delta) and equally
        // useful for a real desktop STUDIO tab's own devtools console.
        socket.onopen = () => {
          console.log(`[WS] connected (robotId param: ${new URLSearchParams(window.location.search).get('robotId') ?? 'none'})`);
          setServerReachable(true);
        };
        socket.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.type === 'delta' && msg.schema === 2 && msg.robotId !== undefined) {
              console.log(`[WS] delta robotId=${msg.robotId} keys=${Object.keys(msg.patch || {}).join(',')}`);
              applyRobotDelta(msg);
            } else if (msg && (msg.type === 'settings' || msg.type === 'delta') && msg.payload) {
              // "delta" without schema 2 (server hasn't heard us declare
              // support, or is an older deployment) and "settings" both
              // carry the SAME full-tree payload shape - only the label
              // differs, see server.ts's own broadcastSettings() - so both
              // apply identically here.
              applyServerData(msg.payload);
            } else if (msg?.type === 'canota_progress' && msg.payload) {
              setCanotaProgress(msg.payload);
            } else if (msg?.error) {
              console.warn('[WS] ' + msg.error);
            }
          } catch {
            // ignore malformed frames rather than tear down the connection
          }
        };
        socket.onclose = (ev) => {
          console.log(`[WS] closed code=${ev.code} reason=${ev.reason || '(none)'}`);
          if (ws === socket) ws = null;
          // a dropped socket is real, live evidence the Server
          // connection is no longer confirmed - reflect that immediately
          // rather than leaving the badge stuck on the last known-good
          // state until (or unless) a reconnect happens to succeed.
          setServerReachable(false);
          if (cancelled) return;
          // Real bug found and fixed 2026-09-08 (C08): server.ts always
          // closes an auth-rejected connection with code 1008 (no token/
          // invalid token/session revoked - see server.ts's own 4 ws.close(
          // 1008, ...) call sites), never anything else. Before this fix,
          // reconnecting here unconditionally meant a token that just
          // expired or was revoked kept being retried with itself forever -
          // an infinite 1008 loop, never surfaced to the user.
          //
          // C08 follow-up, same day: forcing a full logout() on EVERY 1008
          // was still overly broad - the single most common real cause of
          // a 1008 (the access token's own JWT_EXPIRES_IN elapsing on a
          // dashboard tab left open) doesn't mean the account was actually
          // revoked. attemptTokenRefresh() tries server.ts's own new
          // POST /api/refresh first (silent, no lost view/robot selection);
          // only if THAT also fails (a genuinely revoked session, an
          // expired/never-issued refresh token, or a server predating this
          // feature) does this fall back to logout(), same as before.
          if (ev.code === 1008) {
            attemptTokenRefresh().then((recovered) => {
              if (!recovered) logout();
            });
            return;
          }
          reconnectTimer = setTimeout(openWs, WS_RECONNECT_MS);
        };
        // onerror always precedes onclose for a WebSocket - no separate
        // reconnect scheduling needed here, that would double-schedule.
        socket.onerror = () => {};
      } catch {
        // WebSocket unavailable (very old browser, or a dev proxy that
        // doesn't forward upgrades) - the app still works via the existing
        // fetch-once/debounced-POST path below, just without live push.
        // Retries on the same delay rather than giving up permanently, in
        // case this was a transient dev-proxy hiccup rather than a real
        // capability gap.
        if (!cancelled) reconnectTimer = setTimeout(openWs, WS_RECONNECT_MS);
      }
    };
    if (authToken) openWs();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [applyServerData, applyRobotDelta, authToken, attemptTokenRefresh, logout]);

  // The save timer lives in a ref and not in the effect's cleanup. A change that arrives from the server (a
  // delta) re-runs the effect, and cancelling the pending save there used to drop an edit the operator made a
  // moment earlier: it was never saved until some later edit. The payload is built when the timer fires, from the
  // latest state, so whatever a delta changed meanwhile is part of what is sent.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  useEffect(() => {
    if (!isLoaded) return;
    // This exact controllers/settings/activeControllerId change already came from applyRobotDelta() or
    // sendRobotCommand() (see skipNextSaveRef's own header comment): it is in sync with the server, so no new save
    // is scheduled - but one already pending for an earlier local edit is left alone. Consumed (reset to false) so
    // the NEXT change, a genuine local edit, is still saved normally.
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const payloadJson = JSON.stringify({
        settings: settingsRef.current,
        controllers: controllersRef.current,
        activeControllerId: activeControllerIdRef.current,
      });
      if (payloadJson === lastPayloadJsonRef.current) return; // unchanged since the last send/receive - nothing to do

      fetch(apiUrl('/api/settings'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: payloadJson
      }).then((response) => {
        if (!response.ok) {
          // Real failure (401 expired session, 403 non-admin role, 5xx) - NOT marked as sent (lastPayloadJsonRef
          // stays behind), so the next real change - or a manual Retry via flushSettingsSave() - tries again
          // instead of silently giving up on it forever.
          setSettingsSaveError(
            response.status === 401
              ? 'Save failed (401): your session has expired - log in again.'
              : response.status === 403
                ? 'Save failed (403): this account does not have permission to save settings.'
                : `Save failed (HTTP ${response.status}).`
          );
          return;
        }
        lastPayloadJsonRef.current = payloadJson;
        setSettingsSaveError(null);
      }).catch(() => {
        // Real network failure - also not marked as sent, same retry reasoning as the non-ok branch above.
        setSettingsSaveError('Save failed: could not reach the server.');
      });
    }, 500);
  }, [settings, controllers, activeControllerId, isLoaded]);

  const activeController = useMemo(() => controllers.find(c => c.id === activeControllerId) || controllers[0] || defaultControllers[0], [controllers, activeControllerId]);
  const robots = activeController?.robots || [];
  const cameras = activeController?.cameras || [];

  const updateController = (id: string, updates: Partial<HydraController>) => {
    setControllers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const updateRobot = (id: number, updates: Partial<RobotState>) => {
    
    setControllers((prev) => prev.map((c) => {
      if (c.id !== activeControllerId) return c;
      return { ...c, robots: c.robots.map(r => (r.id === id ? { ...r, ...updates } : r)) };
    }));
  };

  // One POST of a robot command, answered as a typed result. A 401 means the access token ran out: it is refreshed
  // once and the command sent again before giving up, so an expired session no longer makes a STOP vanish.
  const postRobotCommand = async (
    id: number,
    command: string,
    params?: Record<string, unknown>
  ): Promise<CommandResult> => {
    const send = async (): Promise<CommandResult> => {
      try {
        const res = await fetch(apiUrl(`/api/robot/${id}/command`), {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ command, params }),
        });
        let body: unknown = null;
        try { body = await res.json(); } catch { /* an answer without a JSON body */ }
        return interpretCommandResponse(res.status, res.ok, body);
      } catch (error) {
        return networkFailure(error instanceof Error ? error.message : undefined);
      }
    };
    let result = await send();
    if (!result.ok && result.code === 'session_expired' && (await attemptTokenRefresh())) result = await send();
    return result;
  };

  const sendRobotCommand = async (
    id: number,
    command: string,
    params?: Record<string, unknown>,
    localMutate?: (robot: RobotState) => Partial<RobotState>,
    affectedIds?: number[]
  ): Promise<CommandResult> => {
    const ids = affectedIds && affectedIds.length > 0 ? affectedIds : [id];
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

    const result = await postRobotCommand(id, command, params);
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
      // And say it: a command that did not reach the robot is never silent (a STOP above all).
      reportCommandIssue({ code: result.code ?? 'rejected', command, robotIds: ids, detail: result.detail });
    } else if (result.warnings.length > 0) {
      reportCommandIssue({ code: 'warnings', command, robotIds: ids, detail: result.warnings.join('; ') });
    }
    return result;
  };

  // The per-robot stop of every robot (and its valves and pumps off), used only when the global route is rate
  // limited (429) or missing (404, an older server). Same report shape as the global answer.
  const stopEachRobot = async (): Promise<StopAllReport> => {
    const targets = controllersRef.current.flatMap((c) => c.robots.map((robot) => ({ controllerId: c.id, robot })));
    const withOneRetry = async (id: number, command: string, params?: Record<string, unknown>): Promise<CommandResult> => {
      let result = await postRobotCommand(id, command, params);
      if (!result.ok && result.code === 'network') {
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        result = await postRobotCommand(id, command, params);
      }
      return result;
    };
    const robots: StopAllRobot[] = await Promise.all(targets.map(async ({ controllerId, robot }) => {
      const stop = withOneRetry(robot.id, 'stop');
      // Switch the outputs off too: a stopped arm with a pump still running is not a stopped robot.
      const valveJobs: Promise<CommandResult>[] = [];
      const pumpJobs: Promise<CommandResult>[] = [];
      robot.valves?.forEach((on, index) => { if (on) valveJobs.push(withOneRetry(robot.id, 'valve', { index, state: false })); });
      robot.pumps?.forEach((on, index) => { if (on) pumpJobs.push(withOneRetry(robot.id, 'pump', { index, state: false })); });
      const stopResult = await stop;
      const valveResults = await Promise.all(valveJobs);
      const pumpResults = await Promise.all(pumpJobs);
      const problem = [stopResult, ...valveResults, ...pumpResults].find((r) => !r.ok);
      return {
        robotId: robot.id,
        controllerId,
        name: robot.name,
        stopped: stopResult.ok,
        valvesOff: valveResults.filter((r) => r.ok).length,
        pumpsOff: pumpResults.filter((r) => r.ok).length,
        reservedBy: null,
        error: problem ? [problem.code, problem.detail].filter(Boolean).join(': ') || null : null,
      };
    }));
    const stoppedCount = robots.filter((r) => r.stopped).length;
    return {
      success: stoppedCount === robots.length,
      stoppedCount,
      failedCount: robots.length - stoppedCount,
      persisted: true,
      robots,
      viaFallback: true,
    };
  };

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
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) applyServerData(data); })
        .catch(() => {});
    } finally {
      setStopAllInFlight((n) => n - 1);
    }
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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    try {
      const response = await fetch(apiUrl('/api/settings'), { method: 'POST', headers, body: payloadJson });
      if (!response.ok) {
        // Real failure - see the debounced save effect's own comment for
        // why lastPayloadJsonRef is deliberately NOT updated here either.
        setSettingsSaveError(
          response.status === 401
            ? 'Save failed (401): your session has expired - log in again.'
            : response.status === 403
              ? 'Save failed (403): this account does not have permission to save settings.'
              : `Save failed (HTTP ${response.status}).`
        );
        return;
      }
      lastPayloadJsonRef.current = payloadJson;
      setSettingsSaveError(null);
    } catch {
      // Real network failure.
      setSettingsSaveError('Save failed: could not reach the server.');
    }
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

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

  const saveKinematics = (id: number) => {
    const robot = robots.find(r => r.id === id);
    if (!robot || robot.recordedPoints.length === 0) return;
    const data = JSON.stringify(robot.recordedPoints, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = settings.worksPaths?.[robot.id] ? settings.worksPaths[robot.id].replace(/\//g, '_') + '_' : '';
    a.download = `${prefix}kinematics_${robot.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadKinematics = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const checked = validateTrajectoryPoints(json);
          if (!checked.ok) {
            reportCommandIssue({ code: 'import_invalid', command: 'trajectory', robotIds: [id], detail: checked.error });
            return;
          }
          // The atomic trajectory command: the server stores the points and resets the playback cursor, so the Play
          // that follows plays THESE points (a plain settings edit reached it half a second later, or not at all).
          void sendRobotCommand(
            id,
            'trajectory',
            { points: checked.value },
            () => ({ recordedPoints: checked.value as RobotState['recordedPoints'] }),
          );
        } else if (json && typeof json.x === 'number') {
          updateRobot(id, { pos: { ...json } });
        } else {
          reportCommandIssue({ code: 'import_invalid', command: 'trajectory', robotIds: [id], detail: 'not a trajectory' });
        }
      } catch {
        reportCommandIssue({ code: 'import_invalid', command: 'trajectory', robotIds: [id], detail: 'not valid JSON' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportScene = () => {
    const data = JSON.stringify(robots, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydra_scene.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importScene = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const checked = validateSceneRobots(json);
        if (!checked.ok) {
          reportCommandIssue({ code: 'import_invalid', command: 'scene', robotIds: [], detail: checked.error });
          return;
        }
        updateController(activeControllerId, { robots: checked.value as unknown as RobotState[] });
      } catch {
        reportCommandIssue({ code: 'import_invalid', command: 'scene', robotIds: [], detail: 'not valid JSON' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const factoryReset = async () => {
    // POST /api/settings requires auth like every other write - without this
    // header it would 401/no-op silently since the response used to never
    // be checked (same root cause described in authToken's own comment
    // above for why the login screen exists) - reloading unconditionally
    // afterward would then present the UNCHANGED settings as if the reset
    // had actually happened. Checked now, same as every other save path.
    const headers: any = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    try {
      const response = await fetch(apiUrl("/api/settings"), { method: "POST", headers, body: "{}" });
      if (!response.ok) {
        setSettingsSaveError(
          response.status === 401
            ? 'Factory reset failed (401): your session has expired - log in again.'
            : response.status === 403
              ? 'Factory reset failed (403): this account does not have permission to save settings.'
              : `Factory reset failed (HTTP ${response.status}).`
        );
        return;
      }
    } catch {
      setSettingsSaveError('Factory reset failed: could not reach the server.');
      return;
    }
    window.location.reload();
  };

  return (
    <HydraContext.Provider value={{
      controllers, activeControllerId, activeController, setActiveControllerId,
      robots, cameras, settings,
      updateController, updateRobot, sendRobotCommand, emergencyStop, stopAllReport, dismissStopAllReport, stopAllPending: stopAllInFlight > 0, updateCamera, flushSettingsSave, updateSettings,
      commandIssue, dismissCommandIssue, reportCommandIssue,
      saveKinematics, loadKinematics, addController, removeController,
      exportScene, importScene, factoryReset,
      authToken, role, isAdmin, login, logout, loginError,
      canotaProgress,
      logsClearedAt, setLogsClearedAt,
      serverReachable, settingsSaveError, settingsLoadError
    }}>
      {children}
    </HydraContext.Provider>
  );
};
