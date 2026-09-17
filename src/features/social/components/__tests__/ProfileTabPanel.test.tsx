import { render, screen } from '@testing-library/react';
import {
  afterEach, describe, expect, it,
} from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import ProfileTabPanel from '../ProfileTabPanel';

function renderPanel(ui: ReactNode, activeTab = 'feed') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfileTabPanel activeTab={activeTab}>{ui}</ProfileTabPanel>
    </QueryClientProvider>,
  );
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setOnline(true);
});

describe('ProfileTabPanel', () => {
  it('renders the tab body when everything is fine', () => {
    setOnline(true);
    renderPanel(<div>body content</div>);
    expect(screen.getByText('body content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the offline banner above the body when offline', () => {
    setOnline(false);
    renderPanel(<div>body content</div>);
    expect(screen.getByRole('status')).toHaveTextContent('Offline — showing last loaded');
    // The body still renders — offline shows last loaded, it does not replace it.
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('catches a failed tab and offers a way out without unmounting the header', () => {
    setOnline(true);
    const Boom = () => {
      throw new Error('load failed');
    };
    // The header lives outside the panel, so a thrown tab error must not bubble past it.
    render(
      <QueryClientProvider client={new QueryClient()}>
        <div>header stays</div>
        <ProfileTabPanel activeTab="feed">
          <Boom />
        </ProfileTabPanel>
      </QueryClientProvider>,
    );
    expect(screen.getByText('header stays')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load this tab")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('clears a stuck error when the visitor switches tabs', () => {
    setOnline(true);
    const Boom = () => {
      throw new Error('load failed');
    };
    const client = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ProfileTabPanel activeTab="feed">
          <Boom />
        </ProfileTabPanel>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Couldn't load this tab")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={client}>
        <ProfileTabPanel activeTab="owned">
          <div>owned body</div>
        </ProfileTabPanel>
      </QueryClientProvider>,
    );
    expect(screen.getByText('owned body')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load this tab")).toBeNull();
  });
});
