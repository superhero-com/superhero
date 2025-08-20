import { BrowserProvider, Contract, parseEther } from 'ethers';

// Mainnet bridge addresses from aepp-bridge-and-swap
export const BRIDGE_CONSTANTS = {
  chainIdHex: '0x1',
  ethBridgeAddress: '0xd099E3Ab65d6294d1d2D1Ad92897Cc29286F8cA5',
  ethNativePlaceholder: '0xabae76f98a84d1dc3e0af8ed68465631165d33b2',
};

// Minimal ABI subset for BridgeOut
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
  { type: 'function', name: 'native_eth_placeholder', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
];

export async function ensureEthProvider() {
  const anyWindow = window as any;
  if (!anyWindow.ethereum) throw new Error('No Ethereum provider found');
  const provider = new BrowserProvider(anyWindow.ethereum);
  const network = await provider.getNetwork();
  // Optional: prompt to switch to Ethereum mainnet if different
  return provider;
}

export async function bridgeEthToAe({ amountEth, aeAccount }: { amountEth: string; aeAccount: string }) {
  const provider = await ensureEthProvider();
  const signer = await provider.getSigner();
  const bridge = new Contract(BRIDGE_CONSTANTS.ethBridgeAddress, BRIDGE_ABI as any, signer);
  const asset = BRIDGE_CONSTANTS.ethNativePlaceholder;
  const value = parseEther(amountEth);
  // action_type 1 per constants
  const tx = await bridge.bridge_out(asset, aeAccount, value, 1, { value });
  return tx.wait?.() ?? tx;
}


