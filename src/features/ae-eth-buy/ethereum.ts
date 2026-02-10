import {
  BrowserProvider, Contract, parseEther, Eip1193Provider,
} from 'ethers';
import { BRIDGE_CONSTANTS, BRIDGE_ABI } from './constants';

/**
 * Ensure Ethereum provider is available and connected
 * @param walletProvider - Optional WalletConnect/AppKit provider
 */
export async function ensureEthProvider(
  walletProvider?: Eip1193Provider,
): Promise<BrowserProvider> {
  // If walletProvider is provided (from AppKit/WalletConnect), use it
  if (walletProvider) {
    return new BrowserProvider(walletProvider, {
      name: 'Ethereum Bridge',
      chainId: parseInt(BRIDGE_CONSTANTS.CHAIN_ID_HEX, 16),
    });
  }

  // Otherwise fall back to window.ethereum
  const anyWindow = window as any;

  if (!anyWindow.ethereum) {
    throw new Error('No Ethereum provider found. Please install MetaMask or another Web3 wallet.');
  }

  const provider = new BrowserProvider(anyWindow.ethereum);

  try {
    // Request account access
    await anyWindow.ethereum.request({ method: 'eth_requestAccounts' });
  } catch {
    throw new Error('User denied account access');
  }

  return provider;
}

/**
 * Switch to Ethereum mainnet if not already connected
 */
export async function ensureCorrectNetwork(provider: BrowserProvider): Promise<void> {
  const anyWindow = window as any;
  const network = await provider.getNetwork();

  // Check if we're on mainnet (chainId 1)
  if (network.chainId !== 1n) {
    try {
      await anyWindow.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BRIDGE_CONSTANTS.CHAIN_ID_HEX }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        throw new Error('Please manually switch to Ethereum Mainnet in your wallet');
      }
      throw new Error(`Failed to switch network: ${error.message}`);
    }
  }
}

/**
 * Get ETH balance for connected account
 * @param provider - Ethereum provider
 * @param accountAddress - Optional specific account address to check balance for
 */
export async function getEthBalance(
  provider: BrowserProvider,
  accountAddress?: string,
): Promise<string> {
  let address: string;

  if (accountAddress) {
    address = accountAddress;
  } else {
    const signer = await provider.getSigner();
    address = await signer.getAddress();
  }

  const balance = await provider.getBalance(address);
  return balance.toString();
}

/**
 * Bridge ETH to æternity network as æETH
 * @param walletProvider - Optional WalletConnect/AppKit provider
 */
export async function bridgeEthToAe({
  amountEth,
  aeAccount,
  walletProvider,
}: {
  amountEth: string;
  aeAccount: string;
  walletProvider?: Eip1193Provider;
}): Promise<{ txHash: string; receipt?: any }> {
  if (!amountEth || !aeAccount) {
    throw new Error('Amount and AE account are required');
  }

  if (Number(amountEth) <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Validate AE account format
  if (!aeAccount.startsWith('ak_')) {
    throw new Error('Invalid æternity account format. Must start with "ak_"');
  }

  const provider = await ensureEthProvider(walletProvider);
  await ensureCorrectNetwork(provider);

  const signer = await provider.getSigner();
  const bridge = new Contract(
    BRIDGE_CONSTANTS.ETH_BRIDGE_ADDRESS,
    BRIDGE_ABI,
    signer,
  );

  // Check balance before bridging
  const signerAddress = await signer.getAddress();
  const balance = await provider.getBalance(signerAddress);
  const amountWei = parseEther(amountEth);

  if (balance < amountWei) {
    throw new Error(`Insufficient ETH balance. Required: ${amountEth} ETH`);
  }

  try {
    // Call bridge_out function with native ETH
    const tx = await bridge.bridge_out(
      BRIDGE_CONSTANTS.ETH_NATIVE_ETH_PLACEHOLDER,
      aeAccount,
      amountWei,
      BRIDGE_CONSTANTS.ACTION_TYPE.ETH_TO_AE,
      { value: amountWei },
    );

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      receipt,
    };
  } catch (error: any) {
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction was rejected by user');
    }
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for transaction');
    }
    throw new Error(`Bridge transaction failed: ${error.message || error}`);
  }
}
