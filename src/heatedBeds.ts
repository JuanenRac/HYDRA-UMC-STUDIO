// =============================================================================
// HYDRA-UMC-STUDIO - Heated bed presets and footprint configuration
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import catalog from '../public/models/heated-beds/catalog.json';
import type { HeatedBedModule } from './store';

export const HEATED_BED_MODELS = catalog.models;
export function heatedBedModel(id?: string) {
  return HEATED_BED_MODELS.find(m => m.id === id) ?? HEATED_BED_MODELS.find(m => m.id === catalog.defaultModelId)!;
}
export function heatedBedSize(module?: Partial<HeatedBedModule>) {
  const model = heatedBedModel(module?.modelId);
  const valid = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 25 && n <= 5000;
  return { width: valid(module?.size?.width) ? module.size.width : model.width,
    length: valid(module?.size?.length) ? module.size.length : model.length };
}
export function selectHeatedBed(module: HeatedBedModule, id: string): HeatedBedModule {
  const model = HEATED_BED_MODELS.find(m => m.id === id);
  return model ? { ...module, modelId: id, size: { width: model.width, length: model.length } } : module;
}
export function resizeHeatedBed(module: HeatedBedModule, axis: 'width' | 'length', value: number): HeatedBedModule {
  if (!Number.isInteger(value) || value < 25 || value > 5000) return module;
  return { ...module, size: { ...heatedBedSize(module), [axis]: value } };
}
