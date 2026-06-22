// Display helpers for token collections.
//
// On-chain a token's `collection` is the full id `"<NAME>-ak_<deployer>"`
// (e.g. "WORDS-ak_2X6…"). The UI shows the NAME, with a few human-facing
// overrides (e.g. the "WORDS" collection is presented as "English").

const COLLECTION_LABEL_OVERRIDES: Record<string, string> = {
  WORDS: 'English',
  CHINESE: 'Chinese',
  RUSSIAN: 'Russian',
  ARABIC: 'Arabic',
};

/** Extract the collection name from a full id ("NAME-ak_…") or pass a name through. */
export function collectionName(idOrName?: string | null): string {
  if (!idOrName) return '';
  return idOrName.split('-ak_')[0];
}

/** Human-facing label for a collection id or name (applies display overrides). */
export function collectionLabel(idOrName?: string | null): string {
  const name = collectionName(idOrName);
  if (!name) return '';
  return COLLECTION_LABEL_OVERRIDES[name.toUpperCase()] ?? name;
}
