import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isUrtcTool, URTC_TOOLS } from '../src/components/robotDetail/shared';

// A tool that is not one of the URTC family stays as it is: the screen only says so.

describe('isUrtcTool', () => {
  it('knows every tool of the selector, None included', () => {
    expect(URTC_TOOLS.length).toBe(26);
    for (const tool of URTC_TOOLS) expect(isUrtcTool(tool)).toBe(true);
  });

  it('does not know another text, an empty text, a different case or what is not a text', () => {
    for (const other of ['PnP', 'Laser', '', 'drill (bl4260)', 'TOOL_DRILL', 7, null, undefined, {}]) {
      expect(isUrtcTool(other)).toBe(false);
    }
  });
});

describe('the warning of a tool outside the family', () => {
  const languages = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];

  it('is written in the eight languages', () => {
    for (const language of languages) {
      const catalogue = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as { robot_detail: Record<string, string> };
      expect(catalogue.robot_detail.tool_not_in_family, language).toBeTruthy();
      expect(catalogue.robot_detail.tool_not_in_family.length, language).toBeGreaterThan(10);
    }
  });
});
