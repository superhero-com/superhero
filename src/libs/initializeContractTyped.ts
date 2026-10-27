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
 * Initialize a typed contract bound to the sdk's node, compiler and account context.
 */
export async function initializeContractTyped<M extends ContractMethodsBase>(
  sdk: any,
  options: InitializeContractOptions,
): Promise<InitializedContract & M> {
  return Contract.initialize({
    ...sdk.getContext(),
    ...options,
  }) as Promise<InitializedContract & M>;
}
