// =============================================================================
// HYDRA-UMC STUDIO - tests/commonTexts.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The words every app shows the same way live in contracts/i18n/common.json of HYDRA-UMC-SDK and are carried by the "common" block of each catalog.
// The thirteen words are in the eight catalogs, and, when a checkout of the SDK is at hand (HYDRA_UMC_SDK_DIR or the sibling folder), they are the ones of
// the contract (tools/i18n_common.py check-studio does the same from the SDK).
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];
const IDS = ['confirm', 'cancel', 'save', 'close', 'retry', 'yes', 'no', 'loading', 'online', 'offline', 'administrator', 'operator', 'viewer'];
const common = (language: string): Record<string, string> => (JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as { common: Record<string, string> }).common;

describe('the common texts', () => {
  it('are in the eight catalogs, none empty', () => {
    for (const language of LANGUAGES) {
      const block = common(language);
      for (const id of IDS) expect(block[id]?.trim(), `${language} common.${id}`).toBeTruthy();
    }
  });

  it('are the ones of the contract of the SDK when a checkout of it is at hand', () => {
    const roots = [process.env.HYDRA_UMC_SDK_DIR, path.resolve(process.cwd(), '..', 'HYDRA-UMC-SDK')].filter((dir): dir is string => !!dir);
    const file = roots.map((dir) => path.join(dir, 'contracts', 'i18n', 'common.json')).find((candidate) => existsSync(candidate));
    if (!file) {
      return;
    }
    const contract = JSON.parse(readFileSync(file, 'utf8')) as { languages: string[]; strings: { id: string; text: Record<string, string> }[] };
    expect(contract.languages).toEqual(LANGUAGES);
    for (const language of LANGUAGES) {
      const block = common(language);
      for (const entry of contract.strings) expect(block[entry.id], `${language} common.${entry.id}`).toBe(entry.text[language]);
    }
  });

  it('are written in the Portuguese of Portugal', () => {
    const pt = common('pt');
    expect(pt.loading).toBe('A carregar…');
    expect(pt.offline).toBe('Desligado');
  });

  it('are the only copy of the words the screens used to repeat: the old keys are gone and the screens use common.*', () => {
    const repeated = ['gamepad_config.mode.dismiss', 'dashboard.loading', 'config.users_role_admin', 'robot_detail.save_trajectory', 'ecosystem.plan_confirm_save', 'ecosystem.admin_server_save',
      'plannerIdentity.save', 'hilBridge.save', 'hubGate.save', 'serviceIdentity.save', 'ingestSwitches.save', 'ecosystem.plan_confirm_cancel', 'totp.cancel'];
    const has = (tree: unknown, key: string): boolean => key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree) !== undefined;
    for (const language of LANGUAGES) {
      const tree = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as unknown;
      for (const key of repeated) expect(has(tree, key), `${language} still has ${key}`).toBe(false);
    }
    const sources = ['src/components/ConnectorHubGatePanel.tsx', 'src/components/HilBridgePanel.tsx', 'src/components/IngestSwitchesPanel.tsx', 'src/components/PlannerIdentityPanel.tsx', 'src/components/ServiceIdentityPanel.tsx'];
    for (const file of sources) expect(readFileSync(file, 'utf8'), file).toContain("t('common.save')");
  });
});
