import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { EditProfileDialog } from '../EditProfileDialog';

const updateMyProfile = vi.fn().mockResolvedValue(undefined);
let mockProfile: { name?: string; aeAddress?: string } | null = null;
let mockActiveAccount: string | undefined = 'ak_active';

vi.mock('@/hooks', () => ({
  useAccount: () => ({ activeAccount: mockActiveAccount }),
}));

vi.mock('../../hooks/useChat', () => ({
  useChat: () => ({ profile: mockProfile, profileService: { updateMyProfile } }),
}));

describe('EditProfileDialog — æ address is a confirmed choice', () => {
  beforeEach(() => {
    updateMyProfile.mockClear();
    mockProfile = null;
    mockActiveAccount = 'ak_active';
  });

  it('does not publish the address until the user opts in and confirms', async () => {
    render(<EditProfileDialog open onOpenChange={() => {}} />);

    // Opt in, then Save shows a confirm step naming the exact address.
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Publish your æternity address?')).toBeInTheDocument();
    expect(screen.getByText('ak_active')).toBeInTheDocument();
    expect(updateMyProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm & publish' }));

    await waitFor(() => expect(updateMyProfile).toHaveBeenCalledTimes(1));
    expect(updateMyProfile.mock.calls[0][0]).toMatchObject({ aeAddress: 'ak_active' });
  });

  it('saving without opting in never publishes an address and needs no confirm', async () => {
    render(<EditProfileDialog open onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByText('Publish your æternity address?')).not.toBeInTheDocument();
    await waitFor(() => expect(updateMyProfile).toHaveBeenCalledTimes(1));
    expect(updateMyProfile.mock.calls[0][0].aeAddress).toBeUndefined();
  });

  it('lets a user who already published turn the choice off, clearing the address', async () => {
    mockProfile = { name: 'Alice', aeAddress: 'ak_published' };
    render(<EditProfileDialog open onOpenChange={() => {}} />);

    // Initialised on because the profile already carries an address.
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox); // turn it off
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // No confirm needed to stop publishing.
    expect(screen.queryByText('Publish your æternity address?')).not.toBeInTheDocument();
    await waitFor(() => expect(updateMyProfile).toHaveBeenCalledTimes(1));
    expect(updateMyProfile.mock.calls[0][0].aeAddress).toBeUndefined();
  });
});
