<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🖥️ HYDRA-UMC STUDIO

<p align="center">
  🇺🇸 <b>English</b> |
  <a href="README_spa.md">🇪🇸 Español</a> |
  <a href="README_fra.md">🇫🇷 Français</a> |
  <a href="README_ita.md">🇮🇹 Italiano</a> |
  <a href="README_deu.md">🇩🇪 Deutsch</a> |
  <a href="README_zho.md">🇨🇳 简体中文</a> |
  <a href="README_jpn.md">🇯🇵 日本語</a>
</p>


### 🤖 Web-Based Control Dashboard for the HYDRA-UMC Multi-Robot Micro-Factory

<p align="left">
  <img src="https://img.shields.io/badge/License-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Vite">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="Three.js">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="TypeScript">
</p>


---

## 🎯 Overview

**HYDRA-UMC STUDIO** is the browser-based control dashboard for [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - the multi-robot micro-factory motherboard (Raspberry Pi CM5 host + dual-core STM32H745 real-time co-processor) that orchestrates up to 8 distributed robot arms over a single FDCAN bus. Where HYDRA-UMC's own repository covers the hardware and firmware, this repository is the human-facing side: a single-page React application that visualizes every robot in real 3D, jogs and records their motion, manages the machines and accessories that go alongside a robot cell, and flashes/tests the whole CAN-OTA firmware chain - all from one browser tab, no native install required beyond Node.js.

**Honesty note, matching the rest of this ecosystem's own documentation convention:** HYDRA-UMC's own real hardware doesn't exist yet as tested silicon (its bootloaders compile clean but haven't run on real boards - see that repository's own `docs/architecture.md`). This dashboard therefore runs its CAN-OTA Flasher/Tester tools against a full built-in simulation that follows the real, documented addressing scheme for every tier, rather than pretending to talk to hardware that isn't there. The 3D robot visualization, kinematics, trajectory recording, and every accessory control panel are fully real and independent of that - only the CAN-OTA transport itself is simulated for now.

Built with **React 19**, **Vite**, **Three.js** (via `@react-three/fiber`/`@react-three/drei`), and **TypeScript** - a pure client with no backend code of its own. Persistent state lives on the separate **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** backend this app talks to over the network.

---

## 🦾 Multi-Robot 3D Control

Manage multiple independent 6-DOF robots simultaneously, each with its own real 3D model, kinematics, and jog/trajectory state. The model picker (RobotDetail → Config tab) groups every available robot by manufacturer:

- 🏭 **Source Robotics** - Parol6, Faze4 (MIT-licensed and GPL-3.0-licensed meshes respectively, see each model's own `ATTRIBUTION.txt`)
- 🏭 **Annin Robotics** - AR3, AR4 (MIT-licensed meshes)
- 🏭 **Universal Robots** - UR3e, UR5e, UR10e, UR16e, UR20 - official geometry, joint limits, and link kinematics pulled directly from Universal Robots' own [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) repository (BSD-3-Clause), covering the small-to-heavy payload range of their e-Series lineup
- 🏭 **Universal Robots (classic)** - UR3, UR5, UR10 - the pre-e-Series CB lineup, official geometry/DH parameters from Universal Robots' own [universal_robot](https://github.com/ros-industrial/universal_robot) ROS-Industrial repository (BSD-3-Clause)
- 🏭 **UFACTORY** - xArm6, Lite 6 (BSD-3-Clause meshes, official [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2) geometry/kinematics)
- 🏭 **Comau** - e.DO (BSD-3-Clause meshes, official [eDO_description](https://github.com/ianathompson/eDO_description) geometry/kinematics)
- 🏭 **Kinova** - Gen3 Lite, Gen2 (BSD-3-Clause meshes, official [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex) geometry/kinematics)
- 🏭 **FANUC** - M-710iC (BSD-3-Clause meshes, official [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description) geometry/kinematics)
- 🏭 **The Robot Studio** - SO-ARM100, a 5-DOF (not 6) low-cost arm (Apache-2.0 meshes, official [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100) geometry/kinematics)
- 🏭 **AgileX** - PiPER (Apache-2.0 meshes, official [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description) geometry/kinematics)
- 🏭 **Unitree** - Z1 (BSD-3-Clause meshes, via Google DeepMind's [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) - each robot folder there keeps its own original manufacturer license)
- 🏭 **Trossen Robotics** - ViperX 300, WidowX 250 (BSD-3-Clause meshes, official [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators) geometry/kinematics)
- 🏭 **Koch / Low-Cost Robot Arm** - Koch v1.1, another 5-DOF (not 6) low-cost arm (Apache-2.0 meshes, via [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie))
- ⚙️ **Generic** - a simplified two-link arm for any rig without a dedicated model

That's 24 real robot models across 13 manufacturers, plus the Generic placeholder - see the license table further down for the exact model↔manufacturer↔license mapping this list summarizes. Every real model (everything except Generic) loads its actual STL mesh geometry per link and drives it through that manufacturer's own real joint transform chain - not a stylized placeholder. Forward/inverse kinematics are computed against each robot's own real geometry (Newton-Raphson solve for position, real per-joint limits where the robot defines any), so a recorded trajectory or a jogged Cartesian target moves the correct arm the way the physical robot actually would. Universal Robots' 5 e-Series models additionally share one common FK/IK engine (`src/examples/urKinematicsShared.ts`) and one common 3D rig renderer (`src/components/3d/URArm.tsx`), since every UR e-Series joint shares the exact same kinematic structure - only the numeric link lengths differ per model. The 3 classic UR models (UR3/UR5/UR10) share their own separate engine and renderer instead (`src/examples/urClassicKinematics.ts`, `src/components/3d/UrClassicArm.tsx`), since that older generation's joints don't all share a common local Z axis the way e-Series does.

Per-robot jog controls include a rotary knob + slider for both **speed** and **acceleration** on every axis, and a full endstop/status readout alongside a live "Robot Controller Board" status card once CAN-OTA is wired to real hardware. Every knob/slider snaps to the jog **Step** value selected in its own combobox (0.1° up to 100°/mm) rather than moving continuously. Robot **A1** is a running proof of concept for a different layout: its Speed/Acceleration/J1-J6/XYZ jog controls live in a draggable floating panel on top of the 3D viewport itself (`Joystick3D.tsx` for the XYZ pad) instead of the panel below it that every other robot still uses - see `src/components/robots/A1.tsx`.

---

## 🏭 Kinematic Brain Stage

A dedicated control panel for the HYDRA-UMC motherboard's own local motion subsystem - the STM32H745's directly-driven axes, separate from the distributed robot arms on STACK A:

- 📐 **XY gantry** jog control for the X, Y1, Y2 (dual-Y gantry), and Z axes
- 🔥 **Heated bed** control (SSR-switched, 230VAC)
- 🔄 **ATC revolver** - rotary tool-index control for the E0-driven automatic tool changer
- 🎢 **Conveyor** - installed/running/speed control for the E1-driven transport belt
- 🛑 A full 12-endstop grid, 3 fan channels, and 10 pumps/10 valves for process fluidics

---

## 🎛️ Accessory & Machine Control Panels

Dedicated panels for the machines and accessories that go alongside a robot cell: **XY Table**, **ATC Tools**, **Rack Manager**, **Pick & Place** (including JuanenPnP/LumenPnP-specific configuration), **CNC** (including JuanenCNC-specific configuration), **Laser** (including JuanenLaser-specific configuration), **Vacuum Table**, and **Heated Bed**.

---

## 🔄 Works & Trajectories

Load canned example trajectories, jog-and-record your own points live, or load/save/edit/play back complex multi-point trajectories (JSON) per robot. Trajectories are portable between robot models - each recorded point is resolved through that specific robot's own real kinematics (`src/examples/robotKinematicsDispatch.ts`) at load/draw/play time, not baked against whichever robot happened to record it, so the same trajectory file drives a Parol6 and a UR10e correctly along their own real reachable geometry.

---

## 🛠️ CAN-OTA Firmware Tools

Flash and self-test firmware across the whole HYDRA-UMC + URTC CAN-OTA chain from one dashboard, with two dedicated entry points:

- **URTC → Flasher / Tester** - for the URTC Tool Head board and its own expansion boards (matches the standalone [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER) desktop tools' own protocol coverage)
- **HYDRA-UMC → Flasher / Tester** - for the Robot Controller Board and Kinematic Brain tiers, relayed the whole way from CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, with no JTAG/SWD probe and no USB-CAN dongle needed (see [HYDRA-UMC's own `docs/architecture.md`](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) for the full addressing/relay design)

Both can download real firmware releases straight from GitHub (`firmware_manifest.json`-based, CRC32-verified) for either the `URTC` or `HYDRA-UMC` repository. As noted above, the transport itself runs against a full built-in simulation until real STM32H745 firmware exists on real hardware to talk to.

---

## 🎮 Gamepad Support

USB and Bluetooth controller integration with custom per-button/per-axis mappings, for jogging robots and accessories without a mouse/keyboard. Real-time actions (joint/table jog, E-STOP, START/STOP, playback speed) fire the same atomic `sendRobotCommand()` path the jog buttons in the robot detail panel use, not the debounced settings save - see `GamepadController.tsx`.

---

## 📹 Camera Integration

Up to 8 simultaneous live feeds (USB vision or thermal MLX90640/41/42-family sensors) with recording and inference status - the camera matrix HYDRA-UMC's own dual USB 3.0 hub subsystem is built around.

---

## 🌐 Multi-Language UI

Full interface translation across **English, Spanish, German, French, Italian, Simplified Chinese, and Japanese** (`src/locales/`), including the in-app Help menu, the About dialog (version/author/license), and every tab of the System Configuration dialog. Coverage isn't 100% of every screen yet - a handful of standalone accessory panels are still hardcoded English, not yet reached by translation work.

---

## ℹ️ About & System Configuration

Two standalone dialogs, both reachable from the header (`Config`/`About` buttons): **About** shows the running app version (read live from `GET /api/hydra-info`), author, and license; **Config** covers server identity, controller/node management, UI theme + language, robot renaming, camera↔robot mapping with conflict detection, the custom URDF library, third-party software integrations (OpenPnP/CNC/Laser backends), per-client remote access (independent switches for SUITE/Android/iOS), user accounts, per-robot work directories, CAN-OTA transport, and gamepad mapping - each its own tab. Both are their own components (`src/components/About.tsx`, `src/components/Config.tsx`), not inlined into the main dashboard shell.

## 🛡️ Reliability

The app protects itself against two different classes of runtime failure, both born from a real production incident (a kiosk display going black after a redeploy). `src/main.tsx` listens for Vite's own `vite:preloadError` event - emitted when a browser tab left open across a redeploy tries to fetch a `React.lazy()`-loaded panel chunk (every `Dashboard.tsx` panel, content-hashed per `vite.config.ts`) that no longer exists under its old hash - and reloads the page once automatically, so a long-lived kiosk tab or a stale background tab self-heals without anyone noticing. A `sessionStorage` guard stops that from reload-looping forever if a chunk is genuinely missing for some other reason. Separately, `src/components/ErrorBoundary.tsx` wraps the `<Suspense>` panel area as a backstop for any other render crash; it's keyed by the active tab, so switching away from a crashed panel actually retries the next one instead of leaving the whole dashboard stuck on a fallback screen.

## 🔐 Accounts & Access

Every backend seeds one account on its own first-ever start - username `admin`, password `admin` - change it from **Config > Users** as soon as the server is reachable beyond a fully trusted LAN. That same tab lets an admin account create additional **operator** accounts: an operator can sign in, watch live state, and drive robots (jog/play/pause/stop/tool/valve/pump/speed), but can't overwrite global settings or manage other accounts. No account is required just to look around - the login screen's own "Continue read-only" skips straight to the dashboard with writes disabled. Full contract (roles, tokens, the `/api/users` routes) documented in [HYDRA-UMC-SERVER's own `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) sections 2a/2b.

Each of the 3 remote clients (SUITE, Android, iOS) self-identifies via an `X-Hydra-Client` request header, so **Config > Remote Access** can allow or block each one independently instead of one combined switch for all three.

---

## 💾 Persistent State

HYDRA-UMC STUDIO itself is a pure client - it holds no state of its own beyond what's in memory for the current session. All persistence (`settings.json`, `users.json`, saved trajectories under `WORKS/`, submitted models) lives on the separate **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** backend this app talks to over the network (see that project's own `data/` and README for the full picture) - state survives a page reload or this app's own redeploy, since neither of those touches the backend process at all. `settings.json` itself is deliberately excluded from that backend's static file serving (it holds controller IPs, CAN-OTA configuration, and full per-robot state), even though its `WORKS/` folder is served normally.

The same `GET`/`POST /api/settings` contract, plus a discovery endpoint (`GET /api/hydra-info`) and a `WebSocket /ws` for live push updates, is also how external clients connect to that same backend - this is what lets [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) discover a running HYDRA-UMC SERVER instance on the network, read/modify its state, and see changes made from this app's own browser tab reflected live (and vice versa). Full contract in [HYDRA-UMC-SERVER's own `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` powers the Overview dashboard footer: CPU load and memory usage are always real (Node's own `os` module); temperature reads real `vcgencmd measure_temp` output when running on an actual Raspberry Pi and falls back to a clearly-flagged mock otherwise (`temp_is_real` in the response); Wi-Fi/Ethernet/Bluetooth status are read from `/sys/class/net`/`/sys/class/bluetooth` (Linux-only, `null`/unknown on any other host rather than a guessed value).

---

## 📂 Repository Structure

```text
HYDRA-UMC-STUDIO/
├── src/
│   ├── Dashboard.tsx            # Top-level app shell - navigation, Overview panel, footer system metrics
│   ├── store.tsx                # Global state: RobotModel/RobotState/HydraController/SystemSettings -
│   │                             # talks to the separate HYDRA-UMC-SERVER backend over REST + WebSocket
│   ├── i18n.ts                  # react-i18next setup - loads src/locales/*.json
│   ├── components/
│   │   ├── About.tsx, Config.tsx  # System Configuration and About dialogs - standalone components
│   │   │                       # reading the same global store, not inlined into the dashboard shell
│   │   ├── ConfirmDialog.tsx    # Shared yes/no confirmation modal
│   │   ├── ErrorBoundary.tsx    # Backstop for any panel render crash - keyed by active tab, see 🛡️ Reliability
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # Login screen and the Config > Users admin/operator account manager
│   │   ├── AdminServer.tsx, AdminLogs.tsx, AdminClients.tsx  # Ecosystem menu: Server Admin, Server
│   │   │                       # Logs, and Connected Apps panels
│   │   ├── EcosystemServices.tsx, EcosystemTelemetry.tsx, AiFamilyStatus.tsx  # Ecosystem menu:
│   │   │                       # Services, Telemetry, and AI Family status panels
│   │   ├── SystemSupervisor.tsx  # Ecosystem menu: Netdata-style real-time CPU/memory/disk/temp/
│   │   │                       # process supervisor, polling HYDRA-UMC-SERVER's GET /api/system/supervisor
│   │   ├── RobotDetail.tsx      # Shared per-robot jog/trajectory/config implementation (the model
│   │   │                       # picker lives here) - every robots/A*.tsx entry point below renders this
│   │   ├── robots/A1.tsx .. A8.tsx  # Per-robot entry points - thin re-exports of RobotDetail.tsx, the
│   │   │                       # place to grow any future robot-specific behavior without touching the
│   │   │                       # other 7. A1 is the one exception already: RobotDetail.tsx's own
│   │   │                       # `isFloatingLayout` branch (robot.id === 1) moves Speed/Acceleration/
│   │   │                       # J1-J6/XYZ jog into a draggable overlay on the 3D viewport instead of
│   │   │                       # the panel below it.
│   │   ├── Joystick3D.tsx       # XYZ jog D-pad used by that floating overlay
│   │   ├── VirtualKinematics.tsx  # The React Three Fiber <Canvas> scene host
│   │   ├── KinematicBrainStage.tsx  # XY gantry / heated bed / ATC revolver / conveyor panel
│   │   ├── Flasher.tsx, Tester.tsx  # CAN-OTA tools (URTC and HYDRA-UMC tiers)
│   │   ├── ATCToolsConfig.tsx, RackConfigView.tsx, PickAndPlace.tsx, CNC.tsx, Laser.tsx,
│   │   │   VacuumTableConfig.tsx, HeatedBedConfig.tsx, XYTableConfig.tsx
│   │   │                       # Accessory/machine control panels
│   │   ├── JuanenPnPConfig.tsx, LumenPnPConfig.tsx, JuanenCNCConfig.tsx, JuanenLaserConfig.tsx
│   │   │                       # Machine-specific configuration variants - not yet wired into any
│   │   │                       # navigation path (dead code)
│   │   ├── CamerasView.tsx, GamepadConfig.tsx, GamepadController.tsx, HelpModal.tsx
│   │   ├── FuturisticSlider.tsx, RotaryKnob.tsx  # Shared jog control widgets
│   │   └── 3d/
│   │       ├── RobotArm.tsx     # Dispatches to the correct per-model rig by robot.model
│   │       ├── Parol6Arm.tsx, Faze4Arm.tsx, AR3Arm.tsx, AR4Arm.tsx, EdoArm.tsx, Gen2Arm.tsx,
│   │       │   Gen3LiteArm.tsx, Lite6Arm.tsx, M710icArm.tsx, PiperArm.tsx, SoArm100Arm.tsx,
│   │       │   Vx300sArm.tsx, Wx250sArm.tsx, XArm6Arm.tsx, Z1Arm.tsx, KochArm.tsx,
│   │       │   LumenPnPRig.tsx, GenericRobotArm.tsx
│   │       │                   # Manufacturer-specific rigs, each hand-transcribed from its own real URDF
│   │       ├── URArm.tsx, UrClassicArm.tsx  # Shared parametrized rigs for the e-Series/Classic Universal Robots lines
│   │       ├── UR3eArm.tsx, UR5eArm.tsx, UR10eArm.tsx, UR16eArm.tsx, UR20Arm.tsx,
│   │       │   Ur3ClassicArm.tsx, Ur5ClassicArm.tsx, Ur10ClassicArm.tsx
│   │       │                   # Thin per-model wrappers around URArm.tsx / UrClassicArm.tsx
│   │       ├── Shared3DEnvironment.tsx, SharedModule3DView.tsx, PathVisualizer.tsx,
│   │       │   Toolhead.tsx, DraggableGizmo.tsx, ATC3DView.tsx, Rack3DView.tsx
│   │       │                   # Scene environment, trajectory drawing, tool/gizmo rendering
│   ├── examples/
│   │   ├── kinematics.ts, utils.ts, robotKinematicsDispatch.ts
│   │   │                       # Shared generic 2-link kinematics + per-model dispatch
│   │   ├── parol6Kinematics.ts, faze4Kinematics.ts, ar3Kinematics.ts, ar4Kinematics.ts,
│   │   │   edoKinematics.ts, gen2Kinematics.ts, gen3LiteKinematics.ts, kochKinematics.ts,
│   │   │   lite6Kinematics.ts, m710icKinematics.ts, piperKinematics.ts, soArm100Kinematics.ts,
│   │   │   xarm6Kinematics.ts, z1Kinematics.ts
│   │   │                       # Manufacturer-specific real FK/IK
│   │   ├── urKinematicsShared.ts, urClassicKinematics.ts  # Shared FK/IK engine for the e-Series/Classic UR lines
│   │   ├── ur3eKinematics.ts, ur5eKinematics.ts, ur10eKinematics.ts, ur16eKinematics.ts, ur20Kinematics.ts,
│   │   │   ur3ClassicKinematics.ts, ur5ClassicKinematics.ts, ur10ClassicKinematics.ts
│   │   │                       # Thin per-model UR chain/limits/home-pose data
│   │   └── list/                # 26 canned example trajectories (circles, spirals, XY-table patterns, pick-and-place, ...)
│   ├── lib/canOta.ts            # CAN-OTA simulation/protocol layer, GitHub firmware download
│   ├── lib/apiBase.ts           # Backend URL resolution - relative+proxied in dev, VITE_API_BASE_URL in prod
│   └── locales/                 # en/es/de/fr/it/ja/zh translation files (react-i18next)
├── public/
│   ├── models/                  # Real 3D mesh assets - one folder per robot (24 total),
│   │                             # each with its own ATTRIBUTION.txt - see the license table below
│   ├── WORKS/                   # Example saved trajectories, one folder per robot
│   ├── settings.json            # Seeded example settings for a fresh checkout
│   └── favicon.svg, icons.svg   # App icon and shared icon sprite
├── images/                       # README banner
├── tests/                        # Real Vitest suite (141 tests) - src/examples/ FK/IK math only, no React/DOM
│   ├── utils.test.ts             # Shared generic-arm FK/IK pair + its 5 path generators
│   ├── urKinematicsShared.test.ts  # Real DH-chain FK + Newton-Raphson IK engine (via the real UR5e chain)
│   ├── parol6Kinematics.test.ts  # Parol6's own hard-coded real chain
│   └── robotKinematicsDispatch.test.ts  # One generic suite parametrized over all 24 real robot models
├── tools/
│   ├── build_test.py            # Non-versioning build/compile check
│   ├── ci_validate.py           # Manifest/CHANGELOG/docs validation used by CI
│   └── generate_portable_works.py  # Regenerates public/WORKS/'s example trajectories
├── example_trajectory.json       # Standalone example trajectory (joint-angle sequence, sample data)
├── metadata.json                 # App name/description (used by the hosting platform)
├── bump_manifest_version.py      # Syncs hydra-umc.project.json's version to the native one (--sync)
├── build.sh / build.bat          # Install deps + production build
├── build-test.sh / build-test.bat  # Non-versioning build/compile check
├── dev.sh / dev.bat              # Install deps + start the Vite dev server
├── vitest.config.ts              # Vitest config (tests/ only, real node environment - no DOM needed)
├── tsconfig.test.json            # Standalone typecheck project for tests/ (kept separate from the app/node references)
├── .env.example                  # VITE_API_BASE_URL template - see src/lib/apiBase.ts
├── README.md                     # this file
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md / README_zho.md / README_jpn.md  # translations
```

The backend this app talks to (settings persistence, the REST/WebSocket API, `docs/REMOTE_API.md`) lives in the separate **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** repository, not in this one - see that project's own README for its structure and how to run it.

---

## 🛠️ Development Environment

### Requirements
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm
- A running **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** backend (`npm run dev` there too, default port `3000`) - this app is a pure client and has nothing to talk to without it.

### Installation

```bash
npm install
```

### Development Mode

Runs Vite's own dev server (plain `vite`, port `5173`) with live-reloading. `vite.config.ts`'s own `server.proxy` transparently forwards `/api`, `/ws`, and `/WORKS` to `http://localhost:3000`, so the app's relative-path fetch/WebSocket calls reach the HYDRA-UMC SERVER backend with no CORS setup needed - just make sure that backend is running first:
- **Windows:** double-click `dev.bat` or run `npm run dev`
- **Linux/Mac:** run `./dev.sh` or `npm run dev`

### Automated Tests

```bash
npm test          # vitest run - 141 real tests over src/examples/
npm run typecheck # tsc -b --noEmit (src/) + tsc -p tsconfig.test.json --noEmit (tests/)
```

Found in an ecosystem-wide software-improvements audit: `src/examples/` (the FK/IK math for every one of the 24 real robot models `robotKinematicsDispatch.ts` fans out to - `utils.ts`'s shared generic-arm formula, `urKinematicsShared.ts`'s real DH-chain + Newton-Raphson engine shared by every UR-family model, `parol6Kinematics.ts`'s own hard-coded chain, and the 23 per-robot `*Kinematics.ts` files themselves) had zero automated test coverage. Fixed: `tests/` (new, Vitest) - 141 tests, most of them one generic, parametrized suite over `robotKinematicsDispatch.ts`'s own dispatch table rather than 23 near-duplicate bespoke files, so a new robot added to that table is covered automatically. Separately: `npm run typecheck` was *also* itself a silent no-op the whole time - `tsc --noEmit` alone against this repo's own solution-style root `tsconfig.json` (`"files": []`, only project `"references"`) checks nothing at all; the real fix needs project build mode (`tsc -b --noEmit`), which immediately surfaced 8 real, pre-existing type errors (now fixed) that had been silently accumulating since `vite build`'s own esbuild/SWC transpilation never type-checks. See [`CHANGELOG.md`](CHANGELOG.md) for the full breakdown.

### Production Build

Compiles into an optimized static build (plain `vite build` - no server bundling, this app has no backend code left):
- **Windows:** double-click `build.bat` or run `npm run build`
- **Linux/Mac:** run `./build.sh` or `npm run build`

Preview the production build locally with:
```bash
npm run preview
```

Deploy the resulting `dist/` folder to any static host. By default the built app looks for its backend at this same page's own hostname on port `3000` (matches the common "everything on the CM5" deployment); set `VITE_API_BASE_URL` at build time (see `.env.example`) to point it at a HYDRA-UMC SERVER instance hosted elsewhere. All real state and data persist on that backend's own `data/` directory, not in this repository.

### Versioning

`bump_manifest_version.py` (repo root) is the single owner of both `hydra-umc.project.json` and `package.json`'s own `version` field - `npm run build` (`vite build`) is deliberately compilation-only so it can never create drift between them by bumping one and not the other. `scripts/bump-version.mjs` is a legacy native-only helper kept for reference; nothing in this repo calls it anymore. The scheme itself is still the ecosystem-wide base-10 "odometer": patch +1 per real bump, rolling over into minor (and minor into major) past 9 rather than ever reaching a two-digit segment (`0.0.9` -> `0.1.0`, not `0.0.10`). The running version is visible live in the **About** dialog (read from `GET /api/hydra-info`, which the Express server reads straight from `package.json` at startup), and the full history is in [`CHANGELOG.md`](CHANGELOG.md).

---

## 🔗 Related Projects

This project is part of the HYDRA-UMC robotics ecosystem by the same author (JuanenRac / Electro Hobby 3D). Worth knowing about, since a request might actually be about one of these rather than this repository.

**Parent Project**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — the real headless backend (REST/WebSocket) every control client actually talks to; this dashboard is a pure frontend client of it, no backend code of its own.

**Sibling Projects** — also talk to HYDRA-UMC-SERVER's own API, each their own client
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — desktop (PySide6) swarm command center for multiple servers at once, packaged as a standalone executable.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — native Android control app with biometric login and a paired Wear OS companion.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — iOS/iPadOS control app (Flutter) with real-time WebSocket sync.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — native touch UI for the onboard 7" DSI touchscreen, embedded on the CM5 itself.
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — coordination boundary for AGV/AMR fleets via a real VDA 5050 MQTT publisher.
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — high-level CNC-cell coordinator with real GRBL status/control-byte access.
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — coordination boundary for legged/humanoid droids, with a real Boston Dynamics Spot command sender.
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — laser-cell safety coordinator reading 3 real key/enclosure/interlock GPIO safeguards.
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — safe high-level board-flow coordinator for OpenPnP pick-and-place.
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — safe coordination boundary for Moonraker/Klipper 3D printers, with real gated job commands.
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — safety coordinator with a real, lazily-imported rclpy ROS 2 transport.
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — coordination boundary for camera-equipped UAVs, with a real MAVLink command sender.

**Child Projects**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — desktop graphical URDF creator/editor that pushes finished models into this dashboard's own catalog via `POST /api/models/submit`.

**Directly Related**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — Smart Summaries and Anomaly Highlighting panels over DATALAKE/ANOMALY-DETECTOR, with an honest statistical fallback; extends this same dashboard with AI-driven insights.
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — integration hub for the Hailo-10 cognitive pipeline (LLM/VLA/voice orchestration); adds voice/natural-language control over this dashboard.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — real voice front-end (VAD + intent parser) with a bounded, confirmation-gated Watch relay; adds voice/natural-language control over this dashboard.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — integration hub for the digital-twin engine, with a real version-compatibility sync contract; lets you preview on the digital twin before touching the real robot, right from this dashboard.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — real hardware-in-the-loop safety interlock routing commands between simulation and real hardware; lets you preview on the digital twin before touching the real robot, right from this dashboard.

**Also Part of the Ecosystem**

*Core Hardware & Platform*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — the physical robot-arm motherboard: CM5 host + dual-core STM32H745, orchestrating up to 8 tool arms over CAN-OTA/SPI-OTA.
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — reproducible Raspberry Pi OS product layer for the CM5: read-only agent, validated config/profiles, WiFi first-contact provisioning.
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — the shared JSON-Schema contract and safety-gate boundary every bridge validates its commands against.

*URTC Tool Platform*
- **[URTC](https://github.com/JuanenRac/URTC)** — firmware for the physical Universal Robot Tool Controller PCB, 25+ tool profiles over CAN bus.
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — desktop GUI flashing tool for URTC boards, CAN-OTA plus full-chip SWD/JTAG.
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — desktop live CAN-bus diagnostic tool for URTC boards, one panel per tool profile.
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — browser-based alternative to URTC-TESTER via the Web Serial API, no local install needed.

*Vision AI Node (Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — integration hub for the Hailo-8 vision pipeline, with a real per-stage hardware-readiness check.
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — real compiled-model registry with Hailo-architecture/checksum safe-load verification.
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — real GStreamer pipeline + MediaMTX config generator with a real HailoRT integration boundary.
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — real Position-Based Visual Servoing correction law, safety-gated on upstream zone state.
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — real zone-breach checking and E-STOP requesting, with calibration-freshness enforcement.

*Cognitive AI Node (Hailo-10)*
- **[HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE)** — real action-token encoding/decoding and trajectory generation for a Vision-Language-Action model.
- **[HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER)** — real rule-based task decomposition and semantic error recovery over MCU error codes.
- **[HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)** — real stdlib-only TF-IDF document search over this ecosystem's own Markdown docs.

*Orchestration & Swarm*
- **[HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR)** — integration hub with a real gRPC/Protobuf health-report contract and mission state machine.
- **[HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER)** — real priority-based job queue with deduplication, over a real HTTP API.
- **[HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)** — real gRPC-based fleet health watchdog with retry/backoff and identity-mismatch detection.
- **[HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D)** — real RRT-based 3D path planner with real obstacle/workspace collision validation.
- **[HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC)** — real CRDT LWW-Element-Map state sync, property-tested for multi-cell convergence.

*Digital Twin & Simulation*
- **[HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA)** — real forward kinematics and joint-limit validation over a real URDF subset.
- **[HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)** — real procedural 2D scene generator with YOLO/COCO annotation export.

*Data & Analytics*
- **[HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE)** — real sqlite3-backed time-series store with a real ingest/query HTTP API.
- **[HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR)** — real FFT + statistical baseline anomaly detector with drift monitoring.
- **[HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)** — real OEE/availability calculation over DATALAKE history, with reproducible CSV export.
- **[HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR)** — real CAN/WebSocket ingestion pipeline into DATALAKE, with sequence deduplication.

*Industrial Gateway*
- **[HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL)** — integration hub relaying to industrial protocols, with a real command allowlist/backpressure layer.
- **[HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER)** — real OPC-UA address space, verified with a real binary-protocol client session.
- **[HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER)** — real MQTT broker with optional per-client authentication and topic ACLs.
- **[HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)** — real MTConnect `/probe` and `/current` XML endpoints with degraded-mode output.

*Complementary Tools & Ecosystem Operations*
- **[HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)** — fleet CLI with a real, stable exit-code contract, a genuine live client of HYDRA-UMC-SERVER's own API.
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — WearOS companion app with real haptic alerts and a paired-phone voice relay.
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — firmware for a board-mounting rack with real tool-ID decoding and Smart Idle pre-heating logic.
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — firmware plus a real Python vision companion for a thermal/RGB inspection tool head.
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — administrative desktop tool that discovers, clones and updates every repo in this ecosystem.
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** — Windows/Linux desktop tool that builds a ready-to-flash CM5 image pre-loaded with the ecosystem's most current versions, with Raspberry-Pi-Imager-style first-boot Wi-Fi/user/SSH configuration.

---

## 📚 Documentation & Community

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — tech stack and coding guidelines for a pull request.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — the standards of behavior expected in this community.
- **[SECURITY.md](SECURITY.md)** — how to report a vulnerability, and this project's own real security focus areas.
- **[SUPPORT.md](SUPPORT.md)** — where to ask questions and report bugs.
- **[LICENSE.md](LICENSE.md)** — this project's own license.

## 👤 AUTHOR
**JuanenRac** (Electro Hobby 3D)
📧 electrohobby3d@gmail.com
📺 [youtube.com/@electrohobby3d](https://youtube.com/@electrohobby3d)

## 📜 LICENSE

HYDRA-UMC STUDIO is (c) 2026 JuanenRac (Electro Hobby 3D). This notice must be included in any distributions of this project or derivative works.

The source code of this application is available under the **GNU General Public License v3.0 (GPL-3.0)**. Full text at https://www.gnu.org/licenses/gpl-3.0.html.

The documentation (this README and its own translations - `README_spa.md`, `README_ita.md`, `README_fra.md`, `README_deu.md`, `README_zho.md`, `README_jpn.md`) is available under **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**. Full text at https://creativecommons.org/licenses/by-sa/4.0/.

**Third-party robot mesh assets:** the real 3D geometry under `public/models/` is NOT covered by the GPL-3.0 above - each robot model's own mesh files are separately-licensed, third-party assets, redistributed here under their own original terms:

| Manufacturer | Models | License |
|---|---|---|
| Source Robotics | Parol6 | GPL-3.0 |
| Source Robotics | Faze4 | MIT |
| Annin Robotics | AR3, AR4 | MIT |
| Universal Robots | UR3e, UR5e, UR10e, UR16e, UR20 | BSD-3-Clause |
| UFACTORY | xArm6, Lite 6 | BSD-3-Clause |
| Comau | e.DO | BSD-3-Clause |
| Kinova | Gen3 Lite | BSD-3-Clause |
| FANUC | M-710iC | BSD-3-Clause |
| The Robot Studio | SO-ARM100 | Apache-2.0 |
| Kinova | Gen2 (j2s6s200) | BSD-3-Clause |
| AgileX | PiPER | Apache-2.0 |
| Unitree | Z1 | BSD-3-Clause |
| Trossen Robotics | ViperX 300, WidowX 250 | BSD-3-Clause |
| Koch / Low-Cost Robot Arm | Koch v1.1 | Apache-2.0 |
| Universal Robots (classic) | UR3, UR5, UR10 | BSD-3-Clause |
| Opulo | LumenPnP v4 (also used for JuanenPnP) | CERN-OHL-W v2 |

Each model's own exact source repository, path, and license text reference lives in that model's own `public/models/<slug>/ATTRIBUTION.txt` - consult that file before redistributing a specific mesh set, rather than assuming the table above is a substitute for it. LumenPnP's own `ATTRIBUTION.txt` is worth reading in full - unlike every robot arm above (a manufacturer's own pre-made STL files, downloaded verbatim), those 5 mesh files were generated in-house from Opulo's real FreeCAD source, not redistributed as-is.

This dashboard is the web control panel for the [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) motherboard project - see that repository for its own hardware (CERN-OHL-S v2) and firmware (GPL-3.0) licensing, which this repository's own license doesn't extend to, and vice versa. It also implements CAN-OTA tooling against the [URTC](https://github.com/JuanenRac/URTC) protocol - see that project's own repository for its own separate license.

If you build on this project, keep the licensing split in mind: code changes should stay GPL-3.0, documentation derivatives should stay CC BY-SA, and any redistribution of a specific robot's mesh assets should stay under that model's own original license - each with attribution back to this project and its author.
