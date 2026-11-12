// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/stopStateFeed.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The one stop state: the message of the server is read only when it is complete, the feed keeps the last one, the socket routes it, and the badge beside the
// STOP button shows it (nothing before the first message, grey while the server does not watch the physical stop, in the language of the person).
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18n from '../src/i18n';
import { StopStateBadge } from '../src/components/StopAll';
import { parseStopState, publishStopStateEvent, resetStopStateFeed, stopStateSnapshot, subscribeStopState } from '../src/lib/stopStateFeed';
import { routeSocketFrame, type SocketHandlers } from '../src/lib/settingsSocket';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import italian from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import pt from '../src/locales/pt.json';
import zh from '../src/locales/zh.json';

afterEach(async () => {
  cleanup();
  resetStopStateFeed();
  await i18n.changeLanguage('en');
});

const message = (over: Record<string, unknown> = {}) => ({
  type: 'stop-state',
  schema: 2,
  state: { schema: 1, state: 'STOPPED', physical: 'latched', software: 'ready', physicalLinkOk: true, source: 'brain-telemetry', changedAt: 1234, ...over },
});

describe('reading the message', () => {
  it('takes a complete message', () => {
    expect(parseStopState(message())).toEqual({ state: 'STOPPED', physical: 'latched', software: 'ready', physicalLinkOk: true, changedAt: 1234 });
    expect(parseStopState(message({ physicalLinkOk: undefined, changedAt: undefined }))).toMatchObject({ physicalLinkOk: null, changedAt: 0 });
  });

  it('ignores every other message and every damaged one', () => {
    const damaged: unknown[] = [
      null, undefined, 3, 'stop-state', [], {}, { type: 'claims' }, { type: 'stop-state' }, { type: 'stop-state', state: 'STOPPED' }, { type: 'stop-state', state: null },
      message({ state: 'PAUSED' }), message({ physical: 'maybe' }), message({ software: 'on' }), message({ state: 7 }),
    ];
    for (const bad of damaged) {
      expect(parseStopState(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('the feed', () => {
  it('starts empty, keeps the last state, tells whoever listens and stops telling after the unsubscribe', () => {
    expect(stopStateSnapshot()).toBeNull();
    const listener = vi.fn();
    const stop = subscribeStopState(listener);
    expect(publishStopStateEvent(message())).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(stopStateSnapshot()?.state).toBe('STOPPED');
    expect(stopStateSnapshot()).toBe(stopStateSnapshot());
    expect(publishStopStateEvent(message({ state: 'READY', physical: 'ready' }))).toBe(true);
    expect(stopStateSnapshot()?.state).toBe('READY');
    stop();
    publishStopStateEvent(message());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('a damaged message leaves the last state as it was', () => {
    publishStopStateEvent(message());
    expect(publishStopStateEvent(message({ state: 'PAUSED' }))).toBe(false);
    expect(stopStateSnapshot()?.state).toBe('STOPPED');
  });

  it('is routed by the socket and never reaches the other handlers', () => {
    const handlers = { applyRobotDelta: vi.fn(), applyServerData: vi.fn(), publishClaims: vi.fn(), setCanotaProgress: vi.fn(), publishStopState: vi.fn() } satisfies SocketHandlers;
    routeSocketFrame(JSON.stringify(message()), handlers);
    expect(handlers.publishStopState).toHaveBeenCalledTimes(1);
    expect(handlers.publishStopState.mock.calls[0][0].state.state).toBe('STOPPED');
    expect(handlers.applyServerData).not.toHaveBeenCalled();
    expect(handlers.publishClaims).not.toHaveBeenCalled();
    routeSocketFrame('not json', handlers);
    expect(handlers.publishStopState).toHaveBeenCalledTimes(1);
  });
});

describe('the badge', () => {
  it('draws nothing before the server has said anything', () => {
    render(<StopStateBadge />);
    expect(screen.queryByTestId('stop-state-badge')).toBeNull();
  });

  it('shows each state with its own marker and explains both stops in the tooltip', () => {
    render(<StopStateBadge />);
    act(() => { publishStopStateEvent(message()); });
    const badge = screen.getByTestId('stop-state-badge');
    expect(badge.getAttribute('data-state')).toBe('STOPPED');
    expect(badge.textContent).toBe('STOPPED');
    expect(badge.getAttribute('title')).toBe('Physical emergency stop: latched - global stop: off');
    act(() => { publishStopStateEvent(message({ state: 'READY', physical: 'ready', software: 'ready' })); });
    expect(screen.getByTestId('stop-state-badge').textContent).toBe('Ready');
    expect(screen.getByTestId('stop-state-badge').getAttribute('title')).toBe('Physical emergency stop: released - global stop: off');
    act(() => { publishStopStateEvent(message({ state: 'UNKNOWN', physical: 'unknown', software: 'ready' })); });
    expect(screen.getByTestId('stop-state-badge').textContent).toBe('Stop not monitored');
    act(() => { publishStopStateEvent(message({ state: 'STOPPED', physical: 'unknown', software: 'stopped' })); });
    expect(screen.getByTestId('stop-state-badge').getAttribute('title')).toBe('Physical emergency stop: not monitored - global stop: on');
  });

  it('has its words in the language of the person', () => {
    expect(es.stop_all.state_stopped).toBe('PARADA');
    expect(es.stop_all.badge_tooltip).toBe('Parada de emergencia física: {{physical}} - parada global: {{software}}');
    expect(de.stop_all.state_unknown).toBe('Stopp nicht überwacht');
  });
});

describe('the eight languages', () => {
  it('every language has every key, and the tooltip keeps both placeholders', () => {
    const keys = ['state_stopped', 'state_ready', 'state_unknown', 'badge_tooltip', 'physical_latched', 'physical_ready', 'physical_unknown', 'software_stopped', 'software_ready'];
    for (const [name, locale] of Object.entries({ en, es, de, fr, it: italian, ja, pt, zh })) {
      const block = (locale as unknown as { stop_all: Record<string, string> }).stop_all;
      for (const key of keys) expect(typeof block[key] === 'string' && block[key].length > 0, `${name}: ${key}`).toBe(true);
      expect(block.badge_tooltip, name).toContain('{{physical}}');
      expect(block.badge_tooltip, name).toContain('{{software}}');
    }
  });
});
