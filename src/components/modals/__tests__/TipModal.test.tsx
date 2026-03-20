import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import TipModal from '../TipModal';

const mockSpend = vi.fn();
const mockUseQueryClient = vi.fn();
const mockSetTipStatus = vi.fn();

vi.mock('../../AeButton', () => ({
  default: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('../../../@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => <div data-testid="address-avatar" />,
}));

vi.mock('../../../hooks', () => ({
  useAeSdk: () => ({
    sdk: { spend: mockSpend },
    activeAccount: 'ak_sender',
    activeNetwork: { explorerUrl: 'https://explorer.example' },
  }),
  useAccount: () => ({ balance: '100000000000000000000' }),
}));

vi.mock('../../../hooks/useChainName', () => ({
  useChainName: () => ({ chainName: 'alice.chain' }),
}));

vi.mock('../../../libs/dex', () => ({
  toAettos: () => 3000000000000000000n,
  fromAettos: () => '100',
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => mockUseQueryClient(),
  };
});

vi.mock('jotai', async () => {
  const actual = await vi.importActual<any>('jotai');
  return {
    ...actual,
    useAtom: () => [{}, mockSetTipStatus],
  };
});

describe('TipModal', () => {
  let tipState: Record<string, { status: string; updatedAt: number }>;
  let queryClient: {
    getQueryData: ReturnType<typeof vi.fn>;
    setQueryData: ReturnType<typeof vi.fn>;
    invalidateQueries: ReturnType<typeof vi.fn>;
    refetchQueries: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    tipState = {};
    mockSetTipStatus.mockImplementation((updater: any) => {
      tipState = typeof updater === 'function' ? updater(tipState) : updater;
    });

    queryClient = {
      getQueryData: vi.fn().mockReturnValue({ totalTips: '2' }),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
      refetchQueries: vi.fn().mockResolvedValue(undefined),
    };
    mockUseQueryClient.mockReturnValue(queryClient);

    mockSpend.mockResolvedValue({ hash: 'th_tip' });
  });

  it('marks post tips as successful and optimistically bumps the cached total', async () => {
    const onClose = vi.fn();

    render(
      <TipModal
        toAddress="ak_receiver"
        onClose={onClose}
        payload="TIP_POST:post-123"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('0.0'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send tip' }));

    await waitFor(() => {
      expect(mockSpend).toHaveBeenCalledTimes(1);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(tipState['ak_receiver|post-123_v3']?.status).toBe('success');

    const optimisticUpdate = queryClient.setQueryData.mock.calls.find(
      ([key]) => JSON.stringify(key) === JSON.stringify(['post-tip-summary', 'post-123_v3']),
    )?.[1];

    expect(typeof optimisticUpdate).toBe('function');
    expect(optimisticUpdate({ totalTips: '2' })).toEqual({ totalTips: '5' });
  });
});
