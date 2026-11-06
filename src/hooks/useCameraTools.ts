// =============================================================================
// HYDRA-UMC STUDIO - The camera tools of the configuration dialog: hooks/useCameraTools.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Moved out of Config.tsx unchanged: the live status of each camera stream (polled only while the Cameras tab is open), the discovery of
// the RTSP path of an IP camera and the scan for USB cameras. The state lives in the dialog, not in the tab, so it survives a change of tab.
// =============================================================================
import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/apiBase';
import type { useFleet, useSession } from '../storeContexts';

export type CameraStreamStatus = Record<string, { status: string; lastError: string | null }>;
export type RtspDiscoverState = { phase: 'idle' | 'discovering' | 'found' | 'not-found' | 'error'; message?: string };
export type UsbDevice = { index: number; available: boolean; width: number; height: number };
export type UsbDiscoverPhase = 'idle' | 'discovering' | 'done' | 'error';

type AuthToken = ReturnType<typeof useSession>['authToken'];
type UpdateCamera = ReturnType<typeof useFleet>['updateCamera'];

export function useCameraTools(camerasTabOpen: boolean, authToken: AuthToken, updateCamera: UpdateCamera) {
  // Real per-camera stream status (GET /api/cameras/status, keyed "<controllerId>:<cameraId>") - only polled while the Cameras tab is
  // open, not continuously in the background. This is the real "did Apply work" feedback.
  const [cameraStatus, setCameraStatus] = useState<CameraStreamStatus>({});
  useEffect(() => {
    if (!camerasTabOpen) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const headers: Record<string, string> = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const res = await fetch(apiUrl('/api/cameras/status'), { headers });
        if (cancelled || !res.ok) return;
        setCameraStatus(await res.json());
      } catch {
        // A network hiccup - the next poll tick retries; one missed poll does not clear the status already shown.
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [camerasTabOpen, authToken]);

  // Real RTSP path discovery result per camera - 'idle' before the first try, then either the real discovered path or a real
  // "tried: [...]" failure, never a guess.
  const [rtspDiscoverStates, setRtspDiscoverStates] = useState<Record<number, RtspDiscoverState>>({});
  const discoverRtspPath = async (cameraId: number, host: string, port: number, username: string, password: string) => {
    if (!host.trim()) return;
    setRtspDiscoverStates((prev) => ({ ...prev, [cameraId]: { phase: 'discovering' } }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(apiUrl('/api/camera/discover-rtsp-path'), {
        method: 'POST', headers, body: JSON.stringify({ host, port, username, password }),
      });
      const body = await res.json();
      const foundPaths: string[] = Array.isArray(body.paths) ? body.paths : [];
      if (res.ok && body.ok && foundPaths.length > 0) {
        // Real streams found - never just the one: a camera can expose more than one at once (see ipStreamLabels()). The slot defaults to
        // the first (main) one; the type combobox now offers exactly as many as were found, and picking another re-points rtspPath.
        updateCamera(cameraId, { rtspPath: foundPaths[0], discoveredStreamPaths: foundPaths, type: 'IP Vision Camera Main Stream' });
        setRtspDiscoverStates((prev) => ({ ...prev, [cameraId]: { phase: 'found', message: foundPaths.join(', ') } }));
      } else {
        setRtspDiscoverStates((prev) => ({ ...prev, [cameraId]: { phase: 'not-found', message: (body.triedPaths || []).join(', ') } }));
      }
    } catch {
      setRtspDiscoverStates((prev) => ({ ...prev, [cameraId]: { phase: 'error' } }));
    }
  };

  // Real USB device discovery, shared across every camera card - one scan finds every device at once, so the result list is global;
  // picking one just fills that one card's hardwareSource field.
  const [usbDiscoverPhase, setUsbDiscoverPhase] = useState<UsbDiscoverPhase>('idle');
  const [usbDevices, setUsbDevices] = useState<UsbDevice[]>([]);
  const discoverUsbDevices = async () => {
    setUsbDiscoverPhase('discovering');
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(apiUrl('/api/camera/discover-usb-devices'), { headers });
      const body = await res.json();
      if (res.ok) {
        setUsbDevices(body.devices || []);
        setUsbDiscoverPhase('done');
      } else {
        setUsbDiscoverPhase('error');
      }
    } catch {
      setUsbDiscoverPhase('error');
    }
  };

  return { cameraStatus, rtspDiscoverStates, discoverRtspPath, usbDiscoverPhase, usbDevices, discoverUsbDevices };
}

export type CameraTools = ReturnType<typeof useCameraTools>;
