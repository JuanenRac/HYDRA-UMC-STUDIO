// =============================================================================
// HYDRA-UMC STUDIO - React Component: i18n.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

/** The languages the interface is translated into. */
export const SUPPORTED_LANGUAGES = ['en', 'es', 'de', 'fr', 'it', 'ja', 'zh', 'pt'] as const;

// English is the fallback and ships with the first screen; every other catalog
// is its own chunk, fetched the first time that language is selected.
const loaders = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*.json');

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

/**
 * Switches the interface language, loading its catalog first when it has not
 * been loaded yet. An unknown code or a failed download leaves the current
 * language (and the English fallback) in place.
 */
export async function setLanguage(code: string): Promise<void> {
  if (!i18n.hasResourceBundle(code, 'translation')) {
    const load = loaders[`./locales/${code}.json`];
    if (!load) return;
    try {
      const mod = await load();
      i18n.addResourceBundle(code, 'translation', mod.default, true, true);
    } catch {
      return;
    }
  }
  await i18n.changeLanguage(code);
}

export default i18n;
