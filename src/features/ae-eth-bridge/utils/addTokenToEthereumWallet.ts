import { Asset } from '../types';

export const addTokenToEthereumWallet = async (asset: Asset) => {
    const tokenAddress = asset.ethAddress;
    const tokenSymbol = asset.symbol;
    const tokenDecimals = asset.decimals;
    const tokenImage = asset.icon;

    try {
        const wasAdded = await (window as any).ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: tokenAddress,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals,
                    image: tokenImage,
                },
            },
        });
        return wasAdded;
    } catch (error) {
        console.error(error);
        return false;
    }
};


