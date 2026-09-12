// =============================================================================
// HYDRA-UMC-STUDIO - Vacuum table catalog and configuration selection
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import catalog from '../public/models/vacuum-tables/catalog.json';
import type { VacuumTableModule } from './store';

export const VACUUM_TABLE_MODELS = catalog.models;
export function vacuumTableModel(id?: string) {
  return VACUUM_TABLE_MODELS.find(model => model.id === id) ?? VACUUM_TABLE_MODELS[0];
}

/** Only change geometry selection; keep pose, pump, valve and other state intact. */
export function selectVacuumTable(module: VacuumTableModule, id: string): VacuumTableModule {
  const model = VACUUM_TABLE_MODELS.find(item => item.id === id);
  if (!model) return module;
  return { ...module, customSize: false, modelId: model.id, size: { width: model.width, length: model.length } };
}

/** Custom footprint in mm; thickness and legacy configurations remain unchanged. */
export function vacuumTableSize(module?: Partial<VacuumTableModule>) {
  const model = vacuumTableModel(module?.modelId);
  const valid = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 10 && n <= 5000;
  return { width: module?.customSize === true && valid(module.size?.width) ? module.size.width : model.width,
    length: module?.customSize === true && valid(module.size?.length) ? module.size.length : model.length };
}

export function resizeVacuumTable(module: VacuumTableModule, axis: 'width' | 'length', value: number): VacuumTableModule {
  if (!Number.isInteger(value) || value < 10 || value > 5000) return module;
  return { ...module, customSize: true, size: { ...vacuumTableSize(module), [axis]: value } };
}
