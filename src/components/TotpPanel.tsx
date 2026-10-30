// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Server Admin > Two-step sign-in: TotpPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The second factor of the signed-in account: turn it on (password, then a QR code or a key to type into an authenticator
// app, then the first code), see the one-time recovery codes, and turn it off (password and a current or recovery code).
// It is off for every account until its owner turns it on, so nothing changes for an account that never opens this.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { encodeQr, qrSvgPath } from '../lib/qrCode';
import { groupedKey, totpApi, type TotpEnrolment, type TotpFailure, type TotpStatus } from '../lib/totpApi';

type Step = 'loading' | 'unsupported' | 'off' | 'enrolling' | 'recovery' | 'on';

const inputClass = 'w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 disabled:opacity-50';
const buttonClass = 'flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors';

function failureKey(failure: TotpFailure): { key: string; values?: Record<string, unknown> } {
  switch (failure.kind) {
    case 'unsupported': return { key: 'totp.error_unsupported' };
    case 'password': return { key: 'totp.error_password' };
    case 'code': return { key: 'totp.error_code' };
    case 'wait': return { key: 'totp.error_wait', values: { seconds: failure.seconds } };
    case 'already': return { key: 'totp.error_already' };
    case 'forbidden': return { key: 'totp.error_forbidden' };
    case 'http': return { key: 'totp.error_http', values: { status: failure.status } };
    default: return { key: 'totp.error_network' };
  }
}

function QrImage({ text }: { text: string }) {
  const { t } = useTranslation();
  const drawing = useMemo(() => {
    const matrix = encodeQr(text);
    return matrix ? qrSvgPath(matrix) : null;
  }, [text]);
  if (!drawing) return <p className="text-[10px] text-amber-400">{t('totp.qr_too_long')}</p>;
  return (
    <svg role="img" aria-label={t('totp.qr_label')} viewBox={`0 0 ${drawing.size} ${drawing.size}`} className="w-44 h-44 bg-white rounded-lg" shapeRendering="crispEdges">
      <path d={drawing.path} fill="#000" />
    </svg>
  );
}

export function TotpPanel() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('loading');
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [enrolment, setEnrolment] = useState<TotpEnrolment | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const say = useCallback((failure: TotpFailure) => {
    const { key, values } = failureKey(failure);
    setError(t(key, values));
  }, [t]);

  const refresh = useCallback(async () => {
    const result = await totpApi.status();
    if (!result.ok) {
      if (result.failure.kind === 'unsupported') setStep('unsupported');
      else { setStep('off'); say(result.failure); }
      return;
    }
    setStatus(result.value);
    setStep(result.value.enabled ? 'on' : 'off');
  }, [say]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- a real fetch on mount, not derived state
  useEffect(() => { void refresh(); }, [refresh]);

  const begin = async () => {
    setBusy(true); setError(''); setNotice('');
    const result = await totpApi.begin(password);
    setBusy(false);
    if (!result.ok) { say(result.failure); return; }
    setPassword(''); setCode(''); setEnrolment(result.value); setStep('enrolling');
  };

  const confirm = async () => {
    setBusy(true); setError('');
    const result = await totpApi.confirm(code);
    setBusy(false);
    if (!result.ok) { say(result.failure); return; }
    setCode(''); setEnrolment(null); setRecovery(result.value); setStep('recovery');
  };

  const disable = async () => {
    setBusy(true); setError(''); setNotice('');
    const result = await totpApi.disable(password, code);
    setBusy(false);
    if (!result.ok) { say(result.failure); return; }
    setPassword(''); setCode(''); setNotice(t('totp.done_off'));
    await refresh();
  };

  const closeRecovery = () => { setRecovery([]); setNotice(t('totp.done_on')); void refresh(); };

  const copyKey = async () => {
    if (!enrolment) return;
    try { await navigator.clipboard.writeText(enrolment.secret); setNotice(t('totp.copied')); } catch { /* no clipboard in this view: the key is on the screen */ }
  };

  return (
    <div className="space-y-2" data-testid="totp-panel">
      <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
        {step === 'on' ? <ShieldCheck size={14} className="text-emerald-400" /> : <ShieldOff size={14} className="text-slate-500" />}
        {t('totp.title')}
      </h5>
      <p className="text-[10px] text-slate-500">{t('totp.intro')}</p>
      {error && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-xs text-emerald-400">{notice}</p>}

      {step === 'loading' && <p className="text-[10px] text-slate-500">{t('totp.loading')}</p>}
      {step === 'unsupported' && <p className="text-[10px] text-amber-400">{t('totp.error_unsupported')}</p>}

      {step === 'off' && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500">{t('totp.status_off')}</p>
          <label className="text-xs font-bold text-slate-200" htmlFor="totp-password">{t('totp.password_label')}</label>
          <input id="totp-password" type="password" autoComplete="current-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} className={inputClass} />
          <button onClick={begin} disabled={busy || !password} className={buttonClass}><KeyRound size={14} /> {t('totp.start')}</button>
        </div>
      )}

      {step === 'enrolling' && enrolment && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400">{t('totp.scan')}</p>
          <QrImage text={enrolment.uri} />
          <div className="text-xs font-bold text-slate-200">{t('totp.key_label')}</div>
          <code data-testid="totp-key" className="block bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-sky-300 break-all select-all">{groupedKey(enrolment.secret)}</code>
          <button onClick={copyKey} className={buttonClass}>{t('totp.copy')}</button>
          <label className="text-xs font-bold text-slate-200" htmlFor="totp-code">{t('totp.code_label')}</label>
          <input id="totp-code" inputMode="numeric" autoComplete="one-time-code" value={code} disabled={busy} onChange={e => setCode(e.target.value)} className={inputClass} />
          <div className="flex gap-2">
            <button onClick={confirm} disabled={busy || !code.trim()} className={buttonClass}><ShieldCheck size={14} /> {t('totp.confirm')}</button>
            <button onClick={() => { setEnrolment(null); setCode(''); setError(''); setStep('off'); }} disabled={busy} className={buttonClass}>{t('totp.cancel')}</button>
          </div>
        </div>
      )}

      {step === 'recovery' && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-200">{t('totp.recovery_title')}</div>
          <p className="text-[10px] text-amber-400">{t('totp.recovery_hint')}</p>
          <ul data-testid="totp-recovery" className="grid grid-cols-2 gap-1 bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-sky-300 font-mono">
            {recovery.map(item => <li key={item} className="select-all">{item}</li>)}
          </ul>
          <button onClick={closeRecovery} className={buttonClass}>{t('totp.recovery_saved')}</button>
        </div>
      )}

      {step === 'on' && (
        <div className="space-y-2">
          <p className="text-[10px] text-emerald-400">{t('totp.status_on', { count: status?.recoveryLeft ?? 0 })}</p>
          <label className="text-xs font-bold text-slate-200" htmlFor="totp-password">{t('totp.password_label')}</label>
          <input id="totp-password" type="password" autoComplete="current-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} className={inputClass} />
          <label className="text-xs font-bold text-slate-200" htmlFor="totp-code">{t('totp.turn_off_code')}</label>
          <input id="totp-code" autoComplete="one-time-code" value={code} disabled={busy} onChange={e => setCode(e.target.value)} className={inputClass} />
          <button onClick={disable} disabled={busy || !password || !code.trim()} className={buttonClass}><ShieldOff size={14} /> {t('totp.turn_off')}</button>
        </div>
      )}
    </div>
  );
}
