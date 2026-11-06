// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: IngestSwitchesPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// What the sibling services hand to the SERVER and what it keeps, one switch each (faults, scenario outcomes, developer node status,
// anomaly verdicts and their relay to the voice interface, the signed record of the voice commands, the check of signed trajectory
// proposals) and the file of the operators' public keys. Every switch is OFF by default; turning one on, or choosing another keys file,
// asks for a confirmation on screen (and the SERVER asks for it again); a switch fixed by the environment of the SERVER is locked. Only an
// administrator sees this screen.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { INGEST_KEYS, changedSwitches, ingestApi, ingestNeedsConfirmation, validKeysFileName, type IngestFailure, type IngestKey, type IngestState } from '../lib/ingestSwitches';

const FAILURE_KEY: Record<IngestFailure, string> = {
  unsupported: 'ingestSwitches.unsupported',
  forbidden: 'ingestSwitches.forbidden',
  network: 'ingestSwitches.load_error',
  http: 'ingestSwitches.load_error',
};

const emptyWanted = (): Record<IngestKey, boolean> => Object.fromEntries(INGEST_KEYS.map(key => [key, false])) as Record<IngestKey, boolean>;

export function IngestSwitchesPanel({ onChanged }: { onChanged?: () => void } = {}) {
  const { t } = useTranslation();
  const [state, setState] = useState<IngestState | null>(null);
  const [wanted, setWanted] = useState<Record<IngestKey, boolean>>(emptyWanted);
  const [keysFile, setKeysFile] = useState('');
  const [problem, setProblem] = useState('');
  const [failure, setFailure] = useState<IngestFailure | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const adopt = useCallback((value: IngestState) => {
    setState(value);
    setWanted(Object.fromEntries(INGEST_KEYS.map(key => [key, value.switches[key].value])) as Record<IngestKey, boolean>);
    setKeysFile(value.proposalKeysFile.value);
  }, []);

  const load = useCallback(async () => {
    const result = await ingestApi.read();
    if (result.ok) { adopt(result.value); setProblem(''); setFailure(null); return; }
    setState(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [adopt, t]);

  useEffect(() => { void load(); }, [load]);

  const keysLocked = state?.proposalKeysFile.source === 'env';
  const change = state ? { switches: changedSwitches(state, wanted), ...(keysLocked || keysFile === state.proposalKeysFile.value ? {} : { proposalKeysFile: keysFile }) } : null;
  const hasChange = !!change && (Object.keys(change.switches).length > 0 || change.proposalKeysFile !== undefined);
  const keysInvalid = !validKeysFileName(keysFile);

  const apply = async () => {
    if (!state || !change) return;
    setSaving(true); setMessage(''); setConfirming(false);
    const result = await ingestApi.write(state, change);
    setSaving(false);
    if (result.ok) { adopt(result.value); setProblem(''); setMessage(t('ingestSwitches.saved')); onChanged?.(); return; }
    setProblem(result.reason ? t('ingestSwitches.save_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
  };

  const save = () => {
    if (!state || !change || keysInvalid) return;
    if (ingestNeedsConfirmation(state, change)) { setConfirming(true); return; }
    void apply();
  };

  // A server without the block does not have the feature: the section stays out of the way.
  if (!state && failure === 'unsupported') return null;

  return (
    <div className="space-y-2" data-testid="ingest-switches-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('ingestSwitches.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('ingestSwitches.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {state && (
        <>
          {INGEST_KEYS.map(key => {
            const locked = state.switches[key].source === 'env';
            return (
              <div key={key} className="space-y-0.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <input type="checkbox" data-testid={`ingest-${key}`} checked={wanted[key]} disabled={saving || locked} onChange={e => { setWanted(prev => ({ ...prev, [key]: e.target.checked })); setMessage(''); }} />
                  {t(`ingestSwitches.${key}`)}
                </label>
                <div className="text-[10px] text-slate-500 pl-6">{t(`ingestSwitches.${key}_hint`)}</div>
                {locked && <div className="text-[10px] text-amber-400 pl-6" role="status" data-testid={`ingest-${key}-locked`}>{t('ingestSwitches.locked')}</div>}
              </div>
            );
          })}
          <div className="space-y-0.5">
            <label className="block text-xs font-bold text-slate-200" htmlFor="ingest-keys-file">{t('ingestSwitches.keys_label')}</label>
            <input
              id="ingest-keys-file"
              data-testid="ingest-keys-file"
              type="text"
              value={keysFile}
              maxLength={64}
              disabled={saving || keysLocked}
              onChange={e => { setKeysFile(e.target.value); setMessage(''); }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
            />
            <div className="text-[10px] text-slate-500">{t('ingestSwitches.keys_hint')}</div>
            {keysInvalid && <div className="text-[10px] text-rose-400" role="alert" data-testid="ingest-keys-invalid">{t('ingestSwitches.keys_invalid')}</div>}
            {keysLocked && <div className="text-[10px] text-amber-400" role="status">{t('ingestSwitches.locked')}</div>}
          </div>
          {state.appliesOnRestart && <div className="text-[10px] text-amber-400" role="status" data-testid="ingest-restart">{t('ingestSwitches.restart')}</div>}
          {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
          <button
            onClick={save}
            data-testid="ingest-save"
            disabled={saving || !hasChange || keysInvalid}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all"
          >
            <Save size={14} /> {t('ingestSwitches.save')}
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('ingestSwitches.confirm_title')}
        message={t('ingestSwitches.confirm_message')}
        confirmLabel={t('ingestSwitches.confirm_button')}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
