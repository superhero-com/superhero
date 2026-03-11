import {
  Contract,
  type ContractMethodsBase,
} from '@aeternity/aepp-sdk';

type InitializedContract = Awaited<ReturnType<typeof Contract.initialize>>;

type InitializeContractOptions = {
  aci: unknown;
  address?: string;
  bytecode?: unknown;
  omitUnknown?: boolean;
};

type InitializableSdk = {
  getContext: () => object;
  initializeContract?: (options: Record<string, unknown>) => ReturnType<typeof Contract.initialize>;
};

/**
 * Adds back `sdk.initializeContract(...)` for SDK instances or wrappers that
 * still reach libraries built against aepp-sdk < v14.
 */
export function ensureSdkInitializeContract<T extends InitializableSdk>(
  sdk: T,
): T & Required<Pick<InitializableSdk, 'initializeContract'>> {
  const compatibleSdk = sdk as T & Required<Pick<InitializableSdk, 'initializeContract'>>;

  if (typeof compatibleSdk.initializeContract !== 'function') {
    Object.assign(compatibleSdk, {
      initializeContract: (options: Record<string, unknown>) => Contract.initialize({
        ...(sdk.getContext() as Record<string, unknown>),
        ...options,
      } as Parameters<typeof Contract.initialize>[0]),
    });
  }

  return compatibleSdk;
}

/**
 * Initialize a typed contract via a compatibility-normalized
 * `sdk.initializeContract(...)` implementation.
 */
export async function initializeContractTyped<M extends ContractMethodsBase>(
  sdk: any,
  options: InitializeContractOptions,
): Promise<InitializedContract & M> {
  const compatibleSdk = ensureSdkInitializeContract(sdk);

  return compatibleSdk.initializeContract(options as Record<string, unknown>) as Promise<
    InitializedContract & M
  >;
}
