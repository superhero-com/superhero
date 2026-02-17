// Bridge configuration constants
export const BRIDGE_CONSTANTS = {
  // Ethereum mainnet bridge address
  ETH_BRIDGE_ADDRESS: '0xd099E3Ab65d6294d1d2D1Ad92897Cc29286F8cA5',
  // Native ETH placeholder address for bridge
  ETH_NATIVE_ETH_PLACEHOLDER: '0xabae76f98a84d1dc3e0af8ed68465631165d33b2',
  // Chain configuration
  CHAIN_ID_HEX: '0x1', // Ethereum mainnet
  // Action types for bridge operations
  ACTION_TYPE: {
    ETH_TO_AE: 1,
    AE_TO_ETH: 2,
  },
} as const;

// Bridge ABI for smart contract interaction
export const BRIDGE_ABI = [
  {
    type: 'function',
    name: 'bridge_out',
    stateMutability: 'payable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'destination', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'action_type', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'native_eth_placeholder',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
