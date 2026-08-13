// =============================================================================
// HYDRA-UMC STUDIO - URTC Flasher Module: Flasher.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// CAN-OTA (and, for the Kinematic Brain, SPI-OTA) firmware flashing across
// all 4 tiers documented in HYDRA-UMC's docs/architecture.md:
//   0. Kinematic Brain (STM32H745ZIT6) - direct SPI, no robot slot involved
//   1. Robot Controller Board (STM32G474RET6) - FDCAN1 "STACK A" slot A1-A8
//   2. URTC Tool Head (STM32F303CCT6) - relayed through its own Robot Controller Board
//   3. Advanced Expansion Board (STM32F303CBT6) - relayed through both of the above,
//      only offered when that robot's URTC head reports expansion_board_type 3 or 4
// Deliberately CAN-OTA/SPI-OTA only - no JTAG/SWD, no USB-CAN dongle (see
// URTC-FLASHER, this project's own desktop sibling tool, for that style of
// flashing instead). Runs against a simulated transport (settings.canOta.
// transport) until real STM32H745 firmware exists to talk to over SPI - see
// canOta.ts's own header comment.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Upload, Download, Zap, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Radio, CloudDownload } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useHydraStore } from '../store';
import {
  chipNameFor, crc32, downloadGithubFirmware, fetchGithubFirmwareReleases, GITHUB_FIRMWARE_REPO,
  hasAdvancedExpansion, hopDescription, mockFlash, mockQueryVersion, slotLabel,
  type CanOtaTarget, type CanOtaTier, type FlashPhase, type GithubFirmwareAsset,
} from '../lib/canOta';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogLine { t: number; text: string; level: 'info' | 'ok' | 'error'; }

const TIERS: CanOtaTier[] = ['kinematicBrain', 'controllerBoard', 'urtcHead', 'urtcExpansion'];

export function Flasher() {
  const { t } = useTranslation();
  const { activeController, updateRobot, updateController, settings } = useHydraStore();
  const robots = activeController?.robots || [];

  const [tier, setTier] = useState<CanOtaTier>('controllerBoard');
  const [robotId, setRobotId] = useState<number>(robots[0]?.id ?? 0);
  const [file, setFile] = useState<{ name: string; size: number; bytes: Uint8Array; crc: number } | null>(null);
  const [allowDowngrade, setAllowDowngrade] = useState(false);
  const [eraseFram, setEraseFram] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [phase, setPhase] = useState<FlashPhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [pages, setPages] = useState({ sent: 0, total: 0 });
  const [log, setLog] = useState<LogLine[]>([]);
  const [ghAssets, setGhAssets] = useState<GithubFirmwareAsset[] | null>(null);
  const [ghLoading, setGhLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const robot = robots.find(r => r.id === robotId);
  const robotIndex0 = robots.findIndex(r => r.id === robotId);
  const isHardwareTransport = settings.canOta?.transport === 'hardware';
  const needsRobotSlot = tier !== 'kinematicBrain';
  const expansionAvailable = hasAdvancedExpansion(robot?.urtcHead?.expansionBoardType);
  const githubRepo = GITHUB_FIRMWARE_REPO[tier];

  useEffect(() => { setGhAssets(null); }, [tier, robotId]);
  useEffect(() => { if (tier === 'urtcExpansion' && !expansionAvailable) setTier('urtcHead'); }, [robotId]); // eslint-disable-line

  const target: CanOtaTarget | null = useMemo(() => {
    if (!activeController) return null;
    if (tier === 'kinematicBrain') return { controllerName: activeController.name, tier };
    if (!robot || robotIndex0 < 0) return null;
    return { controllerName: activeController.name, robotId: robot.id, robotName: robot.name, robotIndex0, tier };
  }, [robot, robotIndex0, tier, activeController]);

  const boardState = tier === 'kinematicBrain' ? activeController?.kinematicBrain
    : tier === 'controllerBoard' ? robot?.controllerBoard
    : tier === 'urtcHead' ? robot?.urtcHead
    : robot?.urtcExpansion;

  function pushLog(text: string, level: LogLine['level'] = 'info') {
    setLog(prev => [...prev.slice(-199), { t: Date.now(), text, level }]);
  }

  function applyBoardPatch(patch: Record<string, any>) {
    if (tier === 'kinematicBrain') {
      if (activeController) updateController(activeController.id, { kinematicBrain: patch });
      return;
    }
    if (tier === 'controllerBoard') updateRobot(robotId, { controllerBoard: patch });
    else if (tier === 'urtcHead') updateRobot(robotId, { urtcHead: { ...robot?.urtcHead, ...patch } });
    else updateRobot(robotId, { urtcExpansion: patch });
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

  async function handleFetchGithub() {
    if (!githubRepo) return;
    setGhLoading(true);
    setGhAssets(null);
    try {
      const assets = await fetchGithubFirmwareReleases(githubRepo);
      setGhAssets(assets);
      pushLog(t('flasher.log.github_found', { count: assets.length, repo: githubRepo }));
    } catch (err) {
      pushLog(t('flasher.log.github_error', { error: String(err) }), 'error');
      setGhAssets([]);
    } finally {
      setGhLoading(false);
    }
  }

  async function handleUseGithubAsset(asset: GithubFirmwareAsset) {
    pushLog(t('flasher.log.github_downloading', { name: asset.name }));
    try {
      const bytes = await downloadGithubFirmware(asset);
      setFile({ name: asset.name, size: bytes.length, bytes, crc: crc32(bytes) });
      pushLog(t('flasher.log.file_loaded', { name: asset.name, size: bytes.length }), 'ok');
    } catch (err) {
      pushLog(t('flasher.log.github_error', { error: String(err) }), 'error');
    }
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
    const patch: Record<string, any> = { firmwareVersion: res.firmwareVersion, bootloaderVersion: res.bootloaderVersion, hardwareId: res.hardwareId, lastSeen: Date.now() };
    if (tier === 'urtcHead' && res.expansionBoardType !== undefined) patch.expansionBoardType = res.expansionBoardType;
    applyBoardPatch(patch);
  }

  async function handleFlash() {
    if (!target || !file) return;
    const targetLabel = t(`flasher.target_${tier === 'kinematicBrain' ? 'kinematic_brain' : tier === 'controllerBoard' ? 'controller_board' : tier === 'urtcHead' ? 'urtc_head' : 'urtc_expansion'}`);
    if (!window.confirm(t('flasher.confirm_flash', { target: targetLabel, robot: robot?.name || activeController?.name }))) return;
    setFlashing(true);
    let lastPhase: FlashPhase | null = null;
    pushLog(t('flasher.log.flash_start', { name: file.name, hop: hopDescription(target) }));
    try {
      for await (const progress of mockFlash(target, file.bytes, { allowDowngrade, eraseFram })) {
        setPhase(progress.phase);
        lastPhase = progress.phase;
        setPercent(progress.percent);
        setPages({ sent: progress.pagesSent, total: progress.pagesTotal });
        if (progress.phase === 'transferring' && progress.pagesSent % 5 !== 0 && progress.pagesSent !== progress.pagesTotal) continue;
        pushLog(t(`flasher.progress.${progress.messageKey}`, { page: progress.pagesSent, total: progress.pagesTotal }), progress.phase === 'error' ? 'error' : 'info');
      }
      if (lastPhase !== 'error') {
        pushLog(t('flasher.log.flash_done'), 'ok');
        applyBoardPatch({ firmwareVersion: file.name.replace(/\.bin$/i, ''), bootloaderVersion: boardState?.bootloaderVersion || '1.0.0', hardwareId: boardState?.hardwareId, lastSeen: Date.now() });
      }
    } finally {
      setFlashing(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-position-[bottom_1px_center] pointer-events-none" />

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
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-bold">{t('flasher.board', 'Board')}</label>
            <select value={tier} onChange={e => setTier(e.target.value as CanOtaTier)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500">
              <option value="kinematicBrain">{t('flasher.target_kinematic_brain')} ({chipNameFor('kinematicBrain')})</option>
              <option value="controllerBoard">{t('flasher.target_controller_board')} ({chipNameFor('controllerBoard')})</option>
              <option value="urtcHead" disabled={!robot?.urtcConnected}>{t('flasher.target_urtc_head')} ({chipNameFor('urtcHead')})</option>
              <option value="urtcExpansion" disabled={!expansionAvailable}>{t('flasher.target_urtc_expansion')} ({chipNameFor('urtcExpansion')}){!expansionAvailable ? ` - ${t('flasher.expansion_not_present')}` : ''}</option>
            </select>
          </div>
          {needsRobotSlot && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold">{t('flasher.robot_slot', 'Robot Slot')}</label>
              <select value={robotId} onChange={e => setRobotId(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500">
                {robots.map((r, i) => (
                  <option key={r.id} value={r.id}>{slotLabel(i)} - {r.name}{r.urtcConnected ? '' : ` (${t('flasher.urtc_unreachable')})`}</option>
                ))}
              </select>
            </div>
          )}
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
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-colors">
              <Upload size={14} /> {t('flasher.browse', 'Browse .bin')}
            </button>
            {githubRepo && (
              <button onClick={handleFetchGithub} disabled={ghLoading} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-sm font-semibold transition-colors">
                <CloudDownload size={14} className={ghLoading ? 'animate-pulse' : ''} /> {t('flasher.download_github', 'Download from GitHub')} ({githubRepo})
              </button>
            )}
            {file && (
              <div className="text-xs font-mono text-slate-400">
                {file.name} - {(file.size / 1024).toFixed(1)} KB - CRC32 <span className="text-sky-400">0x{file.crc.toString(16).toUpperCase().padStart(8, '0')}</span>
              </div>
            )}
          </div>
          {!file && !ghAssets && <div className="text-xs text-slate-500">{t('flasher.no_file', 'No file selected')}</div>}
          {ghAssets && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
              {ghAssets.length === 0 && <div className="px-3 py-2 text-xs text-slate-500">{t('flasher.no_releases', 'No .bin releases published yet.')}</div>}
              {ghAssets.map((a, i) => (
                <button key={i} onClick={() => handleUseGithubAsset(a)} className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-800 transition-colors text-left">
                  <span className="font-mono text-slate-300">{a.name} <span className="text-slate-600">({a.releaseTag})</span></span>
                  <span className="text-slate-500">{(a.size / 1024).toFixed(1)} KB</span>
                </button>
              ))}
            </div>
          )}
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
