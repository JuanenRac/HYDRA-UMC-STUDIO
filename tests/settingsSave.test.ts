import { describe, expect, it } from 'vitest';
import { settingsLocalOnly, settingsSaveAllowed } from '../src/lib/settingsSave';

describe('who may save the settings tree', () => {
  it('lets an administrator and a session whose role is not known save, and never an operator', () => {
    expect(settingsSaveAllowed('admin')).toBe(true);
    expect(settingsSaveAllowed(null)).toBe(true);
    expect(settingsSaveAllowed('something-new')).toBe(true);
    expect(settingsSaveAllowed('operator')).toBe(false);
  });

  it('says the edits stay local only for an operator who edited', () => {
    expect(settingsLocalOnly('operator', true)).toBe(true);
    expect(settingsLocalOnly('operator', false)).toBe(false);
    expect(settingsLocalOnly('admin', true)).toBe(false);
    expect(settingsLocalOnly(null, true)).toBe(false);
  });
});
