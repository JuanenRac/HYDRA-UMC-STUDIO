// =============================================================================
// HYDRA-UMC-STUDIO - src/components/WatchNoticePanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// Read only: which phones say they tell their watch about a newer release of the app. The switch itself is on each phone.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readWatchNotices, type WatchNoticeResult } from '../lib/watchNotice';

export function WatchNoticePanel() {
  const { t } = useTranslation();
  const [result, setResult] = useState<WatchNoticeResult | null>(null);

  useEffect(() => {
    let current = true;
    void readWatchNotices().then((value) => { if (current) setResult(value); });
    return () => { current = false; };
  }, []);

  // A server without the route does not have the feature: the section stays out of the way.
  if (!result || (!result.ok && result.unsupported)) return null;

  return (
    <div className="space-y-2" data-testid="watch-notice-panel">
      <h5 className="text-xs font-bold text-slate-200">{t('watchNotice.title')}</h5>
      <div className="text-[10px] text-slate-500">{t('watchNotice.desc')}</div>
      {!result.ok && <p role="alert" className="text-xs text-rose-400">{t('watchNotice.load_error')}</p>}
      {result.ok && result.devices.length === 0 && <div className="text-[10px] text-slate-500">{t('watchNotice.none')}</div>}
      {result.ok && result.devices.map((device) => (
        <div key={`${device.username}/${device.device_id}`} className="text-xs text-slate-200">
          <span className="font-bold">{device.username}</span> · {device.platform} · {t(device.notifies_watch ? 'watchNotice.on' : 'watchNotice.off')}
          <span className="text-[10px] text-slate-500"> ({device.updated_at.slice(0, 16).replace('T', ' ')} UTC)</span>
        </div>
      ))}
    </div>
  );
}
