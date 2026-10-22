// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > Safety limits (administrators): AdminSafety.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The screen where an administrator sets the limits every client is held to (they live in the server, not in this
// app): the size of a relative jog and the range of an absolute one, by model; the hottest heated-bed target, by
// model; whether the jog has to be armed first and for how long; and whether a reservation has to name its
// controller. Every value is checked here against the hard ceilings the server reports, and the server checks
// again. The defaults are the prudent ones.
// =============================================================================
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, ShieldAlert, Trash2, Undo2 } from 'lucide-react';
import { useHydraStore } from '../store';
import { setSafetyState, useSafetyState } from '../lib/accessStore';
import { fetchSafetyLimits, putSafetyLimits } from '../lib/accessApi';
import { buildPatch, formFromLimits, modelKey, type FormProblem, type SafetyForm } from '../lib/safetyLimits';

const input = 'w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500';

export function AdminSafety() {
  const { t } = useTranslation();
  const { isAdmin, robots } = useHydraStore();
  const state = useSafetyState();
  const [form, setForm] = useState<SafetyForm>(() => formFromLimits(state.limits));
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [newModel, setNewModel] = useState('');

  // The values the server reports fill the form, unless the administrator has started to edit.
  useEffect(() => {
    let cancelled = false;
    void fetchSafetyLimits().then((read) => {
      if (cancelled || !read) return;
      setSafetyState(read.state);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!dirty) setForm(formFromLimits(state.limits));
  }, [state.limits, dirty]);

  const knownModels = useMemo(() => [...new Set(robots.map((r) => modelKey(r.model)).filter(Boolean))], [robots]);

  if (!isAdmin) return <p className="text-sm text-slate-400">{t('safety.admin_only')}</p>;

  const edit = (patch: Partial<SafetyForm>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); setNotice(''); setError(''); };
  const editRow = (index: number, patch: Partial<SafetyForm['rows'][number]>) => edit({ rows: form.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) });

  const problemText = (problem: FormProblem, field: string | undefined) => t(`safety.problem_${problem}`, { field: field ?? '' });

  const save = async () => {
    const built = buildPatch(form, state.hardLimits);
    if (!built.ok || !built.patch) { setError(problemText(built.problem ?? 'number', built.field)); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { result, state: saved } = await putSafetyLimits(built.patch);
      if (!result.ok || !saved) {
        setError(t('safety.save_failed', { detail: result.detail ?? `HTTP ${result.status}` }));
        return;
      }
      setSafetyState(saved);
      setForm(formFromLimits(saved.limits));
      setDirty(false);
      setNotice(t('safety.saved'));
    } finally {
      setBusy(false);
    }
  };

  const restoreDefaults = () => { setForm(formFromLimits(state.defaults)); setDirty(true); setNotice(''); setError(''); };

  const addModel = () => {
    const key = modelKey(newModel);
    if (!key) return;
    if (form.rows.some((r) => modelKey(r.model) === key)) { setError(problemText('duplicate', key)); return; }
    edit({ rows: [...form.rows, { model: key, maxAmount: '', maxAbsolute: '', bedMaxC: '' }] });
    setNewModel('');
  };

  const hard = state.hardLimits;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-2 text-slate-300" data-testid="admin-safety">
      <div>
        <h2 className="text-lg font-black text-slate-100 flex items-center gap-2"><ShieldAlert size={20} className="text-amber-400" />{t('safety.title')}</h2>
        <p className="text-xs text-slate-400 max-w-3xl">{t('safety.intro')}</p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('safety.section_jog_arm')}</h3>
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" data-testid="arm-required" checked={form.armRequired} onChange={(e) => edit({ armRequired: e.target.checked })} />
          <span><span className="font-bold">{t('safety.arm_required')}</span><br /><span className="text-slate-500">{t('safety.arm_required_hint')}</span></span>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="w-56">{t('safety.arm_ttl')}</span>
          <input className={input + ' max-w-[8rem]'} inputMode="numeric" value={form.armTtlSeconds} onChange={(e) => edit({ armTtlSeconds: e.target.value })} aria-label={t('safety.arm_ttl')} />
          <span className="text-slate-500">{t('safety.range_seconds', { min: hard.armTtlMs.min / 1000, max: hard.armTtlMs.max / 1000 })}</span>
        </label>
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" data-testid="require-controller" checked={form.requireControllerId} onChange={(e) => edit({ requireControllerId: e.target.checked })} />
          <span><span className="font-bold">{t('safety.require_controller')}</span><br /><span className="text-slate-500">{t('safety.require_controller_hint')}</span></span>
        </label>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('safety.section_limits')}</h3>
        <p className="text-[11px] text-slate-500">{t('safety.limits_hint', { amount: hard.jogMaxAmount, absolute: hard.jogMaxAbsolute, bed: hard.bedMaxC })}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[560px]">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-1 pr-2">{t('safety.col_model')}</th>
                <th className="py-1 pr-2">{t('safety.col_jog_relative')}</th>
                <th className="py-1 pr-2">{t('safety.col_jog_absolute')}</th>
                <th className="py-1 pr-2">{t('safety.col_bed')}</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-800">
                <td className="py-1 pr-2 font-bold">{t('safety.row_default')}</td>
                <td className="py-1 pr-2"><input className={input} data-testid="default-amount" value={form.defaultMaxAmount} onChange={(e) => edit({ defaultMaxAmount: e.target.value })} aria-label={t('safety.col_jog_relative')} /></td>
                <td className="py-1 pr-2"><input className={input} value={form.defaultMaxAbsolute} onChange={(e) => edit({ defaultMaxAbsolute: e.target.value })} aria-label={t('safety.col_jog_absolute')} /></td>
                <td className="py-1 pr-2"><input className={input} value={form.defaultBedMaxC} onChange={(e) => edit({ defaultBedMaxC: e.target.value })} aria-label={t('safety.col_bed')} /></td>
                <td />
              </tr>
              {form.rows.map((row, index) => (
                <tr key={row.model} className="border-t border-slate-800">
                  <td className="py-1 pr-2 font-mono">{row.model}</td>
                  <td className="py-1 pr-2"><input className={input} value={row.maxAmount} placeholder={t('safety.inherit')} onChange={(e) => editRow(index, { maxAmount: e.target.value })} aria-label={`${row.model} ${t('safety.col_jog_relative')}`} /></td>
                  <td className="py-1 pr-2"><input className={input} value={row.maxAbsolute} placeholder={t('safety.inherit')} onChange={(e) => editRow(index, { maxAbsolute: e.target.value })} aria-label={`${row.model} ${t('safety.col_jog_absolute')}`} /></td>
                  <td className="py-1 pr-2"><input className={input} value={row.bedMaxC} placeholder={t('safety.inherit')} onChange={(e) => editRow(index, { bedMaxC: e.target.value })} aria-label={`${row.model} ${t('safety.col_bed')}`} /></td>
                  <td className="py-1">
                    <button type="button" onClick={() => edit({ rows: form.rows.filter((_, i) => i !== index) })} title={t('safety.remove_model')} aria-label={t('safety.remove_model')} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2">
          <input
            className={input + ' max-w-[16rem]'}
            list="safety-known-models"
            value={newModel}
            placeholder={t('safety.add_model_placeholder')}
            aria-label={t('safety.add_model_placeholder')}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addModel(); }}
          />
          <datalist id="safety-known-models">{knownModels.map((m) => <option key={m} value={m} />)}</datalist>
          <button type="button" onClick={addModel} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-600 text-slate-300 hover:bg-slate-800"><Plus size={12} />{t('safety.add_model')}</button>
        </div>
      </section>

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" disabled={busy || !dirty} onClick={() => { void save(); }} data-testid="safety-save" className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-950 bg-sky-500 hover:bg-sky-400 disabled:opacity-40"><Save size={14} />{t('safety.save')}</button>
        <button type="button" disabled={busy} onClick={restoreDefaults} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40"><Undo2 size={14} />{t('safety.restore_defaults')}</button>
        {notice && <span role="status" className="text-xs font-bold text-emerald-400">{notice}</span>}
        {error && <span role="alert" className="text-xs font-bold text-rose-400">{error}</span>}
      </div>
    </div>
  );
}
