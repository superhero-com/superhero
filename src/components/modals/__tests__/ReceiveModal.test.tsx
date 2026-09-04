import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

import ReceiveModal from '../ReceiveModal';

const ADDRESS = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';

const mockCopyToClipboard = vi.fn();

vi.mock('../../AeButton', () => ({
  default: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('../../../@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => <div data-testid="address-avatar" />,
}));

vi.mock('../../../hooks/useChainName', () => ({
  useChainName: () => ({ chainName: 'alice.chain' }),
}));

vi.mock('../../../utils/address', () => ({
  copyToClipboard: (text: string) => mockCopyToClipboard(text),
}));

afterEach(() => {
  // navigator.share is assigned per-test; drop it so the next test starts clean.
  delete (navigator as any).share;
});

describe('ReceiveModal', () => {
  it('shows the address, its chain name and a scannable QR', () => {
    render(<ReceiveModal address={ADDRESS} onClose={() => {}} />);

    expect(screen.getByText(ADDRESS)).toBeInTheDocument();
    expect(screen.getByText('alice.chain')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });

  it('copies the raw address and confirms it', async () => {
    mockCopyToClipboard.mockResolvedValue(true);
    render(<ReceiveModal address={ADDRESS} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Copy address'));

    await waitFor(() => expect(mockCopyToClipboard).toHaveBeenCalledWith(ADDRESS));
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument());
  });

  it('keeps the copy button un-confirmed when the clipboard write fails', async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    render(<ReceiveModal address={ADDRESS} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Copy address'));

    await waitFor(() => expect(mockCopyToClipboard).toHaveBeenCalled());
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
  });

  it('offers Share only where the Web Share API exists', () => {
    const { unmount } = render(<ReceiveModal address={ADDRESS} onClose={() => {}} />);
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    unmount();

    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as any).share = share;
    render(<ReceiveModal address={ADDRESS} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Share'));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: ADDRESS }));
  });

  it('closes on the close action', () => {
    const onClose = vi.fn();
    render(<ReceiveModal address={ADDRESS} onClose={onClose} />);

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
