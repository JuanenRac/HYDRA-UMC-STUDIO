// =============================================================================
// HYDRA-UMC STUDIO - React Component: GamepadConfig.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gamepad2 } from 'lucide-react';
import { BluetoothPairing } from './BluetoothPairing';
import { useSettingsStore } from '../storeContexts';
import { GAMEPAD_BUTTONS, activeGamepadInputs, gamepadActionSpecs, withMapping } from '../lib/moduleConfigs';

/**
 * Executes the  gamepad config logic.
 * This function handles the necessary computations and state updates.
 */
export function GamepadConfig() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();

  const gamepadEnabled = settings.gamepadEnabled || false;
  const mapping = settings.gamepadMapping || {};

  // Polls the real navigator.getGamepads() (the same per-frame approach GamepadController.tsx uses to drive the robot) purely to show which input is
  // live, so pressing a physical button highlights its row: a non-standard or low-button-count pad (the browser only assigns the standard layout when
  // the Gamepad API reports mapping:"standard") can be identified without guessing which row is which.
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

      setActiveInputs(gp ? activeGamepadInputs(gp.buttons, gp.axes, DEADZONE) : new Set<string>());

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
    updateSettings({ gamepadMapping: withMapping(mapping, btn, action) });
  };

  const ACTIONS = gamepadActionSpecs().map(spec => ({ value: spec.value, label: spec.params ? t(spec.key, spec.fallback, spec.params) : t(spec.key, spec.fallback) }));

  const BUTTONS = GAMEPAD_BUTTONS.map(button => ({ id: button.id, name: t(`gamepad_config.buttons.${button.id}`, button.fallback) }));

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

      {gamepadEnabled && (settings.gamepadConnectionType || 'USB') === 'Bluetooth' && (
        <BluetoothPairing />
      )}

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
