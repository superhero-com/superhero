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

/**
 * Initialize a typed contract using sdk.initializeContract when available,
 * and fall back to Contract.initialize for sdk variants exposing only getContext().
 */
export async function initializeContractTyped<M extends ContractMethodsBase>(
  sdk: any,
  options: InitializeContractOptions,
): Promise<InitializedContract & M> {
  if (typeof sdk?.initializeContract === 'function') {
    return sdk.initializeContract(options as Record<string, unknown>) as Promise<
      InitializedContract & M
    >;
  }

  return Contract.initialize({
    ...sdk.getContext(),
    ...options,
  }) as Promise<InitializedContract & M>;
}
