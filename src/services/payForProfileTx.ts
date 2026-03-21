import {
  AeSdk,
  Encoded,
  MemoryAccount,
  Node,
  Tag,
  unpackTx,
} from '@aeternity/aepp-sdk';
import { CONFIG } from '@/config';
import { normalizeSecretKey } from '@/utils/secretKey';

const PROFILE_FUNCTIONS = new Set([
  'set_profile',
  'set_profile_full',
  'set_custom_name',
  'set_chain_name',
  'clear_chain_name',
  'set_x_name_with_attestation',
]);

const PROFILE_CONTRACT_NAME = 'ProfileRegistry';

let payerSdk: AeSdk | null = null;

const getPayerSecret = () => (
  ((import.meta as any)?.env?.VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY
    || (typeof process !== 'undefined' && (process as any).env?.VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY)
    || '') as string
).trim();

const normalizePayerSecret = (rawSecret: string): `sk_${string}` => {
  try {
    return normalizeSecretKey(rawSecret);
  } catch (error: any) {
    throw new Error(
      `VITE_PAY_FOR_TX_ACCOUNT_PRIVATE_KEY is invalid: ${
        error?.message || 'unknown format'
      }`,
    );
  }
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
    nodes: [{ name: CONFIG.NETWORK, instance: node }],
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
