// =============================================================================
// HYDRA-UMC STUDIO - Camera Integration Component: CamerasView.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import { useState } from 'react';
import { useHydraStore, ipStreamLabels } from '../store';
import { apiUrl } from '../lib/apiBase';
import { useTranslation } from 'react-i18next';
import { Video, Maximize2, Minimize2, Camera as CameraIcon, Power, ScanLine, CircleDot, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Executes the Cn logic. 
 * This function handles the necessary computations and state updates.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Executes the  cameras view logic. 
 * This function handles the necessary computations and state updates.
 */
export function CamerasView() {
  const { cameras, updateCamera, updateRobot } = useHydraStore();
  const { t } = useTranslation();
  const [fullScreenId, setFullScreenId] = useState<number | null>(null);
  const [recordingIds, setRecordingIds] = useState<Set<number>>(new Set());
  const [connectingIds, setConnectingIds] = useState<Set<number>>(new Set());
  const [flashId, setFlashId] = useState<number | null>(null);

  const toggleRecording = (id: number) => {
    setRecordingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const takePhoto = (id: number) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 150);
  };

  const retryConnection = (id: number) => {
    setConnectingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setConnectingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      const cam = cameras.find(c => c.id === id);
      if (cam && !cam.connected) {
        updateCamera(id, { connected: true });
        // cam.assignedRobotId, NOT id (the camera's own id) - Config.tsx
        // lets the owner reassign which robot a camera actually serves
        // (updateCamera(c.id, { assignedRobotId })), and only cameras 1-8
        // happening to still be assigned to robots 1-8 (the seed default)
        // ever made `id` a correct stand-in for the robot id here. Any
        // reassignment (cameras 1/2 reassigned away from robots A1/A2 is
        // exactly the reported symptom: "cameras 1&2 don't behave like
        // 3-8") toggled the WRONG robot's visionEnabled - or none at all,
        // silently, since updateRobot() with a stale id just finds nothing.
        if (cam.assignedRobotId) updateRobot(cam.assignedRobotId, { visionEnabled: true });
      }
    }, 1500);
  };

  const toggleConnection = (id: number) => {
    const cam = cameras.find(c => c.id === id);
    if (cam) {
      const newState = !cam.connected;
      updateCamera(id, { connected: newState, yoloEnabled: false });
      // See retryConnection()'s own comment just above - same fix.
      if (cam.assignedRobotId) updateRobot(cam.assignedRobotId, { visionEnabled: newState });
    }
  };

  const toggleYolo = (id: number) => {
    const cam = cameras.find(c => c.id === id);
    if (cam && cam.connected) {
      updateCamera(id, { yoloEnabled: !cam.yoloEnabled });
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Video className="text-emerald-400" size={20} /> <span className="glow-text-emerald">{t('cameras.title', 'Octal Vision Matrix')}</span>
        </h2>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono">
            Hailo-8 AI: 26 TOPS
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono hidden sm:block">
            USB3 Hubs: GL3523
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 pb-4">
        <div className={cn("grid h-full", fullScreenId ? "grid-cols-1 gap-0" : "grid-cols-2 lg:grid-cols-4 grid-rows-4 lg:grid-rows-2 gap-2")}>
          {cameras.map((c, i) => {
            if (fullScreenId && fullScreenId !== c.id) return null;
            
            return (
            <div key={c.id} className={cn("bg-slate-900 border border-slate-700 hover:glow-border-sky flex flex-col relative group h-full transition-all duration-300", fullScreenId ? "rounded-none border-0" : "rounded-lg overflow-hidden shadow-lg")}>
              <div className="flex flex-col gap-2 p-2 border-b border-slate-800 bg-slate-900/80 shrink-0 w-full z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-200">{t('cameras.cam', 'Cam')} {i + 1}</span>
                    {c.assignedRobotId && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">ROBOT A{c.assignedRobotId}</span>
                    )}
                    {/* Purely informational - which real backend this
                        camera's own stream comes from (Config.tsx's own
                        source-type toggle), not something this view can
                        change itself. Same real proxy endpoint below
                        either way - HYDRA-UMC-SERVER's own
                        GET /api/camera/:id/stream doesn't care which
                        backend mjpeg_server.py opened. */}
                    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black border", c.sourceType === 'ip' ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : "bg-slate-800 text-slate-400 border-slate-700")}>
                      {c.sourceType === 'ip' ? t('cameras.source_ip', 'IP') : t('cameras.source_usb', 'USB')}
                    </span>
                    {c.connected && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('cameras.live', 'LIVE')}</span>
                    )}
                    {c.yoloEnabled && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">YOLOv8</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                  <button onClick={() => toggleConnection(c.id)} className={cn("p-1.5 rounded transition-colors", c.connected ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 glow-border-emerald" : "text-slate-500 hover:text-emerald-400 border border-transparent")}>
                    <Power size={14} />
                  </button>
                  <button onClick={() => toggleYolo(c.id)} disabled={!c.connected} className={cn("p-1.5 rounded transition-colors disabled:opacity-50", c.yoloEnabled ? "text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/30 glow-border-sky" : "text-slate-500 hover:text-sky-400 border border-transparent")}>
                    <ScanLine size={14} />
                  </button>
                  <button onClick={() => takePhoto(c.id)} disabled={!c.connected} className={cn("p-1.5 rounded transition-colors disabled:opacity-50", "text-slate-500 hover:text-slate-200 border border-transparent")}>
                    <CameraIcon size={14} />
                  </button>
                  <button onClick={() => toggleRecording(c.id)} disabled={!c.connected} className={cn("p-1.5 rounded transition-colors disabled:opacity-50", recordingIds.has(c.id) ? "text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/30 glow-border-rose" : "text-slate-500 hover:text-rose-400 border border-transparent")}>
                    <CircleDot size={14} />
                  </button>
                  {!c.connected && (
                    <button onClick={() => retryConnection(c.id)} disabled={connectingIds.has(c.id)} className="p-1.5 rounded transition-colors disabled:opacity-50 text-slate-500 hover:text-sky-400 border border-transparent">
                      <RefreshCw size={14} className={cn(connectingIds.has(c.id) && "animate-spin text-sky-400")} />
                    </button>
                  )}
                  <button 
                    onClick={() => setFullScreenId(fullScreenId === c.id ? null : c.id)} 
                    className="p-1.5 text-slate-500 hover:text-slate-300 rounded border border-transparent hover:glow-border-sky"
                  >
                    {fullScreenId === c.id ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
                </div>
                <div className="w-full">
                  <select
                    value={c.type}
                    onChange={(e) => {
                      const label = e.target.value;
                      if (c.sourceType === 'ip') {
                        // Real behavior, not just a label change: picking
                        // a different discovered stream here re-points
                        // rtspPath at that real stream's own path, so
                        // this actually switches what Vision Center shows
                        // - the server's own camera-process supervisor
                        // (reconcileCameraProcesses) respawns the real
                        // capture the moment this saves, since rtspPath
                        // is part of its fingerprint.
                        const labels = ipStreamLabels(c.discoveredStreamPaths);
                        const idx = labels.indexOf(label as any);
                        const path = idx >= 0 ? c.discoveredStreamPaths?.[idx] : undefined;
                        updateCamera(c.id, path ? { type: label as any, rtspPath: path } : { type: label as any });
                      } else {
                        updateCamera(c.id, { type: label as any });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200 focus:border-sky-400 focus:glow-border-sky outline-none transition-all"
                  >
                    {/* USB vs. as many real streams as the last real
                        "Discover Path" run actually found for THIS
                        camera (ipStreamLabels() - never a fixed pair;
                        this ecosystem's own real cameras can expose 1,
                        2, or more) are mutually exclusive with each
                        other, matching c.sourceType - Thermal stays
                        offered regardless (real hardware type, not tied
                        to sourceType) until those sensors get real
                        functionality. */}
                    {c.sourceType === 'ip' ? (
                      ipStreamLabels(c.discoveredStreamPaths).map((label, i) => (
                        <option key={label} value={label}>
                          {label === 'IP Vision Camera Main Stream'
                            ? t('cameras.ip_vision_main', 'IP Vision Camera Main Stream')
                            : label === 'IP Vision Camera Sub Stream'
                              ? t('cameras.ip_vision_sub', 'IP Vision Camera Sub Stream')
                              : t('cameras.ip_vision_sub_n', 'IP Vision Camera Sub Stream {{n}}', { n: i })}
                        </option>
                      ))
                    ) : (
                      <option value="USB Vision Camera">{t('cameras.usb_vision', 'USB Vision Camera')}</option>
                    )}
                    <option value="Thermal (MLX90640)">{t('cameras.thermal_mlx90640', 'Thermal (MLX90640)')}</option>
                    <option value="Thermal (MLX90641)">{t('cameras.thermal_mlx90641', 'Thermal (MLX90641)')}</option>
                    <option value="Thermal (MLX90642)">{t('cameras.thermal_mlx90642', 'Thermal (MLX90642)')}</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center relative p-2 overflow-hidden bg-slate-950">
                {c.connected ? (
                  <>
                    <div className="w-full h-full border border-slate-800 rounded bg-black/40 flex items-center justify-center relative overflow-hidden">
                      <CameraIcon size={32} className="text-slate-800" />
                      {/* Real gap closed: this whole matrix used to always
                          show that decorative icon regardless of
                          connection state - HYDRA-UMC-SERVER's own GET
                          /api/camera/:id/stream is a real proxy now (see
                          that repo's own CHANGELOG). A plain <img> renders
                          multipart/x-mixed-replace MJPEG natively (no
                          <video>/MSE plumbing needed for this format) -
                          stacked after the icon above so a real, opaque
                          frame naturally covers it once one arrives;
                          hides itself on error (503, no local
                          mjpeg_server.py running yet for this camera)
                          so the icon underneath shows through instead of
                          a broken-image glyph. */}
                      <img
                        src={apiUrl(`/api/camera/${c.id}/stream`)}
                        alt={`${c.type} camera feed`}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/10 via-transparent to-transparent opacity-50" />
                      
                      {/* Grid overlay */}
                      <div className="absolute inset-0 bg-electric-grid opacity-30 mix-blend-screen" />
                      
                      {/* Yolo Bounding boxes mock */}
                      {c.yoloEnabled && c.detections.map((det, idx) => (
                        <div 
                          key={idx} 
                          className="absolute border border-emerald-400 glow-border-emerald bg-emerald-500/10"
                          style={{ left: `${det.box.x}%`, top: `${det.box.y}%`, width: `${det.box.w}%`, height: `${det.box.h}%` }}
                        >
                          <span className="absolute -top-4 left-0 bg-emerald-500 text-slate-950 text-[8px] font-bold px-1 py-0.5 rounded-sm whitespace-nowrap">
                            {det.label} {(det.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}

                      {c.yoloEnabled && c.detections.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sky-400/50 text-[10px] font-mono animate-pulse">{t('cameras.running_inference', 'Running Inference...')}</span>
                        </div>
                      )}

                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 transition-opacity">
                        <span className="text-[9px] font-mono text-emerald-400/70">1080p 60fps</span>
                        {recordingIds.has(c.id) && (
                          <div className="flex items-center gap-1 text-[10px] text-rose-400 font-bold font-mono">
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" /> {t('cameras.rec', 'REC')}
                          </div>
                        )}
                      </div>
                      
                      {flashId === c.id && (
                        <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150" />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full border border-slate-800/50 border-dashed rounded flex flex-col items-center justify-center gap-2 text-slate-600 bg-slate-950/50">
                    <Video size={24} />
                    <span className="text-xs font-mono">{connectingIds.has(c.id) ? t('cameras.connecting', 'CONNECTING...') : t('cameras.no_signal', 'NO SIGNAL')}</span>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
