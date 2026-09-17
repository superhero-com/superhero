import { render, screen, fireEvent } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import ProfileCoverActions from '../ProfileCoverActions';

const copyToClipboard = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/utils/address', () => ({ copyToClipboard }));
vi.mock('../../../../config', () => ({ CONFIG: { EXPLORER_URL: 'https://aescan.io' } }));

const ADDR = 'ak_alice0000000000000000000000000000000000000000000000';

describe('ProfileCoverActions', () => {
  it('renders the share button and the overflow trigger', () => {
    render(<ProfileCoverActions address={ADDR} />);
    expect(screen.getByTestId('profile-share-button')).toBeInTheDocument();
    expect(screen.getByTestId('profile-overflow-trigger')).toBeInTheDocument();
  });

  it('copies the current url when sharing without a native share sheet', async () => {
    render(<ProfileCoverActions address={ADDR} />);
    fireEvent.click(screen.getByTestId('profile-share-button'));
    expect(copyToClipboard).toHaveBeenCalled();
  });
});
