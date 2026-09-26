import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenInformation from '../TokenInformation';

vi.mock('@/hooks/useChainName', () => ({ useChainName: () => ({ chainName: 'nova.chain' }) }));
vi.mock('@/config', () => ({ CONFIG: { EXPLORER_URL: 'https://testnet.aescan.io' } }));
const creator = 'ak_29DbufRiJiyVVZN1VcCLniSvdoTuqnkCaP2aP9fPR6N6idXTjV';
const mount = (data: Partial<TokenDto>) => render(
  <MemoryRouter><TokenInformation token={data as TokenDto} /></MemoryRouter>,
);

describe('Token information', () => {
  it('converts aetto treasury units, shows the full creator address and uses the configured explorer', () => {
    mount({
      creator_address: creator, sale_address: 'ct_sale', address: 'ct_token', dao_balance: '1324670000000000000000', created_at: '2025-04-18T12:00:00Z',
    });
    expect(screen.getByText(creator)).toBeVisible();
    expect(screen.getByRole('link', { name: 'nova.chain' })).toHaveAttribute('href', `/users/${creator}`);
    expect(screen.getByText('1,324.67')).toBeVisible();
    expect(screen.getByRole('link', { name: /View on æScan/ })).toHaveAttribute('href', 'https://testnet.aescan.io/contracts/ct_sale?type=call-transactions');
    fireEvent.click(screen.getByRole('button', { name: 'Contracts' }));
    expect(screen.getByText('ct_token')).toBeVisible();
    expect(screen.getByText('ct_sale')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View on æScan · Token contract' })).toHaveAttribute('href', 'https://testnet.aescan.io/contracts/ct_token');
  });

  it('distinguishes zero treasury from unknown data and does not invent contract addresses', () => {
    const view = mount({ dao_balance: '0', created_at: 'not-a-date', creator_address: creator });
    expect(screen.getByText('0')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Contracts' }));
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /View on æScan/ })).not.toBeInTheDocument();
    view.unmount();
    mount({ dao_balance: '' });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /Open DAO/ })).not.toBeInTheDocument();
  });
});
