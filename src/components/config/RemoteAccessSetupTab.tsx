// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, remote access setup: components/config/RemoteAccessSetupTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Remote access in three steps: the address the apps type (with a QR code), which kinds of app may find the server, and how to check
// that a phone reaches it. The choices are the ones of settings.remoteAccess; "close all" is the conservative way out and asks first.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Wifi } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import { useSettingsStore } from '../../storeContexts';
import { encodeQr, qrSvgPath } from '../../lib/qrCode';
import { REMOTE_CLIENTS, addressReachableFromOutside, allowedClients, clientAllowed, closeAllPatch, serverAddress, type RemoteAccessSetting } from '../../lib/remoteSetupView';

function AddressQr({ text }: { text: string }) {
  const { t } = useTranslation();
  const drawing = useMemo(() => {
    const matrix = encodeQr(text);
    return matrix ? qrSvgPath(matrix) : null;
  }, [text]);
  if (!drawing) return <p className="text-[10px] text-amber-400">{t('remote_setup.qr_too_long')}</p>;
  return (
    <svg role="img" aria-label={t('remote_setup.qr_label')} data-testid="remote-setup-qr" viewBox={`0 0 ${drawing.size} ${drawing.size}`} className="w-40 h-40 bg-white rounded-lg" shapeRendering="crispEdges">
      <path d={drawing.path} fill="#000" />
    </svg>
  );
}

export function RemoteAccessSetupTab({ origin }: { origin?: string }) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  const [confirmClose, setConfirmClose] = useState(false);
  const setting = settings.remoteAccess as RemoteAccessSetting | undefined;
  const address = serverAddress(origin ?? (typeof window !== 'undefined' ? window.location.origin : ''));
  const outside = addressReachableFromOutside(address);
  const open = allowedClients(setting);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="remote-setup-tab">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Wifi size={16} /> {t('remote_setup.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('remote_setup.intro')}</p>
      </div>

      <section className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('remote_setup.step1')}</h4>
        <div className="flex items-center gap-4">
          {address && <AddressQr text={address} />}
          <div className="space-y-2 text-xs">
            <div data-testid="remote-setup-address" className="font-mono text-slate-200 break-all">{address || '-'}</div>
            {!outside && <p data-testid="remote-setup-local" role="alert" className="text-amber-400 text-[10px] leading-relaxed">{t('remote_setup.local_warning')}</p>}
            <p className="text-[10px] text-slate-500 leading-relaxed">{t('remote_setup.step1_hint')}</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('remote_setup.step2')}</h4>
        <p className="text-[10px] text-slate-500 leading-relaxed">{t('remote_setup.step2_hint')}</p>
        {REMOTE_CLIENTS.map((client) => (
          <label key={client} className="flex items-center justify-between text-xs text-slate-300 py-1">
            <span className="flex items-center gap-2"><Smartphone size={14} className="text-emerald-400" /> {t(`remote_setup.client_${client}`)}</span>
            <input type="checkbox" data-testid={`remote-setup-${client}`} checked={clientAllowed(setting, client)} onChange={(e) => updateSettings({ remoteAccess: { ...(setting ?? {}), [client]: e.target.checked } })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500" />
          </label>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span data-testid="remote-setup-count" className="text-[10px] text-slate-500">{t('remote_setup.open_count', { open: open.length, total: REMOTE_CLIENTS.length })}</span>
          <button type="button" data-testid="remote-setup-close-all" disabled={open.length === 0} onClick={() => setConfirmClose(true)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 disabled:opacity-40">{t('remote_setup.close_all')}</button>
        </div>
      </section>

      <section className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('remote_setup.step3')}</h4>
        <p className="text-[10px] text-slate-500 leading-relaxed">{t('remote_setup.step3_hint')}</p>
      </section>

      <ConfirmDialog open={confirmClose} message={t('remote_setup.close_all_confirm')} onConfirm={() => { setConfirmClose(false); updateSettings({ remoteAccess: closeAllPatch(setting) }); }} onCancel={() => setConfirmClose(false)} />
    </div>
  );
}
