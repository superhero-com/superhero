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
  it('shows a middle-truncated address but carries the full value on the title', () => {
    render(<AddressCopyChip address={ADDR} />);
    const chip = screen.getByTestId('profile-address-chip');
    expect(chip).toHaveAttribute('title', ADDR);
    expect(chip.textContent).toContain('ak_2XfP');
    expect(chip.textContent).toContain('8K7Qr'.slice(-4));
    expect(chip.textContent).not.toContain(ADDR); // never the full string as body text
  });

  it('copies the full address to the clipboard on click', async () => {
    render(<AddressCopyChip address={ADDR} />);
    fireEvent.click(screen.getByTestId('profile-address-chip'));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(ADDR));
  });
});
