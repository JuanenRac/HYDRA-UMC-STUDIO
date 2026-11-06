// =============================================================================
// HYDRA-UMC STUDIO - src/hooks/useSharedConfig.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The shared configuration of the installation as the server holds it: the settings tree, the controllers with their robots and the
// active controller; the first read of GET /api/settings, the full-tree message and the targeted delta of the live socket, and the
// save of the whole tree with the revision (ETag) read last, with the refs that guard the echo of the server. The provider keeps
// only what is live (commands, STOP) and the preferences of the person.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { apiUrl } from '../lib/apiBase';
import { saveConflictText } from '../lib/serverErrors';
import { authHeaders } from '../lib/session';
import { applyOverlay, loadOverlay } from '../lib/settingsScope';
import { browserStorage } from '../lib/robotDetailHelpers';
import { parseRobotDelta, deltaTargetExists, patchControllers } from '../lib/robotDelta';
import { defaultSystemSettings } from '../lib/defaultSettings';
import { controllersFromServer, currentHost, hostIntegrations, pickActiveControllerId, seedControllers } from '../lib/serverState';
import { saveSettingsTree, type FetchLike } from '../lib/settingsConcurrency';
import { type HydraController, type SystemSettings, defaultControllers } from '../store';

/** The ETag of an answer of GET /api/settings, kept to send it back as If-Match when the tree is saved. */
export function rememberSettingsEtag(ref: { current: string | null }, response: Response): void {
  const etag = response.headers.get('ETag');
  if (etag) ref.current = etag;
}

export interface SharedConfigInputs {
  authToken: string | null;
  /** The signed-in account, read when a tree arrives (an account that may not edit the global settings keeps its local choices). */
  accountRef: MutableRefObject<{ mayEditGlobal: boolean; username: string | null }>;
  setServerReachable: (reachable: boolean) => void;
  setSettingsLoadError: (error: 'login_required' | 'server' | null) => void;
  setSettingsSaveError: (message: string | null) => void;
  /** Only so that the first read happens again when the session functions change, as it always did. */
  attemptTokenRefresh: unknown;
  logout: unknown;
}

export function useSharedConfig(inputs: SharedConfigInputs) {
  const { authToken, accountRef, setServerReachable, setSettingsLoadError, setSettingsSaveError, attemptTokenRefresh, logout } = inputs;
  const [controllers, setControllers] = useState<HydraController[]>(defaultControllers);
  const [activeControllerId, setActiveControllerId] = useState<string>('192.168.1.100');
  const [settings, setSettings] = useState<SystemSettings>(defaultSystemSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // The server broadcasts every write to every connected client, sender included; without this guard this tab would take its own echoed write
  // for an outside change, set a fresh object with the same content, save again, and loop for ever. The JSON of the last tree applied or
  // sent breaks the loop at the source: no state update, no re-render, no re-save.
  const lastPayloadJsonRef = useRef<string | null>(null);
  // The revision (ETag) of the tree as the last GET /api/settings or the last save answered it: PUT /api/settings sends it as If-Match.
  const settingsEtagRef = useRef<string | null>(null);
  // The cheap sibling for the hot paths (every incoming delta, every optimistic command and its rollback): a flag the deferred save consumes
  // on its next run to say "this change already came from the server or from a command", so the multi-megabyte tree is never serialised there.
  const skipNextSaveRef = useRef(false);

  // Mirrors of the state, current without waiting for a setState callback: the delta asks "does this robot exist here?" and the optimistic
  // command asks "which controller is active?" against these.
  const controllersRef = useRef(controllers);
  useEffect(() => { controllersRef.current = controllers; }, [controllers]);
  const activeControllerIdRef = useRef(activeControllerId);
  useEffect(() => { activeControllerIdRef.current = activeControllerId; }, [activeControllerId]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const applyServerData = useCallback((data: any) => {
    if (data && Object.keys(data).length > 0) {
      const dataJson = JSON.stringify(data);
      if (dataJson === lastPayloadJsonRef.current) return;
      lastPayloadJsonRef.current = dataJson;
    }
    const host = currentHost();

    if (data && Object.keys(data).length > 0) {
      // Assign data.settings directly rather than merging it onto prev: the server always sends the FULL tree, and a
      // merge would change the key order and defeat the echo guard above (the debounced save would see a false
      // mismatch and POST a no-op change back, forever).
      // An account that cannot change the global settings keeps its local choices (theme, language, layout) over what the server sends.
      const overlay = !accountRef.current.mayEditGlobal && accountRef.current.username ? loadOverlay(browserStorage(), accountRef.current.username) : {};
      if (data.settings && Object.keys(overlay).length > 0) {
        const merged = applyOverlay(data.settings, overlay);
        if (merged !== data.settings) skipNextSaveRef.current = true;
        setSettings(merged);
      } else if (data.settings) setSettings(data.settings);
      else setSettings(prev => ({ ...prev, ...data })); // a settings.json from before the nested envelope is incomplete on its own: a merge onto the defaults is right here
      const finalControllers = controllersFromServer(data, host);
      setControllers(finalControllers);
      setActiveControllerId(pickActiveControllerId(data.activeControllerId, finalControllers, host));
    } else {
      setSettings(prev => ({ ...prev, integrations: hostIntegrations(host) }));
      setControllers(seedControllers(host));
      setActiveControllerId(host);
    }
    setIsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }), [applyServerData, setSettingsSaveError]);

  // Applies a targeted delta of one robot (`{type:"delta", schema:2, controllerId, robotId, patch, ...}`), the counterpart of applyServerData for
  // the full-tree message. It validates against controllersRef first: if the robot does not exist here yet, the delta is discarded and a full
  // GET /api/settings is forced instead of ever creating a ghost robot from a partial patch.
  const applyRobotDelta = useCallback((msg: any) => {
    const delta = parseRobotDelta(msg);
    if (!delta) return;
    if (!deltaTargetExists(controllersRef.current, delta)) {
      const headers: Record<string, string> = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      fetch(apiUrl('/api/settings'), { headers }).then(r => { rememberSettingsEtag(settingsEtagRef, r); return r.json(); }).then(data => applyServerData(data)).catch(() => {});
      return;
    }
    setControllers(prev => {
      const next = patchControllers(prev, delta);
      // Marks the deferred save's next run as "already in sync, skip": applying a delta changes the `controllers` reference, which would
      // otherwise look like a local edit and POST the full tree right back.
      skipNextSaveRef.current = true;
      return next;
    });
  }, [authToken, applyServerData]);

  // The first read. GET /api/settings needs a session like every other route: without a token the server answers 401 and the dashboard
  // shows the login screen (settingsLoadError).
  useEffect(() => {
    let cancelled = false;
    const headers: Record<string, string> = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

    fetch(apiUrl('/api/settings'), { headers }).then(async (r) => {
      rememberSettingsEtag(settingsEtagRef, r);
      // If the server refused (401: the settings need a session; 403...) its body is an error object, not settings: applying it would mix
      // {error: ...} into the settings and show the sample robots as if they were the system. Say it needs a session instead.
      if (!r.ok) {
        if (!cancelled) {
          setServerReachable(true);
          setSettingsLoadError(r.status === 401 || r.status === 403 ? 'login_required' : 'server');
          setIsLoaded(true);
        }
        return;
      }
      const data = await r.json();
      // This fetch succeeding IS the real evidence a live server answered; set before applyServerData so even a fresh
      // install with no saved controllers shows System Online.
      if (!cancelled) { setServerReachable(true); setSettingsLoadError(null); applyServerData(data); }
    }).catch(() => {
      if (!cancelled) { setServerReachable(false); setIsLoaded(true); }
    });
    return () => { cancelled = true; };
  }, [applyServerData, applyRobotDelta, authToken, attemptTokenRefresh, logout, setServerReachable, setSettingsLoadError]);

  return {
    controllers, setControllers, activeControllerId, setActiveControllerId, settings, setSettings, isLoaded,
    lastPayloadJsonRef, settingsEtagRef, skipNextSaveRef, controllersRef, activeControllerIdRef, settingsRef,
    applyServerData, persistTree, applyRobotDelta,
  };
}
