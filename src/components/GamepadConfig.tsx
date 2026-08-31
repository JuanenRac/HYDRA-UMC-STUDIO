// =============================================================================
// HYDRA-UMC STUDIO - React Component: GamepadConfig.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useHydraStore } from '../store';
import { useTranslation } from 'react-i18next';
import { Gamepad2 } from 'lucide-react';

/**
 * Executes the  gamepad config logic.
 * This function handles the necessary computations and state updates.
 */
export function GamepadConfig() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useHydraStore();

  const gamepadEnabled = settings.gamepadEnabled || false;
  const mapping = settings.gamepadMapping || {};

  // Real gap found live: a non-standard or low-button-count controller
  // (browsers only assign the well-known B0=A/B12=D-pad-Up/etc. layout
  // below when the Gamepad API reports mapping:"standard" - anything
  // else keeps whatever raw button order its own driver reports) had no
  // way to be identified from this screen at all - an operator plugging
  // in an unusual pad had to guess which row corresponds to which
  // physical button. This polls the real navigator.getGamepads() (same
  // per-frame approach GamepadController.tsx already uses to actually
  // drive the robot) purely to show which input is live right now, so
  // pressing a physical button visibly highlights its real row here -
  // no guessing required regardless of how many buttons the pad has or
  // whether the browser recognizes it as "standard".
  const [connectedGamepad, setConnectedGamepad] = useState<{ id: string; buttons: number; axes: number; mapping: string } | null>(null);
  const [activeInputs, setActiveInputs] = useState<Set<string>>(new Set());
  const detectRequestRef = useRef<number>(0);

  useEffect(() => {
    if (!gamepadEnabled) {
      setConnectedGamepad(null);
      setActiveInputs(new Set());
      return;
    }

    const DEADZONE = 0.3; // slightly looser than GamepadController's own
    // 0.2 - this is only ever used for a visual "is this live right now"
    // highlight, not to fire a real robot command, so a little extra
    // margin against stick drift on an unfamiliar pad is the right side
    // to err on here.

    const poll = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads.find(g => g !== null) || null;

      setConnectedGamepad(gp ? { id: gp.id, buttons: gp.buttons.length, axes: gp.axes.length, mapping: gp.mapping || t('gamepad_config.mapping_raw', 'raw (non-standard)') } : null);

      const active = new Set<string>();
      if (gp) {
        gp.buttons.forEach((b, i) => { if (b.pressed) active.add(`B${i}`); });
        gp.axes.forEach((val, i) => {
          if (val < -DEADZONE) active.add(`AXIS_${i}_NEG`);
          if (val > DEADZONE) active.add(`AXIS_${i}_POS`);
        });
      }
      setActiveInputs(active);

      detectRequestRef.current = requestAnimationFrame(poll);
    };
    detectRequestRef.current = requestAnimationFrame(poll);

    return () => {
      if (detectRequestRef.current) cancelAnimationFrame(detectRequestRef.current);
    };
  }, [gamepadEnabled, t]);

  const toggleGamepad = () => {
    updateSettings({ gamepadEnabled: !gamepadEnabled });
  };

  const updateMapping = (btn: string, action: string) => {
    updateSettings({
      gamepadMapping: {
        ...mapping,
        [btn]: action
      }
    });
  };

  const ACTIONS = [
    { value: '', label: t('gamepad_config.actions.none', 'None') },
    // Robot Selection
    ...Array.from({length: 8}, (_, i) => ({ value: `select_robot_${i+1}`, label: t('gamepad_config.actions.select_robot', 'Select Robot {{n}}', { n: i + 1 }) })),
    // Cartesian XYZ - same tool-point jog as the floating Joystick3D
    // overlay in the 3D viewport (RobotDetail.tsx), just reachable from a
    // gamepad button instead of a click. Listed before Joints: this is
    // the primary, model-agnostic way to move the tool point; J1-J6 stays
    // available right below for direct per-joint control.
    ...['X', 'Y', 'Z'].flatMap(axis => [
      { value: `${axis}+`, label: t('gamepad_config.actions.cartesian_plus', '{{axis}} +', { axis }) },
      { value: `${axis}-`, label: t('gamepad_config.actions.cartesian_minus', '{{axis}} -', { axis }) }
    ]),
    // Joints
    ...['J1', 'J2', 'J3', 'J4', 'J5', 'J6'].flatMap(j => [
      { value: `${j}+`, label: t('gamepad_config.actions.joint_plus', '{{j}} +', { j }) },
      { value: `${j}-`, label: t('gamepad_config.actions.joint_minus', '{{j}} -', { j }) }
    ]),
    // Table
    ...['TX', 'TY'].flatMap(a => [
      { value: `${a}+`, label: t('gamepad_config.actions.table_plus', 'Table {{a}} +', { a }) },
      { value: `${a}-`, label: t('gamepad_config.actions.table_minus', 'Table {{a}} -', { a }) }
    ]),
    // Controls
    { value: 'E-STOP', label: t('gamepad_config.actions.estop', 'E-STOP') },
    { value: 'E-STOP ALL', label: t('gamepad_config.actions.estop_all', 'E-STOP ALL') },
    { value: 'START', label: t('gamepad_config.actions.start', 'START') },
    { value: 'START ALL', label: t('gamepad_config.actions.start_all', 'START ALL') },
    { value: 'STOP', label: t('gamepad_config.actions.stop', 'STOP') },
    { value: 'STOP ALL', label: t('gamepad_config.actions.stop_all', 'STOP ALL') },
    { value: 'ADD POINT', label: t('gamepad_config.actions.add_point', 'ADD POINT') },
    { value: 'SPEED+', label: t('gamepad_config.actions.speed_plus', 'Speed +') },
    { value: 'SPEED-', label: t('gamepad_config.actions.speed_minus', 'Speed -') },
  ];

  const BUTTONS = [
    { id: 'B0', name: t('gamepad_config.buttons.B0', 'A / Cross') },
    { id: 'B1', name: t('gamepad_config.buttons.B1', 'B / Circle') },
    { id: 'B2', name: t('gamepad_config.buttons.B2', 'X / Square') },
    { id: 'B3', name: t('gamepad_config.buttons.B3', 'Y / Triangle') },
    { id: 'B4', name: t('gamepad_config.buttons.B4', 'LB / L1') },
    { id: 'B5', name: t('gamepad_config.buttons.B5', 'RB / R1') },
    { id: 'B6', name: t('gamepad_config.buttons.B6', 'LT / L2') },
    { id: 'B7', name: t('gamepad_config.buttons.B7', 'RT / R2') },
    { id: 'B8', name: t('gamepad_config.buttons.B8', 'Select / Share') },
    { id: 'B9', name: t('gamepad_config.buttons.B9', 'Start / Options') },
    { id: 'B10', name: t('gamepad_config.buttons.B10', 'L3 (Stick Click)') },
    { id: 'B11', name: t('gamepad_config.buttons.B11', 'R3 (Stick Click)') },
    { id: 'B12', name: t('gamepad_config.buttons.B12', 'D-Pad Up') },
    { id: 'B13', name: t('gamepad_config.buttons.B13', 'D-Pad Down') },
    { id: 'B14', name: t('gamepad_config.buttons.B14', 'D-Pad Left') },
    { id: 'B15', name: t('gamepad_config.buttons.B15', 'D-Pad Right') },
    { id: 'AXIS_0_NEG', name: t('gamepad_config.buttons.AXIS_0_NEG', 'Left Stick Left') },
    { id: 'AXIS_0_POS', name: t('gamepad_config.buttons.AXIS_0_POS', 'Left Stick Right') },
    { id: 'AXIS_1_NEG', name: t('gamepad_config.buttons.AXIS_1_NEG', 'Left Stick Up') },
    { id: 'AXIS_1_POS', name: t('gamepad_config.buttons.AXIS_1_POS', 'Left Stick Down') },
    { id: 'AXIS_2_NEG', name: t('gamepad_config.buttons.AXIS_2_NEG', 'Right Stick Left') },
    { id: 'AXIS_2_POS', name: t('gamepad_config.buttons.AXIS_2_POS', 'Right Stick Right') },
    { id: 'AXIS_3_NEG', name: t('gamepad_config.buttons.AXIS_3_NEG', 'Right Stick Up') },
    { id: 'AXIS_3_POS', name: t('gamepad_config.buttons.AXIS_3_POS', 'Right Stick Down') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Gamepad2 size={16} className="text-sky-400" /> {t('gamepad_config.title', 'Gamepad Controller')}
        </h3>
        <div className="flex items-center gap-3">
          {gamepadEnabled && (
            <select
              value={settings.gamepadConnectionType || 'USB'}
              onChange={(e) => updateSettings({ gamepadConnectionType: e.target.value as 'USB' | 'Bluetooth' })}
              className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-slate-300 outline-none"
            >
              <option value="USB">{t('gamepad_config.usb_connection', 'USB Connection')}</option>
              <option value="Bluetooth">{t('gamepad_config.bluetooth_connection', 'Bluetooth Connection')}</option>
            </select>
          )}
          <button
            onClick={toggleGamepad}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors border ${gamepadEnabled ? 'bg-sky-500/20 text-sky-400 border-sky-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
          >
            {gamepadEnabled ? t('gamepad_config.enabled', 'ENABLED') : t('gamepad_config.disabled', 'DISABLED')}
          </button>
        </div>
      </div>

      {gamepadEnabled && (
        <div className="text-xs rounded-lg border p-3 flex items-center justify-between gap-3 border-slate-800 bg-slate-900">
          {connectedGamepad ? (
            <>
              <div className="min-w-0">
                <div className="text-slate-200 font-medium truncate" title={connectedGamepad.id}>{connectedGamepad.id}</div>
                <div className="text-slate-500">
                  {t('gamepad_config.detected_info', '{{buttons}} buttons, {{axes}} axes, mapping: {{mapping}}', {
                    buttons: connectedGamepad.buttons, axes: connectedGamepad.axes, mapping: connectedGamepad.mapping,
                  })}
                </div>
              </div>
              <span className="shrink-0 px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-bold">
                {t('gamepad_config.connected', 'CONNECTED')}
              </span>
            </>
          ) : (
            <span className="text-slate-500">{t('gamepad_config.no_gamepad', 'No gamepad detected - press a button on it to wake the browser up to it.')}</span>
          )}
        </div>
      )}

      {gamepadEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-center relative min-h-[300px]">
            {/* SVG Gamepad representation */}
            <svg viewBox="0 0 400 250" className="w-full max-w-[350px] opacity-80" xmlns="http://www.w3.org/2000/svg">
              <path d="M 60 70 C 20 70 10 120 20 180 C 30 230 70 230 90 200 C 110 170 140 160 200 160 C 260 160 290 170 310 200 C 330 230 370 230 380 180 C 390 120 380 70 340 70 C 300 70 260 90 200 90 C 140 90 100 70 60 70 Z" fill="#1e293b" stroke="#334155" strokeWidth="4"/>
              
              {/* D-Pad */}
              <rect x="75" y="115" width="20" height="60" fill="#334155" rx="3"/>
              <rect x="55" y="135" width="60" height="20" fill="#334155" rx="3"/>
              
              {/* Left Stick */}
              <circle cx="130" cy="180" r="25" fill="#0f172a" stroke="#334155" strokeWidth="3"/>
              <circle cx="130" cy="180" r="15" fill="#334155"/>
              
              {/* Right Stick */}
              <circle cx="270" cy="180" r="25" fill="#0f172a" stroke="#334155" strokeWidth="3"/>
              <circle cx="270" cy="180" r="15" fill="#334155"/>
              
              {/* Action Buttons */}
              <circle cx="340" cy="120" r="12" fill="#334155"/> {/* Y */}
              <circle cx="310" cy="140" r="12" fill="#334155"/> {/* X */}
              <circle cx="370" cy="140" r="12" fill="#334155"/> {/* B */}
              <circle cx="340" cy="160" r="12" fill="#334155"/> {/* A */}

              {/* Select / Start */}
              <rect x="170" y="115" width="15" height="8" fill="#334155" rx="4"/>
              <rect x="215" y="115" width="15" height="8" fill="#334155" rx="4"/>
              
              {/* Bumpers */}
              <path d="M 60 70 Q 100 50 120 75 L 80 75 Z" fill="#334155"/>
              <path d="M 340 70 Q 300 50 280 75 L 320 75 Z" fill="#334155"/>
            </svg>
            <div className="absolute top-2 left-2 text-xs text-slate-500">{t('gamepad_config.visual_reference', 'Visual Reference')}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg overflow-y-auto max-h-[400px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="pb-2 text-slate-400 font-bold uppercase w-6"></th>
                  <th className="pb-2 text-slate-400 font-bold uppercase">{t('gamepad_config.input', 'Input')}</th>
                  <th className="pb-2 text-slate-400 font-bold uppercase">{t('gamepad_config.action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {BUTTONS.map(btn => {
                  const isLive = activeInputs.has(btn.id);
                  return (
                  <tr key={btn.id} className={isLive ? 'bg-sky-500/10' : 'hover:bg-slate-800/30'}>
                    <td className="py-2">
                      {/* Real-time "this row is live right now" dot - the
                          whole point of polling navigator.getGamepads()
                          above: an operator can physically press a button
                          on an unfamiliar/low-button-count pad and see
                          exactly which row corresponds to it, instead of
                          guessing from this fixed 16-button/4-axis list. */}
                      {isLive && <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" title={t('gamepad_config.live_now', 'Active right now')} />}
                    </td>
                    <td className={`py-2 font-medium ${isLive ? 'text-sky-300' : 'text-slate-300'}`}>{btn.name}</td>
                    <td className="py-2">
                      <select 
                        value={mapping[btn.id] || ''} 
                        onChange={(e) => updateMapping(btn.id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 outline-none focus:border-sky-500"
                      >
                        {ACTIONS.map(a => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
