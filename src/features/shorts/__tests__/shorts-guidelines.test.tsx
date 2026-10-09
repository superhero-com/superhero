import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import { ShortsGuidelines } from '../shorts-guidelines';
import { ShortsJourney } from '../shorts-journey';
import type { Short } from '../types';

const video = (overrides: Partial<Short> = {}) => ({
  id: 'a', title: 'My Short', status: 'draft', moderation: 'pending', publicationStatus: 'draft', guidelines: { status: 'reviewing' }, ...overrides,
} as Short);
describe('Publication and feed status', () => {
  it('offers free publication for a draft', () => {
    const publish = vi.fn(); render(<MemoryRouter><ShortsJourney video={video()} busy={false} publish={publish} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' })); expect(publish).toHaveBeenCalledOnce();
    expect(screen.queryByText(/coverage|payment|top.up/i)).not.toBeInTheDocument();
  });
  it('shares published content independently of feed eligibility', () => {
    render(<MemoryRouter><ShortsJourney video={video({ publicationStatus: 'published', status: 'rejected', guidelines: { status: 'ineligible' } })} busy={false} publish={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Watch & share' })).toHaveAttribute('href', '/shorts?short=a');
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });
  it('does not offer publication or sharing after withdrawal', () => {
    render(<MemoryRouter><ShortsJourney video={video({ publicationStatus: 'withdrawn' })} busy={false} publish={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Watch & share' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });
  it('hides inactive scans and demo checks', () => {
    const { rerender } = render(<ShortsGuidelines video={video({ guidelines: { status: 'unavailable' } })} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    rerender(<ShortsGuidelines video={video({ guidelines: { status: 'eligible', approval: 'demo' } })} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
