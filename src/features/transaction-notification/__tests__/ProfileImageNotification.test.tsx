import { render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { TransactionNotificationBanner } from '../TransactionNotificationBanner';

const state = vi.hoisted(() => ({
  status: 'pending', payload: { type: 'update_profile', fields: ['avatar'] },
}));
vi.mock('../transaction-notification.context', async (original) => ({
  ...await original<typeof import('../transaction-notification.context')>(),
  useTransactionNotification: () => ({ notificationState: state, dismissNotification: vi.fn() }),
}));

it.each(['avatar', 'cover'])('shows the network wait for %s, then replaces it with success', (field) => {
  state.payload.fields = [field]; state.status = 'pending';
  const view = render(<TransactionNotificationBanner />);
  expect(screen.getByText('Confirming on-chain…')).toBeInTheDocument();
  expect(screen.queryByText(/Saving your/)).not.toBeInTheDocument();
  state.status = 'confirmed';
  view.rerender(<TransactionNotificationBanner />);
  expect(screen.queryByText('Confirming on-chain…')).not.toBeInTheDocument();
  expect(screen.getByText('Profile updated')).toBeInTheDocument();
});
