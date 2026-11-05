// =============================================================================
// HYDRA-UMC STUDIO - The settings shown before the server has answered: lib/defaultSettings.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The shared configuration the provider starts with. Moved out of the provider unchanged; a function returns a fresh
// copy each time so that no two users of it share the nested objects.
// =============================================================================
import type { SystemSettings } from '../store';

export function defaultSystemSettings(): SystemSettings {
  return {
    visibleModules: ['Vision/Cameras', 'Robots', 'Macros/Tasks', 'Node Network', 'Settings'],
    integrations: {
      openPnP: { enabled: false, ip: '192.168.1.100', port: 8080 },
      slic3r: { enabled: false, ip: '192.168.1.100', port: 8080 },
      prusaSlicer: { enabled: false, ip: '192.168.1.100', port: 8080 },
      cnc: { software: 'LinuxCNC', enabled: false, ip: '192.168.1.100', port: 8080 },
      laser: { software: 'LightBurn', enabled: false, ip: '192.168.1.100', port: 8080 },
      ros2: { enabled: false, ip: '192.168.1.100', port: 8000 },
      printer3d: { enabled: false, software: 'OrcaSlicer', ip: '192.168.1.100', port: 8080 },
    },
    customModels: [],
    modelSubmissions: {
      enabled: false,
      destinationFolder: 'models/submitted',
    },
    autoConnectRobots: false,
    theme: "HYDRA-UMC Studio Fasion",
    language: "en",
    worksPaths: {},
    canOta: {
      transport: 'mock',
      robotControllerBoardMcu: 'STM32G474RET6',
      firmwarePaths: {},
    },
    aiHailo: {
      visionDevice: 'hailo8',
      cognitiveDevice: 'none',
      modelRegistryPath: 'models/hailo',
    },
    uiLayout: {
      rightPanelWidth: 320,
      pointsTableHeight: 300,
    },
    remoteAccess: {
      enabled: true,
      suite: true,
      android: true,
      ios: true,
      watch: true,
      dsi: true,
    },
    serverName: "HYDRA-UMC TEST",
  };
}
