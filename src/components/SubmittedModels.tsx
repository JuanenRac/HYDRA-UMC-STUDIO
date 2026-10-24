// =============================================================================
// HYDRA-UMC STUDIO - Config > Models > Submitted models: SubmittedModels.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// What the model editors submitted to the server (GET /api/models), with a button that saves the URDF of one (the
// meshes stay on the server). Read-only: STUDIO does not change what is submitted.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';
import { authFetch } from '../lib/session';
import { fetchModelCatalog, modelDownloadPath, urdfDownloadName, urdfTextOf, type CatalogError, type SubmittedModel } from '../lib/modelCatalog';

export function SubmittedModels() {
  const { t } = useTranslation();
  const [models, setModels] = useState<SubmittedModel[]>([]);
  const [error, setError] = useState<CatalogError | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchModelCatalog((url) => authFetch(url), apiUrl('/api/models'));
    setModels(result.models);
    setError(result.error);
    setLoading(false);
  }, []);

  // A genuine "synchronize with an external system" effect: the list is read when the section opens.
  useEffect(() => { void load(); }, [load]); // eslint-disable-line -- real fetch, not a derived-state reset

  const download = async (model: SubmittedModel) => {
    setNotice('');
    try {
      const response = await authFetch(apiUrl(modelDownloadPath(model)));
      const answer: unknown = await response.json().catch(() => null);
      const xml = response.ok ? urdfTextOf(answer) : null;
      if (xml === null) {
        setNotice(t('config.submitted_models_download_failed', { name: model.name }));
        return;
      }
      const blob = new Blob([xml], { type: 'application/xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = urdfDownloadName(answer, model.slug);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setNotice(t('config.submitted_models_download_failed', { name: model.name }));
    }
  };

  return (
    <div className="pt-6 border-t border-slate-800/50 space-y-4" data-testid="submitted-models">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('config.submitted_models')}</h3>
        <button onClick={() => void load()} disabled={loading} aria-label={t('config.submitted_models_refresh')} title={t('config.submitted_models_refresh')} className="text-slate-500 hover:text-sky-400 disabled:opacity-40 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="text-[10px] text-slate-600 leading-relaxed">{t('config.submitted_models_desc')}</p>
      {error && <p className="text-xs text-amber-400" role="alert">{t(`config.submitted_models_error_${error}`)}</p>}
      {notice && <p className="text-xs text-rose-400" role="alert">{notice}</p>}
      {!error && !loading && models.length === 0 && <p className="text-xs text-slate-600">{t('config.submitted_models_none')}</p>}
      {models.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-2 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.submitted_models_name')}</th>
                <th className="px-4 py-2 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.submitted_models_category')}</th>
                <th className="px-4 py-2 text-slate-400 uppercase text-[10px] tracking-widest font-black">{t('config.submitted_models_date')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={`${model.category}/${model.slug}`} className="border-b border-slate-800/50">
                  <td className="px-4 py-2 text-slate-200 font-bold">{model.name}</td>
                  <td className="px-4 py-2 text-slate-400 font-mono">{model.category}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono">{model.submittedAt ? model.submittedAt.replace('T', ' ').replace(/\.\d+Z?$/, '') : '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => void download(model)} aria-label={t('config.submitted_models_download', { name: model.name })} title={t('config.submitted_models_download', { name: model.name })} className="text-slate-500 hover:text-sky-400 transition-colors">
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
