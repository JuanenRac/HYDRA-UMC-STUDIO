// =============================================================================
// HYDRA-UMC STUDIO - Notice of a newer release of STUDIO: components/UpdateNotice.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// A thin bar that says a newer release of STUDIO exists and where to download it. It only tells: nothing is installed from here (the update section of
// Configuration has its own switch, off by default). The person can hide it for that version, and turn the notice off in Configuration, Updates. It stays
// silent when the person is not an administrator, when the server does not look for newer versions or when the server cannot be reached.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, X } from 'lucide-react';
import { panelCall } from '../lib/panelApi';
import { parseSelfUpdateStatus, type SelfUpdateStatus } from '../lib/selfUpdate';
import { setStudioPrefs, useStudioPrefs } from '../lib/studioPrefs';
import { studioNotice } from '../lib/updateNotice';

export function UpdateNotice() {
  const { t } = useTranslation();
  const prefs = useStudioPrefs();
  const [status, setStatus] = useState<SelfUpdateStatus | null>(null);

  useEffect(() => {
    if (!prefs.updateNotice) { setStatus(null); return; }
    let alive = true;
    void panelCall(client => client.getAdminSelfUpdate(), parseSelfUpdateStatus).then((result) => { if (alive) setStatus(result.ok ? result.value : null); });
    return () => { alive = false; };
  }, [prefs.updateNotice]);

  const notice = prefs.updateNotice ? studioNotice(status, prefs.updateNoticeDismissed) : null;
  if (!notice) return null;
  return (
    <div role="status" data-testid="update-notice" className="flex items-center gap-3 px-4 py-2 bg-sky-500/10 border-b border-sky-500/30 text-xs text-sky-200">
      <BellRing size={14} className="shrink-0" />
      <span className="flex-1">{t('selfupdate.notice_text', { latest: notice.latest, installed: notice.installed })}</span>
      {notice.url && <a data-testid="update-notice-link" href={notice.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{t('selfupdate.notice_download')}</a>}
      <button type="button" data-testid="update-notice-dismiss" aria-label={t('selfupdate.notice_dismiss')} title={t('selfupdate.notice_dismiss')} onClick={() => setStudioPrefs({ updateNoticeDismissed: notice.latest })} className="p-1 hover:text-white"><X size={14} /></button>
    </div>
  );
}
