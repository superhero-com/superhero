/* eslint-disable object-curly-newline */
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import CreateTokenView from '../CreateTokenView';

const DEPLOYER = 'ak_2X6puZgdPKcfjSVdUGs2bvsvkbsCLN8XbKQwSVtqLUBc3518bi';

// The rules below are copied from what the factory endpoint actually serves.
const COLLECTIONS = {
  [`WORDS-${DEPLOYER}`]: {
    id: `WORDS-${DEPLOYER}`,
    name: 'WORDS',
    allowed_name_length: '20',
    allowed_name_chars: [
      { SingleChar: [45] },
      { CharRangeFromTo: [48, 57] },
      { CharRangeFromTo: [65, 90] },
    ],
    description: 'Allowed: A–Z, 0–9, and -',
  },
  [`CHINESE-${DEPLOYER}`]: {
    id: `CHINESE-${DEPLOYER}`,
    name: 'CHINESE',
    allowed_name_length: '20',
    allowed_name_chars: [
      { SingleChar: [45] },
      { CharRangeFromTo: [19968, 40959] },
    ],
    description: '允许：汉字和 -',
  },
  [`RUSSIAN-${DEPLOYER}`]: {
    id: `RUSSIAN-${DEPLOYER}`,
    name: 'RUSSIAN',
    allowed_name_length: '20',
    allowed_name_chars: [
      { SingleChar: [45] },
      { SingleChar: [1025] },
      { CharRangeFromTo: [1040, 1071] },
    ],
    description: 'Разрешено: А–Я, Ё и -',
  },
};

const FACTORY_SCHEMA = { address: 'ct_factory', collections: COLLECTIONS };

const backendMocks = vi.hoisted(() => ({ listTokens: vi.fn() }));

// The view re-runs its bootstrap effect whenever `loadFactorySchema` changes
// identity, so the hook's return value has to be as stable as the real one.
const factoryMocks = vi.hoisted(() => ({ value: null as any }));

vi.mock('@/api/backend', () => ({
  SuperheroApi: { listTokens: (...args: any[]) => backendMocks.listTokens(...args) },
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({ activeAccount: 'ak_active', sdk: {} }),
}));

vi.mock('@/hooks/useCommunityFactory', () => ({
  useCommunityFactory: () => factoryMocks.value,
}));

vi.mock('@/features/transaction-notification', () => ({
  TxPayloadType: { CreateToken: 'create-token' },
  useTransactionNotification: () => ({
    notifySubmitted: vi.fn(),
    notifyPendingTx: vi.fn(),
    notifyError: vi.fn(),
  }),
}));

vi.mock('@/features/shared/components/LivePriceFormatter', () => ({
  default: () => <span data-testid="live-price" />,
}));

vi.mock('@/components/ConnectWalletButton', () => ({
  ConnectWalletButton: () => <button type="button">connect</button>,
}));

const createCommunityMock = vi.hoisted(() => vi.fn());
vi.mock('../../libs/createCommunity', () => ({
  createCommunity: (...args: any[]) => createCommunityMock(...args),
}));

function renderView() {
  return render(
    <MemoryRouter>
      <CreateTokenView />
    </MemoryRouter>,
  );
}

/** Type into the name field and let the 400ms availability debounce elapse. */
async function typeName(value: string) {
  const input = await screen.findByLabelText('Trend token name');
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  return input;
}

describe('CreateTokenView language auto-detection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    backendMocks.listTokens.mockReset();
    backendMocks.listTokens.mockResolvedValue({ items: [] });
    createCommunityMock.mockReset();
    createCommunityMock.mockResolvedValue('th_hash');
    factoryMocks.value = {
      activeFactorySchema: FACTORY_SCHEMA,
      activeFactoryCollections: Object.values(COLLECTIONS),
      loadFactorySchema: vi.fn().mockResolvedValue(FACTORY_SCHEMA),
      getFactory: vi.fn().mockResolvedValue({ address: 'ct_factory' }),
    };
  });

  it.each([
    ['BITCOIN', 'English'],
    ['北京', 'Chinese'],
    ['МОСКВА', 'Russian'],
  ])('labels %s as %s', async (name, expectedLabel) => {
    renderView();
    await typeName(name);

    expect(await screen.findByText(expectedLabel)).toBeInTheDocument();
    expect(screen.queryByText('Unsupported')).not.toBeInTheDocument();
  });

  it('uppercases typed input so a lowercase name still resolves', async () => {
    renderView();
    const input = await typeName('bitcoin');

    expect((input as HTMLInputElement).value).toBe('BITCOIN');
    expect(await screen.findByText('English')).toBeInTheDocument();
  });

  it('flags a name no collection accepts and blocks submission', async () => {
    renderView();
    await typeName('🚀ROCKET');

    expect(await screen.findByText('Unsupported')).toBeInTheDocument();
    expect(screen.getByText("These characters aren't supported yet")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Token' })).toBeDisabled();
    expect(backendMocks.listTokens).not.toHaveBeenCalled();
  });

  it('flags a name that mixes scripts, since no single collection accepts it', async () => {
    renderView();
    await typeName('北京BEIJING');

    expect(await screen.findByText('Unsupported')).toBeInTheDocument();
  });

  it('shows the detected collection hint rather than the generic one', async () => {
    renderView();
    await typeName('北京');

    expect(await screen.findByText('允许：汉字和 -')).toBeInTheDocument();
  });

  it('checks availability once per settled name, not once per keystroke', async () => {
    renderView();
    const input = await screen.findByLabelText('Trend token name');

    // Separate acts, so each keystroke commits a render the way real typing does.
    const keystrokes = ['B', 'BI', 'BIT', 'BITC', 'BITCO', 'BITCOI', 'BITCOIN'];
    await keystrokes.reduce(
      (previous, value) => previous.then(() => act(async () => {
        fireEvent.change(input, { target: { value } });
        vi.advanceTimersByTime(50);
      })),
      Promise.resolve(),
    );
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(backendMocks.listTokens).toHaveBeenCalledTimes(1);
    });
    expect(backendMocks.listTokens).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'BITCOIN' }),
    );
  });

  it('does not re-query the settled name when typing continues', async () => {
    renderView();
    const input = await typeName('BITCOIN');
    expect(backendMocks.listTokens).toHaveBeenCalledTimes(1);

    // Still inside the debounce window, so the search term has not changed and
    // there is nothing new to ask the backend.
    await act(async () => {
      fireEvent.change(input, { target: { value: 'BITCOINX' } });
      vi.advanceTimersByTime(100);
    });

    expect(backendMocks.listTokens).toHaveBeenCalledTimes(1);
  });

  it('does not judge a name by a later keystroke it has not caught up with', async () => {
    renderView();
    const input = await typeName('BITCOIN');
    await screen.findByText('English');

    // Append an unsupported character but stop short of the debounce window: the
    // status still describes "BITCOIN", so it must not claim the name is taken
    // or available under the newer, unsupported input either.
    await act(async () => {
      fireEvent.change(input, { target: { value: 'BITCOIN🚀' } });
      vi.advanceTimersByTime(100);
    });

    expect(backendMocks.listTokens).toHaveBeenCalledTimes(1);
    expect(backendMocks.listTokens).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'BITCOIN' }),
    );

    // Once the debounce catches up, the verdict applies to what is on screen.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(await screen.findByText('Unsupported')).toBeInTheDocument();
    expect(backendMocks.listTokens).toHaveBeenCalledTimes(1);
  });

  it('offers a picker for an ambiguous name and defaults it to English', async () => {
    renderView();
    // "-" is allowed by every collection, so this name is genuinely ambiguous.
    await typeName('--');

    const chip = await screen.findByRole('button', { expanded: false });
    expect(chip).toHaveTextContent('English');

    await act(async () => {
      fireEvent.click(chip);
    });

    expect(chip).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Chinese' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Chinese' }));
    });
    expect(await screen.findByRole('button', { expanded: false }))
      .toHaveTextContent('Chinese');
  });

  it('does not offer a picker when exactly one collection matches', async () => {
    renderView();
    await typeName('BITCOIN');

    const chip = await screen.findByText('English');
    expect(chip.closest('button')).toBeDisabled();
    expect(chip.closest('button')).not.toHaveAttribute('aria-expanded');
  });

  it('stays quiet while an IME composition is in flight', async () => {
    renderView();
    const input = await screen.findByLabelText('Trend token name');

    // Pinyin for 北京 — Latin text that belongs to no collection, but the user is
    // still mid-word, so flagging it as unsupported would be wrong.
    await act(async () => {
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'beijing' } });
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText('Unsupported')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(input, { target: { value: '北京' } });
      fireEvent.compositionEnd(input, { target: { value: '北京' } });
      vi.advanceTimersByTime(500);
    });

    expect(await screen.findByText('Chinese')).toBeInTheDocument();
  });

  it('deploys under the collection the name actually belongs to', async () => {
    renderView();
    const input = await typeName('BITCOIN');
    expect(await screen.findByText('English')).toBeInTheDocument();

    // Switch scripts and submit in the same tick, the way a paste or an IME
    // commit followed by Enter does. Nothing may deploy a Chinese name under
    // the English collection, whose rules would reject it on chain.
    await act(async () => {
      fireEvent.change(input, { target: { value: '北京' } });
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(createCommunityMock).toHaveBeenCalledTimes(1);
    });
    const [, collectionId, payload] = createCommunityMock.mock.calls[0];
    expect(payload.token.name).toBe('北京');
    expect(collectionId).toBe(COLLECTIONS[`CHINESE-${DEPLOYER}`].id);
  });

  it('refuses to deploy a name no collection accepts', async () => {
    renderView();
    const input = await typeName('BITCOIN');

    await act(async () => {
      fireEvent.change(input, { target: { value: '🚀ROCKET' } });
      fireEvent.submit(input.closest('form')!);
    });

    expect(createCommunityMock).not.toHaveBeenCalled();
  });

  it('never shows a collection the typed name does not belong to', async () => {
    renderView();
    const input = await typeName('BITCOIN');
    expect(await screen.findByText('English')).toBeInTheDocument();

    // The chip must follow the input, not trail a render behind it.
    await act(async () => {
      fireEvent.change(input, { target: { value: '北京' } });
    });

    expect(screen.queryByText('English')).not.toBeInTheDocument();
    expect(screen.getByText('Chinese')).toBeInTheDocument();
  });

  it('reports a name that is already registered', async () => {
    backendMocks.listTokens.mockResolvedValue({
      items: [{ name: 'BITCOIN', address: 'ct_taken', holders_count: 3 }],
    });

    renderView();
    await typeName('BITCOIN');

    expect(await screen.findByText('Trading live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Token' })).toBeDisabled();
  });
});
