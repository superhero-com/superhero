import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchAddressInfo, getAllTokenBalancesFromEthplorer } from '../ethplorer';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Ethplorer API', () => {
  beforeEach(() => {
    (fetch as any).mockClear();
  });

  it('should fetch address info successfully', async () => {
    const mockResponse = {
      address: '0x55d07d7b6a0c373a8cd9bb477c3eac55768f0c16',
      ETH: {
        balance: 0.002578992877993248,
        rawBalance: '2578992877993248',
        price: {
          rate: 4304.857165801885,
          diff: 3.37,
          diff7d: 2.97,
          ts: 1759311420,
          marketCapUsd: 519610252973.4198,
          availableSupply: 120703250.5285526,
          volume24h: 42815554262.74133,
          volDiff1: 11.626461055660783,
          volDiff7: 28.820726108156663,
          volDiff30: -18.23005626165488,
          diff30d: -1.0843420309542608
        }
      },
      tokens: [
        {
          tokenInfo: {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            decimals: '6',
            name: 'Tether USD',
            symbol: 'USDT',
            totalSupply: '94775654692250534'
          },
          balance: 9000000,
          rawBalance: '9000000'
        }
      ]
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await fetchAddressInfo('0x55d07d7b6a0c373a8cd9bb477c3eac55768f0c16');
    
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.ethplorer.io/getAddressInfo/0x55d07d7b6a0c373a8cd9bb477c3eac55768f0c16?apiKey=EK-ibZWr-ja615wd-j9Ghu'
    );
  });

  it('should handle API errors', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    });

    await expect(fetchAddressInfo('invalid-address')).rejects.toThrow('Ethplorer API error: 400 Bad Request');
  });

  it('should extract token balances correctly', () => {
    const mockEthplorerData = {
      address: '0x55d07d7b6a0c373a8cd9bb477c3eac55768f0c16',
      ETH: {
        balance: 0.002578992877993248,
        rawBalance: '2578992877993248',
        price: {
          rate: 4304.857165801885,
          diff: 3.37,
          diff7d: 2.97,
          ts: 1759311420,
          marketCapUsd: 519610252973.4198,
          availableSupply: 120703250.5285526,
          volume24h: 42815554262.74133,
          volDiff1: 11.626461055660783,
          volDiff7: 28.820726108156663,
          volDiff30: -18.23005626165488,
          diff30d: -1.0843420309542608
        }
      },
      tokens: [
        {
          tokenInfo: {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            decimals: '6',
            name: 'Tether USD',
            symbol: 'USDT',
            totalSupply: '94775654692250534'
          },
          balance: 9000000,
          rawBalance: '9000000'
        }
      ]
    };

    const assets = [
      { symbol: 'ETH', ethAddress: '0x0000000000000000000000000000000000000000', decimals: 18 },
      { symbol: 'USDT', ethAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 }
    ];

    const balances = getAllTokenBalancesFromEthplorer(mockEthplorerData, assets);
    
    expect(balances).toEqual({
      ETH: '0.0026',
      USDT: '9.0000'
    });
  });
});
