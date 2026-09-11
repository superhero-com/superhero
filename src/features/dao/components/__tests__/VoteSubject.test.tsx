import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import VoteSubject from '../VoteSubject';

vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: ({ address }: { address: string }) => <span data-testid="address">{address}</span>,
}));

describe('VoteSubject value rendering', () => {
  it('renders a threshold as an integer rather than treating it as an address', () => {
    const voteState = {
      metadata: { subject: { ChangeMinimumTokenThreshold: [10000000000000000001n] } },
    } as any;
    render(<VoteSubject voteState={voteState} />);
    expect(screen.getByText('10000000000000000001')).toBeInTheDocument();
    expect(screen.queryByTestId('address')).not.toBeInTheDocument();
  });
});
