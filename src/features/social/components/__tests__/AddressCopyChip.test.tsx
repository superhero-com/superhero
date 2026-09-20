import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import AddressCopyChip from '../AddressCopyChip';

const copyToClipboard = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/utils/address', () => ({ copyToClipboard }));

const ADDR = 'ak_2XfPqR7nL9vK4mB1sT6wY8dH3jN5cZ0gQxEeUuIiOoPp8K7Qr';

describe('AddressCopyChip', () => {
  it('renders the full address with wrapping permitted instead of visual truncation', () => {
    render(<AddressCopyChip address={ADDR} />);
    const chip = screen.getByTestId('profile-address-chip');
    expect(chip).toHaveAttribute('title', ADDR);
    expect(chip.textContent).toContain(ADDR); // full address, never middle-truncated
    const value = chip.querySelector('span');
    expect(value).toHaveAttribute('dir', 'ltr');
    const truncationClasses = /truncate|text-ellipsis|whitespace-nowrap|overflow-hidden/;
    expect(value?.className).not.toMatch(truncationClasses);
  });

  it('copies the full address to the clipboard on click', async () => {
    render(<AddressCopyChip address={ADDR} />);
    fireEvent.click(screen.getByTestId('profile-address-chip'));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(ADDR));
  });
});
