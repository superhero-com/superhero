/**
 * Maps a feed item to the two things the notification UI needs to be actionable:
 *   - an in-app route to deep-link to when the row is clicked (redirect-on-click)
 *   - the ak_… address of the actor behind it, for the row avatar
 *
 * The backend `data` payload is untyped (`Record<string, unknown>`), so every
 * field is read defensively — a missing field just makes the row non-navigable
 * rather than throwing. Payload shapes come from the backend notification
 * classes in the superhero-api repo.
 */
import type { FeedItem } from './notification-feed-client';

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * Canonical in-app path for a post — or a comment, which is itself a post.
 *
 * Post ids are stored as `<id>_v3`; every in-app post link drops that suffix (see
 * FeedList / SharePopover) and PostDetail's resolver re-adds it. Exported because
 * the legacy `/post/:slug/comment/:id` redirect in routes.tsx needs the same rule,
 * and a third hand-rolled copy of it is a third chance to get it wrong.
 */
export function postDetailPath(idOrSlug: string): string {
  return `/post/${encodeURIComponent(idOrSlug.replace(/_v3$/, ''))}`;
}

/** ak_… address of the actor behind a notification, used for the row avatar. */
export function getNotificationActor(item: FeedItem): string | undefined {
  const d = item.data ?? {};
  // post-comment → commenter, incoming-transfer → sender, invitation → claimer.
  return str(d.commenter) || str(d.sender) || str(d.claimer);
}

/**
 * In-app route a notification deep-links to when clicked, or `undefined` when the
 * type has no meaningful destination (e.g. announcements) — such rows render as
 * non-navigable.
 */
export function getNotificationLink(item: FeedItem): string | undefined {
  const d = item.data ?? {};
  switch (item.type) {
    // A comment is itself a post, so /post/<commentId> opens the comment with its
    // ancestor chain above it — that is how the rest of the app opens comments,
    // and PostDetail centers the resolved post in the viewport. Linking to the
    // parent instead would land the user on the post they already know about.
    case 'post-comment': {
      const comment = str(d.commentId) || str(d.parentPostId);
      return comment ? postDetailPath(comment) : undefined;
    }
    // Both settle on-chain into the wallet; the wallet view lists the transfer.
    case 'incoming-transfer':
    case 'invitation-claimed':
      return '/wallet';
    // The token-detail route resolves a sale address (findByAddress) to its room.
    case 'room-membership':
    case 'room-messages': {
      const sale = str(d.saleAddress);
      return sale ? `/trends/tokens/${encodeURIComponent(sale)}` : undefined;
    }
    default:
      return undefined;
  }
}
