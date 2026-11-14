// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Telemetry > Tier plan editor: DownsamplePlanEditor.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The editor of the tier plan of HYDRA-UMC-DATALAKE (how long raw points are kept and how they are rolled up), for administrators.
// It reads and saves the plan through the server (GET/PUT /api/telemetry/downsample-plan). The rules are strict and are the same as
// the data lake's: the problems are shown next to the cell they belong to, in the language of the app, and "Save" stays disabled
// while there is one. Saving first asks the data lake what it would do (a preview, nothing written), shows the effects, and asks
// for a confirmation; turning real deletion on has its own, red confirmation. A request can never switch deletion on in the data
// lake: that is the operator's option when starting it, and the control stays disabled without it.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Plus, Trash2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import {
  emptyTier, loadPlan, putPlan, validatePlan,
  type Effects, type Failure, type Issue, type PlanDraft, type PlanState, type TierDraft,
} from '../lib/downsamplePlan';

const COLUMNS = [
  { key: 'kind', label: 'ecosystem.plan_col_kind' },
  { key: 'field', label: 'ecosystem.plan_col_field' },
  { key: 'raw', label: 'ecosystem.plan_col_raw' },
  { key: 'bucket', label: 'ecosystem.plan_col_bucket' },
  { key: 'fineBucket', label: 'ecosystem.plan_col_fine' },
  { key: 'rollupRetention', label: 'ecosystem.plan_col_keep' },
  { key: 'fineRetention', label: 'ecosystem.plan_col_fine_keep' },
] as const;

const sameDraft = (a: PlanDraft, b: PlanDraft) => JSON.stringify(a) === JSON.stringify(b);

export function DownsamplePlanEditor() {
  const { t } = useTranslation();
  const [state, setState] = useState<PlanState | null>(null);
  const [draft, setDraft] = useState<PlanDraft>({ tiers: [], delete: false });
  const [failure, setFailure] = useState<{ failure: Failure; status?: number; details?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [effects, setEffects] = useState<{ next: Effects | null; changes: number; warnings: string[] } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true); setNotice(''); setEffects(null);
    const result = await loadPlan();
    if (result.ok) {
      setState(result.value); setDraft(result.value.draft); setFailure(null);
    } else {
      setState(null); setFailure({ failure: result.failure, status: result.status, details: result.details });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const issues = useMemo<Issue[]>(() => (state ? validatePlan(draft, state.knownKinds) : []), [draft, state]);
  const issuesByTier = useMemo(() => {
    const map = new Map<number, Issue[]>();
    for (const issue of issues) if (issue.tier !== null) map.set(issue.tier, [...(map.get(issue.tier) ?? []), issue]);
    return map;
  }, [issues]);
  const changed = state ? !sameDraft(draft, state.draft) : false;
  const valid = issues.length === 0;
  const turningDeleteOn = draft.delete && !(state?.draft.delete ?? false);

  const edit = (tier: number, key: keyof TierDraft, value: string) => {
    setNotice(''); setEffects(null);
    setDraft((d) => ({ ...d, tiers: d.tiers.map((row, i) => (i === tier ? { ...row, [key]: value } : row)) }));
  };

  const issueText = (issue: Issue) => t(`ecosystem.plan_issue_${issue.code}`, issue.params);
  const failureText = (f: Failure, status?: number) => (
    f === 'http' ? t('ecosystem.plan_http', { status: status ?? 0 })
      : f === 'off' ? t('ecosystem.plan_off')
        : f === 'forbidden' ? t('ecosystem.plan_forbidden')
          : f === 'unreachable' ? t('ecosystem.plan_unreachable')
            : f === 'network' ? t('ecosystem.plan_network')
              : f === 'malformed' ? t('ecosystem.plan_malformed')
                : t(`ecosystem.plan_error_${f}`)
  );

  // What the data lake would do with this draft: nothing is written.
  const check = async (): Promise<boolean> => {
    if (!state || !valid) return false;
    setBusy(true); setNotice('');
    const result = await putPlan(draft, state.hash, { preview: true, confirmDelete: turningDeleteOn });
    setBusy(false);
    if (!result.ok) { setFailure({ failure: result.failure, status: result.status, details: result.details }); setEffects(null); return false; }
    setFailure(null);
    setEffects({ next: result.value.effects, changes: result.value.changes, warnings: result.value.warnings });
    return true;
  };

  const save = async () => {
    if (!state || !valid) return;
    setConfirming(false); setBusy(true);
    const result = await putPlan(draft, state.hash, { preview: false, confirmDelete: turningDeleteOn });
    setBusy(false);
    if (!result.ok) { setFailure({ failure: result.failure, status: result.status, details: result.details }); return; }
    await reload();
    setNotice(result.value.saved ? t('ecosystem.plan_saved') : t('ecosystem.plan_unchanged'));
  };

  const askToSave = async () => { if (await check()) setConfirming(true); };

  const inputCls = 'w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500';

  return (
    <div className="space-y-4" data-testid="downsample-plan-editor">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} /> {t('ecosystem.plan_title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2 max-w-2xl">{t('ecosystem.plan_desc')}</p>
      </div>

      {failure && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 space-y-1" role="alert">
          <p>{failureText(failure.failure, failure.status)}</p>
          {failure.details && failure.details.length > 0 && (
            <ul className="list-disc pl-4 text-[10px] text-amber-300/80">{failure.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
          )}
          {failure.failure === 'plan_changed' && (
            <button onClick={() => void reload()} className="mt-1 px-3 py-1 rounded-lg border border-amber-500/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><RefreshCw size={11} /> {t('ecosystem.plan_reload')}</button>
          )}
        </div>
      )}
      {notice && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2" role="status">{notice}</p>}
      {loading && !state && <p className="text-[10px] text-slate-500">...</p>}

      {state && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${state.switches.effectiveMode === 'delete' ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              {state.switches.effectiveMode === 'delete' ? t('ecosystem.plan_mode_delete') : t('ecosystem.plan_mode_dryrun')}
            </span>
            <button onClick={() => void reload()} disabled={loading || busy} className="px-3 py-1 rounded-lg border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 disabled:opacity-40"><RefreshCw size={11} /> {t('ecosystem.plan_reload')}</button>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed max-w-3xl flex gap-2"><ShieldCheck size={14} className="shrink-0 text-sky-500" /> {t('ecosystem.plan_strict_note')}</p>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-x-auto space-y-2">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr>
                  {COLUMNS.map((c) => <th key={c.key} className="pb-2 pr-2 text-slate-500 uppercase text-[9px] tracking-widest font-black">{t(c.label)}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.tiers.map((row, index) => {
                  const rowIssues = issuesByTier.get(index) ?? [];
                  return (
                    <tr key={index} className="align-top" data-testid={`plan-row-${index}`}>
                      {COLUMNS.map((c) => {
                        const bad = rowIssues.some((i) => i.key === c.key);
                        const fineOff = !state.switches.fineRollups && (c.key === 'fineBucket' || c.key === 'fineRetention');
                        return (
                          <td key={c.key} className="pr-2 pb-2">
                            <input
                              value={row[c.key]}
                              onChange={(e) => edit(index, c.key, e.target.value)}
                              list={c.key === 'kind' ? 'plan-known-kinds' : undefined}
                              aria-label={`${t('ecosystem.plan_row', { row: index + 1 })} - ${t(c.label)}`}
                              aria-invalid={bad}
                              disabled={fineOff}
                              className={`${inputCls} ${bad ? 'border-rose-500' : 'border-slate-800'} ${fineOff ? 'opacity-40' : ''}`}
                            />
                          </td>
                        );
                      })}
                      <td className="pb-2">
                        <button onClick={() => { setEffects(null); setDraft((d) => ({ ...d, tiers: d.tiers.filter((_, i) => i !== index) })); }} aria-label={t('ecosystem.plan_remove_tier')} title={t('ecosystem.plan_remove_tier')} className="p-1.5 text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="plan-known-kinds">{state.knownKinds.map((k) => <option key={k} value={k} />)}</datalist>
            <button onClick={() => { setEffects(null); setDraft((d) => ({ ...d, tiers: [...d.tiers, emptyTier()] })); }} className="px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Plus size={12} /> {t('ecosystem.plan_add_tier')}</button>
            <p className="text-[10px] text-slate-600">{t('ecosystem.plan_duration_hint')}</p>
            {state.knownKinds.length > 0 && <p className="text-[10px] text-slate-600">{t('ecosystem.plan_known_kinds', { kinds: state.knownKinds.join(', ') })}</p>}
          </div>

          {issues.length > 0 ? (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 space-y-1" role="alert" data-testid="plan-issues">
              <p className="font-black">{t('ecosystem.plan_invalid_count', { count: issues.length })}</p>
              <ul className="list-disc pl-4 text-[11px]">
                {issues.map((issue, i) => (
                  <li key={i}>{issue.tier !== null ? `${t('ecosystem.plan_row', { row: issue.tier + 1 })}: ` : ''}{issueText(issue)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-emerald-400" data-testid="plan-valid">{t('ecosystem.plan_valid')}</p>
          )}

          <label className={`flex items-start gap-2 text-xs ${state.switches.allowDelete ? 'text-slate-300' : 'text-slate-600'}`}>
            <input
              type="checkbox"
              checked={draft.delete}
              disabled={!state.switches.allowDelete}
              onChange={(e) => { setEffects(null); setDraft((d) => ({ ...d, delete: e.target.checked })); }}
              className="mt-0.5"
            />
            <span>
              {t('ecosystem.plan_delete_label')}
              {!state.switches.allowDelete && <span className="block text-[10px] text-slate-600">{t('ecosystem.plan_delete_disabled')}</span>}
            </span>
          </label>
          {state.switches.allowDelete && draft.delete && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 flex gap-2"><AlertTriangle size={14} className="shrink-0" /> {t('ecosystem.plan_delete_warning')}</p>
          )}

          {effects && (
            <div className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 space-y-1" data-testid="plan-effects">
              <p className="text-emerald-400">{t('ecosystem.plan_previewed')}</p>
              <p>{t('ecosystem.plan_changes', { count: effects.changes })}</p>
              {effects.next && <p>{t('ecosystem.plan_effects', { raw: effects.next.rawPointsToRollUp, rollups: effects.next.rollupsToExpire, fine: effects.next.fineRollupsToExpire })}</p>}
              {effects.warnings.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{t('ecosystem.plan_server_notes')}</p>
                  <ul className="list-disc pl-4 text-[10px] text-slate-400">{effects.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => void check()} disabled={!valid || busy} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">{t('ecosystem.plan_preview')}</button>
            <button onClick={() => void askToSave()} disabled={!valid || !changed || busy} className="px-4 py-2 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[10px] font-black uppercase tracking-widest disabled:opacity-40" data-testid="plan-save">{t('ecosystem.plan_save')}</button>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pb-1">{t('ecosystem.plan_audit_title')}</h4>
            {state.audit.length === 0 ? <p className="text-[10px] text-slate-600">{t('ecosystem.plan_audit_none')}</p> : (
              <ul className="text-[10px] text-slate-500 space-y-0.5 font-mono">
                {state.audit.map((a, i) => (
                  <li key={i}>{new Date(a.atMs).toLocaleString()} - {t('ecosystem.plan_audit_entry', { event: a.event, client: a.client, tiers: a.tiers ?? 0 })}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('ecosystem.plan_confirm_title')}
        message={turningDeleteOn ? t('ecosystem.plan_confirm_delete_message') : t('ecosystem.plan_confirm_message')}
        details={effects?.next ? <p className="text-xs text-slate-300">{t('ecosystem.plan_effects', { raw: effects.next.rawPointsToRollUp, rollups: effects.next.rollupsToExpire, fine: effects.next.fineRollupsToExpire })}</p> : undefined}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        danger={turningDeleteOn}
        onConfirm={() => void save()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
