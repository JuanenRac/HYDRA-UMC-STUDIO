// =============================================================================
// HYDRA-UMC STUDIO - the commands a robot screen sends: useRobotCommands.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Recording a point, the Cartesian and base jogs, the pose resets, the XY table slider and the valves and pumps: the
// handlers of RobotDetail.tsx, taking what they need as arguments so they can be tested on their own. Every real move goes through the atomic `sendRobotCommand` channel (the server persists
// it and broadcasts it to every client); the optimistic local change is rolled back by the store if the request fails.
// =============================================================================
import { jointsToCartesianForModel, jointLimitsFor, resolveTargetJoints } from '../examples/robotKinematicsDispatch';
import { guardJogStep } from '../lib/motionGuard';
import { tableParams } from '../lib/tableMove';
import { homePoseFor } from '../lib/robotDetailHelpers';

export interface RobotCommandDeps {
  robot: any;
  jogStep: number;
  sendRobotCommand: (robotId: number, command: string, params: any, localMutate?: (robot: any) => any) => unknown;
  updateRobot: (robotId: number, patch: any) => unknown;
  reportCommandIssue: (issue: any) => void;
  /** Called by RESET before the pose reset, to stop a running playback. */
  stopPlayback: () => void;
}

export function useRobotCommands({ robot, jogStep, sendRobotCommand, updateRobot, reportCommandIssue, stopPlayback }: RobotCommandDeps) {
  const handleStop = stopPlayback;
  const handleAddPoint = () => {
    // Stamp this robot's own real Cartesian tool-tip position (via its own FK) onto the
    // point at the moment it's recorded - see withCartesian()'s comment above for why this
    // matters: without it, this point's {j1..j6} would later be ambiguous (this robot's own
    // native joints vs. the shared generic formula's), which is exactly what made loaded
    // examples draw/play back wrong for Parol6/Faze4/AR3/AR4.
    const cart = jointsToCartesianForModel(robot.model, robot.joints);
    updateRobot(robot.id, {
      recordedPoints: [...robot.recordedPoints, {
        // The joints below are this robot's own native joint values, so the point says so: the server plays them
        // as they are and every client draws the same pose. Without the marker the point was treated as a
        // Cartesian one and each client re-solved the inverse kinematics on its own, ending in different poses
        // (and one full settings save per client for every step of the playback).
        motionType: 'model-joints',
        j1: Number(robot.joints.j1.toFixed(3)),
        j2: Number(robot.joints.j2.toFixed(3)),
        j3: Number(robot.joints.j3.toFixed(3)),
        j4: Number(robot.joints.j4.toFixed(3)),
        j5: Number(robot.joints.j5.toFixed(3)),
        j6: Number(robot.joints.j6.toFixed(3)),
        x: Number(cart.x.toFixed(3)),
        y: Number(cart.y.toFixed(3)),
        z: Number(cart.z.toFixed(3)),
        a: Number(cart.a.toFixed(3)),
        b: Number(cart.b.toFixed(3)),
        c: Number(cart.c.toFixed(3)),
        ...(robot.hasXYTable ? {
          tx: Number((robot.pos.tx || 0).toFixed(3)),
          ty: Number((robot.pos.ty || 0).toFixed(3)),
          trz: Number((robot.pos.trz || 0).toFixed(3))
        } : {})
      }]
    });
  };

  // XYZ jog for the floating Joystick3D overlay (currently robot A1 only, see
  // JointControlsOverlay above) - nudges the Cartesian target by dx/dy/dz *
  // jogStep, then re-solves joints through this robot's own real kinematics
  // (resolveTargetJoints, same helper the trajectory player above uses) so
  // the 3D pose stays consistent instead of just moving pos.x/y/z blindly.
  //
  // Fires the atomic 'jog' command instead of updateRobot - one call per
  // non-zero axis (the server only moves one pos axis per command), each
  // carrying this SAME resolved `newJoints` as an override so the final
  // robot.joints lands on STUDIO's own per-model IK result regardless of
  // which of the up to 3 calls the server processes last, rather than the
  // server's own calculateJoints() (a single generic formula that would
  // silently diverge from what this same model's real kinematics chain
  // needs - see server.ts's own jog case comment / the delta-sync design).
  // localMutate mirrors the exact same pos+joints locally per axis so the
  // UI moves instantly, rolled back per-axis if that axis's own request
  // fails (see store.tsx's own sendRobotCommand comment).
  const handleXYZJog = (dx: number, dy: number, dz: number) => {
    const cart = jointsToCartesianForModel(robot.model, robot.joints);
    const x = cart.x + dx * jogStep;
    const y = cart.y + dy * jogStep;
    const z = cart.z + dz * jogStep;
    const newJoints = resolveTargetJoints(robot.model, x, y, z, cart.a, cart.b, cart.c, robot.joints, robot.joints);
    // A single step that would swing any joint a long way (an inverse-kinematics branch change, a target near the
    // edge of the workspace) is not sent: on a real robot that is a sweep through everything around it.
    const verdict = guardJogStep({ robotId: robot.id, from: robot.joints, to: newJoints });
    if (!verdict.ok) {
      reportCommandIssue(verdict.issue);
      return;
    }
    const axes: { axis: 'x' | 'y' | 'z'; amount: number; value: number }[] = [
      { axis: 'x' as const, amount: dx * jogStep, value: x },
      { axis: 'y' as const, amount: dy * jogStep, value: y },
      { axis: 'z' as const, amount: dz * jogStep, value: z },
    ].filter((a) => a.amount !== 0);
    for (const a of axes) {
      sendRobotCommand(
        robot.id,
        'jog',
        { axis: a.axis, amount: a.amount, target: 'robot', joints: newJoints },
        (r) => ({ pos: { ...r.pos, [a.axis]: a.value, a: cart.a, b: cart.b, c: cart.c }, joints: newJoints })
      );
    }
  };

  // Dedicated base-rotation (J1) jog, alongside the Cartesian XYZ jog above -
  // requested directly: 2 dedicated base-rotation buttons rather than
  // needing to open the separate J1-J6 grid (JointControlsOverlay) just to
  // nudge the base. Deliberately pure joint-space, NOT round-tripped
  // through Cartesian pos+resolveTargetJoints the way handleXYZJog is:
  // rotating J1 alone doesn't need inverse kinematics at all (unlike
  // dx/dy/dz, which do), so going straight to the joint value is both
  // simpler and can't introduce a wrong-solution IK ambiguity. Still keeps
  // `robot.pos` consistent afterward via forward kinematics (same
  // jointsToCartesianForModel used above) rather than leaving it stale,
  // and clamps to this model's own real J1 limits (jointLimitsFor, same
  // helper the J1-J6 grid's own knob/slider already use) so a jog can't
  // walk the joint value outside what a real robot could ever reach.
  const handleJ1Jog = (direction: 1 | -1) => {
    const [j1Min, j1Max] = jointLimitsFor(robot.model, 'j1');
    const newJ1 = Math.min(j1Max, Math.max(j1Min, robot.joints.j1 + direction * jogStep));
    if (newJ1 === robot.joints.j1) return; // already at a real limit - no-op, not a clamped-but-sent command
    const newJoints = { ...robot.joints, j1: newJ1 };
    const newCart = jointsToCartesianForModel(robot.model, newJoints);
    sendRobotCommand(
      robot.id,
      'jog',
      // axis:'x'/amount:0 is a real no-op on the server's own robot.pos.x -
      // the actual desired state is the `joints` override right below,
      // same sanctioned mechanism handleXYZJog already uses (see
      // server.ts's own jog case comment on that override).
      { axis: 'x', amount: 0, target: 'robot', joints: newJoints },
      () => ({ pos: { ...robot.pos, x: newCart.x, y: newCart.y, z: newCart.z, a: newCart.a, b: newCart.b, c: newCart.c }, joints: newJoints })
    );
  };

  // Real pose reset ("HOME"/"RESET" buttons) - was updateRobot(), the
  // optimistic-local + 500ms-debounced-full-tree-save path meant for UI
  // *preferences* (layout, panel state) - it never broadcasts to any OTHER
  // connected client (a second STUDIO window, or the Android app's own
  // embedded WebView copy of this same page), so a reset triggered on one
  // client silently never appeared on another, in either direction. Real
  // feedback from live testing. Routed through the same atomic
  // sendRobotCommand() channel handleXYZJog/handleJ1Jog above already use,
  // which the server both persists AND broadcasts to every other client.
  // HOME and RESET share this same pos+joints reset - only RESET also
  // stops playback (handleStop), matching each button's own original
  // behavior before this fix.
  const resetPose = (alsoStop: boolean) => {
    if (alsoStop) handleStop();
    const newJoints = homePoseFor(robot.model);
    sendRobotCommand(
      robot.id,
      'reset',
      { target: 'robot', joints: newJoints },
      (r) => ({ pos: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0, tx: r.pos?.tx, ty: r.pos?.ty, trz: r.pos?.trz }, joints: newJoints })
    );
  };

  // Same real-broadcast fix as handleReset above, for the XY table's own
  // separate "HOME XY" button - resets only pos.tx/ty + xyTable.pos, not
  // the arm's own pos/joints.
  const handleResetXY = () => {
    sendRobotCommand(
      robot.id,
      'reset',
      { target: 'xytable' },
      (r) => ({
        pos: { ...r.pos, tx: 0, ty: 0 },
        xyTable: r.xyTable ? { ...r.xyTable, pos: { x: 0, y: 0 } } : r.xyTable,
      })
    );
  };

  // "RESET 3D" only ever remounts THIS client's own VirtualKinematics
  // (camera framing, not real robot state) - the reset3DKey effect below
  // still drives that local remount for every client uniformly (this one
  // included), but the trigger now comes from robot.reset3DTrigger via
  // that effect instead of being bumped directly here, so a press on any
  // client (Android's embedded WebView included) now remounts the 3D view
  // on every OTHER connected client too, not just the one pressed. Real
  // request from live testing ("verse en studio... y viceversa, asi se ve
  // sincronizaciÃ³n").
  const handleReset3D = () => {
    sendRobotCommand(robot.id, 'reset3D', undefined, () => ({ reset3DTrigger: Date.now() }));
  };

  // Same real-broadcast fix as handleReset above, for the XY table's own
  // position sliders (both the floating XYTableOverlay and the docked "XY
  // Table Controls" panel below) - `absolute: true` tells the server to SET
  // the axis to `amount` instead of adding it, reusing the same validated
  // 'jog' command/case rather than a bespoke one.
  const handleXYAxisChange = (axis: 'tx' | 'ty', val: number) => {
    // One atomic "table" move to the position the slider reached (the other axis stays where it is): the server
    // checks the whole move against the limits of the model and applies all of it or none of it.
    const current = robot.xyTable?.pos;
    const params = tableParams(axis === 'tx' ? val : (current?.x ?? 0), axis === 'ty' ? val : (current?.y ?? 0), 'absolute');
    if (!params) return;
    sendRobotCommand(
      robot.id,
      'table',
      { ...params },
      (r) => ({
        pos: { ...r.pos, [axis]: val },
        xyTable: r.xyTable ? { ...r.xyTable, pos: { ...r.xyTable.pos, [axis === 'tx' ? 'x' : 'y']: val } } : r.xyTable,
      })
    );
  };

  const toggleValve = (index: number) => {
    // Atomic /api/robot/:id/command instead of updateRobot + the 500ms
    // debounced full-tree POST /api/settings - see the delta-sync design
    // CAUSA A / store.tsx's own sendRobotCommand comment. localMutate gives
    // instant optimistic feedback (rolled back if the request fails);
    // every other client's state updates via the WS delta round-trip,
    // same as before.
    const newValves = [...robot.valves] as [boolean, boolean];
    newValves[index] = !newValves[index];
    sendRobotCommand(robot.id, 'valve', { index, state: newValves[index] }, () => ({ valves: newValves }));
  };

  const togglePump = (index: number) => {
    const newPumps = [...robot.pumps] as [boolean, boolean];
    newPumps[index] = !newPumps[index];
    sendRobotCommand(robot.id, 'pump', { index, state: newPumps[index] }, () => ({ pumps: newPumps }));
  };

  return { handleAddPoint, handleXYZJog, handleJ1Jog, resetPose, handleResetXY, handleReset3D, handleXYAxisChange, toggleValve, togglePump };
}
