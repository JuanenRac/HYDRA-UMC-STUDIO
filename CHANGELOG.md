# Changelog

All notable work on **HYDRA-UMC STUDIO** is summarized here, newest first.

## Versioning scheme

`bump_manifest_version.py` (root of the workspace) is the single owner of
both `hydra-umc.project.json` and `package.json`'s `version` field -
`npm run build` (`vite build`) is deliberately compilation-only so it can
never create drift between them. `scripts/bump-version.mjs` is a legacy
native-only helper kept for reference; nothing in this repo calls it. It
follows a simple base-10 "odometer" rule rather than semantic-versioning
judgment calls:

- `patch` +1 on every build
- when `patch` would exceed 9, it resets to 0 and `minor` +1 instead (e.g. `0.0.9` -> `0.1.0`, never `0.0.10`)
- the same carry cascades into `major` if `minor` would exceed 9

The running version is visible live in the app itself: **About** dialog
(header `About` button) shows it, read from `GET /api/hydra-info`, which the
Express server reads straight from `package.json` at startup - no separate
number to keep in sync by hand.

This file itself is *not* auto-generated per build (most builds are routine
verification runs with nothing changelog-worthy); it's updated by hand when
a change is actually worth summarizing for a human.

---

## Unreleased

## [0.3.6] - Services badge: real green/red/amber health color, version moved inside it, duplicate port line removed

- **The status badge's color didn't distinguish "stopped on purpose" from
  "actually crashed"** - real feedback from live testing. Now driven by a
  dedicated `healthColor()`, separate from the badge's own label text:
  green for genuinely running, red for cleanly stopped, amber for a real
  error - systemd's own `ActiveState: "failed"` IS that error state
  (crashed / exited non-zero / exhausted its restart limit), never
  conflated with `"inactive"` (stopped as expected). A project whose
  systemd unit says active but whose own declared port probes down is a
  real contradiction (alive but not actually serving) - also amber,
  with its own "Error" label text, not silently shown as plain green or
  lumped in with "Down".
- **Version number moved inside the status badge, ~2x its own label's
  font size, directly under Live/Running/Down/Stopped/Error/N/A** - real
  feedback from live testing, same placement style as the PID chip
  below it. Removed from the card's own bottom row, which also dropped
  the port number that duplicated the one already shown next to the IP
  in the host:port chip.

## [0.3.5] - Clear survives navigation; Services shows real IP:port and Linux PID per project

- **Server Logs' Clear button didn't survive leaving and returning to the
  panel** - real feedback from live testing right after `[0.3.4]` shipped
  it. `AdminLogs.tsx` is conditionally mounted
  (`{activeTab === 'adminLogs' && <AdminLogs />}` in Dashboard.tsx), so
  its own local `clearedAt` state reset every time the operator
  navigated away and back, silently un-clearing the view. Lifted into
  the shared store (`logsClearedAt`/`setLogsClearedAt`) so it survives
  for the life of the session instead of the component's own mount.
- **Services showed only 6 of 19 real running projects as "Live"** - the
  other 13 never declared a `service.port` in their manifest (many are
  CLI/library-shaped, not network services) and looked identical to a
  project that isn't a service at all - real feedback from live testing.
  Each card now shows a real local IP:port when `serviceHost`/
  `servicePort` are set (a TCP/HTTP probe), and a real Linux PID when
  the project's manifest opts into `service.systemd_unit` (a
  `systemctl show` probe, independent of whether it also exposes a
  port - see HYDRA-UMC-SERVER's own `[0.3.6]`). The status badge now
  has 5 real states instead of 3: Live/Down (port probe) win when
  present, Running/Stopped (systemd `ActiveState`) cover everything
  else that opted into `systemd_unit`, N/A stays for a project with
  neither - so a portless-but-running service reads as "Running", not
  lumped in with something that genuinely isn't a service.

## [0.3.4] - Server Logs gets a real Clear button; both Ecosystem panels now fill and scroll properly

- **`AdminLogs.tsx` (Server Logs) had no way to clear the view** - real
  feedback from live testing. Added a Clear button next to Pause/Resume;
  since `lines` is always replaced wholesale from the server's own
  last-300-lines response on every poll, simply emptying local state
  wouldn't have stayed empty past one poll tick while live - Clear instead
  remembers the newest line (or that the log was empty) at the moment it
  was pressed, and only shows what comes after that same anchor in every
  later poll, same "clear the screen, keep tailing" behavior as a
  terminal or devtools console.
- **Server Logs and Services panels didn't fill or scroll properly on a
  wide/tall browser window** - real feedback from live testing (tested
  against the CM5's own served STUDIO, not the desktop build). Both
  panels' own root had a `max-w-5xl`/`max-w-6xl` cap, so a wide window
  left real empty space on the right instead of using it. Server Logs'
  own log box separately capped its height at `70vh` (a fraction of the
  browser viewport) instead of the real space `flex-1` already gave it
  inside its own container. Services was worse: its root had no scroll
  container of its own at all, and its ancestor (Dashboard.tsx's main
  content area) is `overflow-hidden` - a family list taller than the
  visible viewport was silently clipped at the bottom with no way to
  reach the rest, exactly the "services cut off halfway down" report.
  Both width caps removed; Services now has its own `flex-1 min-h-0
  overflow-y-auto` region around just the grouped cards (header/stats/
  search stay fixed above it, same fixed-toolbar-plus-scrolling-body
  shape as Server Logs' own log box), and Server Logs' box now genuinely
  fills whatever height its flex container gives it instead of a
  viewport-fraction cap.
- **Coordinated XY-table examples** - the nine examples that use an XY
  table now describe two deliberately independent motions at every playback
  step: `tx`/`ty` moves the robot base across the table pattern, while the
  local Cartesian pose drives a distinct, animated tool task. Raster, scan,
  circle, diagonal, spiral, snake and flower examples now include a bounded
  inspection/dispensing gesture; the PnP matrix performs an approach, place
  and retract cycle at each table cell. `xyTableTaskPoint()` is the shared
  authoring helper that prevents a future example from accidentally folding
  table travel into arm kinematics.
- **Work playback synchronization** - selecting a Work now sends one atomic
  `trajectory` command to HYDRA-UMC-SERVER instead of relying on the delayed
  full-settings save. Server stores the selected points and resets its cursor
  before Play is available, so it cannot replay the previously loaded Work.
  This applies to every robot model; Parol6 native-joint Works retain their
  `model-joints` path instead of being reinterpreted as generic joints.
- **Model-specific portable trajectories** - all 26 example trajectories and
  every A1–A8 Work now resolve their portable Cartesian intent through the
  selected robot's real IK before reaching Server. The result is persisted as
  explicit `model-joints`, so Faze4 and Parol6 no longer replay the same
  generic joint angles as unrelated physical poses. Example selection now uses
  the same atomic `trajectory` path as Works.

- **Canonical Work geometry** - the eight bundled Work names for every A1-A8
  robot (`aplicacion_pegamento`, `escalera_dibujo`, `impresion_espiral`,
  `inspeccion_optica`, `mover_objetos_palet`, `pintado_panel`,
  `silueta_arbol` and `soldadura_chasis`) are now authored as explicit,
  deterministic Cartesian XZ paths in the validated A1 workspace, rather
  than as unrelated generic joint-angle lists. `tools/generate_portable_works.py`
  regenerates the catalogue and CI rejects drift from that source.

## [0.3.3]

- Build version synchronized with `hydra-umc.project.json` and the repository-native version source.

## [0.3.2] - Gamepad real-time actions now use the atomic command path

- **`GamepadController.tsx`** - real-time actions (joint jog, XY-table
  jog, E-STOP/E-STOP ALL, START/STOP, playback speed) now fire
  `sendRobotCommand()`/`POST /api/robot/:id/command` - the same atomic
  path `RobotDetail.tsx`'s own jog buttons, E-STOP and play/pause already
  use - instead of `updateRobot()`'s 500ms-debounced full-tree
  `POST /api/settings`. A held gamepad stick is inherently low-latency
  input; routing it through the debounced save meant every connected
  client (this one's own optimistic UI included) lagged a held stick by
  up to 500ms, while also paying that save's full-tree serialization cost
  on every animation frame the stick stayed held (see `store.tsx`'s own
  `sendRobotCommand` comment - this is the exact "3D view at turtle
  speed" root cause class that comment already documents for jog/valve/
  pump/speed, just not yet fixed for gamepad input specifically).
  `ADD POINT` deliberately stays on `updateRobot()` - it is not a
  real-time action and has no atomic command of its own server-side.
- Joint jog now respects each model's real per-joint limits
  (`jointLimitsFor()`) instead of applying an unclamped +/-1.5° step -
  the gamepad path previously had no clamping at all, unlike every other
  jog surface in this app.
- XY-table jog now sends the real `target: 'xytable'` jog command
  (`server.ts`'s own dedicated branch) instead of writing `robot.pos`
  directly with an axis name (`tx`/`ty`) the server's `jog` case doesn't
  actually recognize for `target: 'robot'` - previously a silent no-op
  server-side beyond the optimistic local mutation.
- **`examples/robotKinematicsDispatch.ts`** - `jointLimitsFor()` moved
  here from `RobotDetail.tsx` (which now imports it), the same "single
  source of truth" move already applied to `jointsToCartesianForModel()`
  in this file, so `GamepadController.tsx` can reuse the exact same
  per-model joint-limit clamping instead of duplicating the ternary
  chain a second time.

## [0.3.1] - Real hardware transport now also reaches Tier 2 (URTC Tool Head)

- **`lib/canOta.ts`** - `resolveHardwareTarget()` now resolves `urtcHead`
  too (`{ targetTier: SPI_TARGET_STACKA, targetSlot, relay: true }`),
  since HYDRA-UMC-SERVER/spi_bridge's own new relay tunnel
  (RELAY_SEND/RELAY_RECV through the Robot Controller Board) now really
  reaches it - only `urtcExpansion` (Tier 3) still returns `null`, an
  honest boundary since that needs one further real tunnel hop (URTC's
  own I2C bridge) that doesn't exist yet. `hardwareQueryVersion()`/
  `hardwareStartFlash()` now send the new `relay` query parameter.
  `Flasher.tsx`'s `hardwareTargetUnreachable` check (and its UI/log
  messages) needed no code change - it was already derived from
  `resolveHardwareTarget()` returning `null`, so it now correctly stops
  flagging urtcHead as unreachable on its own.
- Verified: `tsc --noEmit`, `npm run build`.

## [0.3.0] - Real hardware transport for Flasher/Tester (Kinematic Brain + Robot Controller Board)

- **`lib/canOta.ts`** - `settings.canOta.transport === 'hardware'` now
  reaches a real path for Tier 0 (Kinematic Brain) and Tier 1 (Robot
  Controller Board): `hardwareQueryVersion()`/`hardwareStartFlash()` call
  HYDRA-UMC-SERVER's new `/api/hardware/canota/{version,flash}` relay,
  which itself relays to HYDRA-UMC's new `src/cm5_host/spi_bridge/` local
  service (the real SPI1 + `HYDRA_DATA_READY` GPIO link to the STM32H745).
  `resolveHardwareTarget()` is a new, explicit, honest boundary:
  urtcHead/urtcExpansion (Tier 2-3) return `null` - they need a real
  application-level relay tunnel the H745 firmware doesn't implement yet
  (still a FreeRTOS smoke-test stub), so they deliberately stay on the
  simulated transport rather than pretending to reach hardware that isn't
  actually connectable yet.
- **`Flasher.tsx`** - the "Flash Now" button is no longer disabled just
  because `transport === 'hardware'` (a real bug this fixes: it used to
  disable the button unconditionally in hardware mode, even for Tier 0/1,
  which are now genuinely reachable); it's disabled only when the
  resolved target truly isn't reachable yet (Tier 2-3), with an honest,
  specific message instead of the old generic "not implemented" banner.
  Real per-page flash progress is now watched live from the store's new
  `canotaProgress` (fed by a new `canota_progress` WebSocket message -
  see store.tsx below), not just the final HTTP response.
- **`Tester.tsx`** - a real bug this fixes: `transport` was never read
  at all, so Query Version silently ran the mock simulation even when
  `'hardware'` was selected. Query Version now reaches the same real path
  as Flasher.tsx; self-test/F-RAM/LEDs/bus monitor stay simulated (no
  real H745 *application* firmware to talk to yet - only the bootloader
  spi_bridge speaks is real), now said explicitly in the UI instead of
  silently implied.
- **`store.tsx`** - new `canotaProgress` state, fed by a new `type:
  "canota_progress"` WebSocket message handler (server.ts's own live
  per-page flash progress broadcast).
- All 7 language files (`en`/`es`/`de`/`fr`/`it`/`zh`/`ja`) gained the new
  `flasher.hardware_target_unreachable`, `flasher.log.
  hardware_target_unreachable`, `flasher.log.flash_hardware_failed` and
  `tester.simulated_below_note` keys; the old, now-inaccurate
  `flasher.hardware_not_implemented` key was replaced, not just added to.
- Verified: `tsc --noEmit`, `npm run build`, `npm run lint` (no new
  errors), and a real cross-language key-parity check (all 7 locale files
  valid JSON, 718 keys each, 0 missing/orphaned).

## [0.2.9] - Ecosystem panels: real charts, card layouts, cross-referenced data

Direct user feedback after `0.2.6`-`0.2.8`: the 5 Ecosystem panels were
functionally real (genuine live data, no fake state) but visually and
functionally thin - flat tables, no charts, no way to search/filter a
~48-project scan, panels that didn't talk to each other. This release
raises all of them, still on the exact same real data sources - no new
invented capability, just doing more with what was already real:

- **`EcosystemTelemetry.tsx`** - real charts via `recharts` (already an
  installed dependency, unused anywhere in this app until now): an
  `AreaChart` for raw points, a `BarChart` for aggregated buckets, both
  themed to STUDIO's own sky/slate palette. A Chart/Table toggle keeps
  exact values reachable when they matter, not just the shape. Added a
  real min/max/avg/count stat strip computed from the actual fetched
  series, and quick time-range presets (5m/1h/6h/24h) that compute real
  start/end epoch ms - hand-typing them is still available, just no
  longer the only way in.
- **`EcosystemServices.tsx`** - grouped by family (the same grouping the
  manifests themselves already carry) into a real card grid instead of
  one long flat table, with a search box, per-family filter chips, and a
  summary stat strip (total / live / families) that answers "is the
  ecosystem healthy" before scanning a single card.
- **`AiFamilyStatus.tsx`** - now cross-references Config > AI/Hailo's own
  `settings.aiHailo` (added in `0.2.7`): a family with real live nodes
  but its configured Hailo device set to "None" surfaces a real,
  actionable warning banner - genuine integration between two features
  from this same session, not two panels that happen to share a menu.
  Card layout per node (stack/version/live badge) instead of a bare
  table row.
- **`AdminClients.tsx`** - admin-first sort, a live "Xm ago" connection
  duration (ticking every second, independent of the 5s data poll) in
  place of a raw ISO timestamp, role-colored avatar icons, and a
  connected/admin-count stat strip.
- **`AdminLogs.tsx`** - a real search box plus tag filter chips extracted
  client-side from each line's own `[TAG]` prefix (`industrialLog()`'s
  real existing convention - `[ADMIN]`, `[WS]`, `[VOICE]`, ... - not an
  invented severity the server never sends).
- **`AdminServer.tsx`** - now also shows a real live snapshot from `GET
  /api/hydra-info` (product, uptime, controller/robot counts, hostname)
  above the port-config form, reusing the same endpoint `About.tsx`
  already calls elsewhere in this app.
- i18n: 24 new `ecosystem.*` keys across all 7 locales; 8 keys orphaned
  by `EcosystemServices.tsx`'s old flat-table layout removed from all 7
  rather than left as dead entries.
- Verified: `tsc --noEmit`, `npm run build` (recharts' real weight lands
  only in `EcosystemTelemetry`'s own lazy chunk, not the main bundle),
  `tools/ci_validate.py`, and every `ecosystem.*` key cross-checked 1:1
  against its actual `t()` call site across all 7 redesigned components.

## [0.2.8] - Real fixes while investigating the reported Android 3D-viewport desync

- **`apiBase.ts`'s `defaultProdBase()` hardcoded `:3000`** regardless of the
  port the page was actually loaded on. Invisible in the common case
  (Server almost always runs on 3000) - but ThreeDScreen.kt's own WebView
  (HYDRA-UMC-ANDROID-CONTROL) loads this page via `http://$ip:$port/...`
  using whatever port that app was configured with, so a deployment on a
  non-default port had every `fetch()`/WebSocket call from inside that
  WebView silently misdirected back to `:3000` instead of the port that
  actually served the page. Now prefers `window.location.port` (the
  page's own real port); `:3000` is only a fallback for a reverse-proxy
  case where the port isn't in the URL at all (80/443).
- **Found live while investigating**: the Server instance this session had
  been testing against was serving a STUDIO frontend build from ~03:16 -
  hours behind every fix landed today, including `0.2.2`'s own real
  Camera-PIP-vs-disabled-camera fix. Redeployed a fresh build (this
  version) into `HYDRA-UMC-SERVER/public/` - confirmed live via the
  running instance's own served `index.html` referencing the new build's
  real asset hashes. Not a code change in this repo, but recorded here
  since it directly explains why several already-fixed bugs could still
  have been visible against that specific running instance.
- Verified: `tsc --noEmit`, `npm run build`.

## [0.2.7] - Config > AI/Hailo, HYDRA-UMC > AI Family, and a new Help tab

- **Config > AI/Hailo** (new tab, same visual pattern as Config > CAN-OTA):
  records which Hailo AI accelerator is actually installed on this
  deployment - a real hardware fact, not a live query (neither AI node
  exposes an HTTP API of its own yet). Two SEPARATE devices tracked:
  vision (Hailo-8, already driving the real detection pipeline today)
  and cognitive (Hailo-10 8GB, a planned separate accelerator - defaults
  to "None", not silently claiming hardware that doesn't exist on any
  real deployment yet), plus a model registry path mirroring
  HYDRA-UMC-DETECTION-HEF's own real `models_dir` concept.
  `SystemSettings.aiHailo` added to `store.tsx`.
- **HYDRA-UMC > AI Family** (`AiFamilyStatus.tsx`, new panel) - the same
  real `GET /api/ecosystem/status` scan `EcosystemServices.tsx` uses,
  filtered to the two families the ecosystem's own manifests self-report
  as AI: "Vision AI Node" and "Cognitive AI Node" (10 real projects
  today: VISION-NODE, DETECTION-HEF, VISION-STREAMER, VISUAL-SERVOING-API,
  SAFETY-ZONES, DOCS-QA, COGNITIVE-NODE, VLA-ENGINE, SEMANTIC-PLANNER,
  VOICE-UI). Deliberately not a richer live AI dashboard - none of these
  nodes have their own API yet, so this stays honest about showing the
  same manifest/liveness data as Services, just pre-filtered.
- **Help > Ecosystem** (new tab) explains the whole HYDRA-UMC menu
  addition from `0.2.6`/this release - Services, Telemetry, AI Family,
  and the 3 admin-only panels - in the same descriptive style as the
  existing Help tabs.
- i18n: 9 new `config.ai_hailo*` keys, 6 new `ecosystem.*` keys, and a
  full `help.tabs.ecosystem` entry (label/heading/4 paragraphs) across
  all 7 locales.
- Verified: `tsc --noEmit`, `npm run build`, `tools/ci_validate.py`, and
  every new key cross-checked 1:1 against its actual `t()` call site.

## [0.2.6] - HYDRA-UMC menu becomes a real ecosystem control/visibility surface

- **Config > HYDRA-UMC menu** grew 5 new panels alongside the existing
  Firmware Update / Hardware Tester / Kinematic Brain: **Services**
  (`EcosystemServices.tsx`, `GET /api/ecosystem/status` - real manifest
  scan + live TCP/HTTP probe of every sibling HYDRA-UMC-* checkout that
  declares a port; view + manual refresh only - no start/stop yet, see
  the note in the panel itself), **Telemetry** (`EcosystemTelemetry.tsx`,
  raw points or bucketed aggregates against HYDRA-UMC-DATALAKE through
  Server's new proxy), and 3 admin-only panels ported from
  HYDRA-UMC-SERVER's own `admin-ui/` reference app rather than
  reinventing them: **Connected Apps** (`AdminClients.tsx`, `GET
  /api/admin/clients`), **Server Logs** (`AdminLogs.tsx`, `GET
  /api/admin/logs`, poll+pause+autoscroll-if-at-bottom), **Server Admin**
  (`AdminServer.tsx`, listen port + graceful restart).
- **`store.tsx`** now decodes `role` out of the session JWT's own payload
  (`decodeJwtRole()` - UI-only read, server still re-checks `requireAdmin`
  on every real request) and exposes `isAdmin`, so the 3 admin-only
  panels above are hidden from the menu entirely for a non-admin session
  instead of just 403ing when opened.
- i18n: new `ecosystem.*` namespace (73 keys) across all 7 locales.
- Verified: `tsc --noEmit`, `npm run build` (all 5 new panels code-split
  as their own lazy chunks), `tools/ci_validate.py`, and every
  `ecosystem.*` translation key cross-checked 1:1 against actual `t()`
  call sites (no unused or missing keys).
- Companion change in HYDRA-UMC-SERVER `0.2.6`: the new `/api/telemetry/*`
  proxy this panel depends on.

## [0.2.5] - 4th Remote Access toggle: HYDRA-UMC-WATCH

- **Config > Remote Access** gained a 4th independent toggle, HYDRA-UMC
  Watch, alongside the existing SUITE/Android/iOS ones - `SystemSettings.
  remoteAccess.watch`, gated server-side on the paired phone's own
  `X-Hydra-Client: watch` header (sent only for the 2 real Watch-relay
  calls, never for that phone's own direct traffic - see
  HYDRA-UMC-SERVER's own changelog for the server-side half).
- Also fixed this CHANGELOG's own stale "Versioning scheme" section,
  which claimed `scripts/bump-version.mjs` is wired into `npm run build`
  - it never has (confirmed against both the script's own header comment
  and `package.json`'s real scripts block); `bump_manifest_version.py`
  alone owns the version.

Verified: full `build-test.bat` suite passes (typecheck/tests/lint).

## [0.2.4] - Real, working Integrations panel (Config > Integrations)

- **Config > Integrations cards are now real, not just saved text.** Each
  of OpenPnP/CNC/Laser (existing) plus 2 new cards - ROS 2 Bridge and 3D
  Printer Bridge (OrcaSlicer/Cura/PrusaSlicer/LycheeSlicer/Bambu Studio)
  - now has a real **Test Connection** button: a genuine TCP reachability
  probe run server-side (`POST /api/integrations/test-connection` - see
  HYDRA-UMC-SERVER's own changelog), not a client-side ping that CORS
  would block anyway. Green/red result shown per card, independent of
  the others, matching this same real green/red-dot language the
  Android app's own Ecosystem tab already uses. CNC/Laser also gained
  the `ip` field they were missing (port-only before - a real reachability
  check needs a real host).
- `SystemSettings.integrations` gains `ros2`/`printer3d`, and `ip` on
  `cnc`/`laser`. Handled defensively (optional chaining, matching the
  existing pattern) everywhere `settings.integrations` is read, since an
  older persisted `settings.json` won't have these fields yet.
- New translation keys in all 7 locale files.
- Verified: `tsc --noEmit` clean, `npm run build` succeeds, `npm run
  lint` introduces zero new warnings (the `TestConnectionButton` is a
  real module-level component, not one declared during render). The
  built bundle confirmed to actually reference the new endpoint path.

## [0.2.3] - Dedicated base-rotation buttons on the XYZ Jog overlay

- **`RobotDetail.tsx`'s floating `JoystickOverlay`** now has 2 dedicated
  base-rotation (J1) buttons right under the XYZ jog `Joystick3D` -
  requested directly, so rotating the base and jogging the tool point are
  both reachable from the one window an operator actually keeps open,
  instead of needing the separate J1-J6 grid (`JointControlsOverlay`)
  just to nudge J1.
- New `handleJ1Jog(direction)`, mirroring `handleXYZJog`'s own real
  atomic-command pattern (`sendRobotCommand('jog', ...)`, not the passive
  `updateRobot`/debounced-POST path a plain joint-value change would
  otherwise take) - deliberately pure joint-space (no Cartesian
  round-trip through IK, unlike XYZ jog: rotating J1 alone doesn't need
  it), clamped to this model's own real J1 limits (`jointLimitsFor`, the
  same helper the J1-J6 grid's own slider already uses), and keeps
  `robot.pos` consistent afterward via forward kinematics
  (`jointsToCartesianForModel`) rather than leaving it stale.
- New `base_rotate_ccw`/`base_rotate_cw`/`base_rotation` translation
  keys added to all 7 locale files (`src/locales/*.json`).
- Verified: `tsc --noEmit` clean, `npm run build` succeeds, `npm run
  lint` shows no new warnings on the touched files. Not yet live-verified
  against a real robot - the button-level plumbing reuses the same
  `sendRobotCommand`/`jog` path `handleXYZJog` already sends real
  movement through, but a live device check is still the way to confirm
  ergonomics/feel before calling this fully done.

## [0.2.2] - Camera PIP fix, condensed Android action buttons, WS diagnostics

- **Fixes a robot's Camera PIP showing in the 3D viewport with every
  camera actually disconnected**, reported live. `visionEnabled` (a
  robot-level flag meant to mirror its assigned camera's real `connected`
  state) has its own `true` seed default independent of any camera ever
  connecting, and can drift from the real camera state on reassignment.
  The Camera PIP gate (and its "reopen" button) now also checks the
  camera's own `connected` state, looked up the same `assignedRobotId`
  way `Dashboard.tsx`'s own overview tiles already do - requiring both can
  only ever hide a PIP that was wrongly showing, never hide one that's
  genuinely supposed to be there.
- **Condensed the 3D-viewport action button row (E-STOP/START/PAUSE/HOME/
  HOME XY/RESET/RESET 3D/REPEAT/Add+Delete Point) to icon-only, on
  HYDRA-UMC-ANDROID-CONTROL's embedded WebView specifically** - detected
  via the distinctive token that WebView already appends to its own
  User-Agent (`ThreeDScreen.kt`), not a URL flag any other embedder would
  also trip. STUDIO's own desktop/tablet browser UI is completely
  unaffected - same text+icon buttons as always. Also fixes HOME and HOME
  XY sharing the exact same icon (HOME XY now uses a distinct grid icon)
  and RESET 3D's icon (was a camera/record glyph unrelated to what the
  button does - now a reset/reload icon) - both fixed for every client,
  not just Android, since neither icon choice was ever correct.
- Added real, permanent WebSocket connect/close/delta diagnostics
  (`console.log`, reaches Android's own logcat via `ThreeDScreenConsole`)
  while investigating a live-reported "Android's 3D view and STUDIO's own
  browser tab don't sync with each other" bug - not yet root-caused (the
  architecture read correctly on inspection; next real repro attempt can
  confirm directly whether the embedded WebView's own WS connection is
  opening/receiving deltas at all instead of guessing blind).
- Verified with a real `npm run build` (clean) and `npm run lint`
  (introduced zero new warnings).

## [0.2.1] - Skip the 10s branding splash when embedded (?hideUI=true)

- **Fixes ~10 extra seconds added to opening HYDRA-UMC-ANDROID-CONTROL's
  embedded 3D-viewport WebView, every time.** `App.tsx` showed a fixed,
  unconditional 10-second splash (`HYDRA_UMC_SPLASHSCREEN.svg`) on every
  single mount - correct for a standalone desktop/kiosk session, but
  `ThreeDScreen.kt` loads this exact page fresh via `?hideUI=true&robotId=...`
  every time that tab opens, paying the full 10s of branding on top of the
  WebView's own real cold-start cost every time. `hideUI=true` already
  means "embedded, no chrome" for Dashboard.tsx's own header/sidebar -
  the splash now reads the same flag once at mount and skips itself
  there too.
- Verified with a real `npm run build` (clean).

## [0.2.0] - Real per-model kinematics restored during server-driven playback

- **Fixes incoherent/nonsensical arm movement while playing a loaded WORKS
  file or stock example**, on any real-kinematics model (Parol6, Faze4,
  AR3, AR4, every UR variant, xArm6, Lite6, e.DO, Gen3 Lite, M-710iC,
  SO-ARM100, Gen2, PiPER, Z1, ViperX 300, WidowX 250, Koch). Root cause:
  0.1.9's server-side playback engine (HYDRA-UMC-SERVER) broadcasts each
  recorded point's stored `{j1..j6}` unmodified - correct only for the
  generic model, since a stock example's `{j1..j6}` is always computed
  against the shared generic 160mm/200mm formula (see `withCartesian`'s own
  comment), not that robot's real joint angles. `RobotDetail.tsx` now
  re-derives the correct joints itself, client-side, from the point's
  Cartesian `x/y/z/a/b/c` (already a real, robot-agnostic workspace target)
  via the exact same `resolveTargetJoints()` per-model dispatch jog already
  used - a `useLayoutEffect` scoped to active playback only, so a direct
  joint-slider edit is never fought with a stale re-derivation. Restores
  the same correctness the removed client-side `playRobotTrajectory` loop
  used to have, without needing HYDRA-UMC-SERVER itself to know anything
  about per-model kinematics (that stays purely a STUDIO/Android-WebView
  concern - the same fix applies to both, since Android's own 3D view
  embeds this exact page).
- A handful of defensive `min-h-0` additions on the viewportOnly 3D layout
  chain, found while diagnosing (separately) a blank 3D viewport specific
  to HYDRA-UMC-ANDROID-CONTROL's embedded WebView - not the actual cause
  there (see that repo's own changelog), but the correct standard class for
  a flex-1 child nested this deep regardless.
- Verified with a real `npm run build` (clean, 0 errors).

## [0.1.9] - Chinese and Japanese added to the UI language switcher

- New `src/locales/zh.json` (Simplified Chinese) and `src/locales/ja.json`
  (Japanese) - full translation of every existing key (dashboard, config,
  robot_detail, cameras, modules, help, flasher, tester, kbstage, auth,
  gamepad_config), matching the coverage of the existing en/es/de/fr/it
  files. Wired into `src/i18n.ts`'s `resources` map and into the language
  `<select>` in `Config.tsx` (Config > UI & Themes). New `language_zh`/
  `language_ja` keys added to all 7 locale files so the dropdown's own
  option labels are translated into whichever language is currently active.
  Verified with a real `npm run build` (clean, 0 errors) after the change.
- New `README_zho.md` / `README_jpn.md` documentation translations, plus the
  5 existing README files' language selectors updated to link them.
- **Play/pause/stop no longer depend on this tab driving playback
  locally.** `RobotDetail.tsx`'s own `playRobotTrajectory` (the ~215-line
  local interpolation loop with a real velocity/acceleration curve) is
  removed, along with the effect that used to start it whenever another
  client's own 'play' command arrived. HYDRA-UMC-SERVER's new V0
  server-side playback engine is now the sole driver of playback motion
  for every client, including this one - this component already renders
  `robot.pos`/`robot.joints`/`robot.playbackState` reactively from
  whatever the server broadcasts, the same way it always displayed a
  combined sibling's own state. Fixes play/pause/stop physically doing
  nothing when commanded from Android/iOS/DSI/SUITE while no STUDIO tab
  had that robot's panel open - the server has no such dependency.
  Verified with a real `npm run build` (clean) and `npm run lint`
  (introduced zero new warnings; two now-genuinely-unused things this
  removal exposed - the `playRobotTrajectory` declaration itself and the
  `unthrottledDelay` import it was the last user of - were removed too,
  not suppressed).

## [0.1.8] - Export a recorded trajectory as G-code

- New "Export as G-code" button (`RobotDetail.tsx`, next to Save/Open in
  the Trajectories tab) - exports `robot.recordedPoints` as standard
  G-code (`G21`/`G90`/`G1 X.. Y.. Z.. A.. B.. C..`/`M2`), using each
  point's own Cartesian pose rather than joint angles (G-code is a
  Cartesian tool-path format). A/B/C are emitted for orientation
  following the convention several real G-code dialects already use for
  rotary axes - the generated header comment says this isn't a
  universal 6-DOF standard, so it should be checked against whatever
  downstream machine/viewer actually consumes the file.

---

## [0.1.3] - Hardened against a partial xyTable patch (real crash fix)

- **`VirtualKinematics.tsx` dereferenced `xyTable.tableSize.width`/
  `xyTable.pos.x`/`.y` with no null-guard** - safe as long as `xyTable`
  was either absent or fully populated, but HYDRA-UMC-SERVER's own
  `"jog"` command for an XY table used to broadcast an incomplete patch
  (`{ xyTable: { pos } }`, missing `tableSize`), which this app's own
  shallow delta-merge (`applyRobotDelta`) applied as a top-level-key
  replace - silently deleting `tableSize` from every OTHER connected
  client's state the instant anyone jogged an XY table. The resulting
  `undefined.width` threw during render - a real, reproducible crash to
  a blank page, not a hypothetical. Fixed at the source in
  HYDRA-UMC-SERVER (now sends the complete `xyTable` object); this repo
  also hardened defensively here and in `RobotDetail.tsx`'s trajectory
  interpolation (same field, same fallback pattern already used
  elsewhere in both files) so the same class of partial-patch crash
  can't recur from some other future cause.

## [0.1.1] - Floating layout extended from robot A1 to A2-A8

- **`isFloatingLayout` is no longer per-robot** - was `robot.id === 1`
  (a proof-of-concept flag), now applies to every robot. None of
  `JointControlsOverlay`/`JoystickOverlay`/`XYTableOverlay` had anything
  A1-specific baked in (robot/jogStep/handlers are plain props, per
  [0.1.0] below), so every robot's 3D view now gets the same 3
  mini-windows and the same freed-up vertical space, no other change
  needed. The `Combine with Robot` checkbox (Config tab, right sidebar)
  and every other `combinedWith`-aware code path were already generic
  across all 8 robots and untouched by this - verified they don't live
  inside the classic panel this hides.

## [0.1.0] - Robot A1's floating layout: split into 3 mini-windows

- **Joystick and XY table controls split out of `JointControlsOverlay`
  into their own floating windows** (`JoystickOverlay`, `XYTableOverlay`)
  - matches STUDIO's own draggable/collapsible mini-window style.
  `XYTableOverlay` only mounts while the robot actually `hasXYTable`, so
  it disappears the instant that's disabled instead of showing an inert
  panel.
- **Step size moved into `JointControlsOverlay`**, alongside
  Speed/Acceleration/Joints - previously only available from the classic
  panel below the 3D view, which the floating layout otherwise left with
  nothing meaningful to show.
- **Add Point / Delete Point moved into the horizontal action-button row**
  (E-STOP/START/HOME/RESET/Repeat), in their own small frame right after
  Repeat - freeing the classic Joint Controls panel below the 3D view of
  its last remaining content.
- **The classic Joint Controls panel is now hidden entirely** for the
  floating layout (nothing left to show there once the above moved out),
  so the 3D viewport's own existing `flex: 1 1 0%` sizing naturally
  reclaims that space - no new layout code needed for the "3D view fills
  the vertical space" part, just removing what was competing with it.
- Still scoped to robot A1 only (`isFloatingLayout`, unchanged) - every
  new component takes robot/jogStep/handlers as plain props with nothing
  A1-specific baked in, so extending this to A2-A8 is a follow-up change
  to that one flag, not new component work.

## [0.0.9] - Factory reset + camera/robot assignment fixes

- **3D view's camera PIP window showed even with the camera off.**
  `RobotDetail.tsx` gated the floating camera PIP overlay purely on
  `robot.online` - a robot with vision explicitly disabled
  (`visionEnabled: false`, the same field OverviewPanel/CamerasView's own
  toggle writes) still got a live PIP window the instant it came online.
  Now gated on `online && visionEnabled` for both the robot itself and
  every combined follower; the "reopen a closed PIP" icon row is filtered
  the same way, so it no longer offers a dead button for a disabled
  camera.
- **Overview cards and the camera control buttons ignored camera
  reassignment.** `CameraState.assignedRobotId` exists specifically so
  Config.tsx's own "which robot does this camera serve" dropdown can
  reassign a camera away from its default (camera N -> robot AN) - but
  `Dashboard.tsx`'s `OverviewPanel` (the vision toggle on each robot's
  card) and `CamerasView.tsx`'s connect/retry buttons both matched
  `camera.id === robotId` directly instead, which only happened to work
  for cameras still sitting at their un-reassigned default. Any real
  reassignment (exactly the reported "cameras 1&2 don't behave like
  3-8") made those controls toggle the wrong robot's `visionEnabled` -
  or nothing at all, silently. Both now match on `assignedRobotId`.
- **Factory reset created a fake second controller.** `applyServerData()`'s
  fallback (used whenever `/api/settings` comes back with no real
  controllers - which is exactly what `factoryReset()` produces: it POSTs
  `{}` and reloads) seeded state from the WHOLE `defaultControllers` demo
  array. That array has 2 entries - `[0]` ("HYDRA-UMC Master") was
  correctly rewritten to this page's own real host, but `[1]` ("HYDRA-UMC
  Node 2", hardcoded at the fixed demo IP `192.168.1.101`) was never
  touched, so it came along every time and showed up as a real, selectable
  server entry that never actually existed. Now both fallback branches
  seed from `defaultControllers[0]` alone before rewriting it to the real
  host - `defaultControllers` itself is untouched, still used elsewhere as
  a plain not-undefined fallback.

## [0.0.6] - Non-blocking confirmations + Flasher/Tester Studio render fix

- Replaced 4 blocking `confirm()` calls (E-STOP, factory reset, delete user,
  confirm flash) with the existing non-blocking `ConfirmDialog.tsx`
  component, so none of those actions can freeze the tab on a blocking
  native dialog anymore.
- Hoisted the `tiers` arrays in Flasher/Tester Studio to module-level
  constants instead of recreating them on every render, avoiding
  unnecessary effect re-runs downstream.
- Shipped as build 0.0.5; this 0.0.6 build itself is a verification
  rebuild confirming no regressions, with no further source changes.

## [0.0.1] - Automatic build versioning

- Added `scripts/bump-version.mjs`: bumps `package.json`'s `version` on every
  `npm run build`, using the odometer rule described above.
- Wired it as the first step of the `build` npm script.
- Seeded this `CHANGELOG.md` with a summary of the project's real history
  (below), condensed from the private session log.
- Documented the versioning scheme in `README.md` and its 4 translations.
- No new UI added for this: the **About** dialog already displayed the live
  app version fetched from the server, which itself already read
  `package.json` at startup - that path now simply reflects the bumped
  number automatically after each build + server restart.

---

## Project history (pre-versioning), summarized

Entries below predate this file and the automatic version bump, so they
carry no version number - order reflects roughly how the work happened,
oldest first.

### Real 3D foundations

Read-only audit of the initial scaffold, followed by several passes of real
robot geometry: swapping a placeholder figure for Parol6's actual mesh and
proportions (sourced from real reference links), wiring its real
kinematics, and extending the same "real mesh + real kinematics" treatment
to further robots. A later pass found and fixed the root cause of 3D
trajectory paths drawing incorrectly for robots whose kinematics used a
different Euler rotation order than the renderer assumed.

### CAN-OTA tooling and firmware scaffolding

Brought the CAN-OTA Flasher/Tester screens (previously a "coming soon"
placeholder) to life for both the URTC and HYDRA-UMC tiers, followed by real
scaffolding work on the STM32G474/STM32H745 firmware side. A full-scope
read-only audit (parallel subagents) then produced a confirmed bug list,
fixed in a later pass.

### Robot library expansion to 24 real models

Added Universal Robots' e-Series (5 models) with joint limits/kinematics
pulled from UR's own official ROS2 description repo, plus a grouped
by-manufacturer model picker. Continued in batches through the rest of the
`awesome-robot-descriptions` list: xArm6/Lite 6 (UFACTORY), e.DO (Comau),
Gen3 Lite (Kinova)/M-710iC (FANUC), SO-ARM100, Gen2/PiPER/Z1/ViperX 300/
WidowX 250, Koch v1.1, and the classic UR3/UR5/UR10 line - closing the
series at 24 real robot models plus the Generic placeholder. Along the way:
found and fixed a toolhead-positioning bug affecting every robot, a
byte-for-byte truncated `LICENSE` file, a full `README.md` rewrite, the
`REMOTE_API.md` contract documenting the SUITE/Android/iOS remote clients,
and a per-client remote-access toggle in Config.

### Real authentication and accounts

A background reconnaissance audit fed a real implementation pass. The
owner's own live testing surfaced a real robot-state bug (A1) fixed on the
spot, and a major structural finding: STUDIO never actually had a login
screen despite the server already expecting authenticated requests -
fixed with a real auth middleware, admin/operator account roles, and
per-client (SUITE/Android/iOS) remote-access control. Model-submission
wiring from the sibling HYDRA-UMC-EDITOR-URDF project, and a real
performance bug fix for slow robot-panel entry, followed shortly after.

### Documentation cleanup and localization

Purged historical/dated narrative ("previously...", migration notices tied
to a specific day) from source comments and docs in favor of comments that
explain current behavior only - copyright headers excluded by design.
Translated `README.md` into Spanish, Italian, French, and German
(`README_spa.md`/`README_ita.md`/`README_fra.md`/`README_deu.md`).

### Line-by-line audit and backlog pass

A full line-by-line (not sampled) audit of the backend and `src/` root plus
`components/` (excluding `3d/`), followed by two passes over the
accumulated `mejoras_futuras.txt` backlog. Notable real fix: AR4's inverse
kinematics solver clamped j1/j2/j3 only *after* an unconstrained
Newton-Raphson solve, which could land on an internally inconsistent pose;
changed to clamp after every iteration (projected Newton-Raphson), raising
the realistic-sweep success rate from 32.5% to 58.1% with the remaining
misses confirmed as genuine out-of-reach cases, not solver gaps. A parallel
investigation into Faze4's own non-convergence confirmed it as the same
kind of real geometric reach limit, not a bug.
