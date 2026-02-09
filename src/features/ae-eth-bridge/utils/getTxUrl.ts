import { BridgeConstants } from '../constants';
import { Direction } from '../types';

export const getTxUrl = (direction: Direction, hash: string) => (direction === Direction.AeternityToEthereum
  ? `${BridgeConstants.aeternity.explorer}/transactions/${hash}`
  : `${BridgeConstants.ethereum.etherscan}/tx/${hash}`);
