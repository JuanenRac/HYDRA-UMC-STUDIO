// =============================================================================
// HYDRA-UMC STUDIO - tests/csp.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { defaultCsp, injectCsp, resolveCsp } from '../scripts/csp';

describe('the Content-Security-Policy of the built page', () => {
  it('only lets scripts come from the page itself, never inline and never from a third-party host', () => {
    const policy = defaultCsp();
    const script = policy.split('; ').find((d) => d.startsWith('script-src '))!;
    expect(script).toContain("'self'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script).not.toContain('gstatic');
    expect(script).not.toMatch(/https?:/);
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
  });
  it('lets the page connect to itself and to the GitHub hosts of the firmware update, and to nothing else', () => {
    const connect = defaultCsp().split('; ').find((d) => d.startsWith('connect-src '))!;
    expect(connect).toBe("connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://objects.githubusercontent.com https://release-assets.githubusercontent.com blob: data:");
    for (const wide of [' http:', ' https:', ' ws:', ' wss:', ' *']) expect(connect.endsWith(wide) || connect.includes(wide + ' ')).toBe(false);
  });
  it('adds the server of the build and its WebSocket, and ignores an address that is not http(s)', () => {
    const connect = (apiBase?: string) => defaultCsp(apiBase).split('; ').find((d) => d.startsWith('connect-src '))!;
    expect(connect('https://hydra.example:3443/api')).toContain('https://hydra.example:3443 wss://hydra.example:3443');
    expect(connect('http://10.0.0.5:3000')).toContain('http://10.0.0.5:3000 ws://10.0.0.5:3000');
    expect(connect('javascript:alert(1)')).toBe(connect(undefined));
    expect(connect('not an address')).toBe(connect(undefined));
    expect(resolveCsp('default', 'https://hydra.example:3443')).toContain('wss://hydra.example:3443');
  });
  it('is the default for an unset or "default" setting, absent for "off", and used as typed otherwise', () => {
    expect(resolveCsp(undefined)).toBe(defaultCsp());
    expect(resolveCsp('  Default ')).toBe(defaultCsp());
    expect(resolveCsp('off')).toBeNull();
    expect(resolveCsp("default-src 'none'")).toBe("default-src 'none'");
  });
  it('goes into the page as a meta tag, once, and not at all when there is no policy', () => {
    const html = '<!doctype html>\n<html>\n  <head>\n    <title>x</title>\n  </head>\n</html>';
    const out = injectCsp(html, "default-src 'self'");
    expect(out).toContain('<meta http-equiv="Content-Security-Policy" content="default-src \'self\'" />');
    expect(injectCsp(out, "default-src 'none'")).toBe(out);
    expect(injectCsp(html, null)).toBe(html);
  });
  it('escapes quotes in a custom policy', () => {
    expect(injectCsp('<head></head>', 'a "b"')).toContain('content="a &quot;b&quot;"');
  });
});
