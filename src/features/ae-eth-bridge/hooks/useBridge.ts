import { useState, useCallback, useMemo } from 'react';
import { Asset, Direction } from '../types';
import { BridgeConstants } from '../constants';

export function useBridge() {
    const [asset, setAsset] = useState<Asset>(BridgeConstants.assets[0]);
    const [direction, setDirection] = useState<Direction>(Direction.EthereumToAeternity);

    const updateAsset = useCallback((newAsset: Asset) => {
        setAsset(newAsset);
    }, []);

    const updateDirection = useCallback((newDirection: Direction) => {
        setDirection(newDirection);
    }, []);

    const assets = useMemo(() => BridgeConstants.assets, []);

    return {
        asset,
        assets,
        direction,
        updateAsset,
        updateDirection,
        isMainnet: BridgeConstants.isMainnet,
    };
}


