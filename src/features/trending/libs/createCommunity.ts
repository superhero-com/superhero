import {
  AeSdkBase, Contract, ContractMethodsBase, Encoded,
} from '@aeternity/aepp-sdk';
import COMMUNITY_FACTORY_CONTRACT_ACI from 'bctsl-contracts/generated/CommunityFactory.aci.json';
import {
  CreateCommunityOptions, Denomination, denominationTokenDecimals, estimateInitialBuyPriceAetto, toTokenDecimals,
} from 'bctsl-sdk';
import BigNumber from 'bignumber.js';

async function feePercentage(contract: Contract<ContractMethodsBase>): Promise<number> {
  if (typeof contract.fee_percentage !== 'function') return undefined;

  return new BigNumber(
    await contract.fee_percentage().then((res) => res.decodedResult),
  )
    .dividedBy(
      await contract.fee_precision().then((res) => res.decodedResult),
    )
    .toNumber();
}

export async function createCommunity(
  aeSdk: AeSdkBase,
  collectionName: string,
  options: CreateCommunityOptions,
  denomination?: Denomination,
  communityFactoryAddress?: Encoded.ContractAddress,
): Promise<Encoded.TxHash> {
  const contract = await aeSdk.initializeContract({
    address: communityFactoryAddress,
    aci: COMMUNITY_FACTORY_CONTRACT_ACI,
  });

  const fee = await feePercentage(contract);

  const {
    token: { name },
    metaInfo,
    initialBuyCount,
  } = options;

  const initialBuyTokenDecimals = toTokenDecimals(
    initialBuyCount,
    denominationTokenDecimals(denomination),
    18n,
  );

  const initialBuyPriceAetto = initialBuyTokenDecimals === '0'
    ? '0'
    : await estimateInitialBuyPriceAetto(
      aeSdk,
      initialBuyCount,
      await contract.bonding_curve().then((res) => res.decodedResult),
      denomination,
      fee,
    );

  const bondingCurveDeployAndBuy = await contract.create_community(
    collectionName,
    name,
    initialBuyTokenDecimals,
    false,
    metaInfo,
    {
      amount: initialBuyPriceAetto,
      waitMined: false,
    },
  );

  return bondingCurveDeployAndBuy.hash;
}
