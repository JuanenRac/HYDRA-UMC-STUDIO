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
import { formatAge, sortToolArms, toolArmLevel, toolArmsApi, type ToolArmLevel, type ToolArmsFailure, type ToolArmsReport } from '../lib/toolArms';

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

export function ToolArmsPanel() {
  const { t } = useTranslation();
  const [report, setReport] = useState<ToolArmsReport | null>(null);
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await toolArmsApi.read();
    setLoading(false);
    if (result.ok) { setReport(result.value); setProblem(''); return; }
    setReport(null);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

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
                  </li>
                );
              })}
            </ul>
          )}
          <div className="text-[10px] text-slate-500">{t('toolArms.stale_note')}</div>
        </>
      )}
    </div>
  );
}
