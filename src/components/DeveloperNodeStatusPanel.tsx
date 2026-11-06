// =============================================================================
// HYDRA-UMC STUDIO - Server Admin > Security: DeveloperNodeStatusPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The latest status that each developer node sent to the SERVER (GET /api/developer-node/status, read only). The route answers 404 while
// its switch is off, and the screen says so instead of drawing an empty list. Only plain texts, numbers and yes/no values of the status
// are drawn, as text; nothing the node sends is interpreted. Asking to check the signed record shows whether its chain is intact.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { developerNodeApi, type DeveloperNodeStatus } from '../lib/ingestSwitches';

export function DeveloperNodeStatusPanel({ refreshKey = 0 }: { refreshKey?: number } = {}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<DeveloperNodeStatus | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (verify: boolean) => {
    setBusy(true);
    const result = await developerNodeApi.read(verify);
    setBusy(false);
    if (result.ok) { setStatus(result.value); setProblem(''); return; }
    setStatus(null);
    setProblem(t(result.failure === 'unsupported' ? 'developerNodeStatus.off' : 'developerNodeStatus.load_error'));
  }, [t]);

  useEffect(() => { void load(false); }, [load, refreshKey]);

  return (
    <div className="space-y-2" data-testid="developer-node-status-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('developerNodeStatus.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('developerNodeStatus.desc')}</div>
      {problem && <p role="status" className="text-[10px] text-slate-400" data-testid="developer-node-status-problem">{problem}</p>}
      {status && (
        <>
          {status.nodes.length === 0 && <div className="text-[10px] text-slate-500" data-testid="developer-node-status-none">{t('developerNodeStatus.none')}</div>}
          {status.nodes.map(node => (
            <div key={node.nodeId} className="rounded-lg border border-slate-700 px-3 py-2 space-y-0.5" data-testid={`developer-node-${node.nodeId}`}>
              <div className="text-xs font-bold text-slate-200">{node.nodeId}</div>
              <div className="text-[10px] text-slate-500">{t('developerNodeStatus.received')}: {new Date(node.at).toLocaleString()} · {t('developerNodeStatus.entry')} {node.seq}</div>
              {node.fields.map(field => (
                <div key={field.name} className="text-[10px] text-slate-400"><span className="font-bold text-slate-300">{field.name}:</span> {field.value}</div>
              ))}
            </div>
          ))}
          {status.chain && (
            <div className={`text-[10px] font-bold ${status.chain.ok ? 'text-emerald-400' : 'text-rose-400'}`} role="status" data-testid="developer-node-status-chain">
              {t(status.chain.ok ? 'developerNodeStatus.chain_ok' : 'developerNodeStatus.chain_broken')}
            </div>
          )}
        </>
      )}
      <div className="flex gap-2">
        <button onClick={() => void load(false)} disabled={busy} data-testid="developer-node-status-refresh" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/40 hover:bg-slate-700/60 disabled:opacity-50 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold">
          <RefreshCw size={14} /> {t('developerNodeStatus.refresh')}
        </button>
        {status && (
          <button onClick={() => void load(true)} disabled={busy} data-testid="developer-node-status-verify" className="px-3 py-1.5 bg-slate-700/40 hover:bg-slate-700/60 disabled:opacity-50 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold">
            {t('developerNodeStatus.verify')}
          </button>
        )}
      </div>
    </div>
  );
}
