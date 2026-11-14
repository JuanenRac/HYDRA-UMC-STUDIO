// =============================================================================
// HYDRA-UMC STUDIO - tests/commonTexts.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The words every app shows the same way live in contracts/i18n/common.json of HYDRA-UMC-SDK and are carried by the "common" block of each catalog.
// The 53 words are in the eight catalogs, and, when a checkout of the SDK is at hand (HYDRA_UMC_SDK_DIR or the sibling folder), they are the ones of
// the contract (tools/i18n_common.py check-studio does the same from the SDK).
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'];
const IDS = ['confirm', 'cancel', 'save', 'close', 'retry', 'yes', 'no', 'loading', 'online', 'offline', 'administrator', 'operator', 'viewer', 'delete', 'pause', 'next', 'previous', 'done', 'status', 'name', 'password', 'language', 'theme', 'type', 'key', 'time', 'robot', 'robots', 'temperature', 'connect', 'disconnect', 'role', 'account', 'memory', 'telemetry', 'approve', 'controllers', 'services', 'users', 'export', 'download', 'load', 'clear', 'search', 'value', 'enable', 'disable', 'saved', 'level_basic', 'level_advanced', 'level_technical', 'sign_in', 'finish', 'endstops', 'speed', 'vision_center'];
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
      'plannerIdentity.save', 'hilBridge.save', 'hubGate.save', 'serviceIdentity.save', 'ingestSwitches.save', 'ecosystem.plan_confirm_cancel', 'totp.cancel',
      'dashboard.connect', 'dashboard.mem_load', 'config.controllers', 'config.status', 'config.ip_password', 'config.submitted_models_name', 'robot_detail.load', 'robot_detail.role', 'cameraMedia.download', 'cameraMedia.pause', 'cameraMedia.delete', 'tester.col_time', 'tester.telemetry.temperature', 'ecosystem.menu_services', 'ecosystem.menu_telemetry', 'ecosystem.supervisor_memory', 'ecosystem.supervisor_temp_trend', 'ecosystem.telemetry_title', 'ecosystem.telemetry_value', 'ecosystem.logs_clear', 'ecosystem.logs_pause', 'ecosystem.admin_security_saved', 'ecosystem.admin_server_stat_controllers', 'ecosystem.admin_server_stat_robots', 'auth.password', 'auth.sign_in', 'robotsCatalog.title', 'assistant.prev', 'assistant.next', 'assistant.done', 'access.col_robot', 'access.col_owner', 'access.safe_mode_disable', 'access.safe_mode_enable', 'audit.filter_type', 'audit.filter_robot', 'audit.col_time', 'audit.col_type', 'audit.col_account', 'audit.col_robot', 'audit.filter_account', 'audit.filter_text', 'totp.key_label', 'plannerIdentity.saved', 'opsProposals.approve', 'opsProposals.confirm_button', 'hubGate.saved', 'serviceIdentity.services_title', 'serviceIdentity.saved', 'security.col_key', 'config.users_role', 'config.users', 'robot_detail.endstops_upper', 'robot_detail.speed', 'dashboard.role', 'dashboard.vision_center'];
    const has = (tree: unknown, key: string): boolean => key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree) !== undefined;
    for (const language of LANGUAGES) {
      const tree = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as unknown;
      for (const key of repeated) expect(has(tree, key), `${language} still has ${key}`).toBe(false);
    }
    const sources = ['src/components/ConnectorHubGatePanel.tsx', 'src/components/HilBridgePanel.tsx', 'src/components/IngestSwitchesPanel.tsx', 'src/components/PlannerIdentityPanel.tsx', 'src/components/ServiceIdentityPanel.tsx'];
    for (const file of sources) expect(readFileSync(file, 'utf8'), file).toContain("t('common.save')");
  });

  it('keeps removed the keys that no screen, test or dynamic name used', () => {
    const dead = ["dashboard.active_controller", "dashboard.add_robot", "dashboard.back", "dashboard.camera_active", "dashboard.camera_offline", "dashboard.collapse_sidebar", "dashboard.combined_into", "dashboard.disconnect", "dashboard.expand_sidebar", "dashboard.global_estop_confirm", "dashboard.idle_short", "dashboard.kinematic_brain_stage", "dashboard.micro_factory_status", "dashboard.remote_app_access_short", "dashboard.role_label", "dashboard.shared_resources", "dashboard.stack_a_slot", "dashboard.subtitle", "dashboard.title", "dashboard.vision_cameras", "dashboard.xy_assigned", "robot_detail.back", "robot_detail.connect", "robot_detail.disconnect", "robot_detail.export", "robot_detail.floating_overlay_hint", "robot_detail.ip_address", "robot_detail.record", "robot_detail.return_zero", "robot_detail.status.disconnected", "robot_detail.vac"];
    const has = (tree: unknown, key: string): boolean => key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree) !== undefined;
    for (const language of LANGUAGES) {
      const tree = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8')) as unknown;
      for (const key of dead) expect(has(tree, key), `${language} has ${key} again`).toBe(false);
    }
  });
});
