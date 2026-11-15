// =============================================================================
// HYDRA-UMC STUDIO - The connection tests of the integration cards: hooks/useConnectionTests.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Moved out of Config.tsx unchanged. The result of POST /api/integrations/test-connection (a real TCP reachability probe of the server)
// per integration card; each card's result is independent of the others.
// =============================================================================
import { useState } from 'react';
import { makeTokenClient, settle } from '../lib/serverClient';
import type { useSession } from '../storeContexts';

export type TestState = 'idle' | 'testing' | 'reachable' | 'unreachable';

type AuthToken = ReturnType<typeof useSession>['authToken'];

export function useConnectionTests(authToken: AuthToken) {
  // Keyed by integration name so each card's own test result is independent of the others.
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});

  const testConnection = async (key: string, ip: string, port: number) => {
    setTestStates((prev) => ({ ...prev, [key]: 'testing' }));
    try {
      const { status, data } = await settle(() => makeTokenClient(authToken).postIntegrationsTestConnection({ body: { host: ip, port } }));
      if (data === null) throw new Error('no JSON');
      setTestStates((prev) => ({ ...prev, [key]: status === 200 && (data as { reachable?: boolean }).reachable ? 'reachable' : 'unreachable' }));
    } catch {
      // A network-level failure (server unreachable, CORS, ...) ends the same way as a real "reachable: false" from the probe.
      setTestStates((prev) => ({ ...prev, [key]: 'unreachable' }));
    }
  };

  return { testStates, testConnection };
}

export type ConnectionTests = ReturnType<typeof useConnectionTests>;
