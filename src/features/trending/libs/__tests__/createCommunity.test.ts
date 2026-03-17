import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { createCommunity } from '../createCommunity';

const mockInitializeContractTyped = vi.fn();
const mockDenominationTokenDecimals = vi.fn();
const mockEstimateInitialBuyPriceAetto = vi.fn();
const mockToTokenDecimals = vi.fn();

vi.mock('@/libs/initializeContractTyped', () => ({
  initializeContractTyped: (...args: any[]) => mockInitializeContractTyped(...args),
}));

vi.mock('bctsl-sdk', async () => {
  const actual = await vi.importActual<any>('bctsl-sdk');
  return {
    ...actual,
    denominationTokenDecimals: (...args: any[]) => mockDenominationTokenDecimals(...args),
    estimateInitialBuyPriceAetto: (...args: any[]) => mockEstimateInitialBuyPriceAetto(...args),
    toTokenDecimals: (...args: any[]) => mockToTokenDecimals(...args),
  };
});

vi.mock('bctsl-contracts/generated/CommunityFactory.aci.json', () => ({
  default: {},
}));

describe('createCommunity', () => {
  const aeSdk = { id: 'sdk' } as any;
  let mockContract: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContract = {
      fee_percentage: vi.fn().mockResolvedValue({ decodedResult: '5' }),
      fee_precision: vi.fn().mockResolvedValue({ decodedResult: '100' }),
      bonding_curve: vi.fn().mockResolvedValue({ decodedResult: 'ct_curve' }),
      create_community: vi.fn().mockResolvedValue({ hash: 'th_created' }),
    };

    mockInitializeContractTyped.mockResolvedValue(mockContract);
    mockDenominationTokenDecimals.mockReturnValue(18n);
  });

  it('skips price estimation when no initial buy is requested', async () => {
    mockToTokenDecimals.mockReturnValue('0');

    await expect(createCommunity(
      aeSdk,
      'words',
      {
        token: { name: 'NANCY' } as any,
        metaInfo: new Map([['website', 'https://example.com']]),
        initialBuyCount: 0,
      },
      'AE' as any,
      'ct_factory' as any,
    )).resolves.toBe('th_created');

    expect(mockEstimateInitialBuyPriceAetto).not.toHaveBeenCalled();
    expect(mockContract.create_community).toHaveBeenCalledWith(
      'words',
      'NANCY',
      '0',
      false,
      expect.any(Map),
      {
        amount: '0',
        waitMined: false,
      },
    );
  });

  it('estimates the initial buy amount and forwards it to the factory contract', async () => {
    mockToTokenDecimals.mockReturnValue('5000000000000000000');
    mockEstimateInitialBuyPriceAetto.mockResolvedValue('123456789');

    await createCommunity(
      aeSdk,
      'words',
      {
        token: { name: 'TREND' } as any,
        metaInfo: new Map([['twitter', '@trend']]),
        initialBuyCount: 5,
      },
      'AE' as any,
      'ct_factory' as any,
    );

    expect(mockEstimateInitialBuyPriceAetto).toHaveBeenCalledWith(
      aeSdk,
      5,
      'ct_curve',
      'AE',
      0.05,
    );

    expect(mockContract.create_community).toHaveBeenCalledWith(
      'words',
      'TREND',
      '5000000000000000000',
      false,
      expect.any(Map),
      {
        amount: '123456789',
        waitMined: false,
      },
    );
  });
});
