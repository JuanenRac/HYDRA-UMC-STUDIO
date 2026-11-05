// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: ServiceIdentityPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The identity the SERVER presents to the services it calls, and which services take it. The switch is OFF by default; turning it on asks
// for a confirmation on screen (and the SERVER asks for it again), every change is recorded, and turning it off warns that a service whose
// identity key is on will refuse the server. Giving a service the key is done on the machine, as root; this screen never does it, and it
// says the safe order. Only an administrator sees this screen.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { serviceIdentityApi, serviceIdentityNeedsConfirmation, servicesBySupport, type IdentityFailure, type IdentitySupport, type ServiceIdentityStatus } from '../lib/serviceIdentity';

const FAILURE_KEY: Record<IdentityFailure, string> = {
  unsupported: 'serviceIdentity.unsupported',
  forbidden: 'serviceIdentity.forbidden',
  network: 'serviceIdentity.load_error',
  http: 'serviceIdentity.load_error',
};
const SUPPORT_KEY: Record<IdentitySupport, string> = {
  accepts: 'serviceIdentity.accepts',
  own_verifier: 'serviceIdentity.own_verifier',
  not_yet: 'serviceIdentity.not_yet',
};

export function ServiceIdentityPanel() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ServiceIdentityStatus | null>(null);
  const [wanted, setWanted] = useState(false);
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<IdentityFailure | null>(null);
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const result = await serviceIdentityApi.read();
    if (result.ok) { setStatus(result.value); setWanted(result.value.enabled); setProblem(''); setFailure(null); return; }
    setStatus(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const apply = async () => {
    setSaving(true); setMessage(''); setWarning(''); setConfirming(false);
    const result = await serviceIdentityApi.write(wanted);
    setSaving(false);
    if (result.ok) {
      setStatus(result.value); setWanted(result.value.enabled); setProblem('');
      setMessage(t('serviceIdentity.saved'));
      if (!result.value.enabled) setWarning(t('serviceIdentity.off_warning'));
      return;
    }
    setProblem(result.reason ? t('serviceIdentity.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!status) return;
    if (serviceIdentityNeedsConfirmation(status.enabled, wanted)) { setConfirming(true); return; }
    void apply();
  };

  // A server without the route does not have the feature: the section stays out of the way.
  if (!status && failure === 'unsupported') return null;

  const stateText = status ? t(`serviceIdentity.state_${status.state}`) : '';
  return (
    <div className="space-y-2" data-testid="service-identity-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('serviceIdentity.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('serviceIdentity.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {status && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <input type="checkbox" data-testid="service-identity-enabled" checked={wanted} disabled={saving || status.locked} onChange={e => { setWanted(e.target.checked); setMessage(''); setWarning(''); }} />
            {t('serviceIdentity.label')}
          </label>
          <span className={`text-[10px] font-bold ${status.state === 'presenting' ? 'text-emerald-400' : status.state === 'idle_no_key' ? 'text-amber-400' : 'text-slate-400'}`} data-testid="service-identity-state">{stateText}</span>
          {status.locked && <div className="text-[10px] text-amber-400" role="status">{t('serviceIdentity.locked')}</div>}
          {!wanted && status.enabled && <div className="text-[10px] text-amber-400" role="alert">{t('serviceIdentity.off_warning')}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          {warning && <div className="text-[10px] text-amber-400" role="alert" data-testid="service-identity-off-warning">{warning}</div>}
          <button
            onClick={save}
            data-testid="service-identity-save"
            disabled={saving || status.locked || wanted === status.enabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('serviceIdentity.save')}
          </button>
          <div className="space-y-1" data-testid="service-identity-services">
            <div className="text-[10px] font-bold text-slate-300">{t('serviceIdentity.services_title')}</div>
            {(['accepts', 'own_verifier', 'not_yet'] as IdentitySupport[]).map(support => {
              const names = servicesBySupport(status, support);
              return (
                <div key={support} className="text-[10px] text-slate-400" data-testid={`service-identity-${support}`}>
                  <span className="font-bold text-slate-300">{t(SUPPORT_KEY[support])} ({names.length}):</span> {names.length > 0 ? names.join(', ') : t('serviceIdentity.none')}
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-500 space-y-0.5" data-testid="service-identity-order">
            <div className="font-bold text-slate-300">{t('serviceIdentity.order_title')}</div>
            <div>{t('serviceIdentity.order_1')}</div>
            <div>{t('serviceIdentity.order_2')}</div>
            <div className="text-amber-400">{t('serviceIdentity.order_3')}</div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('serviceIdentity.confirm_title')}
        message={t('serviceIdentity.confirm_message')}
        confirmLabel={t('serviceIdentity.confirm_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
