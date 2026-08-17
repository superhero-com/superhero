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

/** True when a collection id/name refers to the default English ("WORDS") collection. */
export function isEnglishCollection(idOrName?: string | null): boolean {
  return collectionName(idOrName).toUpperCase() === 'WORDS';
}

interface TokenCollectionFields {
  collection?: string | null;
  collection_info?: { name?: string | null } | null;
}

/** Human-facing collection label for a token; prefers the backend-resolved `collection_info`. */
export function tokenCollectionLabel(token?: TokenCollectionFields | null): string {
  if (!token) return '';
  return collectionLabel(token.collection_info?.name ?? token.collection);
}

/** True when a token's collection is not the default English ("WORDS") collection. */
export function isNonEnglishToken(token?: TokenCollectionFields | null): boolean {
  if (!token) return false;
  return !isEnglishCollection(token.collection_info?.name ?? token.collection);
}
