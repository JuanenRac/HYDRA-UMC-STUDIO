// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Planning and operation: EcosystemPlanning.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Read-only views and dry runs: the simulation of a plan (the semantic planner, never executing anything), the estimates of the job
// dispatcher, the remaining useful life of a series of scores, a reader of the output of `train plan --json` of the updater and the
// state of the window statistics of the data lake. Everything goes through the relay of the server (see src/lib/planningApi.ts); a
// service whose switch is off is said to be off, and nothing on this screen moves a robot, queues a job or installs a version.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Gauge, ListChecks, PlayCircle, RefreshCw, TrainFront } from 'lucide-react';
import {
  checkTrajectory, estimateRul, formatDuration, loadEta, parsePlanRequest, parseRulPoints, parseTrainPlan, probeWindowStatistics, simulatePlan,
  type Eta, type Failure, type RulEstimate, type Simulation, type SwitchState, type TrainPlan,
} from '../lib/planningApi';

const EXAMPLE_PLAN = JSON.stringify({
  steps: [
    { id: 'a', primitive: 'MOVE_TO', robot: 'r1', params: { location: 'bin' } },
    { id: 'b', primitive: 'GRIP', robot: 'r1', params: { target: 'pcb' }, duration_s: 0.5, depends_on: ['a'] },
  ],
  constraints: { workspace: { min: [0, 0, 0], max: [500, 500, 300] }, locations: { bin: [200, 0, 100] }, robots: ['r1'] },
}, null, 2);

const ACTION_STYLE: Record<string, string> = {
  install: 'text-emerald-400', update: 'text-sky-400', downgrade: 'text-amber-400', keep: 'text-slate-400', blocked: 'text-rose-400',
};

const card = 'bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3';
const button = 'flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-all';
const input = 'w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none';

export function EcosystemPlanning() {
  const { t } = useTranslation();
  const say = (failure: Failure, message?: string) => (failure === 'invalid' && message ? `${t('ecosystem.planning_invalid')}${message}` : t(`ecosystem.planning_${failure === 'invalid' ? 'http' : failure}`));

  const [planText, setPlanText] = useState(EXAMPLE_PLAN);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [simulationError, setSimulationError] = useState('');
  const [etaState, setEta] = useState<Eta | null>(null);
  const [etaError, setEtaError] = useState('');
  const [pointsText, setPointsText] = useState('');
  const [limitText, setLimitText] = useState('');
  const [rul, setRul] = useState<RulEstimate | null>(null);
  const [rulError, setRulError] = useState('');
  const [train, setTrain] = useState<TrainPlan | null>(null);
  const [trainError, setTrainError] = useState('');
  const [windows, setWindows] = useState<SwitchState>('unknown');
  const [busy, setBusy] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const runSimulation = async (kind: 'sim' | 'traj' = 'sim') => {
    setSimulation(null);
    setSimulationError('');
    const request = parsePlanRequest(planText);
    if (!request) { setSimulationError(t('ecosystem.planning_sim_invalid_request')); return; }
    setBusy(kind);
    const result = await (kind === 'traj' ? checkTrajectory(request) : simulatePlan(request));
    setBusy('');
    if (result.ok) setSimulation(result.value);
    else setSimulationError(say(result.failure, result.message));
  };

  const readEta = useCallback(async () => {
    setBusy('eta');
    setEtaError('');
    const result = await loadEta();
    setBusy('');
    if (result.ok) setEta(result.value);
    else { setEta(null); setEtaError(say(result.failure, result.message)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const runRul = async () => {
    setRul(null);
    setRulError('');
    const points = parseRulPoints(pointsText);
    const limit = Number(limitText.trim().replace(',', '.'));
    if (!points || limitText.trim() === '' || !Number.isFinite(limit)) { setRulError(t('ecosystem.planning_rul_invalid')); return; }
    setBusy('rul');
    const result = await estimateRul(points, limit);
    setBusy('');
    if (result.ok) setRul(result.value);
    else setRulError(say(result.failure, result.message));
  };

  const openTrain = async (file: File | undefined) => {
    setTrain(null);
    setTrainError('');
    if (!file) return;
    // a train plan is a few kilobytes; anything much bigger is not one
    if (file.size > 1_000_000) { setTrainError(t('ecosystem.planning_train_invalid')); return; }
    const parsed = parseTrainPlan(await file.text());
    if (parsed) setTrain(parsed);
    else setTrainError(t('ecosystem.planning_train_invalid'));
  };

  useEffect(() => {
    let alive = true;
    void probeWindowStatistics().then(state => { if (alive) setWindows(state); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-6 p-4 max-w-5xl">
      <div>
        <h2 className="text-lg font-black text-slate-100 flex items-center gap-2"><ListChecks size={18} /> {t('ecosystem.planning_title')}</h2>
        <p className="text-xs text-slate-500">{t('ecosystem.planning_intro')}</p>
      </div>

      <section className={card} data-testid="planning-simulation">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><PlayCircle size={16} /> {t('ecosystem.planning_sim_title')}</h3>
        <p className="text-[11px] text-slate-500">{t('ecosystem.planning_sim_help')}</p>
        <textarea data-testid="plan-text" rows={10} value={planText} onChange={e => setPlanText(e.target.value)} className={`${input} font-mono`} spellCheck={false} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void runSimulation('sim')} disabled={busy === 'sim' || busy === 'traj'} className={button}><PlayCircle size={14} /> {t('ecosystem.planning_sim_run')}</button>
          <button data-testid="plan-trajectory-run" onClick={() => void runSimulation('traj')} disabled={busy === 'sim' || busy === 'traj'} className={button}><PlayCircle size={14} /> {t('ecosystem.planning_traj_run')}</button>
        </div>
        <p className="text-[11px] text-slate-500">{t('ecosystem.planning_traj_help')}</p>
        {simulationError && <div role="alert" className="text-xs text-rose-400">{simulationError}</div>}
        {simulation && (
          <div className="space-y-2" data-testid="plan-result">
            <div data-testid="plan-verdict" data-verdict={simulation.verdict} className={simulation.verdict === 'accepted' ? 'text-sm font-bold text-emerald-400' : simulation.verdict === 'unchecked' ? 'text-sm font-bold text-amber-400' : 'text-sm font-bold text-rose-400'}>
              {simulation.verdict === 'accepted' ? t('ecosystem.planning_sim_accepted') : simulation.verdict === 'unchecked' ? t('ecosystem.planning_sim_unchecked') : t('ecosystem.planning_sim_rejected')}
            </div>
            <div className="text-[11px] text-slate-500">{t('ecosystem.planning_sim_not_executed')}</div>
            {simulation.unchecked.length > 0 && (
              <div data-testid="plan-unchecked">
                <div className="text-xs font-bold text-slate-300">{t('ecosystem.planning_sim_unchecked_list')}</div>
                <ul className="text-xs text-slate-300 list-disc pl-5">
                  {simulation.unchecked.map((v, i) => <li key={i}><span className="font-mono text-amber-400">{v.rule}</span>{v.stepId ? ` (${v.stepId})` : ''}: {v.message}</li>)}
                </ul>
              </div>
            )}
            {simulation.violations.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-300">{t('ecosystem.planning_sim_violations')}</div>
                <ul className="text-xs text-slate-300 list-disc pl-5">
                  {simulation.violations.map((v, i) => <li key={i}><span className="font-mono text-amber-400">{v.rule}</span>{v.stepId ? ` (${v.stepId})` : ''}: {v.message}{v.suggestion ? ` - ${v.suggestion}` : ''}</li>)}
                </ul>
              </div>
            )}
            {simulation.timeline.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-300">{t('ecosystem.planning_sim_timeline')}</div>
                <table className="text-xs text-slate-300 w-full"><tbody>
                  {simulation.timeline.map(e => <tr key={e.stepId}><td className="font-mono pr-3">{e.stepId}</td><td className="pr-3">{e.robot}</td><td className="pr-3">{e.primitive}</td><td>{formatDuration(e.startMs)} - {formatDuration(e.endMs)}</td></tr>)}
                </tbody></table>
                {simulation.makespanMs !== null && <div className="text-[11px] text-slate-500">{t('ecosystem.planning_sim_makespan')}: {formatDuration(simulation.makespanMs)}</div>}
              </div>
            )}
          </div>
        )}
      </section>

      <section className={card} data-testid="planning-eta">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><CalendarClock size={16} /> {t('ecosystem.planning_eta_title')}</h3>
        <p className="text-[11px] text-slate-500">{t('ecosystem.planning_eta_help')}</p>
        <button onClick={() => void readEta()} disabled={busy === 'eta'} className={button}><RefreshCw size={14} /> {t('ecosystem.planning_eta_load')}</button>
        {etaError && <div role="alert" className="text-xs text-rose-400">{etaError}</div>}
        {etaState && (
          <div className="space-y-1">
            {etaState.drainMs !== null && <div className="text-xs text-slate-300">{t('ecosystem.planning_eta_drain')} {formatDuration(etaState.drainMs - etaState.generatedAtMs)}</div>}
            {etaState.jobs.length === 0 && <div className="text-xs text-slate-500">{t('ecosystem.planning_eta_empty')}</div>}
            <table className="text-xs text-slate-300 w-full"><tbody>
              {etaState.jobs.map(j => (
                <tr key={j.jobId}>
                  <td className="font-mono pr-3">{j.jobId}</td><td className="pr-3">{j.status}</td><td className="pr-3">{j.robotId ?? '-'}</td>
                  <td>{j.estimated && j.endMs !== null ? formatDuration(j.endMs - etaState.generatedAtMs) : `${t('ecosystem.planning_eta_no_estimate')}${j.reason ? ` (${j.reason})` : ''}`}
                    {j.estimated && j.lowMs !== null && j.highMs !== null ? ` [${formatDuration(j.lowMs - etaState.generatedAtMs)} - ${formatDuration(j.highMs - etaState.generatedAtMs)}]` : ''}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      </section>

      <section className={card} data-testid="planning-rul">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><Gauge size={16} /> {t('ecosystem.planning_rul_title')}</h3>
        <p className="text-[11px] text-slate-500">{t('ecosystem.planning_rul_help')}</p>
        <label className="text-xs font-bold text-slate-200" htmlFor="planning-rul-points">{t('ecosystem.planning_rul_points')}</label>
        <textarea id="planning-rul-points" data-testid="rul-points" rows={5} value={pointsText} onChange={e => setPointsText(e.target.value)} className={`${input} font-mono`} spellCheck={false} />
        <label className="text-xs font-bold text-slate-200" htmlFor="planning-rul-limit">{t('ecosystem.planning_rul_limit')}</label>
        <input id="planning-rul-limit" data-testid="rul-limit" type="text" inputMode="decimal" value={limitText} onChange={e => setLimitText(e.target.value)} className={`${input} w-32`} />
        <div><button onClick={() => void runRul()} disabled={busy === 'rul'} className={button}><Gauge size={14} /> {t('ecosystem.planning_rul_run')}</button></div>
        {rulError && <div role="alert" className="text-xs text-rose-400">{rulError}</div>}
        {rul && (
          <div className="text-xs text-slate-300 space-y-1" data-testid="rul-result">
            <div className="font-bold">{t(`ecosystem.planning_rul_${rul.status}`)}</div>
            {rul.status === 'estimated' && rul.daysToLimit !== null && (
              <div>{t('ecosystem.planning_rul_estimated')}: {rul.daysToLimit.toFixed(1)}{rul.daysLow !== null ? ` [${rul.daysLow.toFixed(1)} - ${rul.daysHigh !== null ? rul.daysHigh.toFixed(1) : '...'}]` : ''}</div>
            )}
          </div>
        )}
      </section>

      <section className={card} data-testid="planning-train">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><TrainFront size={16} /> {t('ecosystem.planning_train_title')}</h3>
        <p className="text-[11px] text-slate-500">{t('ecosystem.planning_train_help')}</p>
        <input ref={fileInput} data-testid="train-file" type="file" accept=".json,application/json" className="hidden" onChange={e => { void openTrain(e.target.files?.[0]); e.target.value = ''; }} />
        <button onClick={() => fileInput.current?.click()} className={button}><TrainFront size={14} /> {t('ecosystem.planning_train_load')}</button>
        {trainError && <div role="alert" className="text-xs text-rose-400">{trainError}</div>}
        {train && (
          <div className="space-y-2" data-testid="train-result">
            <div className="text-sm font-bold text-slate-200">{train.train}</div>
            {train.ok ? <div className="text-xs text-emerald-400">{t('ecosystem.planning_train_ok')}</div> : (
              <div className="text-xs text-rose-400">{t('ecosystem.planning_train_problems')}: <ul className="list-disc pl-5">{train.problems.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
            )}
            <table className="text-xs text-slate-300 w-full"><tbody>
              {train.items.map(item => (
                <tr key={item.name}>
                  <td className="font-mono pr-3">{item.name}</td>
                  <td className={`pr-3 font-bold ${ACTION_STYLE[item.action] ?? ''}`}>{t(`ecosystem.planning_train_${item.action}`)}</td>
                  <td className="pr-3">{item.installedVersion ?? '-'} {'->'} {item.version}</td>
                  <td className="text-slate-500">{item.reason ?? ''}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      </section>

      <section className={card} data-testid="planning-datalake">
        <h3 className="text-sm font-bold text-slate-200">{t('ecosystem.planning_dl_title')}</h3>
        <p className="text-[11px] text-slate-500">{t('ecosystem.planning_dl_help')}</p>
        <div className="text-xs text-slate-300" data-testid="dl-windows">{t('ecosystem.planning_dl_windows')}: <span className="font-bold">{t(`ecosystem.planning_dl_${windows === 'unknown' ? 'unknown' : windows}`)}</span></div>
        <div className="text-[11px] text-slate-500">{t('ecosystem.planning_dl_downsampling')}</div>
      </section>
    </div>
  );
}
