export const normalizeAddress = (value?: string | null) => (value || '').trim().toLowerCase();

const readSdkString = (sdkRecord: Record<string, unknown>, key: string) => {
  try {
    const value = sdkRecord[key];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
};

export const getSdkAddresses = (candidate: any): string[] => {
  // eslint-disable-next-line no-underscore-dangle, dot-notation
  const current = candidate?.['_accounts']?.current;
  if (current && typeof current === 'object') return Object.keys(current);
  if (typeof candidate?.addresses === 'function') return candidate.addresses();
  return [];
};

export const sdkHasAccount = (candidate: any, expectedAddress?: string): boolean => {
  const addresses = getSdkAddresses(candidate);
  if (!addresses.length) return false;
  if (!expectedAddress) return true;
  const target = normalizeAddress(expectedAddress);
  return addresses.some((address) => normalizeAddress(address) === target);
};

export const getSdkAddress = (sdk: unknown) => {
  if (sdk && typeof sdk === 'object') {
    const sdkRecord = sdk as Record<string, unknown>;
    const directAddress = readSdkString(sdkRecord, 'address');
    const selectedAddress = readSdkString(sdkRecord, 'selectedAddress');
    if (directAddress) return directAddress;
    if (selectedAddress) return selectedAddress;

    // eslint-disable-next-line no-underscore-dangle, dot-notation
    const accounts = sdkRecord['_accounts'];
    const currentAccounts = accounts && typeof accounts === 'object'
      ? (accounts as Record<string, unknown>).current
      : null;
    if (currentAccounts && typeof currentAccounts === 'object') {
      const firstAddress = Object.keys(currentAccounts as Record<string, unknown>)[0];
      if (firstAddress) return firstAddress;
    }
  }
  return '';
};
