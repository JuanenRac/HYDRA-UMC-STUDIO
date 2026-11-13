// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, updates: components/config/SelfUpdatePanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// HYDRA-UMC updates: the server, Studio and the agent of the operating system against the newest signed release of each, checked by the SERVER (GET
// /api/admin/self-update). The section only looks until the person turns on "apply updates from this Studio" (off by default); even then every update
// and every way back asks for a confirmation that names the program and the two versions. The job shows its steps (checking, downloading, verifying, applying,
// restarting, done or failed) and keeps asking while the server is away restarting: it ends with the result, or with a message after a limit of silence,
// never with a screen that waits for ever. When the update of Studio is done the page reloads to load the new one.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ShieldCheck, Undo2, Download } from 'lucide-react';
import { failureKey as panelFailureKey, panelRead, type PanelFailure } from '../../lib/panelApi';
import { setStudioPrefs, useStudioPrefs } from '../../lib/studioPrefs';
import {
  PROGRESS_STEPS, failureKey, followJob, jobRunning, parseSelfUpdateStatus, progressIndex, readJob, startSelfUpdate,
  type FollowEnd, type SelfUpdateComponent, type SelfUpdateItem, type SelfUpdateJob, type SelfUpdateStatus,
} from '../../lib/selfUpdate';

type Pending = { action: 'apply' | 'rollback'; item: SelfUpdateItem };
const RELOAD_AFTER_MS = 4000;

export function SelfUpdatePanel() {
  const { t } = useTranslation();
  const prefs = useStudioPrefs();
  const [status, setStatus] = useState<SelfUpdateStatus | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<SelfUpdateJob | null>(null);
  const [silent, setSilent] = useState<number | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const following = useRef<string | null>(null);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async (refresh: boolean) => {
    setBusy(true);
    const result = await panelRead(`/api/admin/self-update${refresh ? '?refresh=1' : ''}`, parseSelfUpdateStatus);
    if (!alive.current) return;
    if (result.ok) { setStatus(result.value); setFailure(null); } else { setStatus(null); setFailure(result.failure); }
    setBusy(false);
    return result.ok ? result.value : undefined;
  }, []);

  /** Follows one job to its end; the server may be restarting meanwhile, so a failed look is only a reason to wait. */
  const follow = useCallback(async (id: string) => {
    if (following.current === id) return;
    following.current = id;
    setGaveUp(false);
    const end: FollowEnd = await followJob({
      id, read: readJob, cancelled: () => !alive.current || following.current !== id,
      onJob: (next) => { if (alive.current) { setJob(next); setSilent(null); } },
      onWaiting: (seconds) => { if (alive.current) setSilent(seconds); },
    });
    if (!alive.current || following.current !== id) return;
    following.current = null;
    if (end.kind === 'silent') { setGaveUp(true); return; }
    setSilent(null);
    if (end.kind === 'ended') await load(true);
  }, [load]);

  useEffect(() => {
    void load(false).then((value) => { if (value?.job && jobRunning(value.job)) { setJob(value.job); void follow(value.job.id); } else if (value?.job) setJob(value.job); });
  }, [load, follow]);

  // The update of Studio itself: once it is done the page loads the new Studio.
  useEffect(() => {
    if (!job || job.state !== 'done' || job.component !== 'studio' || job.action !== 'apply') return;
    const timer = window.setTimeout(() => window.location.reload(), RELOAD_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [job]);

  const running = jobRunning(job);
  const canApply = prefs.selfUpdateApply && status?.applyEnabled === true && !running;

  const confirm = async () => {
    if (!pending) return;
    const { action, item } = pending;
    setPending(null);
    setMessage(null);
    const started = await startSelfUpdate(action, item.id);
    if (!alive.current) return;
    if (!started.ok) { setMessage(t(`selfupdate.start_${started.reason}`)); return; }
    setJob(started.job);
    void follow(started.job.id);
  };

  const label = (id: SelfUpdateComponent) => t(`selfupdate.component_${id}`);
  const versionLine = (item: SelfUpdateItem, action: 'apply' | 'rollback') =>
    action === 'apply' ? `${item.installed ?? '?'} -> ${item.latest ?? '?'}` : `${item.installed ?? '?'} -> ${item.previous ?? '?'}`;

  return (
    <section className="space-y-4" data-testid="selfupdate-panel">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><ShieldCheck size={16} /> {t('selfupdate.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('selfupdate.intro')}</p>
      </div>

      <label className="flex items-start gap-3 text-xs text-slate-300">
        <input type="checkbox" data-testid="selfupdate-switch" checked={prefs.selfUpdateApply} onChange={(e) => setStudioPrefs({ selfUpdateApply: e.target.checked })} className="mt-0.5" />
        <span><strong className="block">{t('selfupdate.switch_title')}</strong><span className="text-slate-500 text-[10px]">{t('selfupdate.switch_hint')}</span></span>
      </label>

      {failure && <p role="alert" data-testid="selfupdate-error" className="text-xs text-amber-400">{failure === 'unsupported' ? t('selfupdate.unsupported') : t(panelFailureKey(failure))}</p>}

      {status && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('selfupdate.programs')}</span>
            <button type="button" data-testid="selfupdate-check" onClick={() => void load(true)} disabled={busy || running} className="flex items-center gap-1 text-[10px] text-sky-400 disabled:opacity-40"><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> {t('selfupdate.check')}</button>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[9px] uppercase tracking-widest text-slate-600"><th className="px-4 py-2">{t('selfupdate.col_program')}</th><th className="px-4 py-2">{t('selfupdate.col_installed')}</th><th className="px-4 py-2">{t('selfupdate.col_previous')}</th><th className="px-4 py-2">{t('selfupdate.col_latest')}</th><th className="px-4 py-2">{t('selfupdate.col_state')}</th><th className="px-4 py-2" /></tr></thead>
            <tbody>
              {status.items.map((item) => (
                <tr key={item.id} data-testid="selfupdate-row" className="border-t border-slate-800 text-slate-300">
                  <td className="px-4 py-2"><strong>{label(item.id)}</strong><span className="block text-[9px] font-mono text-slate-600">{item.repo}</span></td>
                  <td className="px-4 py-2 font-mono">{item.installed ?? '-'}</td>
                  <td className="px-4 py-2 font-mono text-slate-500">{item.previous ?? '-'}</td>
                  <td className="px-4 py-2 font-mono">{item.latest ?? '-'}</td>
                  <td className="px-4 py-2" data-testid={`selfupdate-state-${item.id}`}>{t(`selfupdate.state_${item.state}`)}{item.state === 'behind' && !item.signedPackage && <span className="block text-[9px] text-amber-400">{t('selfupdate.no_package')}</span>}</td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    <button type="button" data-testid={`selfupdate-apply-${item.id}`} disabled={!canApply || item.state !== 'behind' || !item.signedPackage} onClick={() => setPending({ action: 'apply', item })} className="inline-flex items-center gap-1 text-[10px] text-sky-400 disabled:opacity-30"><Download size={12} /> {t('selfupdate.update')}</button>
                    <button type="button" data-testid={`selfupdate-rollback-${item.id}`} disabled={!canApply || item.previous === null} onClick={() => setPending({ action: 'rollback', item })} className="inline-flex items-center gap-1 text-[10px] text-slate-400 disabled:opacity-30"><Undo2 size={12} /> {t('selfupdate.rollback')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600" data-testid="selfupdate-mode">
            {!prefs.selfUpdateApply ? t('selfupdate.mode_check_only') : status.applyEnabled ? t('selfupdate.mode_apply') : t('selfupdate.mode_server_off')}
            {status.rateLimited && <> {t('selfupdate.rate_limited')}</>}
          </p>
        </div>
      )}

      {pending && (
        <div role="alertdialog" aria-label={t('selfupdate.confirm_title')} data-testid="selfupdate-confirm" className="border border-amber-500/40 rounded-xl p-4 space-y-3 bg-slate-950">
          <p className="text-xs text-slate-200">{t(pending.action === 'apply' ? 'selfupdate.confirm_apply' : 'selfupdate.confirm_rollback', { program: label(pending.item.id), versions: versionLine(pending.item, pending.action) })}</p>
          <p className="text-[10px] text-slate-500">{t('selfupdate.confirm_note')}</p>
          <div className="flex gap-3">
            <button type="button" data-testid="selfupdate-confirm-yes" onClick={() => void confirm()} className="px-3 py-1 rounded bg-sky-600 text-white text-xs">{t('selfupdate.confirm_yes')}</button>
            <button type="button" data-testid="selfupdate-confirm-no" onClick={() => setPending(null)} className="px-3 py-1 rounded border border-slate-700 text-slate-300 text-xs">{t('selfupdate.confirm_no')}</button>
          </div>
        </div>
      )}

      {message && <p role="alert" data-testid="selfupdate-message" className="text-xs text-amber-400">{message}</p>}

      {job && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3" data-testid="selfupdate-job">
          <div className="text-xs text-slate-300"><strong>{t(job.action === 'apply' ? 'selfupdate.job_apply' : 'selfupdate.job_rollback', { program: label(job.component) })}</strong> <span className="font-mono text-slate-500">{job.fromVersion ?? '?'} -&gt; {job.targetVersion ?? '?'}</span></div>
          <ol className="flex flex-wrap gap-2" data-testid="selfupdate-steps">
            {PROGRESS_STEPS.map((step, index) => {
              const at = progressIndex(job);
              const mark = job.state === 'failed' && index === at + 1 ? 'failed' : index < at || (index === at && (job.state === 'done' || job.state === 'failed')) ? 'done' : index === at ? 'now' : 'next';
              return <li key={step} data-testid={`selfupdate-step-${step}`} data-mark={mark} className={`px-2 py-1 rounded text-[10px] border ${mark === 'now' ? 'border-sky-500 text-sky-300' : mark === 'done' ? 'border-emerald-700 text-emerald-400' : mark === 'failed' ? 'border-red-600 text-red-400' : 'border-slate-800 text-slate-600'}`}>{t(`selfupdate.step_${step}`)}</li>;
            })}
          </ol>
          {job.state === 'done' && <p className="text-xs text-emerald-400" data-testid="selfupdate-done">{t(job.action === 'apply' ? 'selfupdate.done_apply' : 'selfupdate.done_rollback', { version: job.targetVersion ?? '?' })}{job.component === 'studio' && job.action === 'apply' && <> {t('selfupdate.reloading')} <button type="button" data-testid="selfupdate-reload" onClick={() => window.location.reload()} className="underline">{t('selfupdate.reload_now')}</button></>}</p>}
          {job.state === 'failed' && <p role="alert" className="text-xs text-red-400" data-testid="selfupdate-failed">{t(failureKey(job.error))}{job.detail ? <span className="block font-mono text-[10px] text-slate-500">{job.detail}</span> : null}</p>}
          {silent !== null && jobRunning(job) && !gaveUp && <p className="text-xs text-amber-400" role="status" data-testid="selfupdate-waiting">{t('selfupdate.waiting', { seconds: silent })}</p>}
          {gaveUp && (
            <p className="text-xs text-amber-400" role="alert" data-testid="selfupdate-gaveup">{t('selfupdate.gave_up')} <button type="button" data-testid="selfupdate-again" className="underline" onClick={() => { following.current = null; void follow(job.id); }}>{t('selfupdate.look_again')}</button></p>
          )}
          {job.log.length > 0 && <pre className="text-[10px] text-slate-500 max-h-32 overflow-auto whitespace-pre-wrap" aria-live="polite">{job.log.map((line) => `${line.at.slice(11, 19)} ${line.step}: ${line.text}`).join('\n')}</pre>}
        </div>
      )}
    </section>
  );
}
