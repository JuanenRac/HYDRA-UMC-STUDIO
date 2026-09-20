// =============================================================================
// HYDRA-UMC STUDIO - React Hook: src/hooks/usePartColors.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real per-part color overrides, saved by the separate HYDRA-UMC-EDITOR-STL
// desktop tool as a sidecar `part_colors.json` file next to a model's own
// STL parts (see that repo's own part_colors.py - a flat
// `{"<filename>": "#rrggbb"}` dict, only listing parts that actually have a
// saved color). Until this hook existed, that annotation was an
// EDITOR-STL-only preview with no effect anywhere else - this is the one
// place STUDIO's own live 3D viewers read it back, the same real static
// path (`meshBase + 'part_colors.json'`) every Arm/module component
// already loads its own STL parts from, so no new server route or build
// step is needed.
// =============================================================================

import { useEffect, useState } from 'react';

// One shared cache keyed by folder path - every Arm component mounted for
// the same model (there is normally only one at a time, but StrictMode/HMR
// can double-mount) reuses the same real fetch instead of re-requesting the
// same small JSON file.
const cache = new Map<string, Record<string, string>>();
const inFlight = new Map<string, Promise<Record<string, string>>>();

async function fetchPartColors(meshBase: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${meshBase}part_colors.json`);
    if (!response.ok) return {};
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const entries = Object.entries(data as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    );
    return Object.fromEntries(entries);
  } catch {
    // No sidecar file yet, or a genuine network hiccup - either way this is
    // an honest "no overrides saved", never a thrown error a 3D viewer
    // would have to handle.
    return {};
  }
}

/** Real per-part color overrides for the model whose STL parts live under
 * `meshBase` (the exact same string already passed to `useLoader(STLLoader,
 * meshBase + fileName)`) - `{}` before the fetch resolves or when no
 * `part_colors.json` exists for this model. Look up `colors[fileName]`
 * (the same filename string already used to load that part's geometry) and
 * fall back to the component's own default color when it's absent. */
export function usePartColors(meshBase: string): Record<string, string> {
  const [colors, setColors] = useState<Record<string, string>>(() => cache.get(meshBase) ?? {});

  useEffect(() => {
    const cached = cache.get(meshBase);
    if (cached) {
      setColors(cached);
      return;
    }
    let cancelled = false;
    let promise = inFlight.get(meshBase);
    if (!promise) {
      promise = fetchPartColors(meshBase);
      inFlight.set(meshBase, promise);
    }
    promise.then((real) => {
      cache.set(meshBase, real);
      inFlight.delete(meshBase);
      if (!cancelled) setColors(real);
    });
    return () => {
      cancelled = true;
    };
  }, [meshBase]);

  return colors;
}
