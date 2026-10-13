import { describe, expect, it } from 'vitest';
import { shouldOfferTranslation, translateUrl } from '../translate';

describe('shouldOfferTranslation', () => {
  it('offers translation only when the post language differs from the UI language', () => {
    expect(shouldOfferTranslation('zh', 'en')).toBe(true);
    expect(shouldOfferTranslation('en', 'en')).toBe(false);
    expect(shouldOfferTranslation('zh-CN', 'zh')).toBe(false);
  });

  it('skips unknown languages', () => {
    expect(shouldOfferTranslation('und', 'en')).toBe(false);
    expect(shouldOfferTranslation(undefined, 'en')).toBe(false);
    expect(shouldOfferTranslation('en', undefined)).toBe(false);
  });
});

describe('translateUrl', () => {
  it('links to Google Translate with the text and target language', () => {
    const url = new URL(translateUrl('你好 #AE', 'en-US'));
    expect(url.origin).toBe('https://translate.google.com');
    expect(url.searchParams.get('sl')).toBe('auto');
    expect(url.searchParams.get('tl')).toBe('en');
    expect(url.searchParams.get('text')).toBe('你好 #AE');
  });
});
