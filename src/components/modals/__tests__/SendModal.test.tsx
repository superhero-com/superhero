import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { Decimal } from '../../../libs/decimal';
import SendModal from '../SendModal';

const RECIPIENT = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';
const SELF = 'ak_2VvB4fFu7BQoJvDs2gyLRcUxAKf6oQBFCLyCyLquTG7Nhtd6Ry';

const mockSpend = vi.fn();
const mockLoadAccountData = vi.fn();
const mockUseAddressByChainName = vi.fn();

let balance = Decimal.from('100');

vi.mock('../../AeButton', () => ({
  // `loading` is an AeButton-only prop; dropping it here keeps React from
  // warning about an unknown attribute on the plain <button> stand-in.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: ({ children, loading, ...props }: any) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock('../../../@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => <div data-testid="address-avatar" />,
}));

vi.mock('../../../hooks', () => ({
  useAeSdk: () => ({
    sdk: { spend: mockSpend },
    activeAccount: SELF,
    activeNetwork: { explorerUrl: 'https://explorer.example' },
  }),
  useAccount: () => ({ decimalBalance: balance, loadAccountData: mockLoadAccountData }),
}));

vi.mock('../../../hooks/useChainName', () => ({
  useChainName: () => ({ chainName: '' }),
  useAddressByChainName: (input?: string) => mockUseAddressByChainName(input),
}));

// The real module pulls in the whole DEX/contract stack; only the unit
// conversion matters here, and it must stay exact so the assertions are real.
vi.mock('../../../libs/dex', () => ({
  toAettos: (amount: string | number, decimals = 18) => {
    const [whole, frac = ''] = String(amount).split('.');
    return BigInt(whole + frac.padEnd(decimals, '0').slice(0, decimals));
  },
}));

const typeRecipient = (value: string) => {
  fireEvent.change(screen.getByLabelText('Recipient'), { target: { value } });
};

const typeAmount = (value: string) => {
  fireEvent.change(screen.getByLabelText(/Amount \(AE\)/), { target: { value } });
};

describe('SendModal', () => {
  beforeEach(() => {
    balance = Decimal.from('100');
    mockUseAddressByChainName.mockReturnValue({ address: null, isLoading: false });
    mockSpend.mockResolvedValue({ hash: 'th_abc' });
  });

  it('prefills the recipient it was opened with', () => {
    render(<SendModal toAddress={RECIPIENT} onClose={() => {}} />);
    expect(screen.getByLabelText('Recipient')).toHaveValue(RECIPIENT);
  });

  it('keeps Send disabled until recipient and amount are both valid', () => {
    render(<SendModal onClose={() => {}} />);
    const send = screen.getByTestId('send-submit');

    expect(send).toBeDisabled();

    typeRecipient(RECIPIENT);
    expect(send).toBeDisabled();

    typeAmount('1');
    expect(send).toBeEnabled();
  });

  it('rejects a malformed address', () => {
    render(<SendModal onClose={() => {}} />);
    typeRecipient('not-an-address');

    expect(screen.getByText('Enter a valid ak_ address or .chain name.')).toBeInTheDocument();
    expect(screen.getByTestId('send-submit')).toBeDisabled();
  });

  it('reports a .chain name that points nowhere, and does not call it malformed', () => {
    render(<SendModal onClose={() => {}} />);
    typeRecipient('ghost.chain');

    expect(screen.getByText("That .chain name doesn't point to an account.")).toBeInTheDocument();
    expect(screen.queryByText('Enter a valid ak_ address or .chain name.')).not.toBeInTheDocument();
  });

  it('spends to the address a .chain name resolves to', async () => {
    mockUseAddressByChainName.mockReturnValue({ address: RECIPIENT, isLoading: false });
    render(<SendModal onClose={() => {}} />);

    typeRecipient('alice.chain');
    typeAmount('2');
    fireEvent.click(screen.getByTestId('send-submit'));

    await waitFor(() => expect(mockSpend).toHaveBeenCalledWith(
      '2000000000000000000',
      RECIPIENT,
    ));
  });

  it('sends the amount in aettos and surfaces the explorer link on success', async () => {
    render(<SendModal onClose={() => {}} />);

    typeRecipient(RECIPIENT);
    typeAmount('1.5');
    fireEvent.click(screen.getByTestId('send-submit'));

    await waitFor(() => expect(mockSpend).toHaveBeenCalledWith(
      '1500000000000000000',
      RECIPIENT,
    ));
    expect(await screen.findByText(/1\.5 AE sent\./)).toBeInTheDocument();
    expect(screen.getByText('View on explorer'))
      .toHaveAttribute('href', 'https://explorer.example/transactions/th_abc');
    // A spent balance is stale on the profile behind this sheet.
    expect(mockLoadAccountData).toHaveBeenCalled();
  });

  it('shows the wallet error and returns to an editable form', async () => {
    mockSpend.mockRejectedValue(new Error('Rejected by user'));
    render(<SendModal onClose={() => {}} />);

    typeRecipient(RECIPIENT);
    typeAmount('1');
    fireEvent.click(screen.getByTestId('send-submit'));

    expect(await screen.findByText('Rejected by user')).toBeInTheDocument();
    expect(screen.getByTestId('send-submit')).toBeEnabled();
  });

  it('blocks an amount above the balance', () => {
    render(<SendModal onClose={() => {}} />);

    typeRecipient(RECIPIENT);
    typeAmount('101');

    expect(screen.getByText('Insufficient balance.')).toBeInTheDocument();
    expect(screen.getByTestId('send-submit')).toBeDisabled();
  });

  it('holds a fee reserve back from Max', () => {
    render(<SendModal onClose={() => {}} />);

    fireEvent.click(screen.getByText('Max'));

    expect(screen.getByLabelText(/Amount \(AE\)/)).toHaveValue('99.999');
  });

  it('offers 0 for Max when the balance cannot cover the reserve', () => {
    balance = Decimal.from('0.0005');
    render(<SendModal onClose={() => {}} />);

    fireEvent.click(screen.getByText('Max'));

    expect(screen.getByLabelText(/Amount \(AE\)/)).toHaveValue('0');
  });

  it('warns when the recipient is the sender', () => {
    render(<SendModal onClose={() => {}} />);
    typeRecipient(SELF);

    expect(screen.getByText("This is your own address — you'd only pay the fee."))
      .toBeInTheDocument();
  });
});
