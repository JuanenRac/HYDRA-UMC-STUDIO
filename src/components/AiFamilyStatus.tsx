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
// VLA-ENGINE, SEMANTIC-PLANNER, VOICE-UI, ...). Deliberately NOT a second
// live-telemetry surface: none of these nodes expose an HTTP API of their
// own yet (every one is a CLI tool/library today - see e.g.
// VISION-NODE's own real hardware.py probe, which still reports "future
// work: blocked on real CM5+Hailo-8 hardware"), so this stays honest about
// showing manifest/liveness data only, the same as every other project in
// the Services panel - not inventing a richer "AI dashboard" that doesn't
// exist server-side.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, RefreshCw } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';

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

const AI_FAMILIES = new Set(['Vision AI Node', 'Cognitive AI Node']);

export function AiFamilyStatus() {
  const { t } = useTranslation();
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
      setProjects(((data.projects || []) as EcosystemProjectStatus[]).filter(p => p.family && AI_FAMILIES.has(p.family)));
      setError('');
    } catch {
      setError(t('ecosystem.services_load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line -- real fetch on mount, not derived state

  const liveDot = (live: boolean | null) => (
    <span
      className={
        live === true ? 'w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor] bg-emerald-500'
        : live === false ? 'w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor] bg-rose-500'
        : 'w-2 h-2 rounded-full shrink-0 bg-slate-700'
      }
    />
  );

  const byFamily = (family: string) => projects.filter(p => p.family === family);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      <div className="flex items-center justify-between">
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

      {available && (['Vision AI Node', 'Cognitive AI Node'] as const).map(family => (
        <div key={family} className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            {family === 'Vision AI Node' ? t('ecosystem.ai_family_vision', { device: 'Hailo-8' }) : t('ecosystem.ai_family_cognitive', { device: 'Hailo-10' })}
          </h4>
          <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <table className="w-full text-left text-sm">
              <tbody>
                {byFamily(family).map(p => (
                  <tr key={p.name} className="border-b border-slate-800/50 last:border-b-0 hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-bold whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.role || '-'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.version || '-'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{p.maturity || '-'}</td>
                    <td className="px-4 py-3 w-8">{liveDot(p.live)}</td>
                  </tr>
                ))}
                {byFamily(family).length === 0 && (
                  <tr><td className="px-4 py-4 text-center text-slate-600 text-xs">{t('ecosystem.services_none')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-[10px] text-slate-600 max-w-2xl">{t('ecosystem.ai_family_note')}</p>
    </div>
  );
}
