// =============================================================================
// HYDRA-UMC STUDIO - Real play/pause/stop/seek player for a saved .mjpeg
// recording: src/components/MjpegRecordingPlayer.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// A saved recording is served as raw multipart/x-mixed-replace bytes - the
// same framing a live camera stream uses. A plain <img src> "plays" it back
// automatically with zero controls, since it's rendered as an image stream,
// not a real <video> element (no browser can parse this custom multipart
// format as a video container). This component fetches the whole file once,
// parses it into individual real JPEG frame Blobs (mjpegParser.ts), and
// steps through them under its own control - a real play/pause/stop and a
// real seek bar, frame-indexed (never fabricated as a fake continuous
// timeline). When the server's own recording sidecar metadata is present
// (durationMs/frameCount - see GET /api/camera/media), the displayed time
// is real elapsed wall-clock time; for an older recording saved before that
// metadata existed, it honestly falls back to "frame N / M" instead of
// inventing a duration nothing on disk actually recorded.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Square } from 'lucide-react';
import { parseMjpegFrames } from '../lib/mjpegParser';

interface MjpegRecordingPlayerProps {
  url: string;
  durationMs?: number;
  frameCount?: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MjpegRecordingPlayer({ url, durationMs, frameCount: knownFrameCount }: MjpegRecordingPlayerProps) {
  const { t } = useTranslation();
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrls: string[] = [];
    setLoading(true);
    setError(null);
    setIndex(0);
    setPlaying(false);
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buffer => {
        if (cancelled) return;
        const frames = parseMjpegFrames(buffer);
        createdUrls = frames.map(f => URL.createObjectURL(f.blob));
        setFrameUrls(createdUrls);
      })
      .catch(() => {
        if (!cancelled) setError(t('cameraMedia.player_load_failed', "Couldn't load this recording."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      for (const objectUrl of createdUrls) URL.revokeObjectURL(objectUrl);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const totalFrames = frameUrls.length || knownFrameCount || 0;
  // Real per-frame interval derived from the server's own real elapsed
  // durationMs/frameCount when available - never an assumed frame rate.
  // Falls back to a plain 100ms step (10fps) only for a recording with no
  // sidecar metadata at all (saved before this feature existed).
  const frameIntervalMs = durationMs && totalFrames > 1 ? durationMs / totalFrames : 100;

  useEffect(() => {
    if (!playing || frameUrls.length === 0) return;
    intervalRef.current = setInterval(() => {
      setIndex(prev => {
        if (prev + 1 >= frameUrls.length) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, frameIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, frameUrls.length, frameIntervalMs]);

  if (loading) {
    return <div className="text-sm text-slate-500 italic">{t('cameraMedia.player_loading', 'Loading recording...')}</div>;
  }
  if (error || frameUrls.length === 0) {
    return <div className="text-sm text-rose-400">{error || t('cameraMedia.player_empty', 'This recording has no playable frames.')}</div>;
  }

  const currentTimeMs = durationMs ? (index / Math.max(1, frameUrls.length - 1)) * durationMs : null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
      <img src={frameUrls[index]} alt="" className="max-w-full max-h-[calc(100%-3rem)] object-contain" />
      <div className="w-full flex items-center gap-3 px-2">
        <button
          onClick={() => setPlaying(p => !p)}
          className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          title={playing ? t('cameraMedia.pause', 'Pause') : t('cameraMedia.play', 'Play')}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => { setPlaying(false); setIndex(0); }}
          className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          title={t('cameraMedia.stop', 'Stop')}
        >
          <Square size={16} />
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, frameUrls.length - 1)}
          value={index}
          onChange={e => { setPlaying(false); setIndex(Number(e.target.value)); }}
          className="flex-1 accent-emerald-400"
        />
        <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap min-w-[80px] text-right">
          {currentTimeMs !== null && durationMs
            ? `${formatTime(currentTimeMs)} / ${formatTime(durationMs)}`
            : `${index + 1} / ${frameUrls.length}`}
        </div>
      </div>
    </div>
  );
}
