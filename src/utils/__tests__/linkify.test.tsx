import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, it, expect, vi,
} from 'vitest';
import { linkify } from '../linkify';
import { mergedCollectionNameCharsPattern } from '../collectionNameChars';
import type { ICollectionData } from '../types';

// The account-mention chip resolves a chain name via a batched network hook; pin it
// so these render tests stay deterministic and offline.
vi.mock('@/hooks/useChainName', () => ({
  useChainName: () => ({ chainName: null }),
}));

// The enhanced widget fetches token data and pulls in currency/i18n providers; the reader's
// job here is to consume the envelope and choose the right node, so the widget is stubbed to
// a marker that echoes the symbol and the resolved options.
vi.mock('@/components/social/PostTokenTag', () => ({
  default: ({ symbol, options }: { symbol: string; options: Record<string, boolean> }) => (
    <span
      data-testid="post-token-tag"
      data-symbol={symbol}
      data-chart={String(options.chart)}
      data-price={String(options.price)}
      data-change={String(options.change)}
    >
      {`#${symbol}`}
    </span>
  ),
}));

function renderLinkify(text: string, options?: Parameters<typeof linkify>[1]) {
  return render(
    <MemoryRouter>
      <div data-testid="content">{linkify(text, options)}</div>
    </MemoryRouter>,
  );
}

// Mirrors the non-Latin BCL collections deployed on mainnet.
const CHINESE_COLLECTION: ICollectionData = {
  id: 'CHINESE-ak_2vmVWHYLRaqdoyLdWEUBi1NodQ3MA1bFuqqRe9A5DgNv3qoDuV',
  name: 'CHINESE',
  allowed_name_length: '20',
  allowed_name_chars: [{ SingleChar: [45] }, { CharRangeFromTo: [19968, 40959] }],
};
const ARABIC_COLLECTION: ICollectionData = {
  id: 'ARABIC-ak_2vmVWHYLRaqdoyLdWEUBi1NodQ3MA1bFuqqRe9A5DgNv3qoDuV',
  name: 'ARABIC',
  allowed_name_length: '20',
  allowed_name_chars: [{ SingleChar: [45] }, { CharRangeFromTo: [1569, 1610] }],
};
const RUSSIAN_COLLECTION: ICollectionData = {
  id: 'RUSSIAN-ak_2vmVWHYLRaqdoyLdWEUBi1NodQ3MA1bFuqqRe9A5DgNv3qoDuV',
  name: 'RUSSIAN',
  allowed_name_length: '20',
  allowed_name_chars: [
    { SingleChar: [45] },
    { SingleChar: [1025] },
    { CharRangeFromTo: [1040, 1071] },
  ],
};
const BCL_COLLECTIONS = [CHINESE_COLLECTION, ARABIC_COLLECTION, RUSSIAN_COLLECTION];

describe('linkify hashtag parsing', () => {
  it('parses "#emoter.ai/" as the hashtag "#emoter" followed by plain text ".ai/"', () => {
    renderLinkify("What's up people? #emoter.ai/ is the future :)");

    const link = screen.getByRole('link', { name: '#emoter' });
    expect(link).toHaveAttribute('href', '/trends/tokens/EMOTER');

    // The dot-prefixed remainder must not be turned into an external link.
    expect(screen.queryByRole('link', { name: /emoter\.ai/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe(
      "What's up people? #emoter.ai/ is the future :)",
    );
  });

  it('does not allow dots inside the parsed token name', () => {
    renderLinkify('check out #foo.bar.baz now');

    expect(screen.getByRole('link', { name: '#foo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /foo\.bar/i })).not.toBeInTheDocument();
  });

  it('links a plain hashtag to the uppercased trending tokens route', () => {
    renderLinkify('gm #ROCK-N-ROLL fam');

    const link = screen.getByRole('link', { name: '#ROCK-N-ROLL' });
    expect(link).toHaveAttribute('href', '/trends/tokens/ROCK-N-ROLL');
  });

  it('parses multiple hashtags in the same message independently', () => {
    renderLinkify('#one and #two are both tokens');

    expect(screen.getByRole('link', { name: '#one' })).toHaveAttribute('href', '/trends/tokens/ONE');
    expect(screen.getByRole('link', { name: '#two' })).toHaveAttribute('href', '/trends/tokens/TWO');
  });

  it('does not let an AENS-style suffix swallow the hashtag ("#foo.chain")', () => {
    renderLinkify('shoutout #foo.chain today');

    expect(screen.getByRole('link', { name: '#foo' })).toBeInTheDocument();
    // ".chain" is not a known chain name here, so it should stay plain text, not
    // be consumed by the AENS matcher as part of a stolen token.
    expect(screen.getByTestId('content').textContent).toBe('shoutout #foo.chain today');
  });

  it('does not let an account-style suffix swallow the hashtag ("#ak_123abc")', () => {
    renderLinkify('gm #ak_123abc gm');

    expect(screen.getByRole('link', { name: '#ak' })).toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('gm #ak_123abc gm');
  });

  it('still linkifies ordinary URLs that are not preceded by a hashtag', () => {
    renderLinkify('visit https://example.com/page#section for more');

    const link = screen.getByRole('link', { name: /example\.com\/page/i });
    expect(link).toHaveAttribute('href', 'https://example.com/page#section');
  });

  it('still linkifies bare domains that are not preceded by a hashtag', () => {
    renderLinkify('the future is emoter.ai/ now');

    expect(screen.getByRole('link', { name: /emoter\.ai/i })).toBeInTheDocument();
  });

  it('still linkifies known AENS names that are not preceded by a hashtag', () => {
    renderLinkify('say hi to bob.chain', { knownChainNames: new Set(['bob.chain']) });

    const link = screen.getByRole('link', { name: 'bob.chain' });
    expect(link).toHaveAttribute('href', '/users/bob.chain');
  });

  it('still linkifies ak_ account mentions that are not preceded by a hashtag', () => {
    renderLinkify('sent to ak_123abc456');

    const link = screen.getByRole('link', { name: /ak_123abc456/i });
    expect(link).toHaveAttribute('href', '/users/ak_123abc456');
  });

  const MACRO_ADDR = 'ak_2mMPQ2E9zN8Dd6Fm8jrThQvcYQ7cwR3hh6iC5xGZ2gZ4tHacBdEf';

  it('renders an [account:ak_...] macro as an inline account chip', () => {
    renderLinkify(`gm [account:${MACRO_ADDR}] there`);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/users/${MACRO_ADDR}`);
    // The macro delimiters are consumed, and the chip label is '@'-prefixed.
    expect(screen.getByTestId('content').textContent).not.toContain('[account:');
    expect(link.textContent).toMatch(/^@ak_/);
  });

  it('leaves a bare ak_ address as a plain link, not a macro chip', () => {
    renderLinkify(`plain ${MACRO_ADDR} address`);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/users/${MACRO_ADDR}`);
    // No '@' prefix: this is the plain-link path, not the chip.
    expect(link.textContent).not.toContain('@');
  });

  it('treats a lone "#" with no following token characters as plain text', () => {
    renderLinkify('price went up # nice');

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('price went up # nice');
  });

  it('links every hashtag in a run with no separator ("#one#two")', () => {
    renderLinkify('gm #one#two gm');

    expect(screen.getByRole('link', { name: '#one' })).toHaveAttribute('href', '/trends/tokens/ONE');
    expect(screen.getByRole('link', { name: '#two' })).toHaveAttribute('href', '/trends/tokens/TWO');
    expect(screen.getByTestId('content').textContent).toBe('gm #one#two gm');
  });

  it('links three chained hashtags with no separators ("#one#two#three")', () => {
    renderLinkify('#one#two#three');

    expect(screen.getByRole('link', { name: '#one' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#two' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#three' })).toBeInTheDocument();
  });

  it('links hashtags separated by punctuation with no space ("#one,#two")', () => {
    renderLinkify('#one,#two');

    expect(screen.getByRole('link', { name: '#one' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#two' })).toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('#one,#two');
  });

  it('resumes hashtag parsing after an invalid dotted remainder ("#emoter.ai/#foo")', () => {
    renderLinkify('#emoter.ai/#foo');

    expect(screen.getByRole('link', { name: '#emoter' })).toHaveAttribute('href', '/trends/tokens/EMOTER');
    expect(screen.getByRole('link', { name: '#foo' })).toHaveAttribute('href', '/trends/tokens/FOO');
    expect(screen.getByTestId('content').textContent).toBe('#emoter.ai/#foo');
  });

  it('treats a stray leading "#" as inert text but still links a later valid tag ("##foo")', () => {
    renderLinkify('##foo');

    const link = screen.getByRole('link', { name: '#foo' });
    expect(link).toHaveAttribute('href', '/trends/tokens/FOO');
    expect(screen.getByTestId('content').textContent).toBe('##foo');
  });

  it('leaves a run with no valid token anywhere fully untouched ("#_bad_stuff")', () => {
    renderLinkify('gm #_bad_stuff gm');

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('gm #_bad_stuff gm');
  });

  it('does not treat a URL fragment as a hashtag when chained after a real hashtag word', () => {
    renderLinkify('see #emoter then visit https://example.com/page#section');

    expect(screen.getByRole('link', { name: '#emoter' })).toBeInTheDocument();
    const urlLink = screen.getByRole('link', { name: /example\.com\/page/i });
    expect(urlLink).toHaveAttribute('href', 'https://example.com/page#section');
    expect(screen.queryByRole('link', { name: '#section' })).not.toBeInTheDocument();
  });

  it('links a hashtag immediately after punctuation with no space ("see,#TOKEN")', () => {
    renderLinkify('see,#TOKEN');

    expect(screen.getByRole('link', { name: '#TOKEN' })).toHaveAttribute('href', '/trends/tokens/TOKEN');
    expect(screen.getByTestId('content').textContent).toBe('see,#TOKEN');
  });

  it('links a hashtag immediately after CJK text with no space ("支持#TOKEN")', () => {
    renderLinkify('支持#TOKEN');

    expect(screen.getByRole('link', { name: '#TOKEN' })).toHaveAttribute('href', '/trends/tokens/TOKEN');
    expect(screen.getByTestId('content').textContent).toBe('支持#TOKEN');
  });

  it('still protects a URL fragment with no path segment ("example.com#section")', () => {
    renderLinkify('check example.com#section out');

    expect(screen.queryByRole('link', { name: '#section' })).not.toBeInTheDocument();
  });

  it('still protects a root-URL fragment right after a slash ("https://example.com/#top")', () => {
    renderLinkify('go to https://example.com/#top now');

    expect(screen.queryByRole('link', { name: '#top' })).not.toBeInTheDocument();
    const urlLink = screen.getByRole('link', { name: /example\.com/i });
    expect(urlLink).toHaveAttribute('href', 'https://example.com/#top');
  });
});

describe('linkify hashtag parsing — non-Latin BCL collections', () => {
  const hashtagAllowedChars = mergedCollectionNameCharsPattern(BCL_COLLECTIONS);

  it('does not link a non-Latin token name when no collection data is provided (pre-load default)', () => {
    renderLinkify('gm #你好 gm');

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('gm #你好 gm');
  });

  it('links a Chinese token name once the Chinese collection is known', () => {
    renderLinkify('gm #你好 gm', { hashtagAllowedChars });

    const link = screen.getByRole('link', { name: '#你好' });
    expect(link).toHaveAttribute('href', `/trends/tokens/${encodeURIComponent('你好')}`);
  });

  it('links a Chinese token name immediately preceded by other CJK text with no space', () => {
    renderLinkify('支持#你好', { hashtagAllowedChars });

    const link = screen.getByRole('link', { name: '#你好' });
    expect(link).toHaveAttribute('href', `/trends/tokens/${encodeURIComponent('你好')}`);
    expect(screen.getByTestId('content').textContent).toBe('支持#你好');
  });

  it('links an Arabic token name once the Arabic collection is known', () => {
    renderLinkify('#مرحبا is trending', { hashtagAllowedChars });

    expect(screen.getByRole('link', { name: '#مرحبا' })).toBeInTheDocument();
  });

  it('links an uppercase Russian token name (including Ё) once the Russian collection is known', () => {
    renderLinkify('#ПРИВЕТЁ is trending', { hashtagAllowedChars });

    expect(screen.getByRole('link', { name: '#ПРИВЕТЁ' })).toBeInTheDocument();
  });

  it('still stops a non-Latin token name at an invalid trailing character', () => {
    renderLinkify('#你好.link is trending', { hashtagAllowedChars });

    expect(screen.getByRole('link', { name: '#你好' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /你好\.link/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('#你好.link is trending');
  });

  it('still links plain Latin hashtags when collection chars are provided alongside them', () => {
    renderLinkify('gm #ROCK-N-ROLL and #你好', { hashtagAllowedChars });

    expect(screen.getByRole('link', { name: '#ROCK-N-ROLL' })).toHaveAttribute('href', '/trends/tokens/ROCK-N-ROLL');
    expect(screen.getByRole('link', { name: '#你好' })).toBeInTheDocument();
  });

  it('does not link characters that belong to no known collection', () => {
    renderLinkify('gm #こんにちは gm', { hashtagAllowedChars });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('linkify token-tag envelope reader', () => {
  it('renders a bare #SYMBOL exactly as before (no envelope)', () => {
    renderLinkify('gm #SUPERHERO fam');

    expect(screen.getByRole('link', { name: '#SUPERHERO' }))
      .toHaveAttribute('href', '/trends/tokens/SUPERHERO');
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('gm #SUPERHERO fam');
  });

  it('consumes an empty envelope and renders the plain tag', () => {
    renderLinkify('gm #SUPERHERO{} fam');

    expect(screen.getByRole('link', { name: '#SUPERHERO' })).toBeInTheDocument();
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('gm #SUPERHERO fam');
  });

  it('treats mode=tag as the plain tag', () => {
    renderLinkify('#SUPERHERO{mode=tag}');

    expect(screen.getByRole('link', { name: '#SUPERHERO' })).toBeInTheDocument();
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('#SUPERHERO');
  });

  it('treats {change=0} as a plain tag, not a widget (badge gating tested in PostHashtagLink)', () => {
    renderLinkify('#SUPERHERO{change=0}');

    expect(screen.getByRole('link', { name: '#SUPERHERO' })).toBeInTheDocument();
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('#SUPERHERO');
  });

  it('treats the fully-explicit all-off form as a plain tag', () => {
    renderLinkify('#SUPERHERO{chart=0;price=0;change=0}');

    expect(screen.getByRole('link', { name: '#SUPERHERO' })).toBeInTheDocument();
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('#SUPERHERO');
  });

  it('renders a widget for mode=compact (price + change, no chart)', () => {
    renderLinkify('#SUPERHERO{mode=compact}');

    const widget = screen.getByTestId('post-token-tag');
    expect(widget).toHaveAttribute('data-symbol', 'SUPERHERO');
    expect(widget).toHaveAttribute('data-price', 'true');
    expect(widget).toHaveAttribute('data-change', 'true');
    expect(widget).toHaveAttribute('data-chart', 'false');
    expect(screen.getByTestId('content').textContent).toBe('#SUPERHERO');
  });

  it('renders a widget for mode=advanced (chart + price + change)', () => {
    renderLinkify('#SUPERHERO{mode=advanced}');

    const widget = screen.getByTestId('post-token-tag');
    expect(widget).toHaveAttribute('data-chart', 'true');
    expect(widget).toHaveAttribute('data-price', 'true');
    expect(widget).toHaveAttribute('data-change', 'true');
    expect(screen.getByTestId('content').textContent).toBe('#SUPERHERO');
  });

  it('honours an explicit override — advanced minus the chart', () => {
    renderLinkify('#SUPERHERO{mode=advanced;chart=0}');

    const widget = screen.getByTestId('post-token-tag');
    expect(widget).toHaveAttribute('data-chart', 'false');
    expect(widget).toHaveAttribute('data-price', 'true');
    expect(widget).toHaveAttribute('data-change', 'true');
  });

  // The forward-compatibility proof: an envelope written by a future client renders as a
  // clean plain tag in today's client, never as broken text.
  it('renders an unknown future envelope as a clean plain tag', () => {
    renderLinkify('#SUPERHERO{mode=hologram;fps=60}');

    expect(screen.getByRole('link', { name: '#SUPERHERO' })).toBeInTheDocument();
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('#SUPERHERO');
    expect(screen.getByTestId('content').textContent).not.toContain('{');
  });

  it('consumes an unparseable envelope and renders the plain tag', () => {
    renderLinkify('#SUPERHERO{!!garbage!!}');

    expect(screen.getByRole('link', { name: '#SUPERHERO' })).toBeInTheDocument();
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('content').textContent).toBe('#SUPERHERO');
  });

  it('never prints the braces and preserves the surrounding text', () => {
    renderLinkify('gm #SUPERHERO{mode=advanced} to the moon');

    expect(screen.getByTestId('post-token-tag')).toHaveAttribute('data-symbol', 'SUPERHERO');
    const { textContent } = screen.getByTestId('content');
    expect(textContent).toBe('gm #SUPERHERO to the moon');
    expect(textContent).not.toContain('{');
    expect(textContent).not.toContain('}');
  });

  it('reads an envelope on a hyphenated symbol', () => {
    renderLinkify('#EMOTER-AI{mode=advanced}');

    expect(screen.getByTestId('post-token-tag')).toHaveAttribute('data-symbol', 'EMOTER-AI');
    expect(screen.getByTestId('content').textContent).toBe('#EMOTER-AI');
  });

  it('an unterminated brace is not an envelope and the tag still links', () => {
    renderLinkify('#SUPERHERO{mode=advanced fam');

    expect(screen.getByRole('link', { name: '#SUPERHERO' })).toBeInTheDocument();
    expect(screen.queryByTestId('post-token-tag')).not.toBeInTheDocument();
  });
});
