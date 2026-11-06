// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, history: components/config/HistoryTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// What happened and when, in one place: who connected to the server (the clients and their sign-ins) and, for an administrator, the
// audit record of the changes that matter. Both are the screens that already exist, shown here under one tab.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { ConnectionHistory } from '../ConnectionHistory';
import { AdminAudit } from '../AdminAudit';
import { useSession } from '../../storeContexts';

type Part = 'connections' | 'audit';

export function HistoryTab() {
  const { t } = useTranslation();
  const { isAdmin } = useSession();
  const [part, setPart] = useState<Part>('connections');
  const parts: Part[] = isAdmin ? ['connections', 'audit'] : ['connections'];

  return (
    <div className="space-y-4 animate-in fade-in duration-300" data-testid="history-tab">
      <div>
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><History size={16} /> {t('history_tab.title')}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed pt-2">{t('history_tab.intro')}</p>
      </div>
      <div role="tablist" className="flex gap-2">
        {parts.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={part === item} data-testid={`history-part-${item}`} onClick={() => setPart(item)} className={part === item ? 'px-3 py-1.5 rounded-full text-xs font-bold border bg-sky-500 text-slate-950 border-sky-400' : 'px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-950 text-slate-400 border-slate-800'}>{t(`history_tab.part_${item}`)}</button>
        ))}
      </div>
      {!isAdmin && <p data-testid="history-audit-admin-only" className="text-[10px] text-slate-500">{t('history_tab.audit_admin_only')}</p>}
      {part === 'connections' && <ConnectionHistory />}
      {part === 'audit' && isAdmin && <AdminAudit />}
    </div>
  );
}
