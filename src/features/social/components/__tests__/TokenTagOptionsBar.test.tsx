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
  'social.tokenTag.rung0': 'Symbol only',
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
  it('opens a ladder of four content-labelled rungs with per-rung character cost', () => {
    renderBar('#SUPERHERO');
    fireEvent.click(chips()[0]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: 'Symbol only' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Symbol + 24h change, default' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: '+ price' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: '+ price + chart' })).toBeInTheDocument();

    // Rung 0 (`{change=0}`) costs more than the default: #SUPERHERO{change=0} = 20 chars, +10.
    expect(within(dialog).getByText('20 ch')).toBeInTheDocument();
    expect(within(dialog).getByText('+10')).toBeInTheDocument();
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
