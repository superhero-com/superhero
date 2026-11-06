import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { imageReference, imageUrl } from '@/features/profile-images/api';
import { PostMediaGallery } from '../PostMediaGallery';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, args?: { number?: number }) => `${key}${args?.number ?? ''}` }) }));

it('loads only tiny previews in the feed and the full image after opening the dialog', () => {
  const reference = imageReference(`bafy${'a'.repeat(55)}`);
  const { container } = render(<PostMediaGallery media={[reference, `${reference}-preview`, 'ipfs:superhero:images:invalid']} />);
  expect(container.querySelectorAll('img')).toHaveLength(1);
  expect(container.querySelector('img')?.src).toBe(imageUrl(reference, 'preview'));
  fireEvent.click(screen.getByRole('button', { name: 'social.images.open1' }));
  expect(screen.getByRole('dialog').querySelector('img')?.src).toBe(imageUrl(reference));
});

it('uses previews for previously published catalog URLs while keeping legacy GIFs playable', () => {
  const cid = `bafy${'b'.repeat(55)}`;
  const old = `https://superhero.stream/profile-images/images/${cid}/image.webp`;
  const gif = 'https://media.giphy.com/media/example/giphy.gif';
  const { container } = render(<PostMediaGallery media={[old, gif]} />);
  expect([...container.querySelectorAll('img')].map((img) => img.src)).toEqual([imageUrl(imageReference(cid), 'preview'), gif]);
});

it('opens the full image without navigating the feed and supports keyboard browsing and closing', async () => {
  const navigate = vi.fn();
  const urls = ['https://images.example/1.webp', 'https://images.example/2.webp', 'https://images.example/3.webp'];
  render(<div role="presentation" onClick={navigate}><PostMediaGallery media={urls} /></div>);
  fireEvent.click(screen.getByRole('button', { name: 'social.images.open1' }));
  expect(navigate).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog');
  expect(dialog.querySelector('img')?.src).toBe(urls[0]);
  fireEvent.keyDown(dialog, { key: 'ArrowRight' });
  expect(dialog.querySelector('img')?.src).toBe(urls[1]);
  fireEvent.click(screen.getByRole('button', { name: 'social.images.previous' }));
  expect(dialog.querySelector('img')?.src).toBe(urls[0]);
  fireEvent.keyDown(dialog, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(navigate).not.toHaveBeenCalled();
});
