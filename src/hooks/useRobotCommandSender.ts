// =============================================================================
// HYDRA-UMC STUDIO - Sending a robot command: hooks/useRobotCommandSender.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// One POST of a command, answered as a typed result; the command with its optimistic change on screen and the rollback when the server
// refuses it; and the reading of one robot again after a 412. The guard of every motion command runs before anything is sent.
// =============================================================================
import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { applyRobotCommandMutation, rollbackRobotCommand } from '../robotCommandTransition';
import { type CommandIssue, type CommandResult } from '../lib/commandResult';
import { type CommandSequence } from '../lib/commandSequence';
import { guardCommand } from '../lib/motionGuard';
import { getModeState, getSafetyState } from '../lib/accessStore';
import { fetchRobot } from '../lib/accessApi';
import { getStudioPrefs } from '../lib/studioPrefs';
import { isUnknownCommand, markTableCommand, serverHasTableCommand } from '../lib/tableMove';
import { postRobotCommand as postRobotCommandRequest, tableThroughJogs as tableThroughJogsRequest, type PostRobotCommand } from '../lib/robotCommandPost';
import type { HydraController, RobotState } from '../store';

interface RobotCommandSenderDeps {
  attemptTokenRefresh: () => Promise<boolean>;
  commandSequence: CommandSequence;
  controllersRef: MutableRefObject<HydraController[]>;
  activeControllerIdRef: MutableRefObject<string>;
  setControllers: Dispatch<SetStateAction<HydraController[]>>;
  skipNextSaveRef: MutableRefObject<boolean>;
  applyRobotDelta: (msg: any) => void;
  reportCommandIssue: (issue: Omit<CommandIssue, 'id'>) => void;
}

export function useRobotCommandSender({
  attemptTokenRefresh, commandSequence, controllersRef, activeControllerIdRef, setControllers, skipNextSaveRef, applyRobotDelta, reportCommandIssue,
}: RobotCommandSenderDeps) {
  // Per-robot generation counter guarding sendRobotCommand()'s own
  // rollback-on-failure - see that function's own comment and its
  // HYDRA-UMC-IOS-CONTROL/ANDROID-CONTROL/DSI equivalents for the full
  // reasoning (a held jog button/rapid clicks can have several commands
  // for the same robot in flight at once; an early one failing after a
  // later one already applied must not roll back over that newer state).
  const commandGenerationRef = useRef<Record<number, number>>({});

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
      command, params, robotIds: ids, model: target?.model, limits: getSafetyState().limits, modes: getModeState(), listenOnly: getStudioPrefs().listenOnly,
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

  return { postRobotCommand, sendRobotCommand, refreshRobotFromServer };
}
