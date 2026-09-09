import { describe, expect, it } from 'vitest';
import {
  getNotificationActor,
  getNotificationLink,
  postDetailPath,
} from '../notificationNavigation';
import type { FeedItem } from '../notification-feed-client';

function item(type: string, data: Record<string, unknown> | null): FeedItem {
  return {
    id: 1,
    type,
    title: 't',
    body: 'b',
    data,
    read_at: null,
    created_at: new Date(2026, 0, 1).toISOString(),
  };
}

describe('getNotificationLink', () => {
  it('links a post-comment to the COMMENT, not the parent post', () => {
    // The route must be one PostDetail actually resolves — a nested
    // /post/<parent>/comment/<id> path only ever rendered the parent.
    expect(
      getNotificationLink(item('post-comment', {
        parentPostId: '1000_v3',
        commentId: '2000_v3',
      })),
    ).toBe('/post/2000');
  });

  it('drops the _v3 id suffix, like every other post link in the app', () => {
    const link = getNotificationLink(item('post-comment', { commentId: '2000_v3' }));
    expect(link).toBe('/post/2000');
  });

  it('falls back to the parent post when the comment id is missing', () => {
    expect(
      getNotificationLink(item('post-comment', { parentPostId: '1000_v3' })),
    ).toBe('/post/1000');
  });

  it('is non-navigable when a post-comment carries no ids at all', () => {
    expect(getNotificationLink(item('post-comment', { commenter: 'ak_x' }))).toBeUndefined();
    expect(getNotificationLink(item('post-comment', null))).toBeUndefined();
  });

  it('routes transfers and claims to the wallet', () => {
    expect(getNotificationLink(item('incoming-transfer', { sender: 'ak_x' }))).toBe('/wallet');
    expect(getNotificationLink(item('invitation-claimed', { claimer: 'ak_x' }))).toBe('/wallet');
  });

  it('routes room notifications to the token detail that owns the room', () => {
    expect(
      getNotificationLink(item('room-messages', { saleAddress: 'ct_sale' })),
    ).toBe('/trends/tokens/ct_sale');
    expect(getNotificationLink(item('room-membership', {}))).toBeUndefined();
  });

  it('leaves unknown types non-navigable', () => {
    expect(getNotificationLink(item('announcement', { foo: 'bar' }))).toBeUndefined();
  });
});

/**
 * Shared by the bell and by the legacy `/post/:slug/comment/:id` redirect in
 * routes.tsx, so the `_v3` rule lives in exactly one place.
 */
describe('postDetailPath', () => {
  it('drops the _v3 storage suffix', () => {
    expect(postDetailPath('2000_v3')).toBe('/post/2000');
  });

  it('leaves an id without the suffix alone', () => {
    expect(postDetailPath('2000')).toBe('/post/2000');
  });

  it('strips only a TRAILING _v3', () => {
    expect(postDetailPath('a_v3_b')).toBe('/post/a_v3_b');
  });

  it('encodes a slug that would otherwise break the path', () => {
    expect(postDetailPath('a/b?c')).toBe('/post/a%2Fb%3Fc');
  });

  it('degrades to the post root for an empty id rather than throwing', () => {
    expect(postDetailPath('')).toBe('/post/');
  });
});

describe('getNotificationActor', () => {
  it('reads the actor field for each type that has one', () => {
    expect(getNotificationActor(item('post-comment', { commenter: 'ak_c' }))).toBe('ak_c');
    expect(getNotificationActor(item('incoming-transfer', { sender: 'ak_s' }))).toBe('ak_s');
    expect(getNotificationActor(item('invitation-claimed', { claimer: 'ak_k' }))).toBe('ak_k');
    expect(getNotificationActor(item('announcement', null))).toBeUndefined();
  });
});
