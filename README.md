<!-- =============================================================================
HYDRA-UMC-STUDIO - Web control dashboard of the HYDRA-UMC multi-robot micro-factory
Copyright (C) JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0-or-later - see LICENSE
============================================================================= -->

<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🤖 HYDRA-UMC-STUDIO

<p align="center">🇺🇸 <b>English</b> | <a href="README_spa.md">🇪🇸 Español</a> | <a href="README_fra.md">🇫🇷 Français</a> | <a href="README_ita.md">🇮🇹 Italiano</a> | <a href="README_deu.md">🇩🇪 Deutsch</a> | <a href="README_zho.md">🇨🇳 简体中文</a> | <a href="README_jpn.md">🇯🇵 日本語</a> | <a href="README_por.md">🇵🇹 Português</a></p>

### 🤖 Web-Based Control Dashboard for the HYDRA-UMC Multi-Robot Micro-Factory

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg" alt="GPL 3.0 or later">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Tool">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="3D">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="Language">
  <img src="https://img.shields.io/badge/Tests-664%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.3-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-functional-0F6CBD.svg" alt="Maturity">
</p>

---

> **Safety and security status:** this ecosystem is not a certified safety system. There is no hardware E-STOP path, no firmware-enforced limits or interlocks and no verified motion command yet; firmware images are checked with CRC-32 and an Ed25519 signature, and a release build refuses the published development keys (the tool heads and expansion boards behind the relay still run URTC bootloaders, which take a shared-key HMAC-SHA256 instead of a signature); TLS and mutual TLS are optional and off by default; no custom board has been populated or tested yet. Read the [security baseline](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md) and the [threat model](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md) before relying on any statement here for the safety of a person.

---

## 📋 At a glance

| | |
|---|---|
| Version | `0.8.0.3` |
| Maturity | Functional |
| Tests | 664 (`npm test`) |
| Stack | React 19 / Vite / Three.js / Tailwind CSS |
| Target | The Raspberry Pi CM5 of a HYDRA-UMC cell |
| On real hardware | Run on a bench setup: the honesty check above says which parts ran on real hardware |

**Jump to:** [Overview](#-overview) · [Architecture](#-architecture) · [Features](#-features) · [Security & Safety](#-security--safety) · [Interfaces](#-interfaces) · [Configuration](#-configuration) · [Quick start](#-quick-start) · [Testing](#-testing) · [Troubleshooting](#-troubleshooting) · [Repository Structure](#-repository-structure) · [Related Projects](#-related-projects)

## 🚦 Project status

Each line is one part of this repository and the light says how far it is today. It is written from what the repository can show (tests, builds, runs), not from what is planned.

🟢 Done and verified · 🟡 Works, with known limits · 🟠 Partly done or not verified yet · 🔴 Not done or not working

| Area | State | What it means here |
|---|---|---|
| Software | 🟡 | Works for its main purpose; the honesty check above lists what is still missing |
| Tests | 🟢 | 664 automated tests, run on every change |
| Real hardware | 🟡 | Run on a bench setup: the honesty check above says which parts ran on real hardware |
| Documentation | 🟢 | README in eight languages, checked against the manifest on every change |

## 🎯 Overview

**HYDRA-UMC STUDIO** is the browser-based control dashboard for [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - the multi-robot micro-factory motherboard (Raspberry Pi CM5 host + dual-core STM32H745 real-time co-processor) that orchestrates up to 8 distributed robot arms over a single FDCAN bus. Where HYDRA-UMC's own repository covers the hardware and firmware, this repository is the human-facing side: a single-page React application that visualizes every robot in real 3D, jogs and records their motion, manages the machines and accessories that go alongside a robot cell, and flashes/tests the whole CAN-OTA firmware chain - all from one browser tab, no native install required beyond Node.js.

**Honesty note, matching the rest of this ecosystem's own documentation convention:** HYDRA-UMC's own real hardware doesn't exist yet as tested silicon (its bootloaders compile clean but haven't run on real boards - see that repository's own `docs/architecture.md`). This dashboard therefore runs its CAN-OTA Flasher/Tester tools against a full built-in simulation that follows the real, documented addressing scheme for every tier, rather than pretending to talk to hardware that isn't there. The 3D robot visualization, kinematics, trajectory recording, and every accessory control panel are fully real and independent of that - only the CAN-OTA transport itself is simulated for now.

Built with **React 19**, **Vite**, **Three.js** (via `@react-three/fiber`/`@react-three/drei`), and **TypeScript** - a pure client with no backend code of its own. Persistent state lives on the separate **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** backend this app talks to over the network.

## 🧩 Role in HYDRA-UMC

**HYDRA-UMC-STUDIO** is the web control dashboard of the cell: it draws every robot in 3D from its real kinematics, jogs and records trajectories, runs the accessory and machine panels, flashes and tests firmware over the CAN-OTA chain and administers the server, in eight languages. It holds no state of its own and decides nothing about safety: roles, limits, reservations and the stop are decided by HYDRA-UMC-SERVER.

## 🏛️ Architecture

<p align="center">
  <img src="images/architecture.svg" alt="HYDRA-UMC-STUDIO architecture" width="100%">
</p>

## 🖼️ Screenshots

Captured at 1920×1080 on a test bench, with sample data and no real installation behind them.

<table>
<tr><td width="50%" valign="top"><img src="images/screenshots/overview.png" alt="Overview: the eight robot nodes of the micro-factory with their role, model and tooling, and the machine status in the bar below." width="100%"><br><sub>Overview: the eight robot nodes of the micro-factory with their role, model and tooling, and the machine status in the bar below.</sub></td><td width="50%" valign="top"><img src="images/screenshots/robot-view.png" alt="Robot view: joint controls, XYZ jog, the 3D model of the arm and the trajectory panel with the recorded points." width="100%"><br><sub>Robot view: joint controls, XYZ jog, the 3D model of the arm and the trajectory panel with the recorded points.</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/xy-table.png" alt="XY table: the size of the table, the jog buttons with their step and the live 3D view of the axes." width="100%"><br><sub>XY table: the size of the table, the jog buttons with their step and the live 3D view of the axes.</sub></td><td width="50%" valign="top"><img src="images/screenshots/flasher-studio.png" alt="Flasher Studio: pick the board and the robot slot, choose a firmware file and flash it over CAN; here in simulation, so nothing is sent to a board." width="100%"><br><sub>Flasher Studio: pick the board and the robot slot, choose a firmware file and flash it over CAN; here in simulation, so nothing is sent to a board.</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/tester-center.png" alt="Tester Center: the status LED, the persistence check, the tool telemetry, the self-test and the raw bus monitor of a board." width="100%"><br><sub>Tester Center: the status LED, the persistence check, the tool telemetry, the self-test and the raw bus monitor of a board.</sub></td><td width="50%" valign="top"><img src="images/screenshots/safety-limits.png" alt="Safety limits: arming of the jog, the reservation rule and the jog and bed-temperature ceilings per robot model, kept in the server." width="100%"><br><sub>Safety limits: arming of the jog, the reservation rule and the jog and bed-temperature ceilings per robot model, kept in the server.</sub></td></tr>
</table>

## ✨ Features

### Multi-Robot 3D Control

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

### Kinematic Brain Stage

A dedicated control panel for the HYDRA-UMC motherboard's own local motion subsystem - the STM32H745's directly-driven axes, separate from the distributed robot arms on STACK A:

- 📐 **XY gantry** jog control for the X, Y1, Y2 (dual-Y gantry), and Z axes
- 🔥 **Heated bed** control (SSR-switched, 230VAC)
- 🔄 **ATC revolver** - rotary tool-index control for the E0-driven automatic tool changer
- 🎢 **Conveyor** - installed/running/speed control for the E1-driven transport belt
- 🛑 A full 12-endstop grid, 3 fan channels, and 10 pumps/10 valves for process fluidics

### Accessory & Machine Control Panels

Dedicated panels for the machines and accessories that go alongside a robot cell: **XY Table**, **ATC Tools**, **Rack Manager**, **Pick & Place** (including JuanenPnP/LumenPnP-specific configuration), **CNC** (including JuanenCNC-specific configuration), **Laser** (including JuanenLaser-specific configuration), **Vacuum Table**, and **Heated Bed**.

---

### 🧩 Selectable vacuum tables

Choose one of six real STL models in Vacuum Table: 160 × 120, 230 × 210, 230 × 250, 232 × 217, 240 × 240 or 250 × 250 mm. Base thickness is 15 mm; total height with alignment walls is 16.2 mm. Width and length are editable in 5 mm steps (10–5000 mm). The footprint is scaled; thickness stays unchanged. Selecting a preset restores its original dimensions. Custom sizes synchronize through SERVER; scaled holes/channels are a visual layout, not a regenerated manufacturing STL. Selection preserves placement, pump and valve state; reset selects 160 × 120 mm and switches pump and valve off. Legacy/unknown model IDs display the first model. STUDIO and both SUITE interfaces use the same catalog and modelId in robot settings.

[Model guide, configuration and regeneration](docs/VACUUM_TABLE_MODELS.md).

### 🔥 Heated bed model

Four STL presets: 100×100, 200×100, 200×200 and 255×255 mm, all 5 mm thick. Width/length adjust in 5 mm steps (25–5000 mm); selecting a preset restores its dimensions without changing heating. Visual model only, not an electrical or manufacturing design.

[Heated bed model — STL / OpenSCAD](docs/HEATED_BED_MODELS.md).

### 🗄️ Configurable STL racks

STL rack: width and depth 40–1000 mm in 1 mm steps; 1–24 plates at a fixed 10 mm pitch. Dimensions are visual settings, not robot calibration.

[Configurable STL racks — STL / OpenSCAD](docs/RACK_MODELS.md).

### 🛠️ Independent machine models

Independent STL copies for JuanenPnP, JuanenCNC and JuanenLaser; LumenPnP stays original. Edit each model in its own folder. CAD dimensions are used; legacy size settings do not stretch the model.

[Independent machine models — STL](docs/MACHINE_ASSETS.md).

These original JuanenPNP / HYDRA-UMC assets and their SCAD sources use GPL-3.0; they are not Opulo machine CAD.

### Works & Trajectories

Load canned example trajectories, jog-and-record your own points live, or load/save/edit/play back complex multi-point trajectories (JSON) per robot. Trajectories are portable between robot models - each recorded point is resolved through that specific robot's own real kinematics (`src/examples/robotKinematicsDispatch.ts`) at load/draw/play time, not baked against whichever robot happened to record it, so the same trajectory file drives a Parol6 and a UR10e correctly along their own real reachable geometry.

### CAN-OTA Firmware Tools

Flash and self-test firmware across the whole HYDRA-UMC + URTC CAN-OTA chain from one dashboard, with two dedicated entry points:

- **URTC → Flasher / Tester** - for the URTC Tool Head board and its own expansion boards (matches the standalone [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER) desktop tools' own protocol coverage)
- **HYDRA-UMC → Flasher / Tester** - for the Robot Controller Board and Kinematic Brain tiers, relayed the whole way from CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, with no JTAG/SWD probe and no USB-CAN dongle needed (see [HYDRA-UMC's own `docs/architecture.md`](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) for the full addressing/relay design)

Both can download real firmware releases straight from GitHub (`firmware_manifest.json`-based, CRC32-verified) for either the `URTC` or `HYDRA-UMC` repository. As noted above, the transport itself runs against a full built-in simulation until real STM32H745 firmware exists on real hardware to talk to.

### Gamepad Support

USB and Bluetooth controller integration with custom per-button/per-axis mappings, for jogging robots and accessories without a mouse/keyboard. Real-time actions (joint/table jog, E-STOP, START/STOP, playback speed) fire the same atomic `sendRobotCommand()` path the jog buttons in the robot detail panel use, not the debounced settings save - see `GamepadController.tsx`.

### Camera Integration

Up to 8 simultaneous live feeds (USB vision or thermal MLX90640/41/42-family sensors) with recording and inference status - the camera matrix HYDRA-UMC's own dual USB 3.0 hub subsystem is built around.

### Multi-Language UI

Full interface translation across **English, Spanish, German, French, Italian, Simplified Chinese, Japanese and Portuguese** (`src/locales/`), including the in-app Help menu with its step-by-step guides, the assistant, the About dialog (version/author/license), and every tab of the System Configuration dialog. Coverage isn't 100% of every screen yet - a handful of standalone accessory panels are still hardcoded English, not yet reached by translation work.

### Help, Guides & Assistant

The Help window has a **Step-by-step guides** tab: one guide per task (add a controller, move a robot, record a trajectory, use the cameras, flash firmware, manage users, remote access, security...), each with a level (basic, advanced, technical), a search box and a button that goes to the screen where the task is done. **Hydri**, the assistant, is a small animated mascot that floats over the dashboard: it explains the screen you are in, walks you through a task step by step, answers questions typed in words with no server and no AI model (in any of the 8 languages), can read the answers aloud with the browser's own voice, can be dragged anywhere and pinned there, and is switched on or off from the Help window. Its preferences are kept in the browser (`src/assistant/`).

### ℹ️ About & System Configuration

Two standalone dialogs, both reachable from the header (`Config`/`About` buttons): **About** shows the running app version (read live from `GET /api/hydra-info`), author, and license; **Config** covers server identity, controller/node management, UI theme + language, robot renaming, camera↔robot mapping with conflict detection, the custom URDF library, third-party software integrations (OpenPnP/CNC/Laser backends), per-client remote access (independent switches for SUITE/Android/iOS), user accounts, per-robot work directories, CAN-OTA transport, and gamepad mapping - each its own tab. Both are their own components (`src/components/About.tsx`, `src/components/Config.tsx`), not inlined into the main dashboard shell.

### Reliability

The app protects itself against two different classes of runtime failure, both born from a real production incident (a kiosk display going black after a redeploy). `src/main.tsx` listens for Vite's own `vite:preloadError` event - emitted when a browser tab left open across a redeploy tries to fetch a `React.lazy()`-loaded panel chunk (every `Dashboard.tsx` panel, content-hashed per `vite.config.ts`) that no longer exists under its old hash - and reloads the page once automatically, so a long-lived kiosk tab or a stale background tab self-heals without anyone noticing. A `sessionStorage` guard stops that from reload-looping forever if a chunk is genuinely missing for some other reason. Separately, `src/components/ErrorBoundary.tsx` wraps the `<Suspense>` panel area as a backstop for any other render crash; it's keyed by the active tab, so switching away from a crashed panel actually retries the next one instead of leaving the whole dashboard stuck on a fallback screen.
Commands never fail silently: every jog, play, power, vision and tool command returns a typed result, an expired session is refreshed once and retried, and anything still refused is shown in a banner. The red **STOP** button is global: one click, no confirmation, it stops every robot of every controller and switches every valve and pump off in one call (`POST /api/stop-all`). It sits in the header and the footer, in the robot panel and in the remote-control overlay, and Ctrl+Shift+Space presses it from the keyboard (a chord that is not typed by accident, ignored on a held key). The answer is listed robot by robot (a warning when a robot did not stop or the server could not save the stop; robots reserved by someone else are marked); a network failure is retried once, a server over its rate limit (429) or without the route (404) is answered with the per-robot stop, and a persistent "STOP not confirmed" warning stays until a later STOP gets an answer. Joystick jogging is a held deadman control (it ends on pointer cancel, window blur, a hidden tab or after 8 seconds), a J1 move stays on the nearest equivalent angle and a jog step above 20 degrees is refused. Gamepad input follows the robot selected in the interface and is rate limited. A release firmware is checked against its sha256 before CAN-OTA flashing, bootloader images are opt-in, and imported trajectories and scenes are validated before they reach the shared state.

Who may move a robot, and how far, is decided by the server for every client. A robot can be **reserved** for the account and the window (a controller id chosen per window) that asks for it: the same account on another window, or another account, is refused with a message that says which (`other-controller`, `other-account`, `controller-id-required`), the list of reservations comes from `GET /api/claims`, and an administrator can take a robot over. The size of a jog, the range of an absolute jog and the hottest heated-bed target are read from `GET /api/safety-limits` instead of being kept in the app; an administrator edits them by model in **Ecosystem > Safety limits**, together with the optional arming of the jog (off by default; when on, a button arms the jog for a limited time) and the mandatory controller id. Each robot has a **Live / Sim** switch (Live by default): in Sim, nothing that moves the robot or switches something on is sent from that window, while STOP always goes through. A Work or an example with points the arm cannot reach is refused with the list of those points, and can be scaled to the reach of the model instead. The list of reservations is also pushed by the server on the WebSocket (the `claims` message, for connections that asked for `remoteApiVersion=2`), so the access bar shows a change at once instead of waiting for its next poll; the poll only runs now and then while the pushes arrive. Writes are conditional: each one carries the revision of the robot this window last saw (`If-Match`), and when someone else changed the robot in between the server answers 412, the robot is read again and the banner says so (Standard checks reservations, the table and the one-off commands; Strict checks everything but STOP; Off checks nothing; STOP is never checked). The XY table moves with the atomic `table` command, and administrators read the append-only audit record, with its SHA-256 chain verified, in **Ecosystem > Audit record**.

### Accounts & Access

Every backend seeds one account on its own first-ever start - username `admin`, password `admin` - change it from **Config > Users** as soon as the server is reachable beyond a fully trusted LAN. That same tab lets an admin account create additional **operator** accounts: an operator can sign in, watch live state, and drive robots (jog/play/pause/stop/tool/valve/pump/speed), but can't overwrite global settings or manage other accounts. No account is required just to look around - the login screen's own "Continue read-only" skips straight to the dashboard with writes disabled. Full contract (roles, tokens, the `/api/users` routes) documented in [HYDRA-UMC-SERVER's own `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) sections 2a/2b. In production the first administrator comes from the deployment's bootstrap settings and the server refuses example secrets (see [HYDRA-UMC-SERVER's `docs/PRODUCTION_BOOTSTRAP.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md)).

Each of the 5 remote clients (SUITE, Android, iOS, Watch, DSI) self-identifies via an `X-Hydra-Client` request header, so **Config > Remote Access** can allow or block each one independently instead of one combined switch for all five.

**Server Admin** has a **Two-step sign-in** card for the account you are logged in with (off until its owner turns it on): the password, a QR code of the otpauth address (drawn in the app, no extra package) and the key to type by hand, the first code from the authenticator app, and ten one-time recovery codes shown once. The sign-in form then asks for the code of an account that has it on, and **Config > Users** lets an administrator remove the second step of an account that lost both its phone and its recovery codes.

### Persistent State

HYDRA-UMC STUDIO itself is a pure client - it holds no state of its own beyond what's in memory for the current session. All persistence (`settings.json`, `users.json`, saved trajectories under `WORKS/`, submitted models) lives on the separate **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** backend this app talks to over the network (see that project's own `data/` and README for the full picture) - state survives a page reload or this app's own redeploy, since neither of those touches the backend process at all. `settings.json` itself is deliberately excluded from that backend's static file serving (it holds controller IPs, CAN-OTA configuration, and full per-robot state), even though its `WORKS/` folder is served normally.

The sign-in lasts as long as the browser tab: the session and its refresh token are kept in `sessionStorage`, so closing the tab ends it. The sign-in option **Keep me signed in on this device** keeps them in `localStorage` instead, across browser restarts (off by default). The production page carries a Content-Security-Policy as a meta tag (scripts only from the page itself, no inline scripts, no plugins); `HYDRA_STUDIO_CSP=off` at build time leaves it out, for a deployment that sets the header itself, and any other value is used as the policy.

The same `GET`/`POST /api/settings` contract, plus a discovery endpoint (`GET /api/hydra-info`) and a `WebSocket /ws` for live push updates, is also how external clients connect to that same backend - this is what lets [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) discover a running HYDRA-UMC SERVER instance on the network, read/modify its state, and see changes made from this app's own browser tab reflected live (and vice versa). Full contract in [HYDRA-UMC-SERVER's own `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` powers the Overview dashboard footer: CPU load and memory usage are always real (Node's own `os` module); temperature reads real `vcgencmd measure_temp` output when running on an actual Raspberry Pi and falls back to a clearly-flagged mock otherwise (`temp_is_real` in the response); Wi-Fi/Ethernet/Bluetooth status are read from `/sys/class/net`/`/sys/class/bluetooth` (Linux-only, `null`/unknown on any other host rather than a guessed value).

## 🔒 Security & Safety

| Threat | Defence | Where |
|---|---|---|
| Injected scripts running in the page | The build puts a Content-Security-Policy in the page: scripts only from the page itself (plus WebAssembly and the 3D decoder host), no objects, base and forms limited to the page; `HYDRA_STUDIO_CSP` can switch it off or replace it | `scripts/csp.ts`, `vite.config.ts` |
| A sign-in token read back from storage | A login typed here lives in `sessionStorage` (it survives a reload, not closing the tab); `localStorage` only when "keep me signed in" is ticked. A token that arrives in the address goes to `sessionStorage` only, comes in the `#token=` fragment that a browser never sends, and is removed from the address as soon as it is read | `src/lib/session.ts` |
| Two operators changing the same robot | Every robot has a revision: a write sends it with `If-Match` and a stale one is refused with 412; the table moves atomically; reservations and who may jog are decided by the server for every client | `src/lib/revisions.ts`, `src/lib/tableMove.ts`, `src/lib/robotEdits.ts` |
| A stop that waits for a confirmation or a slow screen | The red STOP is global and asks nothing: one `POST /api/stop-all` stops every robot and switches every valve and pump off; if the route is rate limited or missing it falls back to the stop of each robot, and a robot that did not stop is shown in a banner | `src/lib/stopAll.ts`, `src/components/StopAll.tsx` |
| An access option lowered by mistake (voice, MAVLink, Bluetooth, TLS...) | Server Admin shows where each value comes from and locks the ones the server's environment sets; lowering one asks for a confirmation and, once saved, a warning stays on screen: a voice reply that repeats what was said, a recognizer confidence of 0, unsigned MAVLink messages, or MAVLink signing off | `src/components/AdminServer.tsx`, `src/lib/serverSecurity.ts` |
| A broken panel or a stale page after a redeploy blacking out the screen | Each tab sits in its own error boundary, and a stale chunk after a deploy triggers one automatic reload (guarded, so a really missing file cannot loop) | `src/main.tsx`, `src/components/ErrorBoundary.tsx` |

**What it never does:** decide safety. It holds no state of its own and is not an emergency-stop path in hardware; the Kinematic Brain stage and the CAN-OTA tools have only run against the built-in simulation.

## 🔌 Interfaces

| Topic or route | What it carries |
|---|---|
| `/api/login`, `/api/refresh`, `/api/logout` | sign in, renew the token once when it expires and sign out |
| `/api/settings`, `/api/robot/:id`, `/api/robot/:id/command` | the state tree and the typed commands (jog, play, tool, valve, pump, vision) with `If-Match` |
| `/api/robot/:id/claim`, `/release`, `/jog-arm`, `/api/claims` | reserve a robot for this account and window, release it, arm the jog, list who holds what |
| `/api/stop-all`, `/api/safety-limits` | the global stop and the safety limits the server enforces |
| `/ws` | live push of the state (token as the `hydra.bearer` subprotocol, `remoteApiVersion=2`) |
| `/api/camera/*`, `/api/cameras/status` | camera streams, snapshots, recordings, PTZ and the short-lived picture ticket |
| `/api/hardware/canota/version`, `/api/hardware/canota/flash` | the CAN-OTA chain used by Flasher and Tester (a full simulation until real boards exist) |
| `/api/admin/server-config`, `/api/admin/clients`, `/api/admin/logs`, `/api/audit` | Server Admin: the access switches, the connected apps, the server log and the audit record (administrators) |

## ⚙️ Configuration

Two kinds of settings: the build and the browser of this app, and the access switches of the server that Server Admin edits (the environment of the server wins over what is saved; the screen shows which one applies and locks the others).

| Variable | Default | What it sets |
|---|---|---|
| `HYDRA_STUDIO_CSP` | `default` | build time: `default`, `off` (no policy, for a host that sets the header itself) or a complete policy of your own |
| `VITE_API_BASE_URL` | this page's host on port 3000 | build time: where the server is when it is not on the same host (see `.env.example`) |
| `server.proxy` (`vite.config.ts`) | `localhost:3000` | dev server only: forwards `/api`, `/ws` and `/WORKS` to the server so no CORS setup is needed |
| `aiAccess` | `open` | who may use the local AI relay: `open` is any signed-in account, `admin` only administrators |
| `infoAuth` | off | ask for a sign-in on the read-only host information (metrics, process supervisor, ecosystem status) |
| `tls.enabled` | off (plain HTTP) | HTTPS and WSS with the certificate and key you name; the screen shows the fingerprint of the certificate in use |
| `ble.mode` | `off` | Bluetooth LE for phones near the server: `off`, `state` (publish the state only) or `commands` (also take commands); an unknown word means off |
| `ble.requireEncryption` | on | the command characteristic is written, and the state read, only over an encrypted link; only `off` in the variable turns it off |
| `mqtt.mode` | `off` | the MQTT bridge to the broker of the cell: `off`, `state` or `commands`, with its URL, prefix and users |
| `voice.includeHeardText` | off | a voice reply repeats what was said; that is personal data, so it is off, and in the variable only the exact word `1` turns it on |
| `voice.minConfidence` | `0.6` | the least confidence of the speech recognizer, from 0 to 1, to accept a request that starts a movement; 0 switches the check off, a stop is never held back, and a bad number in the variable is ignored |
| `mavlink.signingKeyFile` | empty (no signing) | MAVLink 2 signing of the UAV bridge: the path of a file with the 32-byte key (32 raw bytes or 64 hexadecimal characters); only the path is saved, never the key, and the bridge reads it when it starts |
| `mavlink.signingAllowUnsigned` | off | still accept messages that are not signed (a vehicle that does not sign yet); the screen warns while it is on |

## 🚀 Quick start

Requires Node.js 22 or newer with npm, and a running HYDRA-UMC-SERVER (port 3000): STUDIO is a pure client and has nothing to talk to without it.

```bash
npm install
./dev.sh                           # Vite dev server on port 5173, proxying /api, /ws and /WORKS to the server on port 3000 (dev.bat on Windows)
npm test                           # the Vitest suite
npm run typecheck && npm run lint  # types and lint
./build.sh                         # production build into dist/ (build.bat on Windows)
```

## 🧪 Testing

664 automated tests run with `npm test`. They need no hardware and nothing outside this machine.

The CI runs `HYDRA_UMC_CI=1 python tools/ci_validate.py`, which checks the manifest, the documents, the eight READMEs and the pictures.

## 🏗️ Build & Release

### Requirements
- [Node.js](https://nodejs.org/) (v22 or higher)
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
npm test          # vitest run - 664 tests
npm run typecheck # tsc -b --noEmit (src/) + tsc -p tsconfig.test.json --noEmit (tests/)
```

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

`bump_manifest_version.py` (repo root) is the single owner of both `hydra-umc.project.json` and `package.json`'s own `version` field - `npm run build` (`vite build`) is deliberately compilation-only so it can never create drift between them by bumping one and not the other. `scripts/bump-version.mjs` is a legacy native-only helper kept for reference; nothing in this repo calls it anymore. The running version is visible live in the **About** dialog (the Studio version is read from this app's own `package.json`; the server version shown next to it comes from `GET /api/hydra-info`), and the full history is in [`CHANGELOG.md`](CHANGELOG.md).

## 🩺 Troubleshooting

| You see | Because | Do |
|---|---|---|
| The sign-in fails, or every call says the server cannot be reached | The server is not running, or the page looks for it on the wrong host | Start HYDRA-UMC-SERVER (port 3000 in development) or build with `VITE_API_BASE_URL` |
| A jog or a command is refused because another account or window holds the robot | The server reserves a robot for the account and the window that asked first; jogging also has to be armed | Release it from the access bar of the robot, or wait; an administrator can see who holds it |
| A save is refused with 412 | Another client changed the robot after you loaded it, so your revision is stale | Reload the robot and make the change again |
| A switch of Server Admin is grey | The value comes from the environment of the server, which wins over what is saved | Change the variable of the server and restart it; the screen names the source of each value |
| The page is blank after the server was redeployed | The open tab still points at chunks that no longer exist | The page reloads itself once; if it stays blank, reload by hand and rebuild if a file is really missing |

## 📂 Repository Structure

<p align="center">
  <img src="images/repository-structure.svg" alt="Repository structure of HYDRA-UMC-STUDIO" width="100%">
</p>

<details>
<summary>Text version of the tree</summary>

```text
HYDRA-UMC-STUDIO/
├── src/                             source code
│   ├── App.tsx                      The router and layout, the entry point and the provider of the global state
│   ├── Dashboard.tsx                Top-level app shell - navigation, Overview panel, footer system metrics
│   ├── store.ts                     Global state: RobotModel/RobotState/HydraController/SystemSettings -
│   ├── motionSource.ts              What the drawn pose stands for (commanded or followed by the machine), and the pure state-transition core of sendRobotCommand()
│   ├── i18n.ts                      react-i18next setup - loads src/locales/*.json
│   ├── hooks/                       usePartColors.ts: per-part colour overrides saved by HYDRA-UMC-EDITOR-STL
│   ├── assets/                      The icon, the splash screen and the pictures of the app, and the global styles
│   ├── assistant/                   Hydri, the assistant: answer engine, knowledge base (8 languages), mascot, preferences
│   ├── components/                  the screens and panels: robot detail, 3D scene, administration, CAN-OTA tools
│   ├── examples/                    forward and inverse kinematics of the 24 real robot models
│   ├── lib/canOta.ts                CAN-OTA simulation/protocol layer, GitHub firmware download
│   ├── lib/apiBase.ts               Backend URL resolution - relative+proxied in dev, VITE_API_BASE_URL in prod
│   ├── lib/mediaTicket.ts           Short-lived tickets for the camera pictures
│   ├── lib/claims.ts                Reservations, controller id, safety limits read from the server, Live/Sim mode
│   ├── lib/revisions.ts             Revision of each robot (If-Match, 412), atomic table move, audit record and its chain check
│   ├── lib/session.ts               Session tokens, the access options of the server, operator-facing error texts, who may save the settings, SHA-256 without crypto.subtle
│   ├── lib/stopAll.ts               The global STOP, the answer of a robot command, the edits of a robot as commands, the selected robot, playback step numbering, the warning for unreachable trajectories, where a tool sits on the flange, shortest-path angles
│   ├── lib/claimsFeed.ts            The live list of reservations, checks before a file is imported, throttling of held input, repeat of a held jog button, keyboard rules of dialogs, the parser of saved MJPEG recordings, the catalogue of models the editors submitted
│   └── locales/                     en/es/de/fr/it/ja/zh/pt translation files (react-i18next)
├── docs/                            guides of the vacuum table, heated bed, rack and machine models
├── public/                          3D models: robots, racks, heated beds, vacuum tables, machines (STL and OpenSCAD)
├── images/                          README banner
├── tests/                           Real Vitest suite (610 tests) - src/examples/ FK/IK math only, no React/DOM
├── tools/                           project tools and CI checks
├── scripts/                         bump-version.mjs (explicit version bump) and csp.ts (the Content-Security-Policy of the built page)
├── .github/                         CI workflow and issue templates
├── index.html                       The page Vite builds the app from (the Content-Security-Policy is put in at build time)
├── example_trajectory.json          Standalone example trajectory (joint-angle sequence, sample data)
├── metadata.json                    App name/description (used by the hosting platform)
├── bump_manifest_version.py         Syncs hydra-umc.project.json's version to the native one (--sync)
├── build.sh / build.bat             Install deps + production build
├── build-test.sh / build-test.bat   Non-versioning build/compile check
├── dev.sh / dev.bat                 Install deps + start the Vite dev server
├── vitest.config.ts                 Vitest config (tests/ only, real node environment - no DOM needed)
├── tsconfig.test.json               Standalone typecheck project for tests/ (kept separate from the app/node references)
├── .env.example                     VITE_API_BASE_URL template - see src/lib/apiBase.ts
├── CHANGELOG.md                     what changed in each version
├── hydra-umc.project.json           manifest: version, maturity, family
├── package.json                     package metadata and scripts
└── test.sh                          runs the tests
```

</details>

## 🗺️ Roadmap & Known limits

**Known limits today**

* The CAN-OTA chain (Flasher and Tester) and the Kinematic Brain stage have only run against the built-in simulation: no HYDRA-UMC controller board exists yet to flash or test.
* Table, heated bed and rack sizes are visual settings, not robot calibration and not an electrical or manufacturing design.
* The STOP goes through the server; there is no wireless emergency stop and no hardware stop path.
* Anything that moves a robot is decided by the server (roles, limits, reservations); this app cannot make a move safe by itself.

**Next:** every novelty of this app is ported to HYDRA-UMC-SUITE, and the CAN-OTA tools wait for the first real boards.

## 🌍 Languages

This README and the documents of the repository exist in eight languages: English, Spanish, German, French, Italian, Japanese, Chinese and Portuguese (Portugal). They are written together and checked in the CI so that the eight files have the same sections and the same links.

## 🔗 Related Projects

This project is part of the HYDRA-UMC robotics ecosystem by the same author (JuanenRac / Electro Hobby 3D). Worth knowing about, since a request might actually be about one of these rather than this repository.

**Parent Project**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — the real headless backend (REST/WebSocket) every control client actually talks to; this dashboard is a pure frontend client of it, no backend code of its own.

**Sibling Projects** — also talk to HYDRA-UMC-SERVER's own API, each their own client
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — desktop (PySide6) swarm command center for multiple servers at once, packaged as a standalone executable.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — native Android control app with biometric login and a paired Wear OS companion.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — iOS/iPadOS control app (Flutter) with real-time WebSocket sync.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — native touch UI for the onboard 7" DSI touchscreen, embedded on the CM5 itself.
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — coordination boundary for AGV/AMR fleets via a VDA 5050 MQTT publisher (tested against an emulated fleet only).
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — high-level CNC-cell coordinator with GRBL status/control-byte access (tested against an emulator only).
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — coordination boundary for legged/humanoid droids, with a Boston Dynamics Spot command sender (tested against an emulator only).
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — laser-cell coordinator reading 3 key/enclosure/interlock GPIO signals (tested against a fake chip only; it cannot arm or fire a laser).
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — safe high-level board-flow coordinator for OpenPnP pick-and-place.
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — safe coordination boundary for Moonraker/Klipper 3D printers, with real gated job commands.
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — coordinator with a lazily imported rclpy ROS 2 transport (not yet run against a ROS 2 installation).
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — coordination boundary for camera-equipped UAVs, with a MAVLink command sender (tested against an emulator only).

**Child Projects**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — desktop graphical URDF creator/editor that pushes finished models into this dashboard's own catalog via `POST /api/models/submit`.
- **[HYDRA-UMC-EDITOR-STL](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-STL)** — desktop STL model editor for this dashboard's own `public/models/` library (and HYDRA-UMC-SUITE's own mirror of it) - transform/replace/remove/add real parts, never permanently deleting anything.

**Directly Related**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — Smart Summaries and Anomaly Highlighting panels over DATALAKE/ANOMALY-DETECTOR, with an honest statistical fallback; extends this same dashboard with statistical summaries (no language model yet).
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — integration hub for the Hailo-10 cognitive pipeline (LLM/VLA/voice orchestration); adds voice/natural-language control over this dashboard.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — real voice front-end (VAD + intent parser) with a bounded, confirmation-gated Watch relay; adds voice/natural-language control over this dashboard.
- **[HYDRA-UMC-LOCAL-TECHNICIAN](https://github.com/JuanenRac/HYDRA-UMC-LOCAL-TECHNICIAN)** — local, policy-gated AI maintenance technician for the ecosystem itself - observes, diagnoses and proposes fixes; the two highest risk levels are deliberately not implemented yet.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — integration hub for the digital-twin engine, with a real version-compatibility sync contract; lets you preview on the digital twin before touching the real robot, right from this dashboard.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — hardware-in-the-loop router with a software collision interlock between simulation and real hardware (tested without real hardware); lets you preview on the digital twin before touching the real robot, right from this dashboard.

**Also Part of the Ecosystem**

*Core Hardware & Platform*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — the robot-arm motherboard design: CM5 host + dual-core STM32H745, meant to orchestrate up to 8 tool arms over CAN-OTA/SPI-OTA (firmware at an early stage; no populated board yet).
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — reproducible Raspberry Pi OS product layer for the CM5: read-only agent, validated config/profiles, WiFi first-contact provisioning.
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — the shared JSON-Schema contract and software job-gate boundary every bridge validates its commands against (not a certified safety function).
- **[HYDRA-UMC-CONNECTOR-HUB](https://github.com/JuanenRac/HYDRA-UMC-CONNECTOR-HUB)** — declarative adapter-manifest registry and validator for external-machine connectors; extends the SDK's own contract idea to external machines without replacing the industrial-gateway projects.

*URTC Tool Platform*
- **[URTC](https://github.com/JuanenRac/URTC)** — firmware for the physical Universal Robot Tool Controller PCB, 25+ tool profiles over CAN bus.
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — desktop GUI flashing tool for URTC boards, CAN-OTA plus full-chip SWD/JTAG.
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — desktop live CAN-bus diagnostic tool for URTC boards, one panel per tool profile.
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — browser-based alternative to URTC-TESTER via the Web Serial API, no local install needed.
- **[URTC-GATEWAY](https://github.com/JuanenRac/URTC-GATEWAY)** — gateway in front of the URTC CAN bus: an allowed list of identifiers, a rate limit and a session key; software tested on a computer, not yet on a real bus.

*Vision AI Node (Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — integration hub for the Hailo-8 vision pipeline, with a real per-stage hardware-readiness check.
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — real compiled-model registry with Hailo-architecture/checksum safe-load verification.
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — real GStreamer pipeline + MediaMTX config generator with a real HailoRT integration boundary.
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — Position-Based Visual Servoing correction law with authorisation gated on the zone state; no camera pose estimation yet.
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — v0 zone-breach, calibration-freshness and E-STOP-request logic that takes object positions from a file; no detector feeds it and no physical E-STOP is wired to it yet.

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
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — WearOS companion app with haptic alert patterns and a paired-phone voice relay (not yet run on a physical watch).
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — firmware for a board-mounting rack with real tool-ID decoding and Smart Idle pre-heating logic.
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — firmware plus a real Python vision companion for a thermal/RGB inspection tool head.
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — administrative desktop tool that discovers, clones and updates every repo in this ecosystem.
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** — Windows/Linux desktop tool that builds a ready-to-flash CM5 image pre-loaded with the ecosystem's most current versions, with Raspberry-Pi-Imager-style first-boot Wi-Fi/user/SSH configuration.
- **[HYDRA-UMC-OPS-AGENT](https://github.com/JuanenRac/HYDRA-UMC-OPS-AGENT)** — maintenance-incident coordinator: a low-privilege edge role collects a sanitized inventory/health snapshot, a control-plane role renders it read-only and asks an AI provider to suggest a diagnosis - never applies a patch or deploys anything.
- **[HYDRA-UMC-DEV-SERVER](https://github.com/JuanenRac/HYDRA-UMC-DEV-SERVER)** — reproducible development host (Raspberry Pi 5 / CM5) that stores the ecosystem's source and runs bounded build/test tasks under a durable queue; a dedicated dev role, explicitly not an operational CM5.

## 📚 Documentation

Where to read more:

* [Security baseline of the ecosystem](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)
* [Threat model of the ecosystem](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)
* [Changelog of this repository](CHANGELOG.md)
* [License of this repository](LICENSE.md)

## 🤝 Contributing & Community

* Before a pull request run `HYDRA_UMC_CI=1 py -3 tools/ci_validate.py` (or `HYDRA_UMC_CI=1 python3 tools/ci_validate.py`): it must print `CI_VALIDATION=PASS`. Do not run `build.sh` or `build.bat` for this check; building is not a check.
* The eight READMEs are written from one source in HYDRA-UMC-DOCS; do not edit them by hand. Change the source and write them again with `tools/make_readmes.py`.
* Do not state in a README what has not run: say "simulated" or "not tried on hardware" where that is the truth.
* See [CONTRIBUTING.md](CONTRIBUTING.md), the [code of conduct](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md) and [SUPPORT.md](SUPPORT.md).

## 👤 AUTHOR

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 LICENSE

GPL-3.0-or-later - [LICENSE](LICENSE).
