// =============================================================================
// HYDRA-UMC STUDIO - Robot A1 Entry Point: robots/A1.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Per-robot entry point (2026-08-19 module split, see
// SONNET/HYDRA-UMC-STUDIO/chat.TXT) - Dashboard.tsx now imports THIS file for
// robot A1 instead of the shared RobotDetail directly, so future A1-only
// changes have an obvious, dedicated place to live without touching the
// other 7 robots. Today A1 differs from A2-A8 in exactly one way (the
// floating 3D joint-controls overlay, `isFloatingLayout = robot.id === 1`
// inside RobotDetail.tsx) - implemented as a shared conditional rather than
// copy-pasted 1900 lines of kinematics/playback/store-sync logic 8 times,
// since that logic is genuinely identical across all 8 robots and
// duplicating it would only create 8 places to keep in sync by hand. If A1
// ever needs to diverge further (its own layout, its own control set), this
// is the file to grow - either by adding more `robot.id === 1` branches in
// RobotDetail.tsx, or by having this file render its own JSX using the
// shared hooks/helpers RobotDetail.tsx exports.
export { RobotDetail as default } from '../RobotDetail';
