// =============================================================================
// HYDRA-UMC STUDIO - Global state provider: HydraProvider.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { publishClaimsEvent } from './lib/claimsFeed';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { apiUrl, wsUrl } from './lib/apiBase';
import { saveConflictText, saveFailureText } from './lib/serverErrors';
import { applyRobotCommandMutation, rollbackRobotCommand } from './robotCommandTransition';
import { type CommandResult } from './lib/commandResult';
import { createCommandSequence } from './lib/commandSequence';
import { authHeaders } from './lib/session';
import { guardCommand } from './lib/motionGuard';
import { settingsLocalOnly, settingsSaveAllowed } from './lib/settingsSave';
import { applyOverlay, loadOverlay, saveOverlay, splitSettingsUpdate, usernameFromToken } from './lib/settingsScope';
import { browserStorage } from './lib/robotDetailHelpers';
import { getModeState, getSafetyState } from './lib/accessStore';
import { fetchRobot } from './lib/accessApi';
import { robotRevisions } from './lib/revisions';
import { isUnknownCommand, markTableCommand, serverHasTableCommand } from './lib/tableMove';
import { createEditQueue, markEditCommands, planRobotEdits, serverHasEditCommands, type RobotEditCommand } from './lib/robotEdits';
import { isTemperatureWarning, parseWarnings } from './lib/safetyLimits';
import { type StopAllReport, requestStopAllWithRetry, stopRobotByRobot } from './lib/stopAll';
import { HydraStoreProviders } from './storeContexts';
import { useAuthSession } from './hooks/useAuthSession';
import { useCommandIssues } from './hooks/useCommandIssues';
import { useSafetyLimitsSync } from './hooks/useSafetyLimitsSync';
import { useSceneFiles } from './hooks/useSceneFiles';
import { postRobotCommand as postRobotCommandRequest, tableThroughJogs as tableThroughJogsRequest, type PostRobotCommand } from './lib/robotCommandPost';
import { saveSettingsTree, type FetchLike } from './lib/settingsConcurrency';
import { type CameraState, type HydraController, type RobotState, type SystemSettings, defaultControllers } from './store';

/**
 * Renders the  hydra provider component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
/** The ETag of an answer of GET /api/settings, kept to send it back as If-Match when the tree is saved. */
function rememberSettingsEtag(ref: { current: string | null }, response: Response): void {
  const etag = response.headers.get('ETag');
  if (etag) ref.current = etag;
}

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
  // An operator edited the settings tree and, because the server accepts it only from an administrator, nothing was sent.
  const [operatorEdited, setOperatorEdited] = useState(false);

  // Set when the server answered the first read of the settings with a refusal (no session): what is on screen
  // is then the built-in sample, not the system, and the interface says so.
  const [settingsLoadError, setSettingsLoadError] = useState<'login_required' | 'server' | null>(null);

  // The problem of the last command and the answer of the global STOP live in hooks/useCommandIssues.ts.
  const {
    commandIssue, setCommandIssue, reportCommandIssue, dismissCommandIssue,
    stopAllReport, setStopAllReport, stopAllInFlight, setStopAllInFlight, dismissStopAllReport,
  } = useCommandIssues();

  // The session (token, sign-in, silent renewal, sign-out) lives in hooks/useAuthSession.ts.
  const { authToken, setAuthToken, loginError, loginNeedsCode, accountRef, role, login, attemptTokenRefresh, logout } = useAuthSession();
  const isAdmin = role === 'admin';
  const localOnly = settingsLocalOnly(role, operatorEdited);

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
  // The revision (ETag) of the tree as the last GET /api/settings or the last save answered it: PUT /api/settings sends it as If-Match.
  const settingsEtagRef = useRef<string | null>(null);

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

  // The safety limits come from the server: hooks/useSafetyLimitsSync.ts.
  useSafetyLimitsSync(authToken);

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
        // An account that cannot change the global settings keeps its local choices (theme, language, layout) over what the server sends.
        const overlay = !accountRef.current.mayEditGlobal && accountRef.current.username ? loadOverlay(browserStorage(), accountRef.current.username) : {};
        if (data.settings && Object.keys(overlay).length > 0) {
          const merged = applyOverlay(data.settings, overlay);
          if (merged !== data.settings) skipNextSaveRef.current = true;
          setSettings(merged);
        } else if (data.settings) setSettings(data.settings);
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

  // Saves the whole tree with PUT /api/settings and the ETag read last (see lib/settingsConcurrency.ts). When the server's tree is
  // not the one this window received last, the server's version is shown instead and the person is told to apply the change again.
  const persistTree = useCallback((payloadJson: string, force: boolean) => saveSettingsTree({
    fetchFn: fetch as unknown as FetchLike,
    url: apiUrl('/api/settings'),
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: payloadJson,
    etag: settingsEtagRef.current,
    lastSyncedJson: lastPayloadJsonRef.current,
    force,
  }).then((outcome) => {
    if (outcome.kind === 'saved' || outcome.kind === 'conflict') {
      if (outcome.etag) settingsEtagRef.current = outcome.etag;
    }
    if (outcome.kind === 'conflict') {
      applyServerData(outcome.server);
      setSettingsSaveError(saveConflictText());
    }
    return outcome;
  }), [applyServerData]);

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
      fetch(apiUrl('/api/settings'), { headers }).then(r => { rememberSettingsEtag(settingsEtagRef, r); return r.json(); }).then(data => applyServerData(data)).catch(() => {});
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
      rememberSettingsEtag(settingsEtagRef, r);
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
            } else if (msg?.type === 'claims') {
              // who reserves which robot, pushed when it changes (see lib/claimsFeed.ts)
              publishClaimsEvent(msg);
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
      if (!settingsSaveAllowed(role)) {
        // An operator cannot save the tree: it would be a 403 after every edit. The edit stays in this window.
        setOperatorEdited(true);
        setSettingsSaveError(null);
        return;
      }

      void persistTree(payloadJson, false).then((outcome) => {
        if (outcome.kind === 'failed') {
          // Real failure (401 expired session, 403 non-admin role, 5xx, network) - NOT marked as sent (lastPayloadJsonRef
          // stays behind), so the next real change - or a manual Retry via flushSettingsSave() - tries again
          // instead of silently giving up on it forever.
          setSettingsSaveError(saveFailureText('save', outcome.status));
          return;
        }
        if (outcome.kind === 'conflict') return; // persistTree has already shown the server's version and said so
        lastPayloadJsonRef.current = payloadJson;
        setSettingsSaveError(null);
        // Saving the whole tree changes the robots on the server too: what was known of their revisions is stale.
        robotRevisions.forget();
        // The server lowers a bed target above the ceiling of its model and says so.
        const lowered = parseWarnings(outcome.body).find(isTemperatureWarning);
        if (lowered) reportCommandIssue({ code: 'temperature_limit', command: 'settings', robotIds: lowered.robotId === null ? [] : [lowered.robotId], detail: `${lowered.requested ?? '?'} -> ${lowered.applied ?? '?'}` });
      });
    }, 500);
  }, [settings, controllers, activeControllerId, isLoaded, reportCommandIssue, role, persistTree]);

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

  // An administrator changes any setting. Any other account changes only the local ones (theme, language, layout of the
  // panels: lib/settingsScope.ts), which stay in this browser; a global one is refused here and the interface says so
  // (the server refuses it as well).
  const updateSettings = (updates: Partial<SystemSettings>) => {
    if (settingsSaveAllowed(role)) {
      setSettings(prev => ({ ...prev, ...updates }));
      return;
    }
    const parts = splitSettingsUpdate(updates);
    if (parts.hasGlobal) reportCommandIssue({ code: 'settings_admin_only', command: 'settings', robotIds: [], detail: Object.keys(parts.global).join(', ') });
    if (!parts.hasLocal) return;
    const username = usernameFromToken(authToken);
    const next = { ...settingsRef.current, ...parts.local };
    if (JSON.stringify(next) !== JSON.stringify(settingsRef.current)) skipNextSaveRef.current = true;
    if (username) saveOverlay(browserStorage(), username, { ...loadOverlay(browserStorage(), username), ...parts.local });
    setSettings(prev => ({ ...prev, ...parts.local }));
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
