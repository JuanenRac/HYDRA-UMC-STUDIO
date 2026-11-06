// =============================================================================
// HYDRA-UMC STUDIO - The connection tests of the integration cards: hooks/useConnectionTests.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Moved out of Config.tsx unchanged. The result of POST /api/integrations/test-connection (a real TCP reachability probe of the server)
// per integration card; each card's result is independent of the others.
// =============================================================================
import { useState } from 'react';
import { apiUrl } from '../lib/apiBase';
import type { useSession } from '../storeContexts';

export type TestState = 'idle' | 'testing' | 'reachable' | 'unreachable';

type AuthToken = ReturnType<typeof useSession>['authToken'];

export function useConnectionTests(authToken: AuthToken) {
  // Keyed by integration name so each card's own test result is independent of the others.
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});

  const testConnection = async (key: string, ip: string, port: number) => {
    setTestStates((prev) => ({ ...prev, [key]: 'testing' }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(apiUrl('/api/integrations/test-connection'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ host: ip, port }),
      });
      const body = await res.json();
      setTestStates((prev) => ({ ...prev, [key]: res.ok && body.reachable ? 'reachable' : 'unreachable' }));
    } catch {
      // A network-level failure (server unreachable, CORS, ...) ends the same way as a real "reachable: false" from the probe.
      setTestStates((prev) => ({ ...prev, [key]: 'unreachable' }));
    }
  };

  return { testStates, testConnection };
}

export type ConnectionTests = ReturnType<typeof useConnectionTests>;
