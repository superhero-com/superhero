import React from 'react';
import { definePlugin } from '@/plugin-sdk';
import type { FeedEntry } from '@/features/social/feed-plugins/types';
import TokenCreatedActivityItem from '@/features/social/components/TokenCreatedActivityItem';
import type { PostDto } from '@/api/generated';

export type TokenCreatedRenderExtras = {
  hideMobileDivider?: boolean;
  mobileTight?: boolean;
  footer?: React.ReactNode;
  mobileNoTopPadding?: boolean;
  mobileNoBottomPadding?: boolean;
  mobileTightTop?: boolean;
  mobileTightBottom?: boolean;
};

export type TokenCreatedEntryData = {
  item: PostDto;
  render?: TokenCreatedRenderExtras;
};

export function adaptTokenCreatedToEntry(item: PostDto, render?: TokenCreatedRenderExtras): FeedEntry<TokenCreatedEntryData> {
  const createdAt = (item.created_at as unknown as string) || new Date().toISOString();
  return {
    id: String(item.id),
    kind: 'token-created',
    createdAt,
    data: { item, render },
  };
}

export default definePlugin({
  meta: {
    id: 'token-created',
    name: 'Token Created Feed',
    version: '0.1.0',
    apiVersion: '1.x',
    capabilities: ['feed'],
  },
  setup({ register }) {
    register({
      feed: {
        kind: 'token-created',
        Render: ({ entry }: { entry: FeedEntry<TokenCreatedEntryData> }) => {
          const { item, render } = entry.data;
          return (
            <TokenCreatedActivityItem
              item={item}
              hideMobileDivider={render?.hideMobileDivider}
              mobileTight={render?.mobileTight}
              footer={render?.footer}
              mobileNoTopPadding={render?.mobileNoTopPadding}
              mobileNoBottomPadding={render?.mobileNoBottomPadding}
              mobileTightTop={render?.mobileTightTop}
              mobileTightBottom={render?.mobileTightBottom}
            />
          );
        },
      },
    });
  },
});


