export const normalizeName = (value: string) => value.trim().toLowerCase();

export const normalizeChainNameLabel = (value: string) => (
  normalizeName(value).replace(/\.chain$/u, '')
);
