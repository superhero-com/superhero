// The dangerous-scheme literals below (javascript:/data:) are URL-scheme regression-test
// fixtures, not real navigations — disabling the (correct, in production code) no-script-url
// lint rule for this file only.
/* eslint-disable no-script-url */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { LinkPreviewCard } from '../LinkPreviewCard';

const PAGE_URL = 'https://example.com/some-article';

function ogHtml(ogUrl: string): string {
  return `<!doctype html><html><head>
    <meta property="og:title" content="Malicious page" />
    <meta property="og:url" content="${ogUrl}" />
  </head><body></body></html>`;
}

describe('LinkPreviewCard (scheme-validated href)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a javascript: og:url from a remote page as inert (no javascript: href in the DOM)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => ogHtml('javascript:alert(1)'),
    });

    render(<LinkPreviewCard url={PAGE_URL} />);

    const link = await screen.findByText('Malicious page');
    const anchor = link.closest('a');
    expect(anchor).not.toBeNull();

    // The dangerous scheme must never reach the DOM…
    expect(anchor).not.toHaveAttribute('href', expect.stringContaining('javascript:'));
    expect(document.body.innerHTML).not.toContain('javascript:alert');
    // …and it should fall back to the trusted (http/https-only) page URL instead.
    expect(anchor).toHaveAttribute('href', PAGE_URL);
  });

  it('renders a data:text/html og:url from a remote page as inert', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => ogHtml('data:text/html,<script>alert(1)</script>'),
    });

    render(<LinkPreviewCard url={PAGE_URL} />);

    const link = await screen.findByText('Malicious page');
    const anchor = link.closest('a');
    expect(anchor).toHaveAttribute('href', PAGE_URL);
    expect(document.body.innerHTML).not.toContain('data:text/html');
  });

  it('renders a whitespace-obfuscated javascript: og:url as inert', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => ogHtml('java\tscript:alert(1)'),
    });

    render(<LinkPreviewCard url={PAGE_URL} />);

    const link = await screen.findByText('Malicious page');
    const anchor = link.closest('a');
    expect(anchor).toHaveAttribute('href', PAGE_URL);
  });

  it('uses a legitimate https og:url as-is', async () => {
    const ogUrl = 'https://example.com/canonical-article';
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => ogHtml(ogUrl),
    });

    render(<LinkPreviewCard url={PAGE_URL} />);

    const link = await screen.findByText('Malicious page');
    const anchor = link.closest('a');
    expect(anchor).toHaveAttribute('href', ogUrl);
  });

  it('keeps rel="noopener noreferrer" and target="_blank" on the external anchor', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => ogHtml('https://example.com/canonical-article'),
    });

    render(<LinkPreviewCard url={PAGE_URL} />);

    const link = await screen.findByText('Malicious page');
    const anchor = link.closest('a');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor).toHaveAttribute('target', '_blank');
  });

  it('does not render a preview card at all when all proxies fail', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { container } = render(<LinkPreviewCard url={PAGE_URL} />);
    await waitFor(() => expect(container.querySelector('a')).toBeNull());
  });
});
