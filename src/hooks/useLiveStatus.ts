// =============================================================================
// HYDRA-UMC STUDIO - The live status of the link with the server: hooks/useLiveStatus.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// What the provider knows about the link with the server (is it reachable, did the last save persist, was the first read refused, the
// progress of the CAN flasher, the log clear mark). Moved out of the provider unchanged: it is the state of the live link, apart from the
// shared configuration (settings and controllers) and from the preferences of the person.
// =============================================================================
import { useState } from 'react';

export function useLiveStatus() {
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

  return {
    serverReachable, setServerReachable,
    settingsSaveError, setSettingsSaveError,
    operatorEdited, setOperatorEdited,
    settingsLoadError, setSettingsLoadError,
    canotaProgress, setCanotaProgress,
    logsClearedAt, setLogsClearedAt,
  };
}
