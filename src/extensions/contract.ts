import type { AeSdk } from "@aeternity/aepp-sdk";

export function createContractLoader(sdk: AeSdk) {
  return async function loadContract(aci: any, address: string) {
    // @ts-expect-error aepp-sdk types for getContractInstance are not perfect
    return await (sdk as any).getContractInstance({ aci, address });
  };
}


