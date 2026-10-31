// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/ecosystemHealth.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The Ecosystem health view as rendered: one card per service with its state and versions, the filters, the notices for a certificate
// about to expire and for versions that differ, a service that does not answer next to those that do, and the plain sentences when
// the server does not offer the route or the account may not read it.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { EcosystemHealth } from '../src/components/EcosystemHealth';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const service = (over: Record<string, unknown> = {}) => ({
  name: 'HYDRA-UMC-ALPHA', family: 'hydra', role: 'service', state: 'ok', reason: 'health_ok', version_expected: '1.0.0.0', version_reported: '1.0.0.0',
  drift: false, last_seen_utc: '2030-01-01T00:00:00.000Z', latency_ms: 4, ...over,
});
const report = (services: unknown[], over: Record<string, unknown> = {}) => ({
  schema_version: '1.0', generated_at_utc: '2030-01-01T00:00:10.000Z', available: true, summary: {}, services, certificate: null, warnings: [], ...over,
});

function serve(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response));
}

const full = report(
  [
    service(),
    service({ name: 'HYDRA-UMC-BETA', state: 'degraded', reason: 'health_degraded', version_expected: '2.0.0.0', version_reported: '2.0.0.0' }),
    service({ name: 'HYDRA-UMC-GAMMA', version_expected: '3.0.1.0', version_reported: '3.0.0.0', drift: true }),
    service({ name: 'HYDRA-UMC-DEAD', state: 'down', reason: 'unreachable', version_reported: null, last_seen_utc: null, latency_ms: null }),
  ],
  {
    certificate: { state: 'expiring', not_after_utc: '2030-01-20T00:00:00.000Z', days_left: 19, warn_days: 30 },
    warnings: [{ code: 'certificate_expiring' }, { code: 'service_down', service: 'HYDRA-UMC-DEAD' }, { code: 'service_degraded', service: 'HYDRA-UMC-BETA' }, { code: 'version_drift', service: 'HYDRA-UMC-GAMMA' }],
  },
);

describe('EcosystemHealth', () => {
  it('shows a card per service, the most serious first, and a dead service does not hide the others', async () => {
    serve(200, full);
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getAllByTestId('health-card')).toHaveLength(4));
    const cards = screen.getAllByTestId('health-card');
    expect(cards.map(c => c.getAttribute('data-state'))).toEqual(['down', 'degraded', 'ok', 'ok']);
    expect(cards[0].textContent).toContain('HYDRA-UMC-DEAD');
    expect(cards[0].textContent).toContain('Does not answer');
    expect(cards[0].textContent).toContain('No answer since the server started');
    expect(cards[1].textContent).toContain('Answers, but reports itself degraded');
  });

  it('shows the expected and reported version and marks the one that differs', async () => {
    serve(200, full);
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getAllByTestId('health-card')).toHaveLength(4));
    const drifted = screen.getAllByTestId('health-card').find(c => c.textContent?.includes('HYDRA-UMC-GAMMA'))!;
    expect(drifted.textContent).toContain('Expected: 3.0.1.0');
    expect(drifted.textContent).toContain('Reports: 3.0.0.0');
    expect(screen.getAllByTestId('health-drift')).toHaveLength(1);
    const dead = screen.getAllByTestId('health-card').find(c => c.textContent?.includes('HYDRA-UMC-DEAD'))!;
    expect(dead.textContent).toContain('Reports: unknown');
  });

  it('warns of a certificate about to expire and of the services that need attention', async () => {
    serve(200, full);
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getByTestId('health-certificate')).toBeTruthy());
    expect(screen.getByTestId('health-certificate').textContent).toContain('expires in 19 days (2030-01-20)');
    const warnings = screen.getAllByTestId('health-warning').map(w => w.textContent);
    expect(warnings).toEqual([
      'HYDRA-UMC-DEAD does not answer.', 'HYDRA-UMC-BETA is degraded.', 'HYDRA-UMC-GAMMA reports a different version from its manifest.',
    ]);
  });

  it('filters by state and by version drift, with the counts on the buttons', async () => {
    serve(200, full);
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getAllByTestId('health-card')).toHaveLength(4));
    expect(screen.getByTestId('health-filter-all').textContent).toContain('(4)');
    expect(screen.getByTestId('health-filter-down').textContent).toContain('(1)');
    fireEvent.click(screen.getByTestId('health-filter-down'));
    expect(screen.getAllByTestId('health-card').map(c => c.getAttribute('data-state'))).toEqual(['down']);
    fireEvent.click(screen.getByTestId('health-filter-drift'));
    expect(screen.getAllByTestId('health-card')).toHaveLength(1);
    expect(screen.getByTestId('health-card').textContent).toContain('HYDRA-UMC-GAMMA');
    fireEvent.click(screen.getByTestId('health-filter-unknown'));
    expect(screen.queryAllByTestId('health-card')).toHaveLength(0);
    expect(screen.getByText('No service matches this filter.')).toBeTruthy();
  });

  it('says in plain words that the server does not offer it, that the account may not read it, and that nothing was found', async () => {
    serve(404, {});
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getByTestId('health-problem').textContent).toContain('does not offer the health of the ecosystem'));
    cleanup();
    serve(403, {});
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getByTestId('health-problem').textContent).toBe('Your account may not read the health of the ecosystem.'));
    cleanup();
    serve(200, report([], { available: false }));
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getByTestId('health-not-available')).toBeTruthy());
    expect(screen.getByText('No service of the ecosystem was found.')).toBeTruthy();
  });

  it('never shows a port, an address or a unit, even if the server sent them', async () => {
    serve(200, report([service({ port: 8095, health_path: '/health', systemd_unit: 'hydra-umc-alpha.service', active_state: 'active', host: '127.0.0.1' })]));
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getAllByTestId('health-card')).toHaveLength(1));
    const text = screen.getByTestId('ecosystem-health').textContent ?? '';
    for (const leak of ['8095', '/health', 'hydra-umc-alpha.service', '127.0.0.1']) expect(text).not.toContain(leak);
  });

  it('keeps the last good answer on screen when a later read fails', async () => {
    serve(200, full);
    render(<EcosystemHealth />);
    await waitFor(() => expect(screen.getAllByTestId('health-card')).toHaveLength(4));
    serve(503, {});
    fireEvent.click(screen.getByTestId('health-refresh'));
    await waitFor(() => expect(screen.getByTestId('health-problem')).toBeTruthy());
    expect(screen.getAllByTestId('health-card')).toHaveLength(4);
  });
});
