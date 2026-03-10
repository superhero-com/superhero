type ResolveDisplayNameInput = {
  publicName?: string | null;
  chainName?: string | null;
  address?: string | null;
};

const normalizeDisplayName = (value?: string | null) => String(value || '').trim();

export function resolveDisplayName({
  publicName,
  chainName,
  address,
}: ResolveDisplayNameInput): string {
  return normalizeDisplayName(publicName)
    || normalizeDisplayName(chainName)
    || normalizeDisplayName(address);
}
