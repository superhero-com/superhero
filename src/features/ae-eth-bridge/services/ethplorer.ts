import BigNumber from 'bignumber.js';

export interface EthplorerTokenInfo {
  address: string;
  decimals: string;
  name: string;
  symbol: string;
  totalSupply: string;
  price?: {
    rate: number;
    diff: number;
    diff7d: number;
    ts: number;
    marketCapUsd: number;
    availableSupply: number;
    volume24h: number;
    volDiff1: number;
    volDiff7: number;
    volDiff30: number;
    diff30d: number;
    currency: string;
  };
}

export interface EthplorerToken {
  tokenInfo: EthplorerTokenInfo;
  balance: number;
  rawBalance: string;
}

export interface EthplorerResponse {
  address: string;
  ETH: {
    balance: number;
    rawBalance: string;
    price: {
      rate: number;
      diff: number;
      diff7d: number;
      ts: number;
      marketCapUsd: number;
      availableSupply: number;
      volume24h: number;
      volDiff1: number;
      volDiff7: number;
      volDiff30: number;
      diff30d: number;
    };
  };
  tokens: EthplorerToken[];
}

const ETHPLORER_API_KEY = 'EK-ibZWr-ja615wd-j9Ghu';
const ETHPLORER_BASE_URL = 'https://api.ethplorer.io';

export async function fetchAddressInfo(address: string): Promise<EthplorerResponse> {
  const url = `${ETHPLORER_BASE_URL}/getAddressInfo/${address}?apiKey=${ETHPLORER_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Ethplorer API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Ethplorer API error: ${data.error.message || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching address info from Ethplorer:', error);
    throw error;
  }
}

export function getTokenBalanceFromEthplorer(
  ethplorerData: EthplorerResponse,
  tokenAddress: string,
  decimals: number,
  isNativeEth: boolean = false,
): string {
  // Check if it's native ETH
  if (isNativeEth) {
    const ethBalance = ethplorerData.ETH?.balance || 0;
    return new BigNumber(ethBalance).toFixed(6, BigNumber.ROUND_DOWN);
  }

  // Find the token in the tokens array
  const token = ethplorerData.tokens?.find((t) => t.tokenInfo.address.toLowerCase() === tokenAddress.toLowerCase());

  if (!token) {
    return '0';
  }

  // Convert raw balance to formatted balance using token decimals
  const balance = new BigNumber(token.rawBalance)
    .shiftedBy(-decimals)
    .toFixed(6, BigNumber.ROUND_DOWN);

  return balance;
}

export function getAllTokenBalancesFromEthplorer(
  ethplorerData: EthplorerResponse,
  assets: Array<{ symbol: string; ethAddress: string; decimals: number }>,
  nativeEthAddress?: string,
): Record<string, string> {
  const balances: Record<string, string> = {};

  // Add native ETH balance if there's a native ETH asset
  const ethAsset = assets.find((asset) => asset.ethAddress === '0x0000000000000000000000000000000000000000' || asset.ethAddress === nativeEthAddress);
  if (ethAsset) {
    const isNativeEth = ethAsset.ethAddress === '0x0000000000000000000000000000000000000000' || ethAsset.ethAddress === nativeEthAddress;
    balances[ethAsset.symbol] = getTokenBalanceFromEthplorer(ethplorerData, ethAsset.ethAddress, ethAsset.decimals, isNativeEth);
  }

  // Add token balances
  assets.forEach((asset) => {
    const isNativeEth = asset.ethAddress === '0x0000000000000000000000000000000000000000' || asset.ethAddress === nativeEthAddress;
    if (!isNativeEth) {
      balances[asset.symbol] = getTokenBalanceFromEthplorer(ethplorerData, asset.ethAddress, asset.decimals, false);
    }
  });

  return balances;
}
