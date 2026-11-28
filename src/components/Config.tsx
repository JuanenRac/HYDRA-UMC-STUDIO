// =============================================================================
// HYDRA-UMC STUDIO - System Configuration Dialog: Config.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// Lives as its own module, separate from Dashboard.tsx, so it can evolve on
// its own without risking the rest of the shell. configTab lives here since nothing
// outside this modal ever reads it. Each tab is its own component in components/config/; the
// state that has to survive a change of tab (the camera tools and the connection tests) lives here.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, RefreshCw } from 'lucide-react';
import { UsersPanel } from './UsersPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { useFleet, useSession, useSettingsStore } from '../storeContexts';
import { useCameraTools } from '../hooks/useCameraTools';
import { useConnectionTests } from '../hooks/useConnectionTests';
import { cn } from './robotDetail/shared';
import { IdentityTab } from './config/IdentityTab';
import { ControllersTab } from './config/ControllersTab';
import { UiTab } from './config/UiTab';
import { RobotsTab } from './config/RobotsTab';
import { CamerasTab } from './config/CamerasTab';
import { ModelsTab } from './config/ModelsTab';
import { IntegrationsTab } from './config/IntegrationsTab';
import { RemoteAccessTab } from './config/RemoteAccessTab';
import { PathsTab } from './config/PathsTab';
import { CanOtaTab } from './config/CanOtaTab';
import { AiHailoTab } from './config/AiHailoTab';
import { UpdatesTab } from './config/UpdatesTab';
import { HistoryTab } from './config/HistoryTab';
import { NotificationsTab } from './config/NotificationsTab';
import { PreferencesTab } from './config/PreferencesTab';
import { RemoteAccessSetupTab } from './config/RemoteAccessSetupTab';
import { InstallationTab } from './config/InstallationTab';
import { SecurityTab } from './config/SecurityTab';

const GamepadConfig = React.lazy(() => import('./GamepadConfig').then(m => ({ default: m.GamepadConfig })));

function PanelLoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
      <RefreshCw size={18} className="animate-spin mr-2" /> {t('common.loading')}
    </div>
  );
}

type ConfigTab = 'identity' | 'controllers' | 'ui' | 'robots' | 'cameras' | 'models' | 'integrations' | 'remoteaccess' | 'users' | 'paths' | 'canota' | 'aihailo' | 'gamepad' | 'updates' | 'security' | 'installation' | 'remotesetup' | 'preferences' | 'notifications' | 'history';

/** The four groups of the configuration as a screen. A tab listed after "+" shares the button of the one before it. */
export const CONFIG_GROUPS: ReadonlyArray<{ id: string; tabs: ReadonlyArray<ConfigTab | readonly [ConfigTab, ConfigTab]> }> = [
  { id: 'mine', tabs: ['ui', 'preferences', 'gamepad'] },
  { id: 'people', tabs: ['users', 'security', 'notifications', ['remoteaccess', 'remotesetup']] },
  { id: 'cell', tabs: ['identity', 'controllers', 'robots', 'cameras', 'models', 'paths', 'aihailo', 'integrations'] },
  { id: 'system', tabs: ['updates', 'canota', 'installation', 'history'] },
];

/** `window`: over the dashboard, closed with a button (the classic menu). `screen`: a screen of its own, with its tabs in groups. */
export function Config({ onClose = () => undefined, variant = 'window' }: { onClose?: () => void; variant?: 'window' | 'screen' }) {
  const { t } = useTranslation();
  const [confirmHardwareTransport, setConfirmHardwareTransport] = useState(false);
  const { authToken } = useSession();
  const { settings, updateSettings } = useSettingsStore();
  const { factoryReset, updateCamera } = useFleet();
  const [configTab, setConfigTab] = useState<ConfigTab>('identity');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // The camera tools (the stream status polled only while the Cameras tab is open, the RTSP and USB discovery) and the connection
  // tests of the integration cards keep their state here, so a change of tab does not lose it.
  const cameraTools = useCameraTools(configTab === 'cameras', authToken, updateCamera);
  const connectionTests = useConnectionTests(authToken);

  const tabs: { id: ConfigTab, label: string }[] = [
    { id: 'identity', label: t('config.identity') },
    { id: 'controllers', label: t('common.controllers') },
    { id: 'ui', label: t('config.ui_themes') },
    { id: 'robots', label: t('config.robot_names') },
    { id: 'cameras', label: t('config.camera_setup') },
    { id: 'models', label: t('config.custom_models') },
    { id: 'integrations', label: t('config.integrations') },
    { id: 'remoteaccess', label: t('config.remote_access_tab') },
    { id: 'users', label: t('common.users') },
    { id: 'paths', label: t('config.paths') },
    { id: 'canota', label: t('config.can_ota') },
    { id: 'aihailo', label: t('config.ai_hailo') },
    { id: 'gamepad', label: t('config.gamepad') },
    { id: 'updates', label: t('config.updates') },
    { id: 'security', label: t('config.security_tab') },
    { id: 'installation', label: t('config.installation') },
    { id: 'remotesetup', label: t('config.remote_setup_tab') },
    { id: 'preferences', label: t('config.preferences') },
    { id: 'notifications', label: t('config.notifications') },
    { id: 'history', label: t('config.history') },
  ];

  const content = (
    <div className="flex-1 min-w-0 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
      {configTab === 'identity' && <IdentityTab />}

      {configTab === 'controllers' && <ControllersTab />}

      {configTab === 'ui' && <UiTab />}

      {configTab === 'robots' && <RobotsTab />}

      {configTab === 'cameras' && <CamerasTab tools={cameraTools} />}

      {configTab === 'models' && <ModelsTab />}

      {configTab === 'integrations' && <IntegrationsTab tests={connectionTests} />}

      {configTab === 'remoteaccess' && <RemoteAccessTab />}

      {configTab === 'users' && <UsersPanel />}

      {configTab === 'paths' && <PathsTab />}

      {configTab === 'canota' && <CanOtaTab onChooseHardware={() => setConfirmHardwareTransport(true)} />}

      {configTab === 'aihailo' && <AiHailoTab />}

      {configTab === 'updates' && <UpdatesTab />}

      {configTab === 'security' && <SecurityTab />}

      {configTab === 'installation' && <InstallationTab />}

      {configTab === 'remotesetup' && <RemoteAccessSetupTab />}

      {configTab === 'preferences' && <PreferencesTab />}

      {configTab === 'notifications' && <NotificationsTab />}

      {configTab === 'history' && <HistoryTab />}

      {configTab === 'gamepad' && (
        <div className="animate-in zoom-in-95 fade-in duration-500">
          <React.Suspense fallback={<PanelLoadingFallback />}><GamepadConfig /></React.Suspense>
        </div>
      )}
    </div>
  );
  const dialogs = (
    <>
      <ConfirmDialog
        open={confirmHardwareTransport}
        message={t('config.confirm_hardware_transport')}
        onConfirm={() => {
          updateSettings({ canOta: { ...(settings.canOta ?? { transport: 'mock' }), transport: 'hardware' } });
          setConfirmHardwareTransport(false);
        }}
        onCancel={() => setConfirmHardwareTransport(false)}
      />
      <ConfirmDialog
        open={showResetConfirm}
        message={t('config.reset_confirm')}
        onConfirm={() => { setShowResetConfirm(false); factoryReset(); }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
  const factoryButton = (
    <button onClick={() => setShowResetConfirm(true)} className="w-full min-h-11 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><RefreshCw size={14} /> {t('config.factory_reset_upper')}</button>
  );

  if (variant === 'screen') {
    const label = (id: ConfigTab) => tabs.find((tab) => tab.id === id)!.label;
    const button = (active: boolean) => cn("w-full shrink-0 min-h-11 px-3 rounded-xl border text-left text-sm font-semibold transition-colors", active ? "bg-sky-500 border-sky-300 text-slate-950" : "border-transparent text-slate-400 hover:bg-slate-800");
    const pair = CONFIG_GROUPS.flatMap((group) => group.tabs).find((item): item is readonly [ConfigTab, ConfigTab] => typeof item !== 'string' && item.includes(configTab));
    return (
      <div data-testid="config-screen" className="w-full h-full min-h-0 flex rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
        <div className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-2">
          {CONFIG_GROUPS.map((group) => (
            <div key={group.id} role="group" aria-label={t(`nav.settings_${group.id}`)} className="shrink-0 flex flex-col pb-2">
              <div className="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{t(`nav.settings_${group.id}`)}</div>
              {group.tabs.map((item) => {
                const ids: readonly ConfigTab[] = typeof item === 'string' ? [item] : item;
                const active = ids.includes(configTab);
                return (
                  <button key={ids[0]} data-config-tab={ids[0]} aria-current={active ? 'page' : undefined} onClick={() => { if (!active) setConfigTab(ids[0]!); }} className={button(active)}>{label(ids[0]!)}</button>
                );
              })}
            </div>
          ))}
          <div className="mt-auto shrink-0 border-t border-slate-800 pt-3 p-2">{factoryButton}</div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          {pair && (
            <div role="group" aria-label={label(pair[0])} className="shrink-0 flex gap-2 px-6 pt-4">
              {pair.map((id) => (
                <button key={id} data-config-tab={id} aria-pressed={configTab === id} onClick={() => setConfigTab(id)} className={cn(button(configTab === id), "w-auto")}>{label(id)}</button>
              ))}
            </div>
          )}
          {content}
        </div>
        {dialogs}
      </div>
    );
  }

  return (
    <div data-stop-clear className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[850px] max-w-full overflow-hidden flex flex-col h-250 max-h-full">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2"><Settings className="text-sky-400" size={20} /> {t('config.title')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1" aria-label={t('dashboard.close', 'Close')}>&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-52 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setConfigTab(tab.id)} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-widest text-left transition-colors", configTab === tab.id ? 'bg-slate-800 text-sky-400 border-l-2 border-sky-400' : 'text-slate-500 hover:bg-slate-900')}>{tab.label}</button>
            ))}
            <div className="mt-auto border-t border-slate-800 p-4">
              {factoryButton}
            </div>
          </div>

          {content}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950 shrink-0">
          <button onClick={onClose} className="px-12 py-3 text-sm bg-sky-500 text-slate-950 font-black rounded-xl shadow-[0_0_30px_rgba(0,229,255,0.4)] border border-sky-400 uppercase hover:bg-sky-400 transition-all tracking-[0.2em]">{t('config.commit_close')}</button>
        </div>
      </div>
      {dialogs}
    </div>
  );
}
