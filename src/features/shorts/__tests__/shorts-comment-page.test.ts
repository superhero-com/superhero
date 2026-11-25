import {
  beforeEach, expect, it, vi,
} from 'vitest';
import { loadCommentPage, mergeComments } from '../shorts-comment-page';
import { request } from '../api';

vi.mock('../api', () => ({ request: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const item = {
  id: '51', author: 'ak_author', text: 'Hello', height: '42', sequence: '9',
};
const published = {
  videoId: 'video', author: item.author, sequence: item.sequence, tx: 'th_new',
};
const first = {
  items: [{ ...item, id: '0', sequence: '1' }], next: '25', total: '101', version: '101',
};

it('searches backwards for the exact author sequence when concurrent comments fill the tail', async () => {
  vi.mocked(request).mockResolvedValueOnce(first)
    .mockResolvedValueOnce({ ...first, items: [{ ...item, author: 'ak_other' }] })
    .mockResolvedValueOnce({ ...first, items: [item] });
  const result = await loadCommentPage('video', new AbortController().signal, published);
  expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual([
    '/video/comments', '/video/comments?cursor=76&version=101', '/video/comments?cursor=51&version=101',
  ]);
  expect(result.items).toEqual([...first.items, item]);
  expect(result.next).toBe('25');
  expect(mergeComments(result.items, [item])).toEqual(result.items);
});

it('avoids tail reads when the new comment is already on the first page', async () => {
  vi.mocked(request).mockResolvedValue({ ...first, items: [item] });
  expect((await loadCommentPage('video', new AbortController().signal, published)).items).toEqual([item]);
  expect(request).toHaveBeenCalledOnce();
});
