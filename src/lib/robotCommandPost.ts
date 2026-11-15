// =============================================================================
// HYDRA-UMC STUDIO - The POST of one robot command: lib/robotCommandPost.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// One POST of a robot command answered as a typed result, and the table move sent as the jogs of a server that has no
// table command. Moved out of the provider unchanged; what it needs from the provider is passed in.
// =============================================================================
import { serverClient, settle } from './serverClient';
import { type CommandResult, interpretCommandResponse, networkFailure } from './commandResult';
import { isNumberedCommand } from './commandSequence';
import { getControllerId } from './controllerSession';
import { revisionOf, robotRevisions } from './revisions';
import { tableAsJogs } from './tableMove';

export interface CommandPostDeps {
  /** Renews the access token once; true when a new one is held. */
  attemptTokenRefresh: () => Promise<boolean>;
  /** The counter of this window for the numbered motion commands. */
  commandSequence: { next: () => number };
}

export type PostRobotCommand = (id: number, command: string, params?: Record<string, unknown>) => Promise<CommandResult>;

/**
 * One POST of a robot command, answered as a typed result. A 401 means the access token ran out: it is refreshed
 * once and the command sent again before giving up, so an expired session no longer makes a STOP vanish.
 */
export async function postRobotCommand(
  deps: CommandPostDeps,
  id: number,
  command: string,
  params?: Record<string, unknown>,
): Promise<CommandResult> {
  const send = async (): Promise<CommandResult> => {
    // The revision this window last saw of the robot goes along as If-Match (never for STOP): when the robot changed
    // in between, the server answers 412 instead of overwriting what someone else did.
    const ticket = robotRevisions.begin(id, command);
    const headers: { 'If-Match'?: string } = {};
    if (ticket.ifMatch) headers['If-Match'] = ticket.ifMatch;
    try {
      // the status and the body of a refusal come back with the answer, so a 412 or a 403 reads as it did
      const { status, data: body } = await settle(() => serverClient.postRobotByIdCommand({
        path: { id },
        headers,
        body: isNumberedCommand(command) ? { command, params, controllerId: getControllerId(), seq: deps.commandSequence.next() } : { command, params, controllerId: getControllerId() },
      }));
      robotRevisions.finish(id, ticket.seq, revisionOf(body));
      return interpretCommandResponse(status, status < 300, body);
    } catch (error) {
      robotRevisions.finish(id, ticket.seq, null);
      return networkFailure(error instanceof Error ? error.message : undefined);
    }
  };
  let result = await send();
  if (!result.ok && result.code === 'session_expired' && (await deps.attemptTokenRefresh())) result = await send();
  return result;
}

/** The table move as the jogs of a server that has no table command (the first failing answer is the result). */
export async function tableThroughJogs(post: PostRobotCommand, id: number, params: Record<string, unknown>): Promise<CommandResult> {
  let last: CommandResult = { ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] };
  for (const jog of tableAsJogs(params)) {
    last = await post(id, 'jog', jog);
    if (!last.ok) return last;
  }
  return last;
}
