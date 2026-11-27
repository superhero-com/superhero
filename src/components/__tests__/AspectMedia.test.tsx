import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AspectMedia } from '../AspectMedia';

describe('AspectMedia', () => {
  it('plays a video link that carries a query string', () => {
    const { container } = render(<AspectMedia src="https://cdn.example.com/clip.mp4?x=1" alt="media" />);

    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.example.com/clip.mp4?x=1');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a picker GIF, whose size rides in the hash, as an image', () => {
    const src = 'https://media.giphy.com/media/abc/giphy.gif#w=480&h=270';
    const { container } = render(<AspectMedia src={src} alt="media" />);

    expect(screen.getByRole('img', { name: 'media' })).toHaveAttribute('src', src);
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });
});
