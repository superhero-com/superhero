import { render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { TransactionNotificationBanner } from '../TransactionNotificationBanner';

const state = vi.hoisted(() => ({ status: 'submitted', payload: { type: 'social_graph', action: 'follow', targetAddress: 'ak_target' } }));
vi.mock('../transaction-notification.context', async (original) => ({
  ...await original<typeof import('../transaction-notification.context')>(),
  useTransactionNotification: () => ({ notificationState: state, dismissNotification: vi.fn() }),
}));

it.each(['follow', 'unfollow', 'block', 'unblock'])('renders %s feedback for wallet, pending and confirmed states', (action) => {
  state.payload.action = action;
  state.status = 'submitted';
  const view = render(<TransactionNotificationBanner />);
  expect(screen.getByText('Confirm in your wallet')).toBeInTheDocument();
  state.status = 'pending';
  view.rerender(<TransactionNotificationBanner />);
  expect(screen.getByText('Updating connection…')).toBeInTheDocument();
  state.status = 'confirmed';
  view.rerender(<TransactionNotificationBanner />);
  expect(screen.getByText('Connection updated')).toBeInTheDocument();
});
