// =============================================================================
// HYDRA-UMC STUDIO - the store split by domain: storeContexts.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The provider keeps one big value (store.ts, HydraStoreContextType), and every component that read any part of it
// drew again whenever any part changed: a robot joint moving 20 times a second redrew the login gate. Here the value
// is cut in five domains, each with its own context and hook:
//   session   - who is signed in (token, role, login, logout);
//   feedback  - what the last command and the global stop answered;
//   status    - the link with the server (reachable, save errors, progress of the CAN flasher, cleared log);
//   settings  - the settings of the system and their save;
//   fleet     - controllers, robots, cameras and what changes them.
// The functions of the value are handed out as stable wrappers (same identity for the life of the provider, always
// calling the newest function), and a domain keeps its object while none of its fields changed, so a component that
// reads one domain draws again only when that domain changes. useHydraStore() still gives the whole value for the few
// screens that need several domains.
// =============================================================================
import React, { createContext, useContext, useMemo, useRef } from 'react';
import { HydraContext, type HydraStoreContextType } from './store';

type Store = HydraStoreContextType;

export const SESSION_KEYS = ['authToken', 'role', 'isAdmin', 'login', 'logout', 'loginError', 'loginNeedsCode'] as const;
export const FEEDBACK_KEYS = ['commandIssue', 'dismissCommandIssue', 'reportCommandIssue', 'stopAllReport', 'dismissStopAllReport', 'stopAllPending', 'emergencyStop'] as const;
export const STATUS_KEYS = ['serverReachable', 'settingsSaveError', 'settingsLocalOnly', 'settingsLoadError', 'canotaProgress', 'logsClearedAt', 'setLogsClearedAt'] as const;
export const SETTINGS_KEYS = ['settings', 'updateSettings', 'flushSettingsSave'] as const;
export const FLEET_KEYS = [
  'controllers', 'activeControllerId', 'activeController', 'setActiveControllerId', 'robots', 'cameras', 'updateController', 'updateRobot',
  'setRobotJoints', 'sendRobotCommand', 'refreshRobotFromServer', 'updateCamera', 'addController', 'removeController', 'saveKinematics',
  'loadKinematics', 'exportScene', 'importScene', 'factoryReset',
] as const;

export type SessionStore = Pick<Store, (typeof SESSION_KEYS)[number]>;
export type FeedbackStore = Pick<Store, (typeof FEEDBACK_KEYS)[number]>;
export type StatusStore = Pick<Store, (typeof STATUS_KEYS)[number]>;
export type SettingsStore = Pick<Store, (typeof SETTINGS_KEYS)[number]>;
export type FleetStore = Pick<Store, (typeof FLEET_KEYS)[number]>;

export type Domain = 'session' | 'feedback' | 'status' | 'settings' | 'fleet';

/** The domain every key of the whole value belongs to. */
export const DOMAIN_OF: Record<string, Domain> = Object.fromEntries([
  ...SESSION_KEYS.map((k) => [k, 'session']),
  ...FEEDBACK_KEYS.map((k) => [k, 'feedback']),
  ...STATUS_KEYS.map((k) => [k, 'status']),
  ...SETTINGS_KEYS.map((k) => [k, 'settings']),
  ...FLEET_KEYS.map((k) => [k, 'fleet']),
]);

/** Whether two objects hold the same values under the same keys (identity comparison, one level). */
export function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && Object.is(a[k], b[k]));
}

/**
 * The part of `source` named by `keys`, keeping the previous object while nothing in it changed. Functions are
 * replaced by wrappers that keep their identity and call the newest function of the latest source, so they never
 * make the object change.
 */
export function useDomainValue<T extends object>(source: Record<string, unknown>, keys: readonly string[]): T {
  const latest = useRef(source);
  latest.current = source;
  const wrappers = useRef(new Map<string, (...args: unknown[]) => unknown>());
  const previous = useRef<Record<string, unknown> | null>(null);
  const next: Record<string, unknown> = {};
  for (const k of keys) {
    const v = source[k];
    if (typeof v === 'function') {
      let wrapper = wrappers.current.get(k);
      if (!wrapper) {
        wrapper = (...args: unknown[]) => (latest.current[k] as (...a: unknown[]) => unknown)(...args);
        wrappers.current.set(k, wrapper);
      }
      next[k] = wrapper;
    } else next[k] = v;
  }
  if (previous.current && shallowEqual(previous.current, next)) return previous.current as T;
  previous.current = next;
  return next as T;
}

const SessionContext = createContext<SessionStore | null>(null);
const FeedbackContext = createContext<FeedbackStore | null>(null);
const StatusContext = createContext<StatusStore | null>(null);
const SettingsContext = createContext<SettingsStore | null>(null);
const FleetContext = createContext<FleetStore | null>(null);

/**
 * Provides the whole value (useHydraStore) and its five domains. `value` may be partial in a test: a domain then holds
 * what the test gave.
 */
export function HydraStoreProviders({ value, children }: { value: Store; children: React.ReactNode }) {
  const source = value as unknown as Record<string, unknown>;
  const session = useDomainValue<SessionStore>(source, SESSION_KEYS);
  const feedback = useDomainValue<FeedbackStore>(source, FEEDBACK_KEYS);
  const status = useDomainValue<StatusStore>(source, STATUS_KEYS);
  const settings = useDomainValue<SettingsStore>(source, SETTINGS_KEYS);
  const fleet = useDomainValue<FleetStore>(source, FLEET_KEYS);
  // The whole value is only worth building for the components that still ask for it.
  const whole = useMemo(() => ({ ...fleet, ...session, ...feedback, ...status, ...settings }) as Store, [fleet, session, feedback, status, settings]);
  return (
    <HydraContext.Provider value={whole}>
      <SessionContext.Provider value={session}>
        <FeedbackContext.Provider value={feedback}>
          <StatusContext.Provider value={status}>
            <SettingsContext.Provider value={settings}>
              <FleetContext.Provider value={fleet}>{children}</FleetContext.Provider>
            </SettingsContext.Provider>
          </StatusContext.Provider>
        </FeedbackContext.Provider>
      </SessionContext.Provider>
    </HydraContext.Provider>
  );
}

function need<T>(ctx: T | null, hook: string): T {
  if (!ctx) throw new Error(`${hook} must be used within HydraProvider`);
  return ctx;
}

export const useSession = (): SessionStore => need(useContext(SessionContext), 'useSession');
export const useCommandFeedback = (): FeedbackStore => need(useContext(FeedbackContext), 'useCommandFeedback');
export const useServerStatus = (): StatusStore => need(useContext(StatusContext), 'useServerStatus');
export const useSettingsStore = (): SettingsStore => need(useContext(SettingsContext), 'useSettingsStore');
export const useFleet = (): FleetStore => need(useContext(FleetContext), 'useFleet');
