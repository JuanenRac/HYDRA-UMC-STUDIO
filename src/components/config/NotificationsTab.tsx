// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, notifications: components/config/NotificationsTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The push notifications the server sends to registered phones: on or off, whether the credentials work, how many phones are registered
// and which events are announced. It is a reading: the server takes these switches from its security file (off by default) and has no
// route to change them or to mute an event, so this tab says so instead of showing switches that would do nothing.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, RefreshCw } from 'lucide-react';
import { useSession } from '../../storeContexts';
import { failureKey, panelRead, type PanelFailure } from '../../lib/panelApi';
import { isKnownEvent, parsePush, pushVerdict, type PushState } from '../../lib/notificationsView';

export function NotificationsTab() {
  const { t } = useTranslation();
  const { isAdmin } = useSession();
  const [state, setState] = useState<PushState | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const result = await panelRead('/api/admin/push', parsePush);
    setState(result.ok ? result.value : null);
    setFailure(result.ok ? null : result.failure);
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="notifications-tab">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><Bell size={16} /> {t('notify.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('notify.intro')}</p>
      </div>

      {!isAdmin && <p data-testid="notifications-admin-only" className="text-xs text-slate-500">{t('notify.admin_only')}</p>}
      {isAdmin && failure && <p role="alert" data-testid="notifications-error" className="text-xs text-amber-400">{t(failureKey(failure))}</p>}

      {isAdmin && state && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span data-testid="notifications-verdict" data-verdict={pushVerdict(state)} className="text-xs font-bold text-slate-200">{t(`notify.verdict_${pushVerdict(state)}`)}</span>
            <button type="button" onClick={() => void load()} className="flex items-center gap-1 text-[10px] text-sky-400"><RefreshCw size={12} /> {t('updates.refresh')}</button>
          </div>
          {state.problem && <p data-testid="notifications-problem" className="text-[10px] text-amber-400">{t('notify.problem', { problem: state.problem })}</p>}
          <p data-testid="notifications-devices" className="text-xs text-slate-300">{t('notify.devices', { count: state.devices })}</p>
          {state.sandbox && <p className="text-[10px] text-slate-500">{t('notify.sandbox')}</p>}
          <ul className="divide-y divide-slate-800 border-t border-slate-800">
            {state.events.map((event) => (
              <li key={event.id} data-testid="notifications-event" data-on={event.on ? 'yes' : 'no'} className="flex items-center justify-between py-2 text-xs text-slate-300">
                <span>{isKnownEvent(event.id) ? t(`notify.event_${event.id}`) : event.id}</span>
                <span className={event.on ? 'text-emerald-400' : 'text-slate-600'}>{event.on ? t('notify.on') : t('notify.off')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p data-testid="notifications-read-only" className="text-[10px] text-slate-500 leading-relaxed border border-slate-800 rounded-xl p-4">{t('notify.read_only')}</p>
    </div>
  );
}
