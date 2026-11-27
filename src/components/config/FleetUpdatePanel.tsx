// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, updates: components/config/FleetUpdatePanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Programs installed on the device: every service under /opt/hydra-umc and the server with its Studio, against the newest release of each. The device does the work (a
// copy of each program with its unit files, the installer of the program, the checks, the way back); this panel looks, asks for a confirmation that names the programs, and
// shows each program with its step, its state and the reason it failed, one after the other. It only looks until the person allows applying in the section above (the
// same switch, off by default). The server restarts at the end of its own update: the panel keeps asking, says how long it has waited, and after a limit of silence says so
// and offers to look again. When the run ends with the server updated, the page reloads to load the new Studio.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive, RefreshCw, Download, RotateCcw, Undo2 } from 'lucide-react';
import { failureKey as panelFailureKey, type PanelFailure } from '../../lib/panelApi';
import { useStudioPrefs } from '../../lib/studioPrefs';
import {
  SERVER_NEEDS_MB, applyFleet, confirmationOf, diskLowForServer, errorKey, followFleet, planFleet, readFleet, reasonKey, refusalKey, resumable, resumeFleet, rollbackFleet, runActive,
  stepProgress, summary, updatable, type FleetRow, type FleetStatus,
} from '../../lib/fleetUpdate';

const RELOAD_AFTER_MS = 5000;

/** The times are the ones of a person waiting for a machine; a test of the whole way with a server that restarts passes shorter ones. */
export interface FleetUpdatePanelTimes { pollMs?: number; silenceMs?: number; reloadMs?: number }

export function FleetUpdatePanel({ pollMs, silenceMs, reloadMs }: FleetUpdatePanelTimes = {}) {
  const { t } = useTranslation();
  const prefs = useStudioPrefs();
  const [status, setStatus] = useState<FleetStatus | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [looking, setLooking] = useState(false);
  const [silent, setSilent] = useState<number | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [confirming, setConfirming] = useState<{ kind: 'update' | 'resume' | 'rollback'; names: string[] } | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [serverUpdated, setServerUpdated] = useState(false);
  const following = useRef(false);
  const alive = useRef(true);
  const serverWasUpdating = useRef(false);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const follow = useCallback(async () => {
    if (following.current) return;
    following.current = true;
    setGaveUp(false);
    const end = await followFleet({
      read: readFleet, cancelled: () => !alive.current, intervalMs: pollMs, silenceLimitMs: silenceMs,
      onStatus: (next) => { if (alive.current) { setStatus(next); setSilent(null); } },
      onWaiting: (seconds) => { if (alive.current) setSilent(seconds); },
    });
    following.current = false;
    if (!alive.current) return;
    if (end.kind === 'silent') { setGaveUp(true); return; }
    setSilent(null);
    if (end.kind === 'ended') {
      const server = end.status.report?.services.find((row) => row.name === 'server');
      if (serverWasUpdating.current && server?.state === 'done') setServerUpdated(true);
    }
  }, []);

  const load = useCallback(async () => {
    const seen = await readFleet();
    if (!alive.current) return;
    if (seen.kind === 'status') {
      setStatus(seen.status); setFailure(null); setGaveUp(false); setSilent(null);
      if (runActive(seen.status.report)) { serverWasUpdating.current = true; void follow(); }
    } else {
      setStatus(null); setFailure(seen.kind === 'stop' ? 'forbidden' : 'unsupported');
    }
  }, [follow]);

  useEffect(() => { void load(); }, [load]);

  // The server updated itself: the page loads the new Studio.
  useEffect(() => {
    if (!serverUpdated) return;
    const timer = window.setTimeout(() => window.location.reload(), reloadMs ?? RELOAD_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [serverUpdated, reloadMs]);

  const report = status?.report ?? null;
  const running = runActive(report);
  const canApply = prefs.selfUpdateApply && status?.applyEnabled === true && !running;
  const todo = updatable(report);

  const look = async () => {
    setLooking(true); setMessage(null);
    const result = await planFleet();
    if (!alive.current) return;
    setLooking(false);
    if (result.ok) { setStatus(result.status); setFailure(null); } else setMessage(t(`fleet.start_${result.reason}`));
  };

  const ask = (kind: 'update' | 'resume' | 'rollback', names: string[]) => { setCode(''); setMessage(null); setConfirming({ kind, names }); };
  const needsCode = report?.helper === 'root' && report.totpRequired;

  const start = async (kind: 'update' | 'resume' | 'rollback', names: string[]) => {
    const confirmation = confirmationOf(report, code);
    setConfirming(null); setMessage(null); setCode('');
    serverWasUpdating.current = names.includes('server');
    const result = kind === 'update' ? await applyFleet(names, confirmation) : kind === 'resume' ? await resumeFleet(names[0], confirmation) : await rollbackFleet(names[0], confirmation);
    if (!alive.current) return;
    if (!result.ok) { setMessage(t(`fleet.start_${result.reason}`)); return; }
    setStatus(result.status);
    void follow();
  };

  const rowText = (row: FleetRow): string => {
    if (row.state === 'running') return `${t(report?.helper === 'root' && row.step === 'fetching' ? 'fleet.step_fetching_package' : `fleet.step_${row.step || 'disk'}`)}${row.substeps > 0 ? ` (${row.substep})` : ''}${row.elapsedS > 0 ? ` - ${row.elapsedS} s` : ''}`;
    if (row.error) return t(errorKey(row.error), { free: row.freeMb ?? '?', need: row.needMb ?? '?' });
    return t(`fleet.state_${row.state}`);
  };

  return (
    <section className="space-y-4" data-testid="fleet-panel">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><HardDrive size={16} /> {t('fleet.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t(report?.helper === 'root' ? 'fleet.intro_root' : 'fleet.intro')}</p>
      </div>

      {failure && <p role="alert" data-testid="fleet-error" className="text-xs text-amber-400">{failure === 'unsupported' ? t('fleet.unsupported') : t(panelFailureKey(failure))}</p>}

      {status && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400" data-testid="fleet-run-state">{report ? (report.state === 'failed' ? t('fleet.run_failed', { name: report.stoppedAt || report.error }) : report.state === 'blocked' ? t('fleet.run_blocked', { name: report.stoppedAt || report.error }) : t(`fleet.run_${report.state}`)) : t('fleet.no_plan')}</span>
            <span className="flex gap-3">
              <button type="button" data-testid="fleet-look" onClick={() => void look()} disabled={looking || running} className="flex items-center gap-1 text-[10px] text-sky-400 disabled:opacity-40"><RefreshCw size={12} className={looking ? 'animate-spin' : ''} /> {looking ? t('fleet.looking') : t('fleet.look')}</button>
              <button type="button" data-testid="fleet-update-all" onClick={() => ask('update', todo.map((row) => row.name))} disabled={!canApply || todo.length === 0 || looking} className="flex items-center gap-1 text-[10px] text-sky-400 disabled:opacity-30"><Download size={12} /> {t('fleet.update_all')}</button>
            </span>
          </div>
          {report && <p className="px-4 py-2 text-[10px] text-slate-500" data-testid="fleet-summary">{t('fleet.summary', summary(report))}</p>}
          {report && refusalKey(report.error) && <p role="alert" className="px-4 py-2 text-[10px] text-amber-400" data-testid="fleet-refused">{t(refusalKey(report.error) as string)}</p>}
          {report && (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[9px] uppercase tracking-widest text-slate-600"><th className="px-4 py-2">{t('fleet.col_program')}</th><th className="px-4 py-2">{t('fleet.col_installed')}</th><th className="px-4 py-2">{t('fleet.col_latest')}</th><th className="px-4 py-2">{t('fleet.col_action')}</th><th className="px-4 py-2">{t('fleet.col_progress')}</th><th className="px-4 py-2" /></tr></thead>
              <tbody>
                {report.services.map((row) => (
                  <tr key={row.name} data-testid="fleet-row" data-state={row.state} className="border-t border-slate-800 text-slate-300 align-top">
                    <td className="px-4 py-2 font-mono">{row.name}</td>
                    <td className="px-4 py-2 font-mono">{row.installed ?? '-'}{row.previous && <span className="block text-[9px] text-slate-500" data-testid={`fleet-previous-${row.name}`}>{t('fleet.kept', { version: row.previous })}</span>}</td>
                    <td className="px-4 py-2 font-mono">{row.latest ?? '-'}</td>
                    <td className="px-4 py-2">{t(`fleet.action_${row.action}`)}{reasonKey(row.reason) && <span className="block text-[9px] text-slate-500">{t(reasonKey(row.reason) as string)}</span>}{row.reason === 'needs_newer_rustc' && row.detail && <span className="block text-[9px] font-mono text-slate-500" data-testid={`fleet-needs-${row.name}`}>{row.detail}</span>}</td>
                    <td className="px-4 py-2" data-testid={`fleet-progress-${row.name}`}>
                      {row.action === 'update' || row.state !== 'waiting' ? (
                        <>
                          <div className={row.state === 'failed' || row.state === 'rolled_back' || row.state === 'blocked' ? 'text-red-400' : row.state === 'done' ? 'text-emerald-400' : 'text-slate-300'}>{rowText(row)}</div>
                          <div className="h-1 mt-1 rounded bg-slate-800 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stepProgress(row) * 100)}><i className="block h-1 bg-sky-500" style={{ width: `${Math.round(stepProgress(row) * 100)}%` }} /></div>
                          {row.state === 'running' && row.detail && <div className="text-[9px] font-mono text-slate-500 truncate max-w-xs">{row.detail}</div>}
                          {row.state !== 'running' && row.detail && row.error && <div className="text-[9px] font-mono text-slate-500 break-all max-w-xs">{row.detail}</div>}
                          {row.unitRestored === false && <div className="text-[10px] text-amber-400" data-testid={`fleet-unit-${row.name}`}>{t('fleet.unit_not_restored')}</div>}
                        </>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {resumable(row) && <button type="button" data-testid={`fleet-resume-${row.name}`} disabled={!canApply} onClick={() => (needsCode ? ask('resume', [row.name]) : void start('resume', [row.name]))} className="inline-flex items-center gap-1 text-[10px] text-sky-400 disabled:opacity-30"><RotateCcw size={12} /> {t('fleet.resume')}</button>}
                      {report.helper === 'root' && row.previous && !running && <button type="button" data-testid={`fleet-rollback-${row.name}`} disabled={!canApply} onClick={() => ask('rollback', [row.name])} className="ml-3 inline-flex items-center gap-1 text-[10px] text-slate-400 disabled:opacity-30"><Undo2 size={12} /> {t('fleet.go_back')}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {report && report.rootFreeMb !== null && <p className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600" data-testid="fleet-disk">{t('fleet.disk_line', { root: report.rootFreeMb, workspace: report.workspaceFreeMb ?? '?' })}</p>}
          {diskLowForServer(report) && <p role="alert" className="px-4 py-2 text-[10px] text-amber-400" data-testid="fleet-disk-low">{t('fleet.disk_low', { need: SERVER_NEEDS_MB })}</p>}
          <p className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600" data-testid="fleet-mode">{!prefs.selfUpdateApply ? t('fleet.mode_check_only') : status.applyEnabled ? '' : t('fleet.mode_server_off')}</p>
        </div>
      )}

      {confirming && (
        <div role="alertdialog" aria-label={t(confirming.kind === 'rollback' ? 'fleet.confirm_rollback_title' : 'fleet.confirm_title')} data-testid="fleet-confirm" className="border border-amber-500/40 rounded-xl p-4 space-y-3 bg-slate-950">
          <p className="text-xs text-slate-200">{confirming.kind === 'rollback' ? t('fleet.confirm_rollback_body', { names: confirming.names.join(', ') }) : confirming.kind === 'resume' ? t('fleet.confirm_resume_body', { names: confirming.names.join(', ') }) : t('fleet.confirm_body', { count: confirming.names.length, names: confirming.names.join(', ') })}</p>
          {confirming.names.includes('server') && <p className="text-[10px] text-slate-500" data-testid="fleet-confirm-server">{t('fleet.confirm_server')}</p>}
          {needsCode && (
            <label className="block text-[10px] text-slate-400">{t('fleet.code_label')}
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} data-testid="fleet-code" onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))} className="mt-1 block w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-sm text-slate-200" />
            </label>
          )}
          <div className="flex gap-3">
            <button type="button" data-testid="fleet-confirm-yes" disabled={needsCode && code.length !== 6} onClick={() => void start(confirming.kind, confirming.names)} className="px-3 py-1 rounded bg-sky-600 text-white text-xs disabled:opacity-40">{confirming.kind === 'rollback' ? t('fleet.go_back') : confirming.kind === 'resume' ? t('fleet.resume') : t('fleet.confirm_yes')}</button>
            <button type="button" data-testid="fleet-confirm-no" onClick={() => setConfirming(null)} className="px-3 py-1 rounded border border-slate-700 text-slate-300 text-xs">{t('fleet.confirm_no')}</button>
          </div>
        </div>
      )}

      {message && <p role="alert" data-testid="fleet-message" className="text-xs text-amber-400">{message}</p>}
      {silent !== null && running && !gaveUp && <p className="text-xs text-amber-400" role="status" data-testid="fleet-waiting">{t('fleet.waiting', { seconds: silent })}</p>}
      {gaveUp && <p className="text-xs text-amber-400" role="alert" data-testid="fleet-gaveup">{t('fleet.gave_up')} <button type="button" data-testid="fleet-again" className="underline" onClick={() => void load()}>{t('fleet.look_again')}</button></p>}
      {report?.state === 'interrupted' && <p className="text-xs text-amber-400" role="alert" data-testid="fleet-interrupted">{t('fleet.run_interrupted')}</p>}
      {serverUpdated && <p className="text-xs text-emerald-400" data-testid="fleet-reloading">{t('fleet.reloading')}</p>}
    </section>
  );
}
