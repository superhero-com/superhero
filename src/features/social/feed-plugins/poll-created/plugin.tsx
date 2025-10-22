import React from 'react';
import type { FeedEntry, FeedPage } from '../types';
import { registerPlugin } from '../registry';
import PollCreatedCard from './PollCreatedCard';
import { GovernanceApi } from '@/api/governance';
import type { Encoded } from '@aeternity/aepp-sdk';
import { useAeSdk } from '@/hooks/useAeSdk';

export type PollCreatedEntryData = {
  pollAddress: Encoded.ContractAddress;
  title: string;
  author?: string;
  closeHeight?: number;
  createHeight?: number;
  options: { id: number; label: string; votes?: number }[];
  totalVotes?: number;
};

export function adaptPollToEntry(pollAddress: Encoded.ContractAddress, data: Omit<PollCreatedEntryData, 'pollAddress'>): FeedEntry<PollCreatedEntryData> {
  const createdAt = new Date().toISOString();
  return {
    id: `poll-created:${pollAddress}`,
    kind: 'poll-created',
    createdAt,
    data: { pollAddress, ...data },
  };
}

export function registerPollCreatedPlugin() {
  registerPlugin({
    kind: 'poll-created',
    async fetchPage(page: number) {
      // single first page for now
      if (page && page > 1) {
        return { entries: [], nextPage: undefined } as FeedPage<PollCreatedEntryData>;
      }
      const ordering = await GovernanceApi.getPollOrdering(false);
      const top = (ordering?.data || []).slice(0, 10);
      const entries: FeedEntry<PollCreatedEntryData>[] = [];
      for (let i = 0; i < top.length; i += 1) {
        const p = top[i];
        try {
          const ov = await GovernanceApi.getPollOverview(p.poll);
          const meta = ov?.pollState?.metadata || ({} as any);
          const optsRec = (ov?.pollState?.vote_options || {}) as Record<string, string>;
          const options = Object.entries(optsRec).map(([k, v]) => ({ id: Number(k), label: String(v), votes: 0 }));
          const entry = adaptPollToEntry(p.poll as any, {
            title: meta?.title || 'Untitled poll',
            author: ov?.pollState?.author as any,
            closeHeight: ov?.pollState?.close_height as any,
            createHeight: ov?.pollState?.create_height as any,
            options,
            totalVotes: p?.voteCount || 0,
          });
          entries.push(entry);
        } catch {
          // skip failures
        }
      }
      return { entries, nextPage: undefined } as FeedPage<PollCreatedEntryData>;
    },
    Render: ({ entry, onOpen }: { entry: FeedEntry<PollCreatedEntryData>; onOpen?: (id: string) => void }) => {
      const { pollAddress, title, author, closeHeight, createHeight, options, totalVotes } = entry.data;
      const { sdk } = useAeSdk();
      // do not block render on height; card computes rough time left even if undefined
      const currentHeight = undefined as number | undefined;
      const handleOpen = () => onOpen?.(String(pollAddress));
      return (
        <PollCreatedCard
          title={title}
          author={author}
          closeHeight={closeHeight}
          currentHeight={currentHeight as any}
          options={options}
          totalVotes={totalVotes}
          onOpen={handleOpen}
        />
      );
    },
    // Optional: fetchPage could call GovernanceApi.getPollOrdering(false) and map a first page
  });
}


