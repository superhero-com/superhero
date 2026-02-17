import {
  describe, it, expect, beforeEach, vi, afterEach,
} from 'vitest';
import { PostsService } from '@/api/generated';
import { resolvePostByKey } from '../utils/resolvePost';

describe('resolvePostByKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves direct id with _v3', async () => {
    const post = { id: '123_v3', content: 'hello' } as any;
    const getById = vi.spyOn(PostsService, 'getById').mockResolvedValue(post as any);
    const listAll = vi.spyOn(PostsService, 'listAll').mockResolvedValue({ items: [] } as any);
    const res = await resolvePostByKey('123_v3');
    expect(res).toEqual(post);
    expect(getById).toHaveBeenCalledTimes(1);
    expect(getById).toHaveBeenCalledWith({ id: '123_v3' });
    expect(listAll).not.toHaveBeenCalled();
  });

  it('resolves numeric id without suffix by retrying with _v3', async () => {
    const post = { id: '456_v3', content: 'world' } as any;
    const getById = vi
      .spyOn(PostsService, 'getById')
      .mockRejectedValueOnce(Object.assign(new Error('404'), { status: 404 }))
      .mockResolvedValueOnce(post as any);
    const listAll = vi.spyOn(PostsService, 'listAll').mockResolvedValue({ items: [] } as any);
    const res = await resolvePostByKey('456');
    expect(res).toEqual(post);
    expect(getById).toHaveBeenCalledTimes(2);
    expect(getById).toHaveBeenNthCalledWith(1, { id: '456' });
    expect(getById).toHaveBeenNthCalledWith(2, { id: '456_v3' });
    expect(listAll).not.toHaveBeenCalled();
  });

  it('resolves slug via search fallback', async () => {
    const slug = 'any-aens-trading-platforms-out-2873';
    const post = { id: '2873_v3', slug, content: 'content' } as any;
    const getById = vi
      .spyOn(PostsService, 'getById')
      .mockRejectedValueOnce(Object.assign(new Error('404'), { status: 404 }))
      .mockResolvedValueOnce(post as any);
    const listAll = vi
      .spyOn(PostsService, 'listAll')
      .mockResolvedValue({ items: [{ id: '2873_v3' }] } as any);
    const res = await resolvePostByKey(slug);
    expect(listAll).toHaveBeenCalledWith({
      search: slug, limit: 1, page: 1, orderBy: 'created_at', orderDirection: 'DESC',
    });
    expect(getById).toHaveBeenCalledTimes(2);
    expect(getById).toHaveBeenNthCalledWith(1, { id: slug });
    expect(getById).toHaveBeenNthCalledWith(2, { id: '2873_v3' });
    expect(res).toEqual(post);
  });

  it('throws when not found by any strategy', async () => {
    vi.spyOn(PostsService, 'getById').mockRejectedValue(Object.assign(new Error('404'), { status: 404 }));
    vi.spyOn(PostsService, 'listAll').mockResolvedValue({ items: [] } as any);
    await expect(resolvePostByKey('missing-slug')).rejects.toThrow(/Post not found/i);
  });
});
