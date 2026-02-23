import {
  Contract,
  isAddressValid as aeIsAddressValid,
  type ContractMethodsBase,
} from '@aeternity/aepp-sdk';
import { initializeContractTyped } from '@/libs/initializeContractTyped';

export const isAddressValid = aeIsAddressValid;

export const initializeContract = async (
  sdk: any,
  options: {
    aci: any;
    address: `ct_${string}` | `${string}.chain` | undefined;
    omitUnknown: boolean;
  },
) => initializeContractTyped<ContractMethodsBase>(sdk, {
  aci: options.aci,
  address: options.address,
  omitUnknown: options.omitUnknown,
});

export { Contract };
