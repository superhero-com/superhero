import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { MentionPill } from '../PostMentionTag';

function renderPill(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('MentionPill', () => {
  it('renders a resolved mention as a linked pill with the @ sigil', () => {
    renderPill(<MentionPill name="marco" href="/users/marco" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/users/marco');
    expect(link).toHaveTextContent('@marco');
    expect(link.getAttribute('aria-label')).toContain('mention');
  });

  it('uses a distinct display label when given (formatted address)', () => {
    renderPill(<MentionPill name="ak_123abc" label="ak_12…abc" href="/users/ak_123abc" />);
    expect(screen.getByRole('link')).toHaveTextContent('@ak_12…abc');
  });

  it('renders an unresolvable handle as plain text — no pill, no link', () => {
    const { container } = renderPill(<MentionPill name="deleted_user" href="#" unresolvable />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('.sh-pill-plain')).toHaveTextContent('@deleted_user');
  });
});
