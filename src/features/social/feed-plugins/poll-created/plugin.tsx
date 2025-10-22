import React, { useEffect, useState } from 'react';
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

export function adaptPollToEntry(
  pollAddress: Encoded.ContractAddress,
  data: Omit<PollCreatedEntryData, 'pollAddress'>,
  createdAt?: string
): FeedEntry<PollCreatedEntryData> {
  const ts = createdAt || new Date().toISOString();
  return {
    id: `poll-created:${pollAddress}`,
    kind: 'poll-created',
    createdAt: ts,
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
      // First pass to collect create heights
      const overviews = await Promise.all(
        top.map(async (p) => {
          try {
            const ov = await GovernanceApi.getPollOverview(p.poll);
            return { p, ov };
          } catch {
            return undefined as any;
          }
        })
      );
      const valid = overviews.filter(Boolean) as { p: any; ov: any }[];
      const createHeights = valid.map(({ ov }) => Number(ov?.pollState?.create_height || 0));
      const maxCreateHeight = Math.max(0, ...createHeights);
      const APPROX_BLOCK_MS = 180000; // ~3 minutes per block

      for (let i = 0; i < valid.length; i += 1) {
        const { p, ov } = valid[i];
        const meta = ov?.pollState?.metadata || ({} as any);
        const optsRec = (ov?.pollState?.vote_options || {}) as Record<string, string>;
        // Build votes per option index using overview.stakesForOption[].option
        // The backend may return either index or label; try both, prefer index.
        const indexByLabel = new Map<string, number>(
          Object.entries(optsRec).map(([idx, label]) => [String(label), Number(idx)])
        );
        const votesByIndex = new Map<number, number>();
        const sfo = (ov?.stakesForOption || []) as Array<{ option: string; votes: unknown[] }>;
        for (const row of sfo) {
          const raw = (row as any).option;
          const count = Array.isArray((row as any).votes) ? (row as any).votes.length : 0;
          let optIndex: number | undefined;
          const asNum = Number(raw);
          if (!Number.isNaN(asNum)) {
            optIndex = asNum;
          } else {
            optIndex = indexByLabel.get(String(raw));
          }
          if (typeof optIndex === 'number' && !Number.isNaN(optIndex)) {
            votesByIndex.set(optIndex, count);
          }
        }
        const options = Object.entries(optsRec).map(([k, v]) => ({
          id: Number(k),
          label: String(v),
          votes: votesByIndex.get(Number(k)) ?? 0,
        }));
        const totalVotes = typeof ov?.voteCount === 'number' && !Number.isNaN(ov.voteCount)
          ? ov.voteCount
          : options.reduce((acc, o) => acc + (o.votes || 0), 0);
        const ch = Number(ov?.pollState?.create_height || 0);
        const ageBlocks = Math.max(0, maxCreateHeight - ch);
        const createdAt = new Date(Date.now() - ageBlocks * APPROX_BLOCK_MS).toISOString();
        const entry = adaptPollToEntry(
          p.poll as any,
          {
            title: meta?.title || 'Untitled poll',
            author: ov?.pollState?.author as any,
            closeHeight: ov?.pollState?.close_height as any,
            createHeight: ov?.pollState?.create_height as any,
            options,
            totalVotes,
          },
          createdAt
        );
        entries.push(entry);
      }
      return { entries, nextPage: undefined } as FeedPage<PollCreatedEntryData>;
    },
    Render: ({ entry, onOpen }: { entry: FeedEntry<PollCreatedEntryData>; onOpen?: (id: string) => void }) => {
      const { pollAddress, title, author, closeHeight, createHeight, options, totalVotes } = entry.data;
      const { sdk } = useAeSdk();
      const [currentHeight, setCurrentHeight] = useState<number | undefined>(undefined);
      useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            const h = await (sdk as any)?.getHeight?.();
            if (!cancelled && typeof h === 'number') setCurrentHeight(h);
          } catch {
            // ignore
          }
        })();
        return () => { cancelled = true; };
      }, [sdk]);
      const APPROX_BLOCK_MS = 180000; // ~3m per block
      const createdAtIso = (currentHeight != null && createHeight != null)
        ? new Date(Date.now() - Math.max(0, Number(currentHeight) - Number(createHeight)) * APPROX_BLOCK_MS).toISOString()
        : entry.createdAt;
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
          createdAtIso={createdAtIso}
        />
      );
    },
    // Optional: fetchPage could call GovernanceApi.getPollOrdering(false) and map a first page
  });
}


