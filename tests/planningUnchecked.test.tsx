// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/planningUnchecked.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The kinematic check of a plan can answer `unchecked` (part of it, such as the orientation of the tool, is not shown): the screen must
// say so and must never paint it as an acceptance. How the answer is read, and the screen, in the eight languages.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { EcosystemPlanning } from '../src/components/EcosystemPlanning';
import { checkTrajectory, parseSimulation } from '../src/lib/planningApi';
import en from '../src/locales/en.json';
import es from '../src/locales/es.json';
import de from '../src/locales/de.json';
import fr from '../src/locales/fr.json';
import itLocale from '../src/locales/it.json';
import ja from '../src/locales/ja.json';
import zh from '../src/locales/zh.json';
import pt from '../src/locales/pt.json';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const UNCHECKED = {
  verdict: 'unchecked', executable: false, executed: false, violations: [], timeline: [],
  unchecked: [{ rule: 'orientation_unchecked', step_index: 0, step_id: 'a', message: 'the orientation asked for at bin is not shown to be reachable' }],
};

function answerWith(status: number, body: unknown) {
  const spy = vi.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => body, headers: new Headers() }));
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('reading the answer of the kinematic check', () => {
  it('reads an unchecked verdict with what was not shown', () => {
    const read = parseSimulation(UNCHECKED);
    expect(read?.verdict).toBe('unchecked');
    expect(read?.unchecked).toEqual([{ rule: 'orientation_unchecked', stepId: 'a', message: 'the orientation asked for at bin is not shown to be reachable', suggestion: null }]);
  });

  it('refuses an acceptance that lists something unchecked, and an unchecked that lists nothing or a broken limit', () => {
    expect(parseSimulation({ ...UNCHECKED, verdict: 'accepted' })).toBeNull();
    expect(parseSimulation({ ...UNCHECKED, unchecked: [] })).toBeNull();
    expect(parseSimulation({ ...UNCHECKED, violations: [{ rule: 'trajectory_limit', message: 'over' }] })).toBeNull();
  });

  it('asks the relay of the planner for the trajectory check', async () => {
    const spy = answerWith(200, UNCHECKED);
    const result = await checkTrajectory({ steps: [{}] });
    expect(result.ok && result.value.verdict).toBe('unchecked');
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain('/api/ai/semantic-planner/plan/trajectory-check');
    expect(init.method).toBe('POST');
  });

  it('says it is off when the route is not there', async () => {
    answerWith(404, {});
    expect(await checkTrajectory({ steps: [{}] })).toMatchObject({ ok: false, failure: 'off' });
  });
});

describe('the planning screen', () => {
  it('paints unchecked as neither accepted nor rejected and lists what was not shown', async () => {
    answerWith(200, UNCHECKED);
    render(<EcosystemPlanning />);
    fireEvent.click(screen.getByTestId('plan-trajectory-run'));
    const verdict = await waitFor(() => screen.getByTestId('plan-verdict'));
    expect(verdict.getAttribute('data-verdict')).toBe('unchecked');
    expect(verdict.className).toContain('amber');
    expect(verdict.textContent).toBe(en.ecosystem.planning_sim_unchecked);
    expect(screen.getByTestId('plan-unchecked').textContent).toContain('orientation_unchecked');
  });

  it('has the new texts in the eight languages', () => {
    for (const locale of [en, es, de, fr, itLocale, ja, zh, pt]) {
      for (const key of ['planning_sim_unchecked', 'planning_sim_unchecked_list', 'planning_traj_run', 'planning_traj_help'] as const) {
        expect(typeof locale.ecosystem[key]).toBe('string');
        expect(locale.ecosystem[key].length).toBeGreaterThan(1);
      }
    }
  });
});
