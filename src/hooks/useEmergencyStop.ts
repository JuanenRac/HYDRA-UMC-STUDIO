// =============================================================================
// HYDRA-UMC STUDIO - The global emergency stop: hooks/useEmergencyStop.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The emergency stop is GLOBAL: one call stops every robot of every controller, with no confirmation; a failed call is retried, an expired
// session renewed, and a refused or missing route falls back to the stop robot by robot.
// =============================================================================
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { apiUrl } from '../lib/apiBase';
import { authHeaders } from '../lib/session';
import { type CommandIssue } from '../lib/commandResult';
import { type StopAllReport, requestStopAllWithRetry, stopRobotByRobot } from '../lib/stopAll';
import type { PostRobotCommand } from '../lib/robotCommandPost';
import { rememberSettingsEtag } from './useSharedConfig';
import type { HydraController } from '../store';

interface EmergencyStopDeps {
  controllersRef: MutableRefObject<HydraController[]>;
  settingsEtagRef: MutableRefObject<string | null>;
  postRobotCommand: PostRobotCommand;
  attemptTokenRefresh: () => Promise<boolean>;
  applyServerData: (data: any) => void;
  reportCommandIssue: (issue: Omit<CommandIssue, 'id'>) => void;
  setCommandIssue: Dispatch<SetStateAction<CommandIssue | null>>;
  setStopAllReport: Dispatch<SetStateAction<StopAllReport | null>>;
  setStopAllInFlight: Dispatch<SetStateAction<number>>;
}

export function useEmergencyStop({
  controllersRef, settingsEtagRef, postRobotCommand, attemptTokenRefresh, applyServerData, reportCommandIssue, setCommandIssue, setStopAllReport, setStopAllInFlight,
}: EmergencyStopDeps) {
  // The per-robot stop of every robot (and its valves and pumps off), used only when the global route is rate
  // limited (429) or missing (404, an older server). Same report shape as the global answer.
  const stopEachRobot = (): Promise<StopAllReport> => stopRobotByRobot(
    controllersRef.current.flatMap((c) => c.robots.map((robot) => ({ controllerId: c.id, robot }))),
    postRobotCommand,
  );

  // The emergency stop is GLOBAL: one call stops every robot of every controller, whichever one is selected, with
  // no confirmation (POST /api/stop-all; lib/stopAll.ts). It does not wait for any refresh. A network failure is
  // retried once; an expired session is renewed once; a 429 or a 404 falls back to the per-robot stop; and when
  // nothing answers the "stop not confirmed" issue stays on screen until a later stop gets an answer.
  const emergencyStop = async (): Promise<void> => {
    setStopAllInFlight((n) => n + 1);
    try {
      let attempt = await requestStopAllWithRetry();
      if (attempt.kind === 'failed' && attempt.sessionExpired && (await attemptTokenRefresh())) {
        attempt = await requestStopAllWithRetry();
      }
      const report = attempt.kind === 'report'
        ? attempt.report
        : attempt.kind === 'fallback'
          ? await stopEachRobot()
          : null;
      if (!report) {
        const everyId = [...new Set(controllersRef.current.flatMap((c) => c.robots.map((r) => r.id)))];
        reportCommandIssue({
          code: 'estop_failed',
          command: 'stop',
          robotIds: everyId,
          detail: attempt.kind === 'failed' ? [attempt.code, attempt.detail].filter(Boolean).join(': ') || null : null,
        });
        return;
      }
      setCommandIssue((current) => (current?.code === 'estop_failed' ? null : current));
      setStopAllReport(report);
      // The socket's per-robot deltas usually arrive first; the settings are read again to be sure.
      const refreshHeaders = authHeaders();
      fetch(apiUrl('/api/settings'), { headers: refreshHeaders })
        .then((r) => { rememberSettingsEtag(settingsEtagRef, r); return r.ok ? r.json() : null; })
        .then((data) => { if (data) applyServerData(data); })
        .catch(() => {});
    } finally {
      setStopAllInFlight((n) => n - 1);
    }
  };

  return { emergencyStop };
}
