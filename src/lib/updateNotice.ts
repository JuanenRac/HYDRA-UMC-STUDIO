// =============================================================================
// HYDRA-UMC STUDIO - src/lib/updateNotice.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The notice that a newer release of STUDIO exists. It only reads what the SERVER already reports about the newest signed release of each program (GET
// /api/admin/self-update) and tells the person; it never downloads or installs anything. The page to download from is the releases page of the repository the
// server names, built only from names made of letters, digits, dots, dashes and underscores so a strange answer can never become another address.
import type { SelfUpdateItem, SelfUpdateStatus } from './selfUpdate';

const NAME = /^[A-Za-z0-9._-]{1,100}$/;

export interface StudioNotice { installed: string; latest: string; url: string | null }

/** The newer release of STUDIO that the server reports, or null when STUDIO is current, ahead, not known or the version already hidden. */
export function studioNotice(status: SelfUpdateStatus | null, dismissed: string): StudioNotice | null {
  if (!status) return null;
  const item: SelfUpdateItem | undefined = status.items.find((entry) => entry.id === 'studio');
  if (!item || item.state !== 'behind' || !item.latest || !item.installed) return null;
  if (item.latest === dismissed) return null;
  const url = NAME.test(status.owner) && NAME.test(item.repo) ? `https://github.com/${status.owner}/${item.repo}/releases/latest` : null;
  return { installed: item.installed, latest: item.latest, url };
}
