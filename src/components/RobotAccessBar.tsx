// =============================================================================
// HYDRA-UMC STUDIO - Robot access bar: RobotAccessBar.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// What decides whether this window may move a robot, in one row under the robot's name:
// - Live or Sim: in Sim this window sends nothing that moves the robot (lib/liveSim.ts); the default is Live.
// - The reservation of the robot: reserve it for this window, release it, see who holds it (and, for an
//   administrator, take it over). The reservation belongs to the account and to this window (controller id), and
//   it is renewed while this window keeps it.
// - The arming of the jog, when the administrator asks for it (safety limit jog.armRequired).
// - The list of every reservation (GET /api/claims).
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Hand, Lock, ShieldCheck, Unlock } from 'lucide-react';
import { useHydraStore, type RobotState } from '../store';
import { useModeState, useSafetyState, setRobotMode, setDefaultRobotMode, setSafetyState } from '../lib/accessStore';
import { modeOf } from '../lib/liveSim';
import { armJog, claimRobot, fetchClaims, fetchSafetyLimits, releaseRobot } from '../lib/accessApi';
import { claimStanding, decodeJwtUsername, secondsLeft, type ClaimEntry } from '../lib/claims';
import { getControllerId } from '../lib/controllerSession';
import { isArmed } from '../lib/safetyLimits';
import type { CommandResult } from '../lib/commandResult';
import { ConfirmDialog } from './ConfirmDialog';

const POLL_MS = 10_000;
/** A reservation of this window is renewed when it has less than this left. */
const RENEW_BELOW_SECONDS = 90;

const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function ClaimsList({ claims, robotNames, myUsername }: { claims: ClaimEntry[]; robotNames: Record<number, string>; myUsername: string | null }) {
  const { t } = useTranslation();
  const myController = getControllerId();
  if (claims.length === 0) return <p className="text-[11px] text-slate-500">{t('access.list_empty')}</p>;
  return (
    <table className="w-full text-[11px] text-left" data-testid="claims-list">
      <thead>
        <tr className="text-slate-500 uppercase tracking-wider">
          <th className="py-1 pr-3">{t('access.col_robot')}</th>
          <th className="py-1 pr-3">{t('access.col_owner')}</th>
          <th className="py-1 pr-3">{t('access.col_controller')}</th>
          <th className="py-1">{t('access.col_left')}</th>
        </tr>
      </thead>
      <tbody>
        {claims.map((claim) => {
          const left = secondsLeft(claim);
          const standing = claimStanding(claim, myController, myUsername);
          return (
            <tr key={`${claim.cellId ?? ''}-${claim.robotId}`} className={standing === 'mine' ? 'text-emerald-300' : 'text-slate-300'}>
              <td className="py-1 pr-3 font-bold">{claim.robotName ?? robotNames[claim.robotId] ?? `#${claim.robotId}`}</td>
              <td className="py-1 pr-3">{claim.ownerUsername}</td>
              <td className="py-1 pr-3 font-mono">{claim.controllerId ?? t('access.no_controller')}{standing === 'mine' ? ` (${t('access.this_window')})` : ''}</td>
              <td className="py-1 font-mono">{left === null ? '-' : clock(left)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function RobotAccessBar({ robot }: { robot: RobotState }) {
  const { t } = useTranslation();
  const { authToken, isAdmin, robots, reportCommandIssue } = useHydraStore();
  const modes = useModeState();
  const safety = useSafetyState();
  const mode = modeOf(modes, robot.id);
  const myUsername = useMemo(() => decodeJwtUsername(authToken), [authToken]);
  const myController = getControllerId();

  const [claims, setClaims] = useState<ClaimEntry[]>([]);
  const [armedUntil, setArmedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [showList, setShowList] = useState(false);
  const [confirmForce, setConfirmForce] = useState(false);

  const mine = claims.find((c) => c.robotId === robot.id);
  const standing = claimStanding(mine, myController, myUsername);
  const armRequired = safety.limits.jog.armRequired;
  const armed = isArmed(armedUntil, now);

  const report = useCallback((command: string, result: CommandResult) => {
    if (result.ok) return;
    reportCommandIssue({ code: result.code ?? 'rejected', command, robotIds: [robot.id], detail: result.detail });
  }, [reportCommandIssue, robot.id]);

  const refresh = useCallback(async () => {
    const [list, read] = await Promise.all([fetchClaims(), fetchSafetyLimits(robot.id)]);
    if (list) setClaims(list);
    if (read) {
      setSafetyState(read.state);
      setArmedUntil(read.jogArmedUntil);
    }
  }, [robot.id]);

  useEffect(() => {
    if (!authToken) return;
    void refresh();
    const timer = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [authToken, refresh]);

  useEffect(() => {
    if (standing !== 'mine' && !armed) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [standing, armed]);

  // A reservation of this window is renewed while it is kept (re-claiming one's own robot refreshes its time).
  const left = mine ? secondsLeft(mine, now) : null;
  useEffect(() => {
    if (standing !== 'mine' || left === null || left > RENEW_BELOW_SECONDS) return;
    void claimRobot(robot.id).then((result) => { if (result.ok) void refresh(); });
  }, [standing, left, robot.id, refresh]);

  const run = async (command: string, action: () => Promise<CommandResult>) => {
    setBusy(true);
    try {
      const result = await action();
      report(command, result);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleArm = async () => {
    setBusy(true);
    try {
      const { result, expiresAt } = await armJog(robot.id, !armed);
      report('jog-arm', result);
      if (result.ok) setArmedUntil(armed ? null : expiresAt);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const robotNames = useMemo(() => Object.fromEntries(robots.map((r) => [r.id, r.name])), [robots]);

  const badge = (() => {
    if (standing === 'mine') return { tone: 'bg-emerald-950 text-emerald-400', text: t('access.held_by_me', { time: left === null ? '' : clock(left) }) };
    if (standing === 'other-controller') return { tone: 'bg-amber-950 text-amber-400', text: t('access.held_by_me_elsewhere') };
    if (standing === 'other-account') return { tone: 'bg-rose-950 text-rose-400', text: t('access.held_by_other', { user: mine?.ownerUsername ?? '?' }) };
    return { tone: 'bg-slate-800 text-slate-400', text: t('access.free') };
  })();

  const buttonClass = 'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border disabled:opacity-40';

  return (
    <div className="flex flex-col gap-2" data-testid="robot-access-bar">
      <div className="flex items-center flex-wrap gap-2">
        <div role="group" aria-label={t('access.mode_label')} className="flex rounded-md overflow-hidden border border-slate-700">
          <button
            type="button"
            aria-pressed={mode === 'live'}
            data-testid="mode-live"
            onClick={() => setRobotMode(robot.id, 'live')}
            title={t('access.mode_live_hint')}
            className={'px-2 py-1 text-[10px] font-black uppercase tracking-wider ' + (mode === 'live' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-500 hover:text-slate-300')}
          >
            {t('access.mode_live')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'sim'}
            data-testid="mode-sim"
            onClick={() => setRobotMode(robot.id, 'sim')}
            title={t('access.mode_sim_hint')}
            className={'px-2 py-1 text-[10px] font-black uppercase tracking-wider ' + (mode === 'sim' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500 hover:text-slate-300')}
          >
            {t('access.mode_sim')}
          </button>
        </div>
        {mode === 'sim' && <span className="text-[10px] font-bold text-amber-400" data-testid="sim-notice">{t('access.sim_notice')}</span>}

        <span data-testid="claim-badge" className={'text-xs px-2 py-1 rounded-md uppercase font-bold tracking-wider ' + badge.tone}>{badge.text}</span>

        {standing === 'free' && (
          <button type="button" disabled={busy} onClick={() => run('claim', () => claimRobot(robot.id))} className={buttonClass + ' border-sky-600 text-sky-300 hover:bg-sky-950'}>
            <Lock size={12} />{t('access.reserve')}
          </button>
        )}
        {standing === 'mine' && (
          <button type="button" disabled={busy} onClick={() => run('release', () => releaseRobot(robot.id))} className={buttonClass + ' border-slate-600 text-slate-300 hover:bg-slate-800'}>
            <Unlock size={12} />{t('access.release')}
          </button>
        )}
        {standing !== 'free' && standing !== 'mine' && isAdmin && (
          <button type="button" disabled={busy} onClick={() => setConfirmForce(true)} className={buttonClass + ' border-rose-600 text-rose-300 hover:bg-rose-950'}>
            <Hand size={12} />{t('access.take_over')}
          </button>
        )}

        {armRequired && (
          <button
            type="button"
            disabled={busy || (standing !== 'free' && standing !== 'mine')}
            data-testid="jog-arm"
            onClick={() => { void toggleArm(); }}
            title={t('access.arm_hint')}
            className={buttonClass + (armed ? ' border-emerald-600 text-emerald-300 hover:bg-emerald-950' : ' border-amber-600 text-amber-300 hover:bg-amber-950')}
          >
            <ShieldCheck size={12} />
            {armed ? t('access.disarm', { seconds: Math.max(0, Math.round(((armedUntil ?? now) - now) / 1000)) }) : t('access.arm')}
          </button>
        )}

        <button type="button" onClick={() => setShowList((v) => !v)} aria-expanded={showList} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 underline">
          {t('access.list_toggle', { count: claims.length })}
        </button>
      </div>

      {showList && (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
          <ClaimsList claims={claims} robotNames={robotNames} myUsername={myUsername} />
          <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
            <input type="checkbox" checked={modes.defaultMode === 'sim'} onChange={(e) => setDefaultRobotMode(e.target.checked ? 'sim' : 'live')} />
            {t('access.default_sim')}
          </label>
        </div>
      )}

      <ConfirmDialog
        open={confirmForce}
        message={t('access.confirm_take_over', { robot: robot.name, user: mine?.ownerUsername ?? '?' })}
        onConfirm={() => { setConfirmForce(false); void run('claim', () => claimRobot(robot.id, { force: true })); }}
        onCancel={() => setConfirmForce(false)}
      />
    </div>
  );
}
