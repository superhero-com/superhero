import { TokenDto } from "@/api/generated";
import { initializeContractTyped } from "@/libs/initializeContractTyped";
import TOKEN_SALE_ACI from "bctsl-contracts/generated/TokenSale.aci.json";
import { AeSdkBase, Contract, ContractMethodsBase, Encoded } from "@aeternity/aepp-sdk";
import { Denomination, denominationTokenDecimals, toTokenDecimals } from "bctsl-sdk";
import BigNumber from "bignumber.js";

export async function priceAettoTokenDecimals(
    contract: Contract<ContractMethodsBase>,
    token: TokenDto,
    count: bigint | string | number,
    denomination?: Denomination,
): Promise<{
    tokenDecimals: bigint;
    priceAetto: bigint;
}> {
    const decimals = BigInt(token.decimals || 18);
    const countTokenDecimals = toTokenDecimals(
        count,
        denominationTokenDecimals(denomination),
        decimals,
    );

    return {
        tokenDecimals: decimals,
        priceAetto: await contract.price(countTokenDecimals).then((res) => res.decodedResult),
    };
}

export async function buyToken(
    token: TokenDto,
    aeSdk: AeSdkBase,
    count: bigint | string | number,
    denomination?: Denomination,
    slippagePercent: bigint | string | number = 3n,
): Promise<Encoded.TxHash> {
    const contract = await initializeContractTyped<ContractMethodsBase>(aeSdk, {
        address: token.sale_address,
        aci: TOKEN_SALE_ACI,
    });
    const { tokenDecimals, priceAetto } = await priceAettoTokenDecimals(
        contract,
        token,
        count,
        denomination,
    );

    const countTokenDecimals = toTokenDecimals(
        count,
        denominationTokenDecimals(denomination),
        tokenDecimals,
    );

    const priceAettoWithSlippage = new BigNumber(priceAetto.toString())
        .plus(
            new BigNumber(priceAetto.toString())
                .times(slippagePercent.toString())
                .div(100),
        )
        .toFixed(0);

    const result = await contract.buy(countTokenDecimals, {
        amount: priceAettoWithSlippage,
        omitUnknown: true,
        waitMined: false,
    });

    return result.hash;
}