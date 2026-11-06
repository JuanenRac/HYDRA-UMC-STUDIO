// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, security: components/config/SecurityTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// One place for the security of the sign-in: a short list of checks, the second factor of the signed-in account and, for an
// administrator, the signing keys of the tokens with their rotation. Rotating a key is guarded twice, by a switch that is off every
// time the tab is opened and by a confirmation, because a new key takes over the signing of every new token.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';
import { TotpPanel } from '../TotpPanel';
import { ConfirmDialog } from '../ConfirmDialog';
import { useSession } from '../../storeContexts';
import { totpApi } from '../../lib/totpApi';
import { failureKey, panelRead, type PanelFailure } from '../../lib/panelApi';
import { activeKey, dateOf, parseKeys, rotateKey, securityChecks, type KeysState, type RotateFailure } from '../../lib/securityView';

const rotateErrorKey = (failure: RotateFailure): string => {
  switch (failure) {
    case 'asymmetric_off': return 'security.error_asymmetric_off';
    case 'file': return 'security.error_file';
    case 'forbidden': return 'panels.error_forbidden';
    case 'unsupported': return 'panels.error_unsupported';
    case 'http': return 'panels.error_http';
    default: return 'panels.error_network';
  }
};

export function SecurityTab() {
  const { t } = useTranslation();
  const { isAdmin } = useSession();
  const [secondFactor, setSecondFactor] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<KeysState | null>(null);
  const [keysFailure, setKeysFailure] = useState<PanelFailure | null>(null);
  const [allowRotation, setAllowRotation] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const status = await totpApi.status();
    setSecondFactor(status.ok ? status.value.enabled : null);
    if (isAdmin) {
      const result = await panelRead('/api/admin/jwt-keys', parseKeys);
      setKeys(result.ok ? result.value : null);
      setKeysFailure(result.ok ? null : result.failure);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const rotate = async () => {
    setConfirming(false);
    const result = await rotateKey();
    if (result.ok) {
      setKeys(result.state);
      setAllowRotation(false);
      setNotice({ kind: 'ok', text: t('security.rotated', { kid: result.kid }) });
    } else {
      setNotice({ kind: 'error', text: t(rotateErrorKey(result.failure)) });
    }
  };

  const checks = securityChecks(secondFactor, keys?.algorithm ?? null);
  const current = keys ? activeKey(keys.keys) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="security-tab">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><ShieldCheck size={16} /> {t('security.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('security.intro')}</p>
      </div>

      <ul className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800" aria-label={t('security.checks_title')}>
        {checks.map((check) => (
          <li key={check.id} data-testid={`security-check-${check.id}`} data-state={check.ok === null ? 'unknown' : check.ok ? 'ok' : 'warn'} className="flex items-center justify-between px-4 py-3 text-xs">
            <span className="text-slate-300">{t(`security.check_${check.id}`)}</span>
            <span className={check.ok === null ? 'text-slate-600' : check.ok ? 'text-emerald-400' : 'text-amber-400'}>{check.ok === null ? t('security.state_unknown') : check.ok ? t('security.state_ok') : t('security.state_warn')}</span>
          </li>
        ))}
      </ul>

      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4"><TotpPanel /></div>

      {isAdmin ? (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3" data-testid="security-keys">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><KeyRound size={14} /> {t('security.keys_title')}</span>
            <button type="button" onClick={() => void load()} className="flex items-center gap-1 text-[10px] text-sky-400"><RefreshCw size={12} /> {t('updates.refresh')}</button>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">{t('security.keys_intro')}</p>
          {keysFailure && <p role="alert" data-testid="security-keys-error" className="text-xs text-amber-400">{t(failureKey(keysFailure))}</p>}
          {keys && (
            <>
              <p className="text-xs text-slate-300">{t('security.algorithm')}: <span className="font-mono" data-testid="security-algorithm">{keys.algorithm ?? '-'}</span>{current ? <> - {t('security.active_key')}: <span className="font-mono" data-testid="security-active-kid">{current.kid}</span></> : null}</p>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[9px] uppercase tracking-widest text-slate-600"><th className="py-1">{t('security.col_key')}</th><th>{t('security.col_created')}</th><th>{t('security.col_state')}</th></tr></thead>
                <tbody>
                  {keys.keys.map((key) => (
                    <tr key={key.kid} data-testid="security-key-row" className="border-t border-slate-800 text-slate-300">
                      <td className="py-1 font-mono">{key.kid}</td>
                      <td>{dateOf(key.createdAt)}</td>
                      <td>{key.active ? t('security.key_active') : key.acceptedUntil !== null ? t('security.key_retired', { date: dateOf(key.acceptedUntil) }) : t('security.key_retired_plain')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" data-testid="security-allow-rotation" checked={allowRotation} onChange={(e) => setAllowRotation(e.target.checked)} /> {t('security.allow_rotation')}</label>
              <button type="button" data-testid="security-rotate" disabled={!allowRotation} onClick={() => setConfirming(true)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 disabled:opacity-40">{t('security.rotate')}</button>
            </>
          )}
          {notice && <p role="status" data-testid="security-notice" className={notice.kind === 'ok' ? 'text-xs text-emerald-400' : 'text-xs text-amber-400'}>{notice.text}</p>}
        </div>
      ) : (
        <p data-testid="security-admin-only" className="text-[10px] text-slate-500">{t('security.admin_only')}</p>
      )}
      <ConfirmDialog open={confirming} message={t('security.rotate_confirm')} onConfirm={() => void rotate()} onCancel={() => setConfirming(false)} />
    </div>
  );
}
