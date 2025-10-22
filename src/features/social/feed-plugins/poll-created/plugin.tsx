import React, { useMemo } from 'react';
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
    Render: ({ entry, onOpen }: { entry: FeedEntry<PollCreatedEntryData>; onOpen?: (id: string) => void }) => {
      const { pollAddress, title, author, closeHeight, createHeight, options, totalVotes } = entry.data;
      const { sdk } = useAeSdk();
      const currentHeight = (sdk as any)?.getHeight ? undefined : undefined; // avoid calling during SSR; page data shows time left anyway
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


