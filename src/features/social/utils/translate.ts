const baseLanguage = (code?: string | null) => String(code || '').toLowerCase().split(/[-_]/)[0];

/**
 * Whether a post written in `postLanguage` should offer a translation for a reader
 * using `uiLanguage`. Unknown or undetected languages ("und") never do.
 */
export function shouldOfferTranslation(
  postLanguage?: string | null,
  uiLanguage?: string | null,
): boolean {
  const post = baseLanguage(postLanguage);
  const ui = baseLanguage(uiLanguage);
  if (!post || post === 'und' || !ui) return false;
  return post !== ui;
}

/** Google Translate link for the post text, auto-detecting the source language. */
export function translateUrl(text: string, targetLanguage: string): string {
  const params = new URLSearchParams({
    sl: 'auto',
    tl: baseLanguage(targetLanguage) || 'en',
    text,
    op: 'translate',
  });
  return `https://translate.google.com/?${params.toString()}`;
}
