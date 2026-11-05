// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: OpsProposalsPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The proposals of the node watchdog (OPS-AGENT) that wait for a person. Nothing is opened for maintenance until an administrator approves
// it here: approving asks for a confirmation on screen (and the SERVER asks for it again), rejecting does not, and every decision is
// recorded by the SERVER and by the watchdog under the name of the signed-in account. The section stays out of the way on a server that
// has no such channel set up.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { decisionNeedsConfirmation, opsProposalsApi, type ProposalFailure, type ProposalLists } from '../lib/opsProposals';

const FAILURE_KEY: Record<ProposalFailure, string> = {
  unsupported: 'opsProposals.unsupported',
  not_configured: 'opsProposals.not_configured',
  forbidden: 'opsProposals.forbidden',
  not_pending: 'opsProposals.not_pending',
  network: 'opsProposals.load_error',
  http: 'opsProposals.load_error',
};

export function OpsProposalsPanel() {
  const { t } = useTranslation();
  const [lists, setLists] = useState<ProposalLists | null>(null);
  const [failure, setFailure] = useState<ProposalFailure | null>(null);
  const [problem, setProblem] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await opsProposalsApi.list();
    if (result.ok) { setLists(result.value); setFailure(null); setProblem(''); return; }
    setLists(null);
    setFailure(result.failure);
    setProblem(t(FAILURE_KEY[result.failure]));
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const decide = async (incidentId: string, decision: 'approved' | 'rejected') => {
    setBusy(true); setMessage(''); setConfirming(null);
    const result = await opsProposalsApi.decide(incidentId, decision);
    setBusy(false);
    if (result.ok) {
      setProblem('');
      setMessage(t(decision === 'approved' ? 'opsProposals.approved' : 'opsProposals.rejected', { id: incidentId }));
    } else {
      setMessage('');
      setProblem(result.failure === 'http' && result.reason ? t('opsProposals.decide_error', { reason: result.reason }) : t(FAILURE_KEY[result.failure]));
    }
    await load();
  };

  const ask = (incidentId: string, decision: 'approved' | 'rejected') => {
    if (decisionNeedsConfirmation(decision)) { setConfirming(incidentId); return; }
    void decide(incidentId, decision);
  };

  // Nothing to show on a server that has no channel to the watchdog: the section stays out of the way rather than offering what cannot work.
  if (!lists && (failure === 'unsupported' || failure === 'not_configured')) return null;

  return (
    <div className="space-y-2" data-testid="ops-proposals-panel">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-bold text-slate-200">{t('opsProposals.title')}</h5>
        <button onClick={() => void load()} disabled={busy} aria-label={t('opsProposals.refresh')} title={t('opsProposals.refresh')} className="text-slate-400 hover:text-slate-200">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="text-[10px] text-slate-500">{t('opsProposals.desc')}</div>
      {problem && <p role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{problem}</p>}
      {message && <div className="text-[10px] text-emerald-400" role="status">{message}</div>}
      {lists && lists.pending.length === 0 && <div className="text-[10px] text-slate-500" data-testid="ops-proposals-empty">{t('opsProposals.none')}</div>}
      {lists && lists.pending.map(p => (
        <div key={p.incidentId} className="border border-slate-700 rounded-lg px-3 py-2 space-y-1" data-testid="ops-proposal">
          <div className="text-xs font-bold text-slate-200">{p.component || p.incidentId}</div>
          <div className="text-[10px] text-slate-400">{p.symptom}</div>
          <div className="text-[10px] text-slate-500">{t('opsProposals.meta', { id: p.incidentId, node: p.sourceNode, severity: p.severity, at: p.detectedAt })}</div>
          <div className="flex gap-2">
            <button onClick={() => ask(p.incidentId, 'approved')} disabled={busy} data-testid="ops-proposal-approve"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
              <Check size={14} /> {t('opsProposals.approve')}
            </button>
            <button onClick={() => ask(p.incidentId, 'rejected')} disabled={busy} data-testid="ops-proposal-reject"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold">
              <X size={14} /> {t('opsProposals.reject')}
            </button>
          </div>
        </div>
      ))}
      {lists && lists.decided.length > 0 && (
        <ul className="text-[10px] text-slate-500 space-y-0.5" data-testid="ops-proposals-decided">
          {lists.decided.slice(-5).reverse().map(d => (
            <li key={`${d.incidentId}-${d.decidedAt}`}>{t(d.decision === 'approved' ? 'opsProposals.decided_approved' : 'opsProposals.decided_rejected', { id: d.incidentId, by: d.by, at: d.decidedAt })}</li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirming !== null}
        title={t('opsProposals.confirm_title')}
        message={t('opsProposals.confirm_message', { id: confirming ?? '' })}
        confirmLabel={t('opsProposals.confirm_button')}
        onConfirm={() => { if (confirming) void decide(confirming, 'approved'); }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
