// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/historyTab.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The history tab: the connections for everyone, the audit record for administrators only, and nothing of the audit record rendered
// (or asked for) when the account is not an administrator.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { HistoryTab } from '../src/components/config/HistoryTab';

vi.mock('../src/components/ConnectionHistory', () => ({ ConnectionHistory: () => <div data-testid="connection-history" /> }));
vi.mock('../src/components/AdminAudit', () => ({ AdminAudit: () => <div data-testid="admin-audit" /> }));

afterEach(() => { cleanup(); });

function renderTab(isAdmin: boolean) {
  render(<HydraStoreProviders value={{ authToken: 'tok', isAdmin } as never}><HistoryTab /></HydraStoreProviders>);
}

describe('HistoryTab', () => {
  it('opens on the connections and lets an administrator move to the audit record', () => {
    renderTab(true);
    expect(screen.getByTestId('connection-history')).toBeTruthy();
    expect(screen.queryByTestId('admin-audit')).toBeNull();
    fireEvent.click(screen.getByTestId('history-part-audit'));
    expect(screen.getByTestId('admin-audit')).toBeTruthy();
    expect(screen.queryByTestId('connection-history')).toBeNull();
    fireEvent.click(screen.getByTestId('history-part-connections'));
    expect(screen.getByTestId('connection-history')).toBeTruthy();
  });

  it('offers only the connections, and says why, to an account that is not an administrator', () => {
    renderTab(false);
    expect(screen.getByTestId('connection-history')).toBeTruthy();
    expect(screen.queryByTestId('history-part-audit')).toBeNull();
    expect(screen.getByTestId('history-audit-admin-only')).toBeTruthy();
    expect(screen.queryByTestId('admin-audit')).toBeNull();
  });
});
