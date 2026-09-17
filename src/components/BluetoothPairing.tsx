// =============================================================================
// HYDRA-UMC STUDIO - React Component: BluetoothPairing.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Real Bluetooth pairing for the CM5 itself, not the operator's own
// browser/PC. GamepadConfig.tsx's own navigator.getGamepads() poll only
// ever sees a gamepad connected to whichever machine is RUNNING the
// browser - pairing a gamepad directly to the CM5's own Bluetooth radio
// (so it works locally on the device, with no browser/PC in the loop at
// all) needs a real, privileged, server-side action instead. This panel
// drives HYDRA-UMC-SERVER's own admin-gated POST /api/system/bluetooth/*
// routes (scan/pair/power), which shell out to a real `bluetoothctl` on
// the CM5 itself - never a simulated or client-side-only pairing flow.
//
// Admin-only (same tier as EcosystemServices.tsx's own service controls):
// pairing a physical Bluetooth device to the host is a real system
// action, not a per-operator preference.

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bluetooth, BluetoothConnected, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { apiUrl } from '../lib/apiBase';
import { useHydraStore } from '../store';

interface BluetoothDeviceInfo {
  mac: string;
  name: string;
  icon: string | null;
  paired: boolean;
  bonded: boolean;
  connected: boolean;
  trusted: boolean;
}

type PanelStatus = 'idle' | 'scanning' | 'pairing';

export function BluetoothPairing() {
  const { t } = useTranslation();
  const { authToken, isAdmin } = useHydraStore();

  const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [actioningMac, setActioningMac] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }, [authToken]);

  // Real POST /scan: powers the adapter on first (a device that never
  // asked to be discoverable answers nothing either way, so this is
  // always safe to call), then runs a real ~10s bluetoothctl discovery
  // window on the CM5 itself before returning whatever it actually found
  // - never a cached or simulated list.
  const scan = useCallback(async () => {
    setStatus('scanning');
    setError(null);
    try {
      await fetch(apiUrl('/api/system/bluetooth/power'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ on: true }),
      });
      const res = await fetch(apiUrl('/api/system/bluetooth/scan'), { method: 'POST', headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('bluetooth_pairing.scan_error', 'Bluetooth scan failed.'));
        return;
      }
      setDevices(data.devices || []);
      setHasScanned(true);
    } catch {
      setError(t('bluetooth_pairing.scan_error', 'Bluetooth scan failed.'));
    } finally {
      setStatus('idle');
    }
  }, [authHeaders, t]);

  // Real POST /pair: pair + trust + connect, all on the CM5 itself - see
  // server.ts's own header comment for the real handshake order and the
  // real ClassicBondedOnly gap this closes. Re-scans on success so this
  // device's own real paired/bonded/connected flags are shown immediately,
  // not assumed.
  const pair = useCallback(async (mac: string) => {
    setActioningMac(mac);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/system/bluetooth/pair'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('bluetooth_pairing.pair_error', 'Could not pair with {{name}}.', { name: mac }));
        return;
      }
      await scan();
    } catch {
      setError(t('bluetooth_pairing.pair_error', 'Could not pair with {{name}}.', { name: mac }));
    } finally {
      setActioningMac(null);
    }
  }, [authHeaders, scan, t]);

  const forget = useCallback(async (mac: string) => {
    setActioningMac(mac);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/system/bluetooth/remove'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('bluetooth_pairing.forget_error', 'Could not remove {{name}}.', { name: mac }));
        return;
      }
      await scan();
    } catch {
      setError(t('bluetooth_pairing.forget_error', 'Could not remove {{name}}.', { name: mac }));
    } finally {
      setActioningMac(null);
    }
  }, [authHeaders, scan, t]);

  if (!isAdmin) {
    return (
      <div className="text-xs rounded-lg border p-3 border-slate-800 bg-slate-900 text-slate-500">
        {t('bluetooth_pairing.admin_only', 'Pairing a Bluetooth device to this CM5 requires an administrator account.')}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Bluetooth size={14} className="text-sky-400" />
          {t('bluetooth_pairing.title', 'Pair a Bluetooth device to this CM5')}
        </h4>
        <button
          onClick={scan}
          disabled={status === 'scanning'}
          className="px-3 py-1 rounded text-xs font-bold border bg-sky-500/20 text-sky-400 border-sky-500/50 disabled:opacity-50 flex items-center gap-1.5"
        >
          {status === 'scanning'
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCw size={12} />}
          {status === 'scanning'
            ? t('bluetooth_pairing.scanning', 'Scanning…')
            : t('bluetooth_pairing.scan', 'Scan for devices')}
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        {t(
          'bluetooth_pairing.hint',
          'Put your gamepad in pairing mode first (hold its Bluetooth/sync button until it flashes), then scan. This pairs the device directly to this CM5, independent of whichever computer is viewing this page.',
        )}
      </p>

      {error && (
        <div className="text-xs rounded border border-red-500/50 bg-red-500/10 text-red-400 p-2">{error}</div>
      )}

      {hasScanned && devices.length === 0 && status !== 'scanning' && (
        <div className="text-xs text-slate-500">{t('bluetooth_pairing.no_devices', 'No devices found - make sure the device is in pairing mode and try again.')}</div>
      )}

      {devices.length > 0 && (
        <ul className="space-y-2">
          {devices.map((device) => (
            <li
              key={device.mac}
              className="flex items-center justify-between gap-3 text-xs rounded border border-slate-800 bg-slate-950 p-2"
            >
              <div className="min-w-0">
                <div className="text-slate-200 font-medium truncate">{device.name}</div>
                <div className="text-slate-500 font-mono">{device.mac}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {device.bonded && device.connected ? (
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-bold flex items-center gap-1">
                    <BluetoothConnected size={12} />
                    {t('bluetooth_pairing.connected', 'CONNECTED')}
                  </span>
                ) : (
                  <button
                    onClick={() => pair(device.mac)}
                    disabled={actioningMac === device.mac}
                    className="px-2 py-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/50 font-bold disabled:opacity-50 flex items-center gap-1"
                  >
                    {actioningMac === device.mac
                      ? <Loader2 size={12} className="animate-spin" />
                      : null}
                    {t('bluetooth_pairing.pair', 'Pair')}
                  </button>
                )}
                {device.paired && (
                  <button
                    onClick={() => forget(device.mac)}
                    disabled={actioningMac === device.mac}
                    title={t('bluetooth_pairing.forget', 'Forget this device')}
                    className="p-1.5 rounded bg-slate-800 text-slate-400 border border-slate-700 disabled:opacity-50 hover:text-red-400 hover:border-red-500/50"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
