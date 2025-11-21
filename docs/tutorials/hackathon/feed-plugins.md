---
title: Feed Plugins & Popular Feed Injection
---

## Overview

Feed plugins allow you to inject custom content into the Superhero unified feed. Your plugin content can appear alongside regular posts and can optionally be included in the popular feed ranking system.

## Feed Plugin Interface

A feed plugin implements the `FeedPlugin` interface:

```typescript
import type { FeedPlugin, FeedEntry } from '@/features/social/feed-plugins/types';

export type FeedPage<T = any> = {
  entries: FeedEntry<T>[];
  nextPage?: number; // undefined when no more pages
};

export type FeedPlugin<T = any> = {
  kind: string; // Unique identifier for your content type (e.g., "poll", "nft")
  fetchPage?: (page: number) => Promise<FeedPage<T>>;
  useLive?: () => { push: (entry: FeedEntry<T>) => void } | void;
  Render: (props: { entry: FeedEntry<T>; onOpen?: (id: string) => void }) => JSX.Element;
  Skeleton?: React.FC; // Optional loading placeholder
  getComposerActions?: (ctx: ComposerActionCtx) => ComposerAction[];
};
```

## Feed Entry Structure

```typescript
export type FeedEntry<T = any> = {
  id: string; // Unique identifier
  kind: string; // Content type (matches plugin.kind)
  createdAt: string; // ISO timestamp
  data: T; // Your custom data
};
```

## Basic Feed Plugin Example

```typescript
import { FeedPlugin, FeedEntry } from '@/features/social/feed-plugins/types';
import { registerPlugin } from '@/features/social/feed-plugins/registry';

const myFeedPlugin: FeedPlugin<MyData> = {
  kind: 'my-content',
  
  async fetchPage(page: number) {
    // Fetch your content from API or contract
    const response = await fetch(`/api/my-content?page=${page}`);
    const items = await response.json();
    
    return {
      entries: items.map(item => ({
        id: item.id,
        kind: 'my-content',
        createdAt: item.created_at,
        data: item,
      })),
      nextPage: items.length > 0 ? page + 1 : undefined,
    };
  },
  
  Render: ({ entry, onOpen }) => {
    return (
      <div onClick={() => onOpen?.(entry.id)}>
        <h3>{entry.data.title}</h3>
        <p>{entry.data.description}</p>
      </div>
    );
  },
  
  Skeleton: () => <div>Loading...</div>,
};

// Register the plugin
registerPlugin(myFeedPlugin);
```

## Popular Feed Injection

To have your plugin content appear in the popular feed, you need to:

1. **Implement PopularRankingContributor** (backend API plugin)
2. **Use proper ID format** in feed entries

### ID Format for Popular Feed

Your feed entry IDs should follow this format:
```
{plugin-name}:{unique-id}
```

Example:
- `poll:123` for a poll with sequence ID 123
- `poll:hash_abc123` for a poll with hash identifier

### Backend Integration

See the [API Plugin Development](./api-plugin-development.md) guide for implementing `PopularRankingContributor` on the backend.

## Live Updates

Use the `useLive` hook to push real-time updates:

```typescript
const myFeedPlugin: FeedPlugin = {
  kind: 'my-content',
  
  useLive() {
    const { push } = useWebSocket('/ws/my-content', (event) => {
      push({
        id: event.id,
        kind: 'my-content',
        createdAt: event.created_at,
        data: event,
      });
    });
    
    return { push };
  },
  
  // ... rest of plugin
};
```

## Composer Integration

Feed plugins can also provide composer actions:

```typescript
const myFeedPlugin: FeedPlugin = {
  kind: 'my-content',
  
  getComposerActions(ctx) {
    return [
      {
        id: 'create-my-content',
        label: 'Create My Content',
        icon: '🎨',
        onClick: () => {
          ctx.navigate('/create-my-content');
        },
      },
    ];
  },
  
  // ... rest of plugin
};
```

## Best Practices

1. **Pagination**: Always implement `fetchPage` with proper pagination
2. **Error Handling**: Handle errors gracefully in `fetchPage`
3. **Performance**: Use `Skeleton` component for loading states
4. **ID Uniqueness**: Ensure IDs are globally unique
5. **Timestamps**: Use ISO 8601 format for `createdAt`

## Example: Poll Feed Plugin

```typescript
import { FeedPlugin, FeedEntry } from '@/features/social/feed-plugins/types';
import { GovernanceApi } from '@/api/governance';

const pollFeedPlugin: FeedPlugin<PollData> = {
  kind: 'poll-created',
  
  async fetchPage(page: number) {
    const polls = await GovernanceApi.getPolls({ page, limit: 20 });
    
    return {
      entries: polls.items.map(poll => ({
        id: `poll:${poll.poll_seq_id}`,
        kind: 'poll-created',
        createdAt: poll.created_at,
        data: poll,
      })),
      nextPage: polls.hasMore ? page + 1 : undefined,
    };
  },
  
  Render: ({ entry, onOpen }) => (
    <PollCreatedCard 
      poll={entry.data} 
      onOpen={() => onOpen?.(entry.id)} 
    />
  ),
  
  Skeleton: () => <PollSkeleton />,
};

registerPlugin(pollFeedPlugin);
```

