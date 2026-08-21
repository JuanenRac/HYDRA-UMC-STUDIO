# Changelog

All notable work on **HYDRA-UMC STUDIO** is summarized here, newest first.

## Versioning scheme

`package.json`'s `version` field bumps automatically on every real production
build (`npm run build` - see `scripts/bump-version.mjs`, wired as the first
step of the `build` script). It follows a simple base-10 "odometer" rule
rather than semantic-versioning judgment calls:

- `patch` +1 on every build
- when `patch` would exceed 9, it resets to 0 and `minor` +1 instead (e.g. `1.0.9` -> `1.1.0`, never `1.0.10`)
- the same carry cascades into `major` if `minor` would exceed 9

The running version is visible live in the app itself: **About** dialog
(header `About` button) shows it, read from `GET /api/hydra-info`, which the
Express server reads straight from `package.json` at startup - no separate
number to keep in sync by hand.

This file itself is *not* auto-generated per build (most builds are routine
verification runs with nothing changelog-worthy); it's updated by hand when
a change is actually worth summarizing for a human.

---

## [1.0.1] - Automatic build versioning

- Added `scripts/bump-version.mjs`: bumps `package.json`'s `version` on every
  `npm run build`, using the odometer rule described above.
- Wired it as the first step of the `build` npm script.
- Seeded this `CHANGELOG.md` with a summary of the project's real history
  (below), condensed from the private session log
  (`SONNET/HYDRA-UMC-STUDIO/auditoria_historial.txt`).
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
