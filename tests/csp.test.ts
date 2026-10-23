// =============================================================================
// HYDRA-UMC STUDIO - tests/csp.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { defaultCsp, injectCsp, resolveCsp } from '../scripts/csp';

describe('the Content-Security-Policy of the built page', () => {
  it('only lets scripts come from the page itself (plus the 3D decoder host), never inline', () => {
    const policy = defaultCsp();
    const script = policy.split('; ').find((d) => d.startsWith('script-src '))!;
    expect(script).toContain("'self'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
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
