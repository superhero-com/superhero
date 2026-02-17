import {
  AeSdk,
  Encoded,
  encode,
  Encoding,
  MemoryAccount,
  Node,
  Tag,
  unpackTx,
} from '@aeternity/aepp-sdk';
import { CONFIG } from '@/config';

const PROFILE_FUNCTIONS = new Set([
  'set_profile',
  'set_profile_full',
  'set_custom_name',
  'set_chain_name',
  'clear_chain_name',
  'set_display_source',
  'set_x_name_with_attestation',
]);

const PROFILE_CONTRACT_NAME = 'ProfileRegistry';

let payerSdk: AeSdk | null = null;

const getPayerSecret = () => (
  ((import.meta as any)?.env?.VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY
    || (typeof process !== 'undefined' && (process as any).env?.VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY)
    || '') as string
);

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY has invalid hex format');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
};

const normalizePayerSecret = (rawSecret: string): `sk_${string}` => {
  const secret = rawSecret.trim();
  if (secret.startsWith('sk_')) return secret as `sk_${string}`;

  const secretBytes = hexToBytes(secret);
  if (secretBytes.length < 32) {
    throw new Error(
      'VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY hex value must contain at least 32 bytes',
    );
  }
  // Legacy secrets can contain the full keypair payload; sdk v14 expects sk_-encoded 32-byte secret.
  return encode(secretBytes.subarray(0, 32), Encoding.AccountSecretKey) as `sk_${string}`;
};

const getPayerSdk = (): AeSdk => {
  if (payerSdk) return payerSdk;
  const payerSecretRaw = getPayerSecret();
  if (!payerSecretRaw) {
    throw new Error('VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY is not configured');
  }
  const payerSecretKey = normalizePayerSecret(payerSecretRaw);
  const payerAccount = new MemoryAccount(payerSecretKey);

  const node = new Node(CONFIG.NODE_URL);
  const sdk = new AeSdk({
    nodes: [{ name: 'ae_mainnet', instance: node }],
    accounts: [payerAccount],
  });
  payerSdk = sdk;
  return sdk;
};

export async function payForProfileTx(
  signedTx: Encoded.Transaction | string | { tx?: string; transaction?: string; signedTx?: string },
  profileContractAddress: Encoded.ContractAddress,
) {
  const normalizedSignedTx = (() => {
    if (typeof signedTx === 'string') return signedTx;
    if (signedTx && typeof signedTx === 'object') {
      const maybe = (
        (signedTx as any).tx
        || (signedTx as any).transaction
        || (signedTx as any).signedTx
      );
      if (typeof maybe === 'string') return maybe.trim();
    }
    return '';
  })();
  if (!normalizedSignedTx || !normalizedSignedTx.startsWith('tx_')) {
    throw new Error('Wallet did not return a valid signed transaction');
  }
  if (!profileContractAddress?.startsWith('ct_')) {
    throw new Error('Profile contract address is invalid');
  }

  let tx: any;
  try {
    tx = unpackTx(normalizedSignedTx as Encoded.Transaction, Tag.SignedTx);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode signed tx: ${msg}`);
  }
  if (tx.encodedTx.tag !== Tag.ContractCallTx) {
    throw new Error('Expected signed contract call transaction');
  }
  if (tx.encodedTx.contractId !== profileContractAddress) {
    throw new Error('Only profile contract calls can be sponsored');
  }

  const tempSdk = getPayerSdk();

  try {
    return await tempSdk.payForTransaction(
      normalizedSignedTx as Encoded.Transaction,
      {
        verify: false,
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`payForTransaction failed: ${msg}`);
  }
}

export function encodeProfileCallData(
  contract: any,
  functionName: string,
  args: unknown[],
): Encoded.ContractBytearray {
  if (!PROFILE_FUNCTIONS.has(functionName)) {
    throw new Error(`Unsupported profile function: ${functionName}`);
  }
  // eslint-disable-next-line no-underscore-dangle
  return contract._calldata.encode(PROFILE_CONTRACT_NAME, functionName, args);
}
