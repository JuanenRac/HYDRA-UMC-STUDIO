// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Ecosystem health > controller boards: NodeHealthPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The last health frame that the kinematic brain heard from each of the eight controller boards (GET /api/ecosystem/node-health, read only). It shows nothing at all
// when the server does not offer the route (an administrator did not turn it on) or the account may not read it, and it says plainly when a slot has never been
// heard or when the brain does not answer: nothing is invented.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NODE_HEALTH_FLAGS, loadAllNodeHealth, panelIsHidden, slotState, type NodeHealthResult } from '../lib/nodeHealthApi';

const POLL_MS = 10000;
const STATE_STYLE = { heard: 'text-emerald-400 border-emerald-500/30', never: 'text-slate-400 border-slate-700', silent: 'text-amber-400 border-amber-500/30' } as const;

export function NodeHealthPanel() {
  const { t } = useTranslation();
  const [results, setResults] = useState<NodeHealthResult[] | null>(null);

  const load = useCallback(async () => {
    setResults(await loadAllNodeHealth());
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (results === null || panelIsHidden(results)) return null;

  return (
    <div className="space-y-2" data-testid="node-health">
      <h4 className="text-sm font-bold text-slate-200">{t('nodeHealth.title')}</h4>
      <p className="text-[11px] text-slate-500">{t('nodeHealth.help')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.map((result, slot) => {
          if (!result.ok) {
            return (
              <div key={slot} className={`bg-slate-950 border rounded-xl px-4 py-3 ${STATE_STYLE.silent}`} data-testid="node-health-row" data-slot={slot} data-state="unknown">
                <span className="text-sm font-bold text-slate-200">{t('nodeHealth.slot')} {slot}</span>
                <span className="block text-[11px]">{t('nodeHealth.state_unknown')}</span>
              </div>
            );
          }
          const health = result.value;
          const state = slotState(health);
          return (
            <div key={slot} className={`bg-slate-950 border rounded-xl px-4 py-3 flex flex-col gap-1 ${STATE_STYLE[state]}`} data-testid="node-health-row" data-slot={slot} data-state={state}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-200">{t('nodeHealth.slot')} {slot}</span>
                <span className="text-[11px] font-black uppercase tracking-wider">{t(`nodeHealth.state_${state}`)}</span>
              </div>
              {state === 'heard' && health.ageMs !== null && health.sequence !== null && health.txErrors !== null && health.rxErrors !== null && health.stalls !== null && health.uptimeS !== null && (
                <>
                  <span className="text-[10px] text-slate-400">{t('nodeHealth.age', { seconds: (health.ageMs / 1000).toFixed(1) })} - {t('nodeHealth.sequence', { n: health.sequence })}</span>
                  <span className="text-[10px] text-slate-400">{t('nodeHealth.errors', { tx: health.txErrors, rx: health.rxErrors })} - {t('nodeHealth.stalls', { n: health.stalls })}</span>
                  <span className="text-[10px] text-slate-400">{health.uptimeS >= 4080 ? t('nodeHealth.uptime_more', { seconds: health.uptimeS }) : t('nodeHealth.uptime', { seconds: health.uptimeS })}</span>
                  <span className="text-[10px] text-slate-500" data-testid="node-health-flags">
                    {health.flagNames.length === 0
                      ? t('nodeHealth.flags_none')
                      : health.flagNames.map(name => ((NODE_HEALTH_FLAGS as readonly string[]).includes(name) ? t(`nodeHealth.flag_${name}`) : name)).join(', ')}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
