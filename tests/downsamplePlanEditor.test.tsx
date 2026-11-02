// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/downsamplePlanEditor.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The tier plan editor as rendered: the plan of the data lake in a table, the problems next to the cell they belong to with Save
// disabled, a preview before the confirmation, the deletion control disabled without the option of the operator, and the plain
// sentences when the data lake does not offer the plan or the account may not use it.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { DownsamplePlanEditor } from '../src/components/DownsamplePlanEditor';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const planAnswer = (over: Record<string, unknown> = {}) => ({
  plan: { tiers: [{ kind: 'motor_temp', field: '*', raw: 172_800_000, bucket: 3_600_000 }], delete: false },
  hash: 'h1', knownKinds: ['motor_temp', 'vibration'],
  switches: { allowDelete: false, deleteRequestedByPlan: false, deleteOldSwitch: false, effectiveMode: 'dryRun', fineRollups: true, autoIntervalSeconds: 3600 },
  audit: [], ...over,
});

function serve(handler: (method: string, url: string, body: unknown) => { status: number; body: unknown }) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const answer = handler(init?.method ?? 'GET', String(input), init?.body ? JSON.parse(String(init.body)) : null);
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('DownsamplePlanEditor', () => {
  it('shows the plan of the data lake, valid and not yet changed, with Save disabled', async () => {
    serve(() => ({ status: 200, body: planAnswer() }));
    render(<DownsamplePlanEditor />);
    await waitFor(() => expect(screen.getByTestId('plan-row-0')).toBeTruthy());
    expect((screen.getByTestId('plan-row-0').querySelectorAll('input')[2] as HTMLInputElement).value).toBe('2d');
    expect(screen.getByTestId('plan-valid')).toBeTruthy();
    expect((screen.getByTestId('plan-save') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Mode now: dry run (reports, deletes nothing)')).toBeTruthy();
  });

  it('rejects an incoherent plan next to its row and keeps Save disabled', async () => {
    serve(() => ({ status: 200, body: planAnswer() }));
    render(<DownsamplePlanEditor />);
    await waitFor(() => expect(screen.getByTestId('plan-row-0')).toBeTruthy());
    const bucket = screen.getByTestId('plan-row-0').querySelectorAll('input')[3] as HTMLInputElement;
    fireEvent.change(bucket, { target: { value: '30d' } });
    const box = await screen.findByTestId('plan-issues');
    expect(box.textContent).toContain('The rollup width must not be longer than the raw time.');
    expect(bucket.getAttribute('aria-invalid')).toBe('true');
    expect((screen.getByTestId('plan-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('rejects a kind the data lake does not know', async () => {
    serve(() => ({ status: 200, body: planAnswer() }));
    render(<DownsamplePlanEditor />);
    await waitFor(() => expect(screen.getByTestId('plan-row-0')).toBeTruthy());
    fireEvent.change(screen.getByTestId('plan-row-0').querySelectorAll('input')[0], { target: { value: 'ghost' } });
    expect((await screen.findByTestId('plan-issues')).textContent).toContain('has no data and no policy');
  });

  it('previews, asks for confirmation and saves with the hash it read', async () => {
    const spy = serve((method, url) => {
      if (method === 'GET') return { status: 200, body: planAnswer() };
      if (url.includes('preview=1')) return { status: 200, body: { saved: false, hash: 'h2', mode: 'dryRun', changes: [{}], warnings: [], effects: { totals: { rawPointsToRollUp: 7, rollupsToExpire: 0, fineRollupsToExpire: 0 } } } };
      return { status: 200, body: { saved: true, hash: 'h2', mode: 'dryRun', changes: [{}], warnings: [] } };
    });
    render(<DownsamplePlanEditor />);
    await waitFor(() => expect(screen.getByTestId('plan-row-0')).toBeTruthy());
    fireEvent.change(screen.getByTestId('plan-row-0').querySelectorAll('input')[2], { target: { value: '3d' } });
    fireEvent.click(screen.getByTestId('plan-save'));
    await screen.findByText('Save the tier plan?');
    expect(screen.getAllByText(/7 raw point\(s\) to roll up/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Plan saved'));
    const put = spy.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(put).toHaveLength(2);
    const last = JSON.parse(String(put[1][1]?.body));
    expect(last.expectedHash).toBe('h1');
    expect(last.plan.tiers[0].raw).toBe('3d');
    expect(String(put[1][0])).not.toContain('preview');
  });

  it('keeps the deletion control disabled, with the reason, unless the operator allowed it', async () => {
    serve(() => ({ status: 200, body: planAnswer() }));
    render(<DownsamplePlanEditor />);
    await waitFor(() => expect(screen.getByTestId('plan-row-0')).toBeTruthy());
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(screen.getByText(/--downsample-allow-delete/, { selector: 'span' })).toBeTruthy();
  });

  it('lets an allowed operator turn deletion on, with a red warning', async () => {
    serve(() => ({ status: 200, body: planAnswer({ switches: { allowDelete: true, effectiveMode: 'dryRun', fineRollups: true } }) }));
    render(<DownsamplePlanEditor />);
    await waitFor(() => expect(screen.getByTestId('plan-row-0')).toBeTruthy());
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.disabled).toBe(false);
    fireEvent.click(box);
    expect(screen.getByText(/removed for good/)).toBeTruthy();
    expect((screen.getByTestId('plan-save') as HTMLButtonElement).disabled).toBe(false);
  });

  it('says in plain words that the data lake does not offer the plan, or that the account may not use it', async () => {
    serve(() => ({ status: 404, body: { error: 'not found' } }));
    render(<DownsamplePlanEditor />);
    expect((await screen.findByRole('alert')).textContent).toContain('--downsample-admin');
    cleanup();
    serve(() => ({ status: 403, body: { error: 'admin only' } }));
    render(<DownsamplePlanEditor />);
    expect((await screen.findByRole('alert')).textContent).toContain('Only an administrator');
  });

  it('offers to read again when somebody else saved in between', async () => {
    serve((method) => {
      if (method === 'GET') return { status: 200, body: planAnswer() };
      return { status: 409, body: { code: 'plan_changed', error: 'x', details: ['current hash zzz'] } };
    });
    render(<DownsamplePlanEditor />);
    await waitFor(() => expect(screen.getByTestId('plan-row-0')).toBeTruthy());
    fireEvent.change(screen.getByTestId('plan-row-0').querySelectorAll('input')[2], { target: { value: '3d' } });
    fireEvent.click(screen.getByTestId('plan-save'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('The plan changed since you read it');
    expect(alert.textContent).toContain('current hash zzz');
  });
});
