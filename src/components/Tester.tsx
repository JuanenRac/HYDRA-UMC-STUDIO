// =============================================================================
// HYDRA-UMC STUDIO - URTC Tester Module: Tester.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// CAN-OTA runtime diagnostics for a Robot Controller Board or (relayed
// through it) a robot's own URTC Tool Head - porting URTC-TESTER's own
// feature set (global LED/OLED controls, F-RAM query/erase, per-tool
// telemetry, safe self-test, raw CAN bus monitor) onto the same multi-hop
// chain Flasher.tsx uses. See HYDRA-UMC's docs/architecture.md and
// canOta.ts's header comment for the addressing scheme and simulated
// transport this runs against until real hardware exists.
//
// Like URTC-TESTER itself, self-test only ever performs SAFE at-rest checks
// (comms, zero-setpoint round trips) - it never actuates anything at
// meaningful power; that needs a human watching.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Beaker, Radio, RefreshCw, Trash2, CheckCircle2, XCircle, Circle, Thermometer, Gauge, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useHydraStore, type ToolType } from '../store';
import { chipNameFor, hasAdvancedExpansion, hopDescription, mockQueryVersion, mockSelfTest, slotLabel, startMockBusMonitor, type CanFrame, type CanOtaTarget, type CanOtaTier, type SelfTestStep } from '../lib/canOta';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToolCategory = 'thermal' | 'motor' | 'vacuum' | 'binary' | 'generic';

const TOOL_CATEGORY: Partial<Record<ToolType, ToolCategory>> = {
  'Soldering Station (T12)': 'thermal',
  '3D Printing Hotend': 'thermal',
  'Hot Air Rework Nozzle': 'thermal',
  'Drill (BL4260)': 'motor',
  'Smart Electric Screwdriver': 'motor',
  'SMT Solder Paste Dispenser': 'motor',
  'Thermal Paste / Liquid Dispenser': 'motor',
  'Vacuum / Pneumatic Gripper': 'vacuum',
  'Large-Format Vacuum Gripper': 'vacuum',
  'Heavy-Duty Electromagnet': 'binary',
  'Spot Welder Head': 'binary',
  'Ultrasonic Welder / Packaging Sealer': 'binary',
  'UV Curing Head': 'binary',
};

function categoryFor(tool: ToolType): ToolCategory {
  return TOOL_CATEGORY[tool] || 'generic';
}

const ALL_TIERS: CanOtaTier[] = ['kinematicBrain', 'controllerBoard', 'urtcHead', 'urtcExpansion'];

/**
 * `tiers` restricts which of the 4 CAN-OTA tiers this instance offers - see
 * Flasher.tsx's own header comment on the "URTC" vs "HYDRA-UMC" nav button
 * split this exists for (Dashboard.tsx).
 */
export function Tester({ tiers = ALL_TIERS }: { tiers?: CanOtaTier[] } = {}) {
  const { t } = useTranslation();
  const { activeController, updateRobot, updateController } = useHydraStore();
  const robots = activeController?.robots || [];

  const [tier, setTier] = useState<CanOtaTier>(tiers[0]);
  useEffect(() => { if (!tiers.includes(tier)) setTier(tiers[0]); }, [tiers]); // eslint-disable-line
  const [robotId, setRobotId] = useState<number>(robots[0]?.id ?? 0);
  const [querying, setQuerying] = useState(false);
  const [statusColor, setStatusColor] = useState('#00ff66');
  const [ringOn, setRingOn] = useState(false);
  const [oledMode, setOledMode] = useState<'standard' | 'night' | 'off'>('standard');
  const [framState, setFramState] = useState<{ hasValidState: boolean } | null>(null);
  const [testSteps, setTestSteps] = useState<SelfTestStep[]>([]);
  const [testing, setTesting] = useState(false);
  const [frames, setFrames] = useState<CanFrame[]>([]);
  // useState, not useRef: the Start/Stop button needs to re-render the instant
  // this changes (a ref mutation is invisible to React until something else
  // happens to force a re-render, which left the button visually stuck on
  // "Stop" after being pressed). The actual stop callback itself still lives
  // in a ref (monitorStopFnRef) since it's an unstoppable-through-props
  // function-in-flight, not something the UI needs to react to.
  const [monitorActive, setMonitorActive] = useState(false);
  const monitorStopFnRef = useRef<(() => void) | null>(null);

  const robot = robots.find(r => r.id === robotId);
  const robotIndex0 = robots.findIndex(r => r.id === robotId);
  const needsRobotSlot = tier !== 'kinematicBrain';
  const expansionAvailable = hasAdvancedExpansion(robot?.urtcHead?.expansionBoardType);

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
  const category = robot ? categoryFor(robot.tool) : 'generic';

  // Current target, kept in a ref so in-flight async work (handleSelfTest/
  // handleFramQuery below) can tell, once its await resolves, whether the
  // user has since switched tier/robot - and if so, drop the stale result
  // instead of applying it to state the UI now attributes to a different
  // target. Plain assignment during render (no effect) so it's always
  // current by the time any async callback checks it.
  const targetKeyRef = useRef('');
  targetKeyRef.current = `${tier}:${robotId}`;

  useEffect(() => {
    setTestSteps([]);
    setTesting(false);
    setFramState(null);
    setFrames([]);
    monitorStopFnRef.current?.();
    monitorStopFnRef.current = null;
    setMonitorActive(false);
  }, [robotId, tier]);

  useEffect(() => { if (tier === 'urtcExpansion' && !expansionAvailable) setTier('urtcHead'); }, [robotId]); // eslint-disable-line

  function toggleMonitor() {
    if (monitorStopFnRef.current) {
      monitorStopFnRef.current();
      monitorStopFnRef.current = null;
      setMonitorActive(false);
      return;
    }
    if (!target) return;
    monitorStopFnRef.current = startMockBusMonitor(target, f => setFrames(prev => [...prev.slice(-99), f]));
    setMonitorActive(true);
  }

  async function handleQueryVersion() {
    if (!target) return;
    setQuerying(true);
    const res = await mockQueryVersion(target);
    setQuerying(false);
    if (!res.online) return;
    const patch: Record<string, any> = { firmwareVersion: res.firmwareVersion, bootloaderVersion: res.bootloaderVersion, hardwareId: res.hardwareId, lastSeen: Date.now() };
    if (tier === 'kinematicBrain') {
      if (activeController) updateController(activeController.id, { kinematicBrain: patch });
    } else if (tier === 'controllerBoard') {
      updateRobot(robotId, { controllerBoard: patch });
    } else if (tier === 'urtcHead') {
      if (res.expansionBoardType !== undefined) patch.expansionBoardType = res.expansionBoardType;
      updateRobot(robotId, { urtcHead: { ...robot?.urtcHead, ...patch } });
    } else {
      updateRobot(robotId, { urtcExpansion: patch });
    }
  }

  async function handleFramQuery() {
    const requestKey = targetKeyRef.current;
    await new Promise(r => setTimeout(r, 150));
    if (targetKeyRef.current !== requestKey) return; // tier/robot changed mid-flight - drop stale result
    setFramState({ hasValidState: Math.random() > 0.3 });
  }

  async function handleSelfTest() {
    if (!target) return;
    const requestKey = targetKeyRef.current;
    setTesting(true);
    setTestSteps([]);
    for await (const step of mockSelfTest(target)) {
      if (targetKeyRef.current !== requestKey) return; // tier/robot changed mid-flight - abandon this run
      setTestSteps(prev => [...prev, step]);
    }
    if (targetKeyRef.current === requestKey) setTesting(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-position-[bottom_1px_center] pointer-events-none" />

      <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">{t('tester.title', 'Tester')}</h2>
            <p className="text-xs text-slate-400">{t('tester.subtitle', 'CAN-OTA Diagnostics & Live Telemetry')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10 space-y-6">
        {/* Target selection */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('flasher.target', 'Target')}</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-bold">{t('flasher.board', 'Board')}</label>
            <select value={tier} onChange={e => setTier(e.target.value as CanOtaTier)} aria-label={t('flasher.board', 'Board')} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500">
              {tiers.includes('kinematicBrain') && <option value="kinematicBrain">{t('flasher.target_kinematic_brain')} ({chipNameFor('kinematicBrain')})</option>}
              {tiers.includes('controllerBoard') && <option value="controllerBoard">{t('flasher.target_controller_board')} ({chipNameFor('controllerBoard')})</option>}
              {tiers.includes('urtcHead') && <option value="urtcHead" disabled={!robot?.urtcConnected}>{t('flasher.target_urtc_head')} ({chipNameFor('urtcHead')})</option>}
              {tiers.includes('urtcExpansion') && <option value="urtcExpansion" disabled={!expansionAvailable}>{t('flasher.target_urtc_expansion')} ({chipNameFor('urtcExpansion')}){!expansionAvailable ? ` - ${t('flasher.expansion_not_present')}` : ''}</option>}
            </select>
          </div>
          {needsRobotSlot && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold">{t('flasher.robot_slot', 'Robot Slot')}</label>
              <select value={robotId} onChange={e => setRobotId(Number(e.target.value))} aria-label={t('flasher.robot_slot', 'Robot Slot')} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500">
                {robots.map((r, i) => (
                  <option key={r.id} value={r.id}>{slotLabel(i)} - {r.name}</option>
                ))}
              </select>
            </div>
          )}
          {target && (
            <div className="text-[11px] font-mono text-slate-500 bg-slate-900 rounded-lg px-3 py-2 flex items-center gap-2 overflow-x-auto">
              <Radio size={12} className="shrink-0 text-emerald-500" /> {hopDescription(target)}
            </div>
          )}
          <div className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">
              {boardState ? (
                <span>{t('flasher.current_version')}: <span className="text-emerald-400 font-mono">{boardState.firmwareVersion || '?'}</span></span>
              ) : (
                <span className="text-slate-500">{t('flasher.no_version_known')}</span>
              )}
            </div>
            <button onClick={handleQueryVersion} disabled={querying} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg transition-colors">
              <RefreshCw size={12} className={querying ? 'animate-spin' : ''} /> {t('flasher.query_version', 'Query Version')}
            </button>
          </div>
        </div>

        <div className={cn('grid gap-6', tier === 'urtcHead' ? 'grid-cols-2' : 'grid-cols-1')}>
          {/* Global controls - URTC head only (status/ring LED, OLED are on that board) */}
          {tier === 'urtcHead' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('tester.global_controls', 'Global Controls')}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('tester.status_led', 'Status LED')}</span>
                <input type="color" aria-label={t('tester.status_led', 'Status LED')} value={statusColor} onChange={e => setStatusColor(e.target.value)} className="w-10 h-7 rounded bg-transparent border border-slate-800 cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('tester.ring_led', 'Ring LED')}</span>
                <button onClick={() => setRingOn(!ringOn)} className={cn('px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors', ringOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700')}>
                  {ringOn ? t('modules.on', 'ON') : t('modules.off', 'OFF')}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('tester.oled_mode', 'OLED Mode')}</span>
                <select value={oledMode} onChange={e => setOledMode(e.target.value as any)} aria-label={t('tester.oled_mode', 'OLED Mode')} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none">
                  <option value="standard">{t('tester.oled_standard', 'Standard')}</option>
                  <option value="night">{t('tester.oled_night', 'Night')}</option>
                  <option value="off">{t('tester.oled_off', 'Off')}</option>
                </select>
              </div>
              {robot?.urtcHead?.expansionBoardType !== undefined && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                  <span className="text-xs text-slate-400">{t('tester.expansion_type', 'Expansion Board')}</span>
                  <span className={cn('text-xs font-mono', expansionAvailable ? 'text-emerald-400' : 'text-slate-500')}>
                    {robot.urtcHead.expansionBoardType === 0 ? t('tester.expansion_none', 'None') : `#${robot.urtcHead.expansionBoardType}${expansionAvailable ? ` (${t('flasher.target_urtc_expansion')})` : ''}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* F-RAM - Robot Controller Board and URTC head both carry persisted state */}
          {(tier === 'controllerBoard' || tier === 'urtcHead') && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('tester.fram', 'Persistence (F-RAM)')}</h3>
              <div className="text-xs text-slate-400">
                {framState ? (
                  framState.hasValidState ? <span className="text-emerald-400">{t('tester.fram_valid', 'Valid saved state found')}</span> : <span className="text-slate-500">{t('tester.fram_empty', 'No saved state')}</span>
                ) : (
                  <span className="text-slate-600">{t('tester.fram_unknown', 'Unknown - query to check')}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handleFramQuery} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                  <RefreshCw size={12} /> {t('tester.fram_query', 'Query')}
                </button>
                <button onClick={() => setFramState({ hasValidState: false })} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors">
                  <Trash2 size={12} /> {t('tester.fram_erase', 'Erase')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tool telemetry */}
        {tier === 'urtcHead' && robot && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              {t('tester.tool_telemetry', 'Tool Telemetry')} <span className="text-slate-600 font-normal normal-case">{robot.tool}</span>
            </h3>
            <ToolTelemetryPanel category={category} />
          </div>
        )}

        {/* Self-test */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('tester.self_test', 'Self-Test')}</h3>
            <button onClick={handleSelfTest} disabled={testing || !target} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors">
              <Beaker size={12} className={testing ? 'animate-pulse' : ''} /> {testing ? t('tester.testing', 'Testing...') : t('tester.run_self_test', 'Run Self-Test')}
            </button>
          </div>
          <p className="text-[10px] text-slate-600">{t('tester.self_test_note', 'Safe checks only - communication and zero-setpoint round trips. Never actuates at meaningful power.')}</p>
          {testSteps.length > 0 && (
            <div className="space-y-1.5">
              {testSteps.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  {s.pass ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <XCircle size={14} className="text-rose-400 shrink-0" />}
                  <span className={s.pass ? 'text-slate-300' : 'text-rose-400'}>{t(`tester.selftest.${s.labelKey}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw CAN bus monitor */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('tester.bus_monitor', 'Raw Bus Monitor')}</h3>
            <button onClick={toggleMonitor} disabled={!target} aria-pressed={monitorActive} aria-label={monitorActive ? t('tester.monitor_stop', 'Stop') : t('tester.monitor_start', 'Start')} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border', monitorActive ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700')}>
              <Circle size={10} className={monitorActive ? 'fill-rose-400 text-rose-400 animate-pulse' : 'fill-slate-500 text-slate-500'} />
              {monitorActive ? t('tester.monitor_stop', 'Stop') : t('tester.monitor_start', 'Start')}
            </button>
          </div>
          <div className="bg-black/40 rounded-lg h-40 overflow-y-auto custom-scrollbar font-mono text-[10px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-950 text-slate-500">
                <tr><th className="text-left px-2 py-1 font-normal">{t('tester.col_time', 'Time')}</th><th className="text-left px-2 py-1 font-normal">{t('tester.col_id', 'ID')}</th><th className="text-left px-2 py-1 font-normal">DLC</th><th className="text-left px-2 py-1 font-normal">{t('tester.col_data', 'Data')}</th></tr>
              </thead>
              <tbody>
                {frames.slice().reverse().map((f, i) => (
                  <tr key={i} className="text-slate-400 border-t border-slate-900">
                    <td className="px-2 py-0.5">{new Date(f.timestamp).toLocaleTimeString()}</td>
                    <td className="px-2 py-0.5 text-sky-400">0x{f.id.toString(16).toUpperCase()}</td>
                    <td className="px-2 py-0.5">{f.dlc}</td>
                    <td className="px-2 py-0.5">{f.data.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}</td>
                  </tr>
                ))}
                {frames.length === 0 && <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-600">{t('tester.monitor_empty', 'No frames - start the monitor.')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolTelemetryPanel({ category }: { category: ToolCategory }) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 800);
    return () => clearInterval(id);
  }, []);
  const wobble = (base: number, amp: number) => base + Math.sin(tick / 2) * amp + (Math.random() - 0.5) * amp * 0.3;

  if (category === 'thermal') {
    const temp = wobble(210, 3);
    return (
      <div className="flex items-center gap-4">
        <Thermometer size={28} className="text-rose-400" />
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{t('tester.telemetry.temperature', 'Temperature')}</span><span className="font-mono text-slate-200">{temp.toFixed(1)}°C</span></div>
          <div className="bg-slate-900 rounded-full h-2 overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${Math.min(100, temp / 3)}%` }} /></div>
        </div>
      </div>
    );
  }
  if (category === 'motor') {
    const rpm = Math.max(0, wobble(1400, 40));
    return (
      <div className="flex items-center gap-4">
        <Gauge size={28} className="text-sky-400" />
        <div className="text-xs text-slate-400">{t('tester.telemetry.rpm', 'RPM')}: <span className="font-mono text-slate-200">{rpm.toFixed(0)}</span></div>
        <div className="text-xs text-slate-400">{t('tester.telemetry.endstop', 'Endstop')}: <span className="text-slate-500">{t('tester.telemetry.open', 'Open')}</span></div>
      </div>
    );
  }
  if (category === 'vacuum') {
    return (
      <div className="flex items-center gap-4">
        <Gauge size={28} className="text-amber-400" />
        <div className="text-xs text-slate-400">{t('tester.telemetry.analog', 'Analog')}: <span className="font-mono text-slate-200">{Math.round(wobble(1800, 100))}</span></div>
        <div className="text-xs text-slate-400">{t('tester.telemetry.part_detected', 'Part detected')}: <span className="text-slate-500">{t('modules.off', 'OFF')}</span></div>
      </div>
    );
  }
  if (category === 'binary') {
    return (
      <div className="flex items-center gap-4">
        <Zap size={28} className="text-violet-400" />
        <div className="text-xs text-slate-400">{t('tester.telemetry.actuator_state', 'Actuator state')}: <span className="text-slate-500">{t('modules.off', 'OFF')}</span></div>
      </div>
    );
  }
  return <div className="text-xs text-slate-500">{t('tester.telemetry.generic', 'Generic panel - communication + version telemetry only for this tool profile.')}</div>;
}
