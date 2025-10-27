import type { AeSdk } from "@aeternity/aepp-sdk";

export function createContractLoader(sdk: AeSdk) {
  return async function loadContract(aci: any, address: string) {
    return await (sdk as any).getContractInstance({ aci, address });
  };
}


