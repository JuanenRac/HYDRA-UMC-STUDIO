// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog, cameras: components/config/CamerasTab.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The camera slots: robot assignment, USB or IP source, discovery and the live status of each stream. Moved out of Config.tsx unchanged.

import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Search, Zap } from 'lucide-react';
import { RTSP_DEFAULT_PORT, ipStreamLabels } from '../../store';
import { useFleet, useSettingsStore } from '../../storeContexts';
import type { CameraTools } from '../../hooks/useCameraTools';
import { cn } from '../robotDetail/shared';

export function CamerasTab({ tools }: { tools: CameraTools }) {
  const { t } = useTranslation();
  const { flushSettingsSave } = useSettingsStore();
  const { activeController, updateCamera } = useFleet();
  const { cameraStatus, rtspDiscoverStates, discoverRtspPath, usbDiscoverPhase, usbDevices, discoverUsbDevices } = tools;
  return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-2">{t('config.camera_mapping_title')}</h3>
        <div className="grid grid-cols-1 gap-4">
          {activeController.cameras.map((c, idx) => {
            const hasConflict = activeController.cameras.some(other => other.id !== c.id && (other.assignedRobotId === c.assignedRobotId && c.assignedRobotId));
            const hasSourceConflict = activeController.cameras.some(other => other.id !== c.id && (other.hardwareSource === c.hardwareSource && c.hardwareSource));

            return (
            <div key={c.id} className={cn("bg-slate-950 p-6 rounded-2xl border transition-all shadow-xl space-y-4", (hasConflict || hasSourceConflict) ? "border-rose-500/50 bg-rose-500/5 shadow-rose-500/10" : "border-slate-800")}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className={cn("w-10 h-10 rounded-full border flex items-center justify-center font-black", (hasConflict || hasSourceConflict) ? "bg-rose-500/20 border-rose-500 text-rose-400" : "bg-slate-900 border-slate-700 text-sky-400")}>C{c.id}</div>
                   <span className="text-xs font-black text-slate-200 uppercase tracking-widest">{t('config.vision_slot')} {idx + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(hasConflict || hasSourceConflict) && <div className="flex items-center gap-1 text-rose-400 text-[10px] font-bold uppercase"><AlertTriangle size={14}/> {t('config.resource_conflict')}</div>}
                  {!hasConflict && !hasSourceConflict && <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", c.connected ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-600")}>{c.connected ? t('config.active_stream') : t('config.standby')}</span>}
                  {/* Real live status of this camera's own
                      stream serve process (HYDRA-UMC-SERVER's
                      own new GET /api/cameras/status) - the
                      actual "did Apply work" feedback a config
                      edit never had before; a black box that
                      silently did nothing is exactly the bug
                      this whole feature exists to fix. */}
                  {(() => {
                    const st = cameraStatus[`${activeController.id}:${c.id}`];
                    if (!st) return null;
                    // "stopped" is a real, deliberate state (this
                    // camera's own connected toggle is off - the
                    // server already stopped its real process
                    // rather than burning CPU/memory on a feed
                    // nothing's asking to see), never an error -
                    // neutral slate, not alarm red.
                    const cls = st.status === 'running' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : st.status === 'starting' ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : st.status === 'stopped' ? "bg-slate-500/10 text-slate-400 border-slate-500/30"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30";
                    const label = st.status === 'running' ? t('config.stream_running', 'Stream Live')
                      : st.status === 'starting' ? t('config.stream_starting', 'Starting…')
                      : st.status === 'stopped' ? t('config.stream_stopped', 'Stopped')
                      : t('config.stream_error', 'Stream Error');
                    return (
                      <span title={st.lastError || undefined} className={cn("px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border", cls)}>
                        {label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.assigned_robot')}</label>
                  <select
                    value={c.assignedRobotId || ""}
                    onChange={e => updateCamera(c.id, { assignedRobotId: parseInt(e.target.value) || undefined })}
                    className={cn("w-full bg-slate-900 border rounded-lg p-2 text-xs text-slate-200 outline-none transition-all", hasConflict ? "border-rose-500" : "border-slate-800 focus:border-sky-500")}
                  >
                    <option value="">{t('config.none_floating')}</option>
                    {activeController.robots.map(r => <option key={r.id} value={r.id}>{r.name} (A{r.id})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.source_type')}</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateCamera(c.id, {
                        sourceType: 'usb',
                        // Re-normalizes the Vision Center's own
                        // "type" label (CamerasView.tsx) to match
                        // - that combobox only ever offers "USB
                        // Vision Camera" once sourceType is
                        // "usb", so a stale "IP Vision Camera ..."
                        // value would otherwise match none of its
                        // rendered options. Thermal stays
                        // untouched either way - it's a real
                        // hardware type, not tied to sourceType.
                        ...(!c.type.startsWith('IP Vision Camera') ? {} : { type: 'USB Vision Camera' }),
                      })}
                      className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors", (c.sourceType || 'usb') === 'usb' ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300")}
                    >
                      {t('config.source_usb')}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCamera(c.id, {
                        sourceType: 'ip',
                        // Same re-normalization the other way -
                        // defaults a fresh switch to the main
                        // stream label (the more common real
                        // choice); rtspPath itself (below) is
                        // what actually decides which real
                        // stream gets captured, this is only
                        // the display label.
                        ...(c.type !== 'USB Vision Camera' ? {} : { type: 'IP Vision Camera Main Stream' }),
                      })}
                      className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors", c.sourceType === 'ip' ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300")}
                    >
                      {t('config.source_ip')}
                    </button>
                  </div>
                </div>
              </div>

              {(c.sourceType || 'usb') === 'usb' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.hardware_source')}</label>
                    <button
                      type="button"
                      onClick={discoverUsbDevices}
                      disabled={usbDiscoverPhase === 'discovering'}
                      className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sky-400 hover:text-sky-300 disabled:opacity-50"
                    >
                      {usbDiscoverPhase === 'discovering' ? <RefreshCw size={11} className="animate-spin" /> : <Search size={11} />}
                      {t('config.discover_usb_devices', 'Discover USB Devices')}
                    </button>
                  </div>
                  <input
                    value={c.hardwareSource || ""}
                    onChange={e => updateCamera(c.id, { hardwareSource: e.target.value })}
                    className={cn("w-full bg-slate-900 border rounded-lg p-2 text-xs font-mono outline-none transition-all", hasSourceConflict ? "border-rose-500 text-rose-400" : "border-slate-800 text-emerald-400 focus:border-emerald-500")}
                    placeholder="/dev/video0"
                  />
                  {/* Real devices found by the last scan (shared
                      across every camera card - one scan finds
                      them all) - picking one just fills THIS
                      card's own field, doesn't touch any other
                      camera. */}
                  {usbDiscoverPhase === 'done' && (
                    usbDevices.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {usbDevices.map((d) => (
                          <button
                            key={d.index}
                            type="button"
                            onClick={() => updateCamera(c.id, { hardwareSource: String(d.index) })}
                            className="px-2 py-1 rounded text-[9px] font-mono bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500 transition-colors"
                          >
                            #{d.index} · {d.width}×{d.height}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-600 pt-1">{t('config.no_usb_devices_found', 'No real USB cameras found.')}</p>
                    )
                  )}
                  {usbDiscoverPhase === 'error' && (
                    <p className="text-[9px] text-rose-400 pt-1">{t('config.usb_discovery_failed', 'Discovery failed - is HYDRA-UMC-VISION-STREAMER installed on this server?')}</p>
                  )}
                </div>
              ) : (
                // Real, generic RTSP fields - not tied to any one camera brand.
                // Any real IP camera that speaks RTSP (the vast majority of
                // them) plugs in here the same way: host/port/path plus
                // optional credentials, matching HYDRA-UMC-VISION-STREAMER's
                // own CameraConfig(source_type="ip") one-to-one (see that
                // project's own config.py for the real field-by-field
                // reasoning, including why rtsp_port defaults to 554 but a
                // real camera answering on a different port - confirmed
                // real for one on this network, port 8554 - must be
                // explicitly settable, not hardcoded).
                <div className="space-y-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <p className="text-[9px] text-slate-500 leading-relaxed">{t('config.ip_camera_hint')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.ip_host')}</label>
                      <input
                        value={c.ipHost || ""}
                        onChange={e => updateCamera(c.id, { ipHost: e.target.value })}
                        className={cn("w-full bg-slate-950 border rounded-lg p-2 text-xs font-mono outline-none transition-all", hasSourceConflict ? "border-rose-500 text-rose-400" : "border-slate-800 text-emerald-400 focus:border-emerald-500")}
                        placeholder="192.168.0.210"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.rtsp_port')}</label>
                      <input
                        type="number"
                        value={c.rtspPort ?? RTSP_DEFAULT_PORT}
                        onChange={e => updateCamera(c.id, { rtspPort: parseInt(e.target.value) || RTSP_DEFAULT_PORT })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-emerald-400 outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.rtsp_path')}</label>
                      <button
                        type="button"
                        onClick={() => discoverRtspPath(c.id, c.ipHost || "", c.rtspPort ?? RTSP_DEFAULT_PORT, c.ipUsername || "", c.ipPassword || "")}
                        disabled={!c.ipHost || rtspDiscoverStates[c.id]?.phase === 'discovering'}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sky-400 hover:text-sky-300 disabled:opacity-50"
                      >
                        {rtspDiscoverStates[c.id]?.phase === 'discovering' ? <RefreshCw size={11} className="animate-spin" /> : <Search size={11} />}
                        {t('config.discover_path', 'Discover Path')}
                      </button>
                    </div>
                    {/* One real field per real stream this camera's
                        own last discovery actually found - not a
                        single field a 2nd/3rd real stream had
                        nowhere to go. discoveredStreamPaths[0] is
                        always the Main path; rtspPath (the field
                        that actually drives the live capture -
                        see server.ts's own cameraFingerprint())
                        mirrors whichever index the Vision Center
                        combobox currently has selected, so editing
                        THAT one here also updates the live stream,
                        same as before this real multi-path support
                        existed. Editing any other index only
                        updates its own stored path - it takes
                        effect once that stream is actually
                        selected in Vision Center. */}
                    {(() => {
                      const paths = c.discoveredStreamPaths && c.discoveredStreamPaths.length > 0 ? c.discoveredStreamPaths : [c.rtspPath || ''];
                      const labels = ipStreamLabels(c.discoveredStreamPaths);
                      const activeIndex = labels.indexOf(c.type as any);
                      const updatePathAt = (index: number, value: string) => {
                        const nextPaths = [...paths];
                        nextPaths[index] = value;
                        const isLegacySingle = paths.length <= 1;
                        const isActive = isLegacySingle ? index === 0 : index === (activeIndex >= 0 ? activeIndex : 0);
                        updateCamera(c.id, isActive ? { discoveredStreamPaths: nextPaths, rtspPath: value } : { discoveredStreamPaths: nextPaths });
                      };
                      return paths.map((path, i) => (
                        <div key={i} className={i > 0 ? "pt-2" : undefined}>
                          {i > 0 && (
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                              {labels[i] === 'IP Vision Camera Sub Stream'
                                ? t('cameras.ip_vision_sub', 'IP Vision Camera Sub Stream')
                                : labels[i]
                                  ? t('cameras.ip_vision_sub_n', 'IP Vision Camera Sub Stream {{n}}', { n: i })
                                  : `${t('config.rtsp_path')} ${i + 1}`}
                            </label>
                          )}
                          <input
                            value={path}
                            onChange={e => updatePathAt(i, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-emerald-400 outline-none focus:border-emerald-500 transition-all"
                            placeholder="/11"
                          />
                        </div>
                      ));
                    })()}
                    {/* Never invents a path - real success fills
                        the field(s) above directly (still editable
                        by hand after); a real, honest failure
                        lists exactly which real paths were
                        actually tried. */}
                    {rtspDiscoverStates[c.id]?.phase === 'found' && (
                      <p className="text-[9px] text-emerald-400 pt-1">{t('config.rtsp_path_found', 'Found: {{path}}', { path: rtspDiscoverStates[c.id]?.message })}</p>
                    )}
                    {rtspDiscoverStates[c.id]?.phase === 'not-found' && (
                      <p className="text-[9px] text-amber-400 pt-1">{t('config.rtsp_path_not_found', 'None of the tried paths answered: {{paths}}', { paths: rtspDiscoverStates[c.id]?.message })}</p>
                    )}
                    {rtspDiscoverStates[c.id]?.phase === 'error' && (
                      <p className="text-[9px] text-rose-400 pt-1">{t('config.rtsp_discovery_failed', 'Discovery failed - could not reach the server.')}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.ip_username')}</label>
                      <input
                        value={c.ipUsername || ""}
                        onChange={e => updateCamera(c.id, { ipUsername: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-sky-500 transition-all"
                        placeholder="admin"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('config.ip_password')}</label>
                      <input
                        type="password"
                        value={c.ipPassword || ""}
                        onChange={e => updateCamera(c.id, { ipPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-sky-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Real edits already auto-save (the ordinary
                  500ms debounced POST /api/settings every other
                  field in this app already uses) and
                  HYDRA-UMC-SERVER's own process supervisor
                  reconciles the real stream process from
                  whatever lands there - this button doesn't do
                  anything an edit wasn't already going to do on
                  its own, it just skips the wait for someone
                  who wants to confirm "Apply" did something
                  right now, matching the status badge above. */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => flushSettingsSave()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-400 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
                >
                  <Zap size={12} />
                  {t('config.apply_now', 'Apply Now')}
                </button>
              </div>
            </div>
          )})}
        </div>
      </div>
  );
}
