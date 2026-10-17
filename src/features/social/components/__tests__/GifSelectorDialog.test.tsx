import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  describe, expect, it, vi,
} from 'vitest';
import { GifSelectorDialog } from '../GifSelectorDialog';
import { MAX_POST_MEDIA } from '../../utils/mediaUrl';

const { GIF_URL } = vi.hoisted(() => ({ GIF_URL: 'https://media.giphy.com/media/g1/giphy.gif' }));
const IMAGE_URL = 'https://example.com/cat.png';

vi.mock('@/utils/common', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/utils/common')>(),
  fetchJson: vi.fn().mockResolvedValue({
    results: [{
      id: 'g1', original: GIF_URL, animated: GIF_URL, mp4: null, width: 0, height: 0,
    }],
    totalCount: 1,
    hasMore: false,
  }),
}));

function renderDialog(initialMedia: string[] = []) {
  const onOpenChange = vi.fn();
  const Harness = () => {
    const [mediaUrls, setMediaUrls] = useState(initialMedia);
    return (
      <GifSelectorDialog
        open
        onOpenChange={onOpenChange}
        mediaUrls={mediaUrls}
        onMediaUrlsChange={setMediaUrls}
      />
    );
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

const linkInput = () => screen.getByRole('textbox', { name: 'Image or video link' });
const typeLink = (value: string) => fireEvent.change(linkInput(), { target: { value } });
const previewSrcs = () => screen.queryAllByRole('img', { name: 'media' }).map((img) => img.getAttribute('src'));

describe('GifSelectorDialog — adding media by link', () => {
  it('adds a pasted image link to the post media', () => {
    renderDialog();

    typeLink(IMAGE_URL);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(previewSrcs()).toEqual([IMAGE_URL]);
    expect(linkInput()).toHaveValue('');
  });

  it('adds the link on Enter', () => {
    renderDialog();

    typeLink(IMAGE_URL);
    fireEvent.keyDown(linkInput(), { key: 'Enter' });

    expect(previewSrcs()).toEqual([IMAGE_URL]);
  });

  it('refuses a page link and says why, then clears the error once the link is edited', () => {
    renderDialog();

    typeLink('https://www.youtube.com/watch?v=abc');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('alert')).toHaveTextContent('That link is not an image or video.');
    expect(previewSrcs()).toEqual([]);

    typeLink('https://www.youtube.com/watch?v=ab');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not add the same link twice', () => {
    renderDialog([IMAGE_URL]);

    typeLink(IMAGE_URL);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(previewSrcs()).toEqual([IMAGE_URL]);
  });

  it('stops taking links and GIFs once the post is full', async () => {
    const full = Array.from({ length: MAX_POST_MEDIA }, (_, i) => `https://example.com/${i}.png`);
    renderDialog(full);

    typeLink(IMAGE_URL);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByText(`You can add up to ${MAX_POST_MEDIA} images, GIFs or videos per post.`)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('img', { name: 'GIF preview' }));
    expect(previewSrcs()).toEqual(full);
  });
});

describe('GifSelectorDialog — Confirm', () => {
  it('closes without changes when no link is pending', () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /^confirm/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(previewSrcs()).toEqual([]);
  });

  it('keeps a pasted link that was not added yet', () => {
    const { onOpenChange } = renderDialog();

    typeLink(IMAGE_URL);
    fireEvent.click(screen.getByRole('button', { name: /^confirm/i }));

    expect(previewSrcs()).toEqual([IMAGE_URL]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('stays open with the error when the pending link is invalid', () => {
    const { onOpenChange } = renderDialog();

    typeLink('https://example.com/page');
    fireEvent.click(screen.getByRole('button', { name: /^confirm/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
