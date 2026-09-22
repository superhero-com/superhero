import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { changeLanguage } from '@/i18n';

// Deliberately the ONLY project import: the point is that loading the switcher
// alone must be enough to register the post-language reset listener, because the
// hook that owns it lives in the lazily loaded feed chunks. Importing the hook
// here would make this pass for the wrong reason. If the side-effect import ever
// moves to another always-loaded module, point this import at that module.
import '../LanguageSwitcher';

const STORAGE_KEY = 'postLanguageFilter';

describe('LanguageSwitcher — post language preference reset', () => {
  beforeEach(async () => {
    await changeLanguage('en');
    window.localStorage.clear();
  });

  it('resets a stale "All languages" choice on a UI round trip made before any feed has loaded', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: 'en', filter: 'all' }));

    // A user on a profile or chat page (no feed mounted) switches away and back.
    await changeLanguage('ar');
    await changeLanguage('en');

    // Without the listener the stored { en, all } survives the round trip and the
    // next feed visit silently shows every language under an "English" label.
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string))
      .toEqual({ ui: 'en', filter: 'en' });
  });
});
