import React from 'react';
import {
  render, screen, fireEvent, within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  describe, it, expect, vi,
} from 'vitest';
import TokenTagOptionsBar from '../TokenTagOptionsBar';

const LABELS: Record<string, string> = {
  'social.tokenTag.barLabel': 'In this post',
  'social.tokenTag.rung1': 'Symbol + 24h change',
  'social.tokenTag.rung2': '+ price',
  'social.tokenTag.rung3': '+ price + chart',
  'social.tokenTag.default': 'default',
  'social.tokenTag.custom': 'Custom',
  'social.tokenTag.customize': 'Customize parts',
  'social.tokenTag.chars': 'ch',
  'social.tokenTag.optionsFor': 'Display options',
  'social.tokenTag.occurrence': 'occurrence',
  'social.tokenTag.howItAppears': 'How it appears in your post',
  'social.tokenTag.close': 'Close',
  'social.tokenTag.done': 'Done',
  'social.tokenTag.on': 'On',
  'social.tokenTag.off': 'Off',
  'social.tokenTag.switchChange': '24h change badge',
  'social.tokenTag.switchPrice': 'Price',
  'social.tokenTag.switchChart': '24h chart',
  'social.tokenTag.customizeHint': 'chart · price · change',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => LABELS[key] ?? key }),
}));
vi.mock('../../../../hooks/useCommunityFactory', () => ({
  useHashtagAllowedChars: () => '',
}));
// The live preview pulls in currency/i18n and a network sparkline; stub it to a marker that
// echoes the rung's options so the ladder can be asserted without the widget's dependencies.
vi.mock('@/components/social/PostTokenTag', () => ({
  TokenPill: ({ options }: { options: Record<string, boolean> }) => (
    <span data-testid="preview" data-opts={`${Number(options.change)}${Number(options.price)}${Number(options.chart)}`} />
  ),
}));
vi.mock('@/api/generated', () => ({
  TokensService: { findByAddress: vi.fn().mockResolvedValue(null) },
}));

function renderBar(value: string, onChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <TokenTagOptionsBar value={value} onChange={onChange} />
    </QueryClientProvider>,
  );
  return { onChange, ...utils };
}

const chips = () => screen.getAllByRole('button').filter((b) => b.getAttribute('aria-haspopup') === 'dialog');

describe('TokenTagOptionsBar — chip bar', () => {
  it('renders nothing when there are no token tags', () => {
    const { container } = renderBar('just a plain post');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one chip per token occurrence, not per symbol', () => {
    renderBar('gm #SUPERHERO and #AETERNITY');
    expect(chips()).toHaveLength(2);

    renderBar('#SUPERHERO beats #SUPERHERO');
    // Two occurrences of the same symbol → two chips.
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('aria-haspopup') === 'dialog').length)
      .toBeGreaterThanOrEqual(2);
  });

  it('labels a chip by what it shows, never by a preset name', () => {
    renderBar('#SUPERHERO{mode=compact}');
    // The wire preset name never reaches the UI.
    expect(screen.queryByText('Compact')).not.toBeInTheDocument();
    expect(screen.queryByText('Tag')).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
    expect(screen.getByText('+ price')).toBeInTheDocument();
  });
});

describe('TokenTagOptionsBar — rung ladder', () => {
  it('opens a ladder of three content-labelled rungs, percentage-only the default', () => {
    renderBar('#SUPERHERO');
    fireEvent.click(chips()[0]);

    const dialog = screen.getByRole('dialog');
    // The badge-less "Symbol only" rung is gone; the ladder opens on the percentage-only default.
    expect(within(dialog).queryByRole('radio', { name: 'Symbol only' })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole('radio')).toHaveLength(3);
    expect(within(dialog).getByRole('radio', { name: 'Symbol + 24h change, default' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: '+ price' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: '+ price + chart' })).toBeInTheDocument();

    // The +price rung's cost is shown: #SUPERHERO{mode=compact} = 24 chars, +14 over the bare tag.
    expect(within(dialog).getByText('24 ch')).toBeInTheDocument();
    expect(within(dialog).getByText('+14')).toBeInTheDocument();
  });

  it('emits {mode=advanced} when the +price+chart rung is chosen', () => {
    const { onChange } = renderBar('#SUPERHERO');
    fireEvent.click(chips()[0]);
    fireEvent.click(screen.getByRole('radio', { name: '+ price + chart' }));
    expect(onChange).toHaveBeenCalledWith('#SUPERHERO{mode=advanced}');
  });

  it('rewrites the correct occurrence — the second #SUPERHERO, not the first', () => {
    const { onChange } = renderBar('#SUPERHERO beats #SUPERHERO');
    fireEvent.click(chips()[1]);
    fireEvent.click(screen.getByRole('radio', { name: '+ price' }));
    expect(onChange).toHaveBeenCalledWith('#SUPERHERO beats #SUPERHERO{mode=compact}');
  });
});

describe('TokenTagOptionsBar — dialog escapes the composer card', () => {
  it('portals the dialog to <body> and keeps it open on an inside click, closes on an outside one', () => {
    const { container } = renderBar('#SUPERHERO');
    fireEvent.click(chips()[0]);

    const dialog = screen.getByRole('dialog');
    // Portalled out of the bar so it escapes the composer card's backdrop-blur stacking context:
    // it lives under <body>, not inside the bar's own container.
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);

    // Outside-click close still works across the portal boundary: a mousedown inside the dialog
    // must not close it (it is no longer a DOM descendant of the bar).
    fireEvent.mouseDown(within(dialog).getByRole('radiogroup'));
    expect(screen.queryByRole('dialog')).toBeInTheDocument();

    // A mousedown truly outside both the bar and the dialog closes it.
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('TokenTagOptionsBar — serialized cap gate', () => {
  // Expand the string the way `serializeMentions` does, so a rung is measured against the wire
  // length (the +40 stands in for a tagged account's `[account:…]` macro elsewhere in the body).
  const serialize = (s: string) => `${s}${'y'.repeat(40)}`;

  it('refuses a rung that would cross the serialized cap, but allows one that fits', () => {
    const onChange = vi.fn();
    // Display 226 chars; serialized 266. Cap 280 → 14 chars of wire room.
    const value = `${'z'.repeat(215)} #SUPERHERO`;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TokenTagOptionsBar
          value={value}
          onChange={onChange}
          characterLimit={280}
          serialize={serialize}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(chips()[0]);

    // +price+chart adds `{mode=advanced}` (15) → 281 serialized. The display math (241) would
    // wrongly say it fits; the serialized gate refuses it.
    fireEvent.click(screen.getByRole('radio', { name: '+ price + chart' }));
    expect(onChange).not.toHaveBeenCalled();

    // +price adds `{mode=compact}` (14) → 280 serialized ≤ 280: accepted.
    fireEvent.click(screen.getByRole('radio', { name: '+ price' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(`${'z'.repeat(215)} #SUPERHERO{mode=compact}`);
  });
});

describe('TokenTagOptionsBar — chip hover leaves the textarea as it found it', () => {
  const BarWithTextarea = ({ value }: { value: string }) => {
    const ref = React.useRef<HTMLTextAreaElement>(null);
    return (
      <>
        <textarea ref={ref} defaultValue={value} data-testid="ta" />
        <TokenTagOptionsBar value={value} onChange={() => {}} textareaRef={ref} />
      </>
    );
  };

  it('restores the prior selection and does not leave the textarea focused when a chip is hovered then left without a click', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <BarWithTextarea value="#SUPERHERO beats #SUPERHERO" />
      </QueryClientProvider>,
    );
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    ta.setSelectionRange(3, 3); // author's caret, textarea not focused
    expect(document.activeElement).not.toBe(ta);

    const chip = chips()[1];
    fireEvent.mouseEnter(chip); // highlights the 2nd occurrence and focuses the textarea
    expect(ta.selectionStart).not.toBe(3);
    expect(document.activeElement).toBe(ta);

    fireEvent.mouseLeave(chip); // left without clicking — must undo both
    expect(ta.selectionStart).toBe(3);
    expect(ta.selectionEnd).toBe(3);
    expect(document.activeElement).not.toBe(ta);
  });
});
