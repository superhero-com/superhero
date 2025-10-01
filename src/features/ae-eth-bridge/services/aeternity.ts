import { Contract, isAddressValid as aeIsAddressValid } from '@aeternity/aepp-sdk';

export const isAddressValid = aeIsAddressValid;

export const initializeContract = async (
    sdk: any,
    options: {
        aci: any;
        address: `ct_${string}` | `${string}.chain` | undefined;
        omitUnknown: boolean;
    }
) => {
    return Contract.initialize({
        ...sdk.getContext(),
        aci: options.aci,
        address: options.address,
        omitUnknown: options.omitUnknown,
    });
};

export { Contract };


