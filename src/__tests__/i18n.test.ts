import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import i18n, { changeLanguage, SUPPORTED_LANGUAGES, toSupportedLanguage } from '../i18n';

afterEach(async () => {
  vi.restoreAllMocks();
  await changeLanguage('en');
});

describe('supported interface languages', () => {
  it('offers the four native scripts in the agreed order', () => {
    expect(SUPPORTED_LANGUAGES.map(({ code, label }) => [code, label])).toEqual([
      ['ru', 'Русский'], ['ar', 'العربية'], ['en', 'English'], ['zh', '中文'],
    ]);
  });

  it.each([
    ['en-US', 'en'], ['zh-Hans-CN', 'zh'], ['AR_sa', 'ar'], ['ru-RU', 'ru'],
    ['de', 'en'], ['fr', 'en'], ['constructor', 'en'], [null, 'en'],
  ])('normalizes %s to %s', (language, expected) => {
    expect(toSupportedLanguage(language)).toBe(expected);
  });

  it('persists the selection and restores LTR after Arabic', async () => {
    await changeLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem('lng')).toBe('ar');
    expect(i18n.t('common.nav.home')).toBe('الرئيسية');
    await changeLanguage('zh');
    expect(document.documentElement.lang).toBe('zh');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem('lng')).toBe('zh');
  });

  it('keeps Russian chrome with English fallback for untranslated deeper strings', async () => {
    await changeLanguage('ru');
    expect(i18n.t('nav.home', { ns: 'common' })).toBe('Главная');
    expect(i18n.t('portfolio.overview', { ns: 'common' })).toBe('Portfolio overview');
  });

  it('changes locale and direction even if persistence is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    await changeLanguage('ar');
    expect(i18n.language).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });
});
