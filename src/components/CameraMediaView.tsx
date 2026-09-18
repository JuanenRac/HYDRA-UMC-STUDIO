// =============================================================================
// HYDRA-UMC STUDIO - Camera snapshot/recording library: CameraMediaView.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Lists every real snapshot/recording HYDRA-UMC-SERVER's own
// GET /api/camera/media has saved (see CamerasView.tsx's own toggleRecording/
// takePhoto, which now actually call the server instead of only flipping
// local UI state), grouped by camera, with a viewer pane on the right - the
// same real backend list a viewer must read from, since nothing about a
// capture is ever stored client-side.
// =============================================================================

import { useEffect, useState } from 'react';
import { useHydraStore } from '../store';
import { apiUrl } from '../lib/apiBase';
import { useTranslation } from 'react-i18next';
import { Camera as CameraIcon, Video, Image as ImageIcon, RefreshCw, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MediaItem {
  cameraId: number;
  kind: 'snapshots' | 'recordings';
  filename: string;
  sizeBytes: number;
  capturedAt: string;
  recording: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CameraMediaView() {
  const { authToken } = useHydraStore();
  const { t } = useTranslation();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<number | 'all'>('all');
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(apiUrl('/api/camera/media'), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setItems(body.items || []);
    } catch {
      setError(t('cameraMedia.load_failed', "Couldn't load camera media from the server."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const cameraIds = Array.from(new Set(items.map(i => i.cameraId))).sort((a, b) => a - b);
  const visible = items.filter(i => selectedCameraId === 'all' || i.cameraId === selectedCameraId);

  const mediaUrl = (item: MediaItem) => apiUrl(`/api/camera/media/${item.cameraId}/${item.kind}/${encodeURIComponent(item.filename)}`);

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <ImageIcon className="text-emerald-400" size={20} /> <span className="glow-text-emerald">{t('cameraMedia.title', 'Camera Media Library')}</span>
        </h2>
        <button onClick={load} className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors" title={t('cameraMedia.refresh', 'Refresh')}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setSelectedCameraId('all')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors', selectedCameraId === 'all' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200')}>
          {t('cameraMedia.all_cameras', 'All cameras')}
        </button>
        {cameraIds.map(id => (
          <button key={id} onClick={() => setSelectedCameraId(id)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors', selectedCameraId === id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200')}>
            {t('cameras.cam', 'Cam')} {id}
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-rose-400">{error}</div>}

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-1/3 min-w-[220px] overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
          {!loading && visible.length === 0 && !error && (
            <div className="text-sm text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-xl">
              {t('cameraMedia.empty', 'No photos or recordings saved yet. Use the camera and record buttons on Vision Center.')}
            </div>
          )}
          {visible.map(item => (
            <button
              key={`${item.cameraId}-${item.kind}-${item.filename}`}
              onClick={() => setSelected(item)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all border',
                selected?.filename === item.filename && selected.cameraId === item.cameraId && selected.kind === item.kind
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200',
              )}
            >
              {item.kind === 'recordings' ? <Video size={16} className={item.recording ? 'text-rose-400' : ''} /> : <CameraIcon size={16} />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{t('cameras.cam', 'Cam')} {item.cameraId} · {item.filename}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-60">
                  {new Date(item.capturedAt).toLocaleString()} · {formatSize(item.sizeBytes)}
                  {item.recording && <span className="text-rose-400"> · {t('cameras.rec', 'REC')}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 bg-black/40 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden relative">
          {!selected && (
            <div className="text-sm text-slate-600 italic">{t('cameraMedia.select_hint', 'Select a photo or recording on the left to view it here.')}</div>
          )}
          {selected && selected.kind === 'snapshots' && (
            <img src={mediaUrl(selected)} alt={selected.filename} className="max-w-full max-h-full object-contain" />
          )}
          {selected && selected.kind === 'recordings' && (
            // Same real multipart/x-mixed-replace body a live camera stream
            // uses (see CamerasView.tsx's own <img> for /api/camera/:id/stream)
            // - the server serves a saved recording with the exact same
            // framing, so a plain <img> plays it back frame by frame.
            <img key={selected.filename} src={mediaUrl(selected)} alt={selected.filename} className="max-w-full max-h-full object-contain" />
          )}
          {selected && (
            <a
              href={mediaUrl(selected)}
              download={selected.filename}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
            >
              <Download size={14} /> {t('cameraMedia.download', 'Download')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
