// =============================================================================
// HYDRA-UMC STUDIO - components/OrchestratorStopRetry.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Whether the orchestrator keeps asking the server to confirm a global stop. On by default; switching it off asks first. The server writes it
// into the configuration file of the orchestrator, which reads it when it starts.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import type { OrchestratorOptions } from '../lib/serverSecurity';

export function OrchestratorStopRetry({ options, saving, onSave }: { options: OrchestratorOptions; saving: boolean; onSave: (body: { orchestrator: { retryServer: boolean } }) => void }) {
  const { t } = useTranslation();
  const [retry, setRetry] = useState(options.retryServer.value);
  const [asking, setAsking] = useState(false);
  useEffect(() => setRetry(options.retryServer.value), [options.retryServer.value]);

  const send = () => onSave({ orchestrator: { retryServer: retry } });
  const save = () => (options.retryServer.value && !retry ? setAsking(true) : send());

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-bold text-slate-200">{t('ecosystem.admin_security_orch_title')}</h5>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
        <input type="checkbox" data-testid="orch-retry" checked={retry} disabled={saving || !options.editable} onChange={e => setRetry(e.target.checked)} />
        {t('ecosystem.admin_security_orch_retry')}
      </label>
      <div className="text-[10px] text-slate-500">{options.editable ? t('ecosystem.admin_security_orch_help') : t('ecosystem.admin_security_orch_not_editable')}</div>
      <button onClick={save} disabled={saving || !options.editable} data-testid="orch-save" className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/40 rounded-lg text-xs font-black uppercase tracking-widest">
        <Save size={14} /> {t('ecosystem.admin_security_orch_save')}
      </button>
      <ConfirmDialog open={asking} message={t('ecosystem.admin_security_orch_confirm')} onConfirm={() => { setAsking(false); send(); }} onCancel={() => setAsking(false)} />
    </div>
  );
}
