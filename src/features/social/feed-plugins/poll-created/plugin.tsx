import React, { useEffect, useState, useCallback } from 'react';
import type { FeedEntry, FeedPage } from '../types';
import { registerPlugin } from '../registry';
import PollCreatedCard from './PollCreatedCard';
import type { Encoded } from '@aeternity/aepp-sdk';
import { useAeSdk } from '@/hooks/useAeSdk';
import { GovernanceApi } from '@/api/governance';
import { CONFIG } from '@/config';

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
      // Resolve exact creation time from MDW by fetching contract_create tx for each poll
      const mdwBase = CONFIG.MIDDLEWARE_URL.replace(/\/$/, '');
      async function fetchCreationInfo(ct: string): Promise<{ time: string | null; hash?: string | null }> {
        try {
          // 1) Fetch contract details to get source_tx_hash
          const c = await fetch(`${mdwBase}/v3/contracts/${ct}`).then(r => r.json());
          const sourceTxHash = c?.source_tx_hash || c?.create_tx || c?.creation_tx || null;
          // 2) Prefer exact tx time by fetching the transaction by hash
          if (sourceTxHash) {
            try {
              const tx = await fetch(`${mdwBase}/v3/transactions/${sourceTxHash}`).then(r => r.json());
              const t = tx?.micro_time || tx?.block_time;
              if (t) return { time: new Date(t).toISOString(), hash: sourceTxHash };
              if (tx?.block_height) {
                const kb = await fetch(`${mdwBase}/v3/key-blocks/${tx.block_height}`).then(r => r.json());
                if (kb?.time) return { time: new Date(kb.time).toISOString(), hash: sourceTxHash };
              }
            } catch {}
          }
          // 3) Fallback: try filtered query (some MDWs)
          try {
            const res = await fetch(`${mdwBase}/v3/transactions?type=contract_create&contract_id=${ct}&direction=forward&limit=1`);
            const json = await res.json();
            const tx = json?.data?.[0] || json?.transactions?.[0] || json?.[0];
            const hash = sourceTxHash || tx?.hash || tx?.tx_hash || tx?.tx_hash_str || null;
            if (tx?.micro_time || tx?.block_time) return { time: new Date(tx.micro_time ?? tx.block_time).toISOString(), hash };
            if (tx?.block_height) {
              const kb = await fetch(`${mdwBase}/v3/key-blocks/${tx.block_height}`).then(r => r.json());
              if (kb?.time) return { time: new Date(kb.time).toISOString(), hash };
            }
            return { time: null, hash };
          } catch {}
        } catch {}
        return { time: null, hash: null };
      }

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
        const ctInfo = await fetchCreationInfo(p.poll as any);
        const createdAt = ctInfo.time || new Date().toISOString();
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
        (entry as any).data.txHash = ctInfo.hash || undefined;
        entries.push(entry);
      }
      return { entries, nextPage: undefined } as FeedPage<PollCreatedEntryData>;
    },
    Render: ({ entry, onOpen }: { entry: FeedEntry<PollCreatedEntryData>; onOpen?: (id: string) => void }) => {
      const { pollAddress, title, author, closeHeight, createHeight, options, totalVotes } = entry.data;
      const { sdk, activeAccount } = useAeSdk() as any;
      const [voting, setVoting] = useState(false);
      const [pendingOption, setPendingOption] = useState<number | null>(null);
      const [myVote, setMyVote] = useState<number | null>(null);
      const [displayOptions, setDisplayOptions] = useState(options);
      const [displayTotalVotes, setDisplayTotalVotes] = useState(totalVotes);
      const refreshMyVote = useCallback(async () => {
        try {
          if (!activeAccount) { setMyVote(null); return; }
          const ov = await GovernanceApi.getPollOverview(pollAddress as any);
          const votesMap = (ov?.pollState?.votes || {}) as Record<string, number>;
          const v = votesMap[activeAccount as string];
          setMyVote(typeof v === 'number' ? v : null);
        } catch {
          // ignore
        }
      }, [activeAccount, pollAddress]);

      useEffect(() => { refreshMyVote(); }, [refreshMyVote]);

      const rebuildFromOverview = useCallback((ov: any) => {
        const optsRec = (ov?.pollState?.vote_options || {}) as Record<string, string>;
        const indexByLabel = new Map<string, number>(
          Object.entries(optsRec).map(([idx, label]) => [String(label), Number(idx)])
        );
        const votesByIndex = new Map<number, number>();
        const sfo = (ov?.stakesForOption || []) as Array<{ option: string; votes: unknown[] }>;
        for (const row of sfo || []) {
          const raw = (row as any).option;
          const count = Array.isArray((row as any).votes) ? (row as any).votes.length : 0;
          let optIndex: number | undefined;
          const asNum = Number(raw);
          if (!Number.isNaN(asNum)) optIndex = asNum; else optIndex = indexByLabel.get(String(raw));
          if (typeof optIndex === 'number' && !Number.isNaN(optIndex)) votesByIndex.set(optIndex, count);
        }
        const nextOptions = Object.entries(optsRec).map(([k, v]) => ({ id: Number(k), label: String(v), votes: votesByIndex.get(Number(k)) ?? 0 }));
        const nextTotal = typeof ov?.voteCount === 'number' && !Number.isNaN(ov.voteCount)
          ? ov.voteCount
          : nextOptions.reduce((acc, o) => acc + (o.votes || 0), 0);
        setDisplayOptions(nextOptions);
        setDisplayTotalVotes(nextTotal);
      }, []);
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
      const submitVote = async (opt: number) => {
        if (!sdk || voting) return;
        try {
          setVoting(true);
          setPendingOption(opt);
          const poll = await (await import('@aeternity/aepp-sdk')).Contract.initialize<{ vote: (o: number) => void }>({
            ...(sdk as any).getContext(),
            aci: (await import('@/api/GovernancePollACI.json')).default as any,
            address: pollAddress,
          } as any);
          await (poll as any).vote(opt);
          await refreshMyVote();
          try {
            const ov = await GovernanceApi.getPollOverview(pollAddress as any);
            rebuildFromOverview(ov);
          } catch {}
        } finally {
          setVoting(false);
          setPendingOption(null);
        }
      };
      const revokeVote = async () => {
        if (!sdk || voting) return;
        try {
          setVoting(true);
          setPendingOption(myVote);
          const poll = await (await import('@aeternity/aepp-sdk')).Contract.initialize<{ revoke_vote: () => void }>({
            ...(sdk as any).getContext(),
            aci: (await import('@/api/GovernancePollACI.json')).default as any,
            address: pollAddress,
          } as any);
          await (poll as any).revoke_vote();
          await refreshMyVote();
          try {
            const ov = await GovernanceApi.getPollOverview(pollAddress as any);
            rebuildFromOverview(ov);
          } catch {}
        } finally {
          setVoting(false);
          setPendingOption(null);
        }
      };
      return (
        <PollCreatedCard
          title={title}
          author={author}
          closeHeight={closeHeight}
          currentHeight={currentHeight as any}
          options={displayOptions}
          totalVotes={displayTotalVotes}
          onOpen={handleOpen}
          createdAtIso={createdAtIso}
          myVote={myVote}
          onVoteOption={submitVote}
          onRevoke={revokeVote}
          voting={voting}
          txHash={(entry as any).data?.txHash}
          contractAddress={pollAddress as any}
          pendingOption={pendingOption}
        />
      );
    },
    // Optional: fetchPage could call GovernanceApi.getPollOrdering(false) and map a first page
  });
}


