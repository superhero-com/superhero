import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  PENDING_TRANSACTIONS_STORAGE_KEY,
  PENDING_TRANSACTION_POLL_MS,
  PENDING_TRANSACTION_TIMEOUT_MS,
  clearPendingTransactions,
  onPendingTransactionSettled,
} from '@/features/pending-transactions/store';
import {
  JUST_CREATED_TTL_MS,
  pendingTokenCreation,
  tokenJustCreated,
  trackTokenCreation,
} from '../pendingTokenCreation';

const mockFindToken = vi.fn();
const mockIsMined = vi.fn();

vi.mock('@/api/generated', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TokensService: {
      ...actual.TokensService,
      findByAddress: (...args: any[]) => mockFindToken(...args),
    },
  };
});

vi.mock('@/utils/apiRead', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, isTransactionMined: (...args: any[]) => mockIsMined(...args) };
});

describe('a token creation on its way', () => {
  beforeEach(() => {
    clearPendingTransactions();
    mockIsMined.mockResolvedValue(false);
    mockFindToken.mockRejectedValue(new Error('Token not found'));
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearPendingTransactions();
    vi.useRealTimers();
  });

  it('is kept for the token page, whatever case the URL uses, and across a reload', () => {
    const tracked = trackTokenCreation('ak_owner', 'th_create', 'SUPERHERO');

    expect(pendingTokenCreation('superhero')).toEqual(tracked);
    expect(pendingTokenCreation('OTHER')).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(PENDING_TRANSACTIONS_STORAGE_KEY)!)).toEqual([{
      kind: 'create_token',
      account: 'ak_owner',
      txHash: 'th_create',
      startedAt: tracked.startedAt,
      step: 'sent',
      meta: { tokenName: 'SUPERHERO' },
    }]);
  });

  it('is confirmed once mined, and done once the backend has its sale contract', async () => {
    const settled = vi.fn();
    const unsubscribe = onPendingTransactionSettled(settled);
    trackTokenCreation('ak_owner', 'th_create', 'SUPERHERO');
    await vi.advanceTimersByTimeAsync(0);
    expect(pendingTokenCreation('SUPERHERO')?.step).toBe('sent');

    mockIsMined.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS);
    expect(pendingTokenCreation('SUPERHERO')?.step).toBe('confirmed');
    expect(settled).not.toHaveBeenCalled();

    // Known to the backend but without its sale contract yet: not live.
    mockFindToken.mockResolvedValue({ name: 'SUPERHERO', sale_address: null });
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS);
    expect(pendingTokenCreation('SUPERHERO')).not.toBeNull();

    mockFindToken.mockResolvedValue({ name: 'SUPERHERO', sale_address: 'ct_sale' });
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS);

    expect(pendingTokenCreation('SUPERHERO')).toBeNull();
    expect(settled).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'settled',
      result: { saleAddress: 'ct_sale' },
    }));
    expect(mockFindToken).toHaveBeenCalledWith({ address: 'SUPERHERO' });
    unsubscribe();
  });

  it('counts as just created for a while after it goes live, so the page does not show the wait again', async () => {
    expect(tokenJustCreated('LIVENOW')).toBe(false);
    trackTokenCreation('ak_owner', 'th_live', 'LIVENOW');
    mockIsMined.mockResolvedValue(true);
    mockFindToken.mockResolvedValue({ name: 'LIVENOW', sale_address: 'ct_live' });
    await vi.advanceTimersByTimeAsync(0);

    expect(pendingTokenCreation('LIVENOW')).toBeNull();
    expect(tokenJustCreated('livenow')).toBe(true);
    expect(tokenJustCreated('OTHER')).toBe(false);

    vi.advanceTimersByTime(JUST_CREATED_TTL_MS + 1);
    expect(tokenJustCreated('LIVENOW')).toBe(false);
  });

  it('does not count one that was given up on', async () => {
    trackTokenCreation('ak_owner', 'th_dropped', 'DROPPED');
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_TIMEOUT_MS + PENDING_TRANSACTION_POLL_MS);

    expect(pendingTokenCreation('DROPPED')).toBeNull();
    expect(tokenJustCreated('DROPPED')).toBe(false);
  });
});
