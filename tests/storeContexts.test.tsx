// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/storeContexts.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import React, { useRef, useState } from 'react';
import { DOMAIN_OF, HydraStoreProviders, shallowEqual, useFleet, useSession } from '../src/storeContexts';

afterEach(cleanup);

describe('the store is cut in domains', () => {
  it('puts every field of the store in exactly one domain', () => {
    const source = readFileSync('src/store.ts', 'utf-8');
    const start = source.indexOf('export interface HydraStoreContextType');
    const body = source.slice(start, source.indexOf('\n}\n', start));
    const fields = [...body.matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
    expect(fields.length).toBeGreaterThan(30);
    for (const field of fields) expect(DOMAIN_OF[field], field).toBeDefined();
    expect(Object.keys(DOMAIN_OF).sort()).toEqual([...fields].sort());
  });

  it('compares one level by identity', () => {
    const a = { x: 1 };
    expect(shallowEqual({ a, n: 1 }, { a, n: 1 })).toBe(true);
    expect(shallowEqual({ a, n: 1 }, { a: { x: 1 }, n: 1 })).toBe(false);
    expect(shallowEqual({ n: 1 }, { n: 1, m: 2 })).toBe(false);
  });
});

describe('a component draws again only when its own domain changes', () => {
  it('leaves the session alone while the robots move, and keeps the function identities', () => {
    const draws = { session: 0, fleet: 0 };
    const seenLogin: unknown[] = [];

    function SessionReader() {
      const { authToken, login } = useSession();
      draws.session += 1;
      seenLogin.push(login);
      return <div data-testid="token">{authToken}</div>;
    }
    function FleetReader() {
      const { robots } = useFleet();
      draws.fleet += 1;
      return <div data-testid="count">{robots.length}</div>;
    }
    let addRobot: () => void = () => undefined;
    // The same elements on every render of the host, as the children of the real provider are.
    const readers = (
      <>
        <SessionReader />
        <FleetReader />
      </>
    );
    function Host() {
      const [robots, setRobots] = useState<unknown[]>([]);
      const renders = useRef(0);
      renders.current += 1;
      addRobot = () => setRobots((r) => [...r, {}]);
      // New function identities on every render, like the real provider.
      const value = { authToken: 'abc', login: async () => renders.current > 0, robots, updateRobot: () => undefined } as never;
      return (
        <HydraStoreProviders value={value}>{readers}</HydraStoreProviders>
      );
    }
    render(<Host />);
    expect(draws).toEqual({ session: 1, fleet: 1 });
    act(() => addRobot());
    act(() => addRobot());
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(screen.getByTestId('token').textContent).toBe('abc');
    expect(draws.fleet).toBe(3);
    expect(draws.session).toBe(1);
    expect(new Set(seenLogin).size).toBe(1);
  });

  it('calls the newest function through the stable wrapper', async () => {
    let call: (() => Promise<boolean>) | undefined;
    function Reader() {
      call = useSession().login as unknown as () => Promise<boolean>;
      return null;
    }
    function Host({ answer }: { answer: boolean }) {
      return (
        <HydraStoreProviders value={{ authToken: null, login: async () => answer } as never}>
          <Reader />
        </HydraStoreProviders>
      );
    }
    const { rerender } = render(<Host answer={false} />);
    const first = call;
    expect(await call?.()).toBe(false);
    rerender(<Host answer />);
    expect(call).toBe(first);
    expect(await call?.()).toBe(true);
  });
});
