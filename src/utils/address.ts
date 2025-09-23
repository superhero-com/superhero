import { Encoding } from '@aeternity/aepp-sdk';

// Hash prefixes allowed for validation
const AE_HASH_PREFIXES_ALLOWED = [
  Encoding.AccountAddress,
  Encoding.ContractAddress,
  Encoding.Name,
  Encoding.OracleAddress,
  Encoding.TxHash,
] as const;

// AENS domain suffix
const AE_AENS_DOMAIN = '.chain';

// Hash regex for validation
const HASH_REGEX = /^[A-Za-z0-9]+$/;

// Address types for explorer URLs
const ADDRESS_TYPES: Record<string, string> = {
  [Encoding.AccountAddress]: 'accounts',
  [Encoding.ContractAddress]: 'contracts',
  [Encoding.Name]: 'names',
  [Encoding.OracleAddress]: 'oracles/queries',
  [Encoding.TxHash]: 'transactions',
};

export interface ValidatedHash {
  valid: boolean;
  isName: boolean;
  prefix: string | null;
  hash: string | null;
}

/**
 * Validates an Aeternity hash or name
 */
export function validateHash(fullHash?: string): ValidatedHash {
  type HashPrefix = (typeof AE_HASH_PREFIXES_ALLOWED)[number];
  const isName = !!fullHash?.endsWith(AE_AENS_DOMAIN);
  let valid = false;
  let prefix: HashPrefix | null = null;
  let hash = null;

  if (fullHash) {
    [prefix, hash] = fullHash.split('_') as [HashPrefix, string];
    valid =
      (AE_HASH_PREFIXES_ALLOWED.includes(prefix) && HASH_REGEX.test(hash)) ||
      isName;
  }

  return {
    valid,
    isName,
    prefix,
    hash,
  };
}

/**
 * Formats an address for display by truncating the middle
 */
export function formatAddress(address: string, length = 6): string {
  if (!address) return '';
  
  if (address.endsWith(AE_AENS_DOMAIN)) {
    return address; // Show full AENS names
  }
  
  // Special formatting for Aeternity account addresses: ak_<first3> ... <last3>
  const { valid, prefix, hash } = validateHash(address);
  if (valid && prefix === Encoding.AccountAddress && hash) {
    if (hash.length <= 6) return address;
    return `${prefix}_${hash.slice(0, 3)}...${hash.slice(-3)}`;
  }
  
  if (address.length <= length * 2 + 3) {
    return address; // Don't truncate short addresses
  }
  
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Gets the endpoint type for explorer URLs based on hash prefix
 */
export function getEndpointByHash(hash: string): string | undefined {
  const { valid, prefix } = validateHash(hash);
  if (valid && prefix) {
    return ADDRESS_TYPES[prefix];
  }
  return undefined;
}

/**
 * Prepares a URL for the Aeternity explorer
 */
export function prepareExplorerUrl(
  hash: string,
  explorerUrl: string,
  prefix?: string
): string | undefined {
  const endpoint = prefix ?? getEndpointByHash(hash);
  return endpoint ? `${explorerUrl}/${endpoint}/${hash}` : undefined;
}

/**
 * Checks if an address is an account address
 */
export function isAccountAddress(address: string): boolean {
  const { valid, prefix } = validateHash(address);
  return valid && prefix === Encoding.AccountAddress;
}

/**
 * Checks if an address is a contract address
 */
export function isContractAddress(address: string): boolean {
  const { valid, prefix } = validateHash(address);
  return valid && prefix === Encoding.ContractAddress;
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
