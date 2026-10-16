import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import NewPostsPill from '../NewPostsPill';

describe('NewPostsPill', () => {
  beforeEach(async () => { await changeLanguage('en'); });

  it('renders nothing without new posts', () => {
    const { container } = render(<NewPostsPill count={0} onClick={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a pluralized label and calls onClick', () => {
    const onClick = vi.fn();
    const { rerender } = render(<NewPostsPill count={1} onClick={onClick} />);
    expect(screen.getByRole('button', { name: 'Show 1 new post' })).toBeInTheDocument();
    rerender(<NewPostsPill count={3} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show 3 new posts' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
