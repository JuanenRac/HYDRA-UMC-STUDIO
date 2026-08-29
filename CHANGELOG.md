# Changelog

All notable work on **HYDRA-UMC STUDIO** is summarized here, newest first.

## Versioning scheme

`package.json`'s `version` field bumps automatically on every real production
build (`npm run build` - see `scripts/bump-version.mjs`, wired as the first
step of the `build` script). It follows a simple base-10 "odometer" rule
rather than semantic-versioning judgment calls:

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
