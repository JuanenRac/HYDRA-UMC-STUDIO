// =============================================================================
// HYDRA-UMC STUDIO - Ecosystem > AI dashboard panel: AiDashboardPanel.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The AI dashboard of HYDRA-UMC-DASHBOARD-AI (trend summary, anomaly check, fleet view) inside this app, served by HYDRA-UMC-SERVER at /dashboard-ai.
// It uses the same login as this app, so it is framed only when it comes from this page's own origin; from another origin a link opens it instead.
// =============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';
import { canShareLogin, dashboardAiUrl, heightFromMessage, originOf, MIN_FRAME_HEIGHT } from '../lib/aiDashboardFrame';

export function AiDashboardPanel() {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState<number>(720);
  const pageOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const url = useMemo(() => dashboardAiUrl(apiUrl('')), []);
  const shared = useMemo(() => canShareLogin(url, pageOrigin), [url, pageOrigin]);
  const expectedOrigin = useMemo(() => originOf(url, pageOrigin) ?? '', [url, pageOrigin]);

  useEffect(() => {
    if (!shared) return undefined;
    const onMessage = (event: MessageEvent) => {
      const next = heightFromMessage({
        data: event.data,
        origin: event.origin,
        source: event.source,
        frameWindow: frameRef.current?.contentWindow ?? null,
        expectedOrigin,
      });
      if (next !== null) setHeight(next);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [shared, expectedOrigin]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-black uppercase tracking-wider text-slate-100">{t('ecosystem.ai_dashboard_title')}</h2>
        <p className="mt-1 text-xs text-slate-400">{t('ecosystem.ai_dashboard_desc')}</p>
      </div>
      {shared ? (
        <iframe
          ref={frameRef}
          title={t('ecosystem.ai_dashboard_title')}
          src={url}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full rounded-xl border border-slate-800 bg-slate-950"
          style={{ height: Math.max(MIN_FRAME_HEIGHT, height) }}
        />
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
          <p>{t('ecosystem.ai_dashboard_other_origin')}</p>
          <a className="mt-3 inline-flex items-center gap-2 font-bold text-sky-300 underline" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> {t('ecosystem.ai_dashboard_open')}
          </a>
        </div>
      )}
    </div>
  );
}
