// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Safety: ToolArmsPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The arm state of the URTC tools, read only: for each pair of robot and tool whether its power stage may act, who reported it and how old
// the report is. A stale report is never shown as safe: a stale armed tool is a warning and a stale disarmed tool is unknown. The screen
// arms, disarms and stops nothing. Without the safety zones service (or without its tool list) it says so instead of showing an empty list.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { canOfferReset, formatAge, resetConfirmed, sortToolArms, toolArmLevel, toolArmsApi, type ResetResult, type ToolArm, type ToolArmLevel, type ToolArmsFailure, type ToolArmsReport } from '../lib/toolArms';

const FAILURE_KEY: Record<ToolArmsFailure, string> = {
  unavailable: 'toolArms.unavailable',
  unsupported: 'toolArms.unavailable',
  forbidden: 'toolArms.forbidden',
  network: 'toolArms.load_error',
  http: 'toolArms.load_error',
  shape: 'toolArms.load_error',
};
const LEVEL_STYLE: Record<ToolArmLevel, string> = {
  armed: 'text-rose-300',
  warning: 'text-amber-400',
  unknown: 'text-slate-400',
  disarmed: 'text-emerald-400',
};

/** The sentence for a reset that did not go through. */
function resetProblemKey(result: Exclude<ResetResult, { ok: true }>): string {
  switch (result.failure) {
    case 'refused': return `toolArms.refuse_${result.reason}`;
    case 'off': return 'toolArms.reset_off';
    case 'forbidden': return 'toolArms.reset_forbidden';
    case 'mismatch': return 'toolArms.reset_mismatch';
    case 'invalid': return 'toolArms.reset_invalid';
    case 'unavailable': return 'toolArms.reset_unavailable';
    case 'rejected': return 'toolArms.reset_rejected';
    default: return 'toolArms.reset_error';
  }
}

export function ToolArmsPanel({ canReset = false }: { canReset?: boolean } = {}) {
  const { t } = useTranslation();
  const [report, setReport] = useState<ToolArmsReport | null>(null);
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState<ToolArm | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ ok: boolean; key: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await toolArmsApi.read();
    setLoading(false);
    if (result.ok) { setReport(result.value); setProblem(''); return; }
    setReport(null);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const closeReset = () => { setResetting(null); setTyped(''); };
  const doReset = async () => {
    if (!resetting || !resetConfirmed(resetting, typed)) return;
    setBusy(true); setResetMessage(null);
    const result = await toolArmsApi.reset(resetting, typed);
    setBusy(false);
    setResetMessage(result.ok ? { ok: true, key: 'toolArms.reset_done' } : { ok: false, key: resetProblemKey(result) });
    closeReset();
    // the state the SERVER now reports is what the screen shows, not what was asked for
    await load();
  };

  return (
    <div className="space-y-2" data-testid="tool-arms-panel">
      <div className="flex items-center gap-2">
        <h5 className="text-xs font-bold text-slate-200">{t('toolArms.title')}</h5>
        <button onClick={() => void load()} disabled={loading} data-testid="tool-arms-refresh" aria-label={t('toolArms.refresh')} title={t('toolArms.refresh')} className="p-1 text-slate-400 hover:text-sky-300 disabled:opacity-50">
          <RefreshCw size={12} />
        </button>
      </div>
      <div className="text-[10px] text-slate-500">{t('toolArms.desc')}</div>
      {problem && <p aria-live="polite" data-testid="tool-arms-problem" className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {report && (
        <>
          <div className="text-[10px] text-slate-400" data-testid="tool-arms-summary">{t('toolArms.summary', { armed: report.armedCount, stale: report.staleCount, ttl: report.ttlSeconds })}</div>
          {report.arms.length === 0 ? (
            <div className="text-[10px] text-slate-500" data-testid="tool-arms-empty">{t('toolArms.empty')}</div>
          ) : (
            <ul className="space-y-0.5" data-testid="tool-arms-list">
              {sortToolArms(report.arms).map(arm => {
                const level = toolArmLevel(arm);
                const age = formatAge(arm.ageSeconds);
                return (
                  <li key={`${arm.robot}/${arm.toolId}`} data-testid={`tool-arm-${arm.robot}-${arm.toolId}`} data-level={level} className="text-[11px] flex flex-wrap gap-x-3 font-mono text-slate-300">
                    <span>{arm.robot}</span>
                    <span>{t('toolArms.tool', { id: arm.toolId })}</span>
                    <span className={`font-bold ${LEVEL_STYLE[level]}`}>{t(`toolArms.level_${level}`)}</span>
                    <span className="text-slate-500">{t('toolArms.age', { value: age.value, unit: t(`toolArms.unit_${age.unit}`) })}</span>
                    {arm.by && <span className="text-slate-500">{t('toolArms.by', { by: arm.by })}</span>}
                    {canReset && canOfferReset(arm) && (
                      <button onClick={() => { setResetting(arm); setTyped(''); setResetMessage(null); }} data-testid={`tool-arm-reset-${arm.robot}-${arm.toolId}`} className="text-sky-300 hover:text-sky-200 underline">{t('toolArms.reset_button')}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="text-[10px] text-slate-500">{t('toolArms.stale_note')}</div>
          {canReset && resetting && (
            <div role="group" aria-label={t('toolArms.reset_title', { robot: resetting.robot, id: resetting.toolId })} data-testid="tool-arms-reset-form" className="space-y-1 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2">
              <div className="text-xs font-bold text-amber-300">{t('toolArms.reset_title', { robot: resetting.robot, id: resetting.toolId })}</div>
              <div className="text-[10px] text-slate-400">{t('toolArms.reset_hint')}</div>
              <label className="block text-[10px] text-slate-300" htmlFor="tool-arms-reset-typed">{t('toolArms.reset_type_label', { robot: resetting.robot })}</label>
              <input id="tool-arms-reset-typed" data-testid="tool-arms-reset-typed" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy} className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono" />
              <div className="flex gap-2">
                <button onClick={() => void doReset()} data-testid="tool-arms-reset-confirm" disabled={busy || !resetConfirmed(resetting, typed)} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold">{t('toolArms.reset_confirm')}</button>
                <button onClick={closeReset} data-testid="tool-arms-reset-cancel" disabled={busy} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-bold">{t('toolArms.reset_cancel')}</button>
              </div>
            </div>
          )}
          {resetMessage && <p role="alert" data-testid="tool-arms-reset-message" className={`text-xs ${resetMessage.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{t(resetMessage.key)}</p>}
        </>
      )}
    </div>
  );
}
