// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > AI Family Panel: AiFamilyStatus.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The same real GET /api/ecosystem/status manifest scan EcosystemServices.tsx
// uses, filtered to the two real families the ecosystem's own manifests
// self-report as AI: "Vision AI Node" (Hailo-8-facing today - VISION-NODE,
// DETECTION-HEF, VISION-STREAMER, ...) and "Cognitive AI Node" (the
// planned separate Hailo-10 8GB accelerator's target - COGNITIVE-NODE,
// VLA-ENGINE, SEMANTIC-PLANNER, VOICE-UI, ...).
//
// Real, useful cross-reference with Config > AI/Hailo (settings.aiHailo,
// added this same session): a family with real live nodes but its own
// Hailo device set to "None" in Config is a genuine, actionable
// misconfiguration worth surfacing here - not a live device query (that
// stays honestly out of scope, see the header note below), just a fact
// this app already knows from its own settings tree, shown where an
// operator would actually be looking for it.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, RefreshCw, AlertTriangle, Circle } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';
import { useHydraStore } from '../store';

interface EcosystemProjectStatus {
  name: string;
  role: string | null;
  stack: string | null;
  family: string | null;
  version: string | null;
  maturity: string | null;
  servicePort: number | null;
  live: boolean | null;
}

const AI_FAMILIES = [
  { key: 'Vision AI Node', device: 'hailo8' as const, deviceLabel: 'Hailo-8' },
  { key: 'Cognitive AI Node', device: 'hailo10' as const, deviceLabel: 'Hailo-10' },
];

export function AiFamilyStatus() {
  const { t } = useTranslation();
  const { settings } = useHydraStore();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<EcosystemProjectStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/ecosystem/status'));
      const data = await res.json();
      setAvailable(!!data.available);
      setProjects(((data.projects || []) as EcosystemProjectStatus[]).filter(p => p.family && AI_FAMILIES.some(f => f.key === p.family)));
      setError('');
    } catch {
      setError(t('ecosystem.services_load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line -- real fetch on mount, not derived state

  const byFamily = useCallback((family: string) => projects.filter(p => p.family === family), [projects]);

  // The real cross-reference: visionDevice='none' but Vision AI nodes exist
  // and at least one is genuinely live, or the mirror case for cognitive -
  // a real, actionable fact from this app's own settings tree, not a
  // guess about hardware this app never queries.
  const mismatches = useMemo(() => {
    const configured = { hailo8: settings.aiHailo?.visionDevice ?? 'hailo8', hailo10: settings.aiHailo?.cognitiveDevice ?? 'none' };
    return AI_FAMILIES.filter(f => {
      const items = byFamily(f.key);
      const anyLive = items.some(p => p.live === true);
      return anyLive && configured[f.device] === 'none';
    });
  }, [byFamily, settings.aiHailo]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Bot size={16} /> {t('ecosystem.ai_family_title')}</h3>
          <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystem.ai_family_desc')}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 transition-colors shrink-0">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('ecosystem.refresh')}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}
      {available === false && <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">{t('ecosystem.services_unavailable')}</p>}

      {mismatches.map(f => (
        <div key={f.key} className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{t('ecosystem.ai_family_device_mismatch', { family: f.key, device: f.deviceLabel })}</span>
        </div>
      ))}

      {available && AI_FAMILIES.map(({ key: family, device, deviceLabel }) => {
        const items = byFamily(family);
        const liveCount = items.filter(p => p.live === true).length;
        const configuredDevice = device === 'hailo8' ? (settings.aiHailo?.visionDevice ?? 'hailo8') : (settings.aiHailo?.cognitiveDevice ?? 'none');
        return (
          <div key={family} className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {family === 'Vision AI Node' ? t('ecosystem.ai_family_vision', { device: deviceLabel }) : t('ecosystem.ai_family_cognitive', { device: deviceLabel })}
              </h4>
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${configuredDevice === 'none' ? 'bg-slate-800/60 text-slate-500 border-slate-700' : 'bg-sky-500/10 text-sky-400 border-sky-500/30'}`}>
                {configuredDevice === 'none' ? t('config.ai_hailo_none') : deviceLabel}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(p => (
                <div key={p.name} className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">{p.role || '-'} · v{p.version || '-'}</div>
                  </div>
                  <span
                    className={
                      p.live === true ? 'shrink-0 flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400'
                      : p.live === false ? 'shrink-0 flex items-center gap-1 text-[9px] font-black uppercase text-rose-400'
                      : 'shrink-0 flex items-center gap-1 text-[9px] font-black uppercase text-slate-600'
                    }
                  >
                    <Circle size={6} className="fill-current" />
                    {p.live === true ? t('ecosystem.services_live') : p.live === false ? t('ecosystem.services_dead') : t('ecosystem.services_not_a_service')}
                  </span>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-slate-600 md:col-span-2">{t('ecosystem.services_none')}</p>
              )}
            </div>
            <p className="text-[9px] text-slate-700">{t('ecosystem.ai_family_live_count', { live: liveCount, total: items.length })}</p>
          </div>
        );
      })}

      <p className="text-[10px] text-slate-600 max-w-2xl">{t('ecosystem.ai_family_note')}</p>
    </div>
  );
}
