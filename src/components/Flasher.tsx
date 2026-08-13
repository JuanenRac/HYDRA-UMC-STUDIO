// =============================================================================
// HYDRA-UMC STUDIO - URTC Flasher Module: Flasher.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// CAN-OTA firmware flashing for a Robot Controller Board or (relayed through
// it) a robot's own URTC Tool Head - see HYDRA-UMC's docs/architecture.md for
// the full SPI -> STM32H745 -> FDCAN1 -> Robot Controller Board -> CAN ->
// URTC chain this targets. Deliberately CAN-OTA only - no JTAG/SWD, no
// USB-CAN dongle (see URTC-FLASHER, this project's own desktop sibling tool,
// for that style of flashing instead). Runs against a simulated transport
// (settings.canOta.transport) until real STM32H745 firmware exists to talk
// to over SPI - see canOta.ts's own header comment.
// =============================================================================

import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Upload, Download, Zap, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Radio } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useHydraStore, type RobotState } from '../store';
import { crc32, hopDescription, mockFlash, mockQueryVersion, slotLabel, type CanOtaTarget, type CanOtaTier, type FlashPhase } from '../lib/canOta';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogLine { t: number; text: string; level: 'info' | 'ok' | 'error'; }

export function Flasher() {
  const { t } = useTranslation();
  const { activeController, updateRobot, settings } = useHydraStore();
  const robots = activeController?.robots || [];

  const [robotId, setRobotId] = useState<number>(robots[0]?.id ?? 0);
  const [tier, setTier] = useState<CanOtaTier>('controllerBoard');
  const [file, setFile] = useState<{ name: string; size: number; bytes: Uint8Array; crc: number } | null>(null);
  const [allowDowngrade, setAllowDowngrade] = useState(false);
  const [eraseFram, setEraseFram] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [phase, setPhase] = useState<FlashPhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [pages, setPages] = useState({ sent: 0, total: 0 });
  const [log, setLog] = useState<LogLine[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const robot = robots.find(r => r.id === robotId);
  const robotIndex0 = robots.findIndex(r => r.id === robotId);
  const isHardwareTransport = settings.canOta?.transport === 'hardware';

  const target: CanOtaTarget | null = useMemo(() => {
    if (!robot || robotIndex0 < 0) return null;
    return { controllerName: activeController?.name || '', robotId: robot.id, robotName: robot.name, robotIndex0, tier };
  }, [robot, robotIndex0, tier, activeController]);

  const boardState = tier === 'controllerBoard' ? robot?.controllerBoard : robot?.urtcHead;

  function pushLog(text: string, level: LogLine['level'] = 'info') {
    setLog(prev => [...prev.slice(-199), { t: Date.now(), text, level }]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.arrayBuffer().then(buf => {
      const bytes = new Uint8Array(buf);
      setFile({ name: f.name, size: bytes.length, bytes, crc: crc32(bytes) });
      pushLog(t('flasher.log.file_loaded', { name: f.name, size: bytes.length }));
    });
  }

  async function handleQueryVersion() {
    if (!target) return;
    setQuerying(true);
    pushLog(t('flasher.log.querying', { hop: hopDescription(target) }));
    const res = await mockQueryVersion(target);
    setQuerying(false);
    if (!res.online) {
      pushLog(t('flasher.log.no_response'), 'error');
      return;
    }
    pushLog(t('flasher.log.version_found', { fw: res.firmwareVersion, bl: res.bootloaderVersion }), 'ok');
    const patch = { firmwareVersion: res.firmwareVersion, bootloaderVersion: res.bootloaderVersion, hardwareId: res.hardwareId, lastSeen: Date.now() };
    updateRobot(robotId, tier === 'controllerBoard' ? { controllerBoard: patch } : { urtcHead: patch });
  }

  async function handleFlash() {
    if (!target || !file) return;
    if (!window.confirm(t('flasher.confirm_flash', { target: tier === 'controllerBoard' ? t('flasher.target_controller_board') : t('flasher.target_urtc_head'), robot: robot?.name }))) return;
    setFlashing(true);
    pushLog(t('flasher.log.flash_start', { name: file.name, hop: hopDescription(target) }));
    try {
      for await (const progress of mockFlash(target, file.bytes, { allowDowngrade, eraseFram })) {
        setPhase(progress.phase);
        setPercent(progress.percent);
        setPages({ sent: progress.pagesSent, total: progress.pagesTotal });
        if (progress.phase === 'transferring' && progress.pagesSent % 5 !== 0 && progress.pagesSent !== progress.pagesTotal) continue;
        pushLog(t(`flasher.progress.${progress.messageKey}`, { page: progress.pagesSent, total: progress.pagesTotal }), progress.phase === 'error' ? 'error' : 'info');
      }
      if (phase !== 'error') {
        pushLog(t('flasher.log.flash_done'), 'ok');
        const patch = { firmwareVersion: file.name.replace(/\.bin$/i, ''), bootloaderVersion: boardState?.bootloaderVersion || '1.0.0', hardwareId: boardState?.hardwareId, lastSeen: Date.now() };
        updateRobot(robotId, tier === 'controllerBoard' ? { controllerBoard: patch } : { urtcHead: patch });
      }
    } finally {
      setFlashing(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] pointer-events-none" />

      <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">{t('flasher.title', 'Flasher')}</h2>
            <p className="text-xs text-slate-400">{t('flasher.subtitle', 'CAN-OTA Firmware Flashing (no JTAG/SWD, no USB-CAN)')}</p>
          </div>
        </div>
        {isHardwareTransport && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-semibold">
            <AlertTriangle size={14} /> {t('flasher.hardware_not_implemented')}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10 space-y-6">
        {/* Target selection */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('flasher.target', 'Target')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold">{t('flasher.robot_slot', 'Robot Slot')}</label>
              <select value={robotId} onChange={e => setRobotId(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500">
                {robots.map((r, i) => (
                  <option key={r.id} value={r.id}>{slotLabel(i)} - {r.name}{r.urtcConnected ? '' : ` (${t('flasher.urtc_unreachable')})`}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold">{t('flasher.board', 'Board')}</label>
              <select value={tier} onChange={e => setTier(e.target.value as CanOtaTier)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500">
                <option value="controllerBoard">{t('flasher.target_controller_board')}</option>
                <option value="urtcHead" disabled={!robot?.urtcConnected}>{t('flasher.target_urtc_head')}</option>
              </select>
            </div>
          </div>
          {target && (
            <div className="text-[11px] font-mono text-slate-500 bg-slate-900 rounded-lg px-3 py-2 flex items-center gap-2 overflow-x-auto">
              <Radio size={12} className="shrink-0 text-sky-500" /> {hopDescription(target)}
            </div>
          )}
          <div className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">
              {boardState ? (
                <span>{t('flasher.current_version')}: <span className="text-emerald-400 font-mono">{boardState.firmwareVersion || '?'}</span> ({t('flasher.bootloader')} <span className="font-mono text-slate-300">{boardState.bootloaderVersion || '?'}</span>)</span>
              ) : (
                <span className="text-slate-500">{t('flasher.no_version_known')}</span>
              )}
            </div>
            <button onClick={handleQueryVersion} disabled={querying || !target} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg transition-colors">
              <RefreshCw size={12} className={querying ? 'animate-spin' : ''} /> {t('flasher.query_version', 'Query Version')}
            </button>
          </div>
        </div>

        {/* Firmware file */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('flasher.firmware_file', 'Firmware File')}</h3>
          <input ref={fileInputRef} type="file" accept=".bin" onChange={handleFileChange} className="hidden" />
          <div className="flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-colors">
              <Upload size={14} /> {t('flasher.browse', 'Browse .bin')}
            </button>
            {file ? (
              <div className="text-xs font-mono text-slate-400">
                {file.name} - {(file.size / 1024).toFixed(1)} KB - CRC32 <span className="text-sky-400">0x{file.crc.toString(16).toUpperCase().padStart(8, '0')}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">{t('flasher.no_file', 'No file selected')}</div>
            )}
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input type="checkbox" checked={allowDowngrade} onChange={e => setAllowDowngrade(e.target.checked)} className="accent-sky-500" />
              {t('flasher.allow_downgrade', 'Allow downgrade (bypass anti-rollback)')}
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input type="checkbox" checked={eraseFram} onChange={e => setEraseFram(e.target.checked)} className="accent-sky-500" />
              {t('flasher.erase_fram', 'Erase F-RAM after flash')}
            </label>
          </div>
        </div>

        {/* Flash action + progress */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <button
            onClick={handleFlash}
            disabled={!file || flashing || isHardwareTransport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            <Zap size={16} /> {flashing ? t('flasher.flashing', 'Flashing...') : t('flasher.flash_now', 'Flash Now')}
          </button>
          {phase && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>{t(`flasher.progress.${phase}`)}{pages.total > 1 && phase === 'transferring' ? ` (${pages.sent}/${pages.total})` : ''}</span>
                <span>{percent}%</span>
              </div>
              <div className="bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div className={cn('h-full transition-all duration-200', phase === 'error' ? 'bg-rose-500' : phase === 'done' ? 'bg-emerald-500' : 'bg-sky-500')} style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Log */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('flasher.log_title', 'Log')}</h3>
          <div className="bg-black/40 rounded-lg p-3 h-48 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1">
            {log.length === 0 && <div className="text-slate-600">{t('flasher.log_empty', 'No activity yet.')}</div>}
            {log.map((l, i) => (
              <div key={i} className={cn('flex items-start gap-2', l.level === 'ok' ? 'text-emerald-400' : l.level === 'error' ? 'text-rose-400' : 'text-slate-400')}>
                {l.level === 'ok' ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : l.level === 'error' ? <XCircle size={12} className="mt-0.5 shrink-0" /> : <Download size={12} className="mt-0.5 shrink-0 opacity-50" />}
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
