import React, { useCallback, useEffect, useState } from 'react';
import { definePlugin } from '@/plugin-sdk';
import type { FeedEntry, FeedPage } from '@/features/social/feed-plugins/types';
import type { Encoded } from '@aeternity/aepp-sdk';
import { useAeSdk } from '@/hooks/useAeSdk';
import { GovernanceApi } from '@/api/governance';
import { CONFIG } from '@/config';
import PollCreatedCard from '@/features/social/feed-plugins/poll-created/PollCreatedCard';
import { pollAttachmentSpec } from '@/features/social/feed-plugins/poll-attachment';
import { translations } from './locales';

export type PollCreatedEntryData = {
  pollAddress: Encoded.ContractAddress;
  title: string;
  description?: string;
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

const plugin = definePlugin({
  meta: {
    id: 'poll-created',
    name: 'Poll Created Feed',
    version: '0.1.0',
    apiVersion: '1.x',
    capabilities: ['feed', 'composer'],
  },
  translations, // Export translations for the loader
  setup({ register }) {
    register({
      feed: {
        kind: 'poll-created',
        async fetchPage(page: number) {
          if (page && page > 1) {
            return { entries: [], nextPage: undefined } as FeedPage<PollCreatedEntryData>;
          }
          // Fetch polls from new API endpoint
          const pollsResponse = await GovernanceApi.getAllPolls(1, 1000);
          const allPolls = pollsResponse?.items || [];
          const entries: FeedEntry<PollCreatedEntryData>[] = [];
          const mdwBase = CONFIG.MIDDLEWARE_URL.replace(/\/$/, '');
          async function fetchCreationInfo(ct: string): Promise<{ time: string | null; hash?: string | null }> {
            try {
              const c = await fetch(`${mdwBase}/v3/contracts/${ct}`).then(r => r.json());
              const sourceTxHash = c?.source_tx_hash || c?.create_tx || c?.creation_tx || null;
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

          const pollsWithVotes = await Promise.all(
            allPolls.map(async (poll: any) => {
              if (!poll.poll_address) return undefined;
              try {
                const pollWithVotes = await GovernanceApi.getPollWithVotes(poll.poll_address);
                return { poll, pollWithVotes };
              } catch {
                return undefined as any;
              }
            })
          );
          const valid = pollsWithVotes.filter(Boolean) as { poll: any; pollWithVotes: any }[];
          for (let i = 0; i < valid.length; i += 1) {
            const { poll, pollWithVotes } = valid[i];
            const pollData = pollWithVotes?.poll || poll;
            const meta = pollData?.metadata || ({} as any);
            const voteOptionsArray = pollData?.vote_options || [];
            const optsRec = voteOptionsArray.reduce((acc: Record<string, string>, opt: { key: number; val: string }) => {
              acc[String(opt.key)] = opt.val;
              return acc;
            }, {} as Record<string, string>);
            const votesByOption = pollData?.votes_count_by_option || {};
            const options = Object.entries(optsRec).map(([k, v]) => ({
              id: Number(k),
              label: String(v),
              votes: Number(votesByOption[k] || 0),
            }));
            const totalVotes = typeof pollData?.votes_count === 'number' && !Number.isNaN(pollData.votes_count)
              ? pollData.votes_count
              : options.reduce((acc, o) => acc + (o.votes || 0), 0);
            const pollAddress = pollData.poll_address || poll.poll_address;
            const ctInfo = await fetchCreationInfo(pollAddress);
            const createdAt = pollData.created_at
              ? new Date(pollData.created_at).toISOString()
              : (ctInfo.time || new Date().toISOString());
            const entry = adaptPollToEntry(
              pollAddress as any,
              {
                title: meta?.title || 'Untitled poll',
                description: meta?.description || undefined,
                author: pollData?.author as any,
                closeHeight: pollData?.close_height as any,
                createHeight: pollData?.create_height as any,
                options,
                totalVotes,
              },
              createdAt
            );
            (entry as any).data.txHash = pollData.hash || ctInfo.hash || undefined;
            entries.push(entry);
          }
          // Sort by creation time, newest first
          entries.sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return bTime - aTime;
          });
          return { entries, nextPage: undefined } as FeedPage<PollCreatedEntryData>;
        },
        Render: ({ entry, onOpen }: { entry: FeedEntry<PollCreatedEntryData>; onOpen?: (id: string) => void }) => {
          const { pollAddress, title, description, author, closeHeight, createHeight, options, totalVotes } = entry.data;
          const { sdk, activeAccount } = useAeSdk() as any;
          const [voting, setVoting] = useState(false);
          const [pendingOption, setPendingOption] = useState<number | null>(null);
          const [myVote, setMyVote] = useState<number | null>(null);
          const [displayOptions, setDisplayOptions] = useState(options);
          const [displayTotalVotes, setDisplayTotalVotes] = useState(totalVotes);
          const refreshMyVote = useCallback(async () => {
            try {
              if (!activeAccount) { setMyVote(null); return; }
              const pollWithVotes = await GovernanceApi.getPollWithVotes(pollAddress as any);
              const accountVotes = (pollWithVotes?.votes || [])
                .filter((v: any) => {
                  const voter = v.data?.voter || v.data?.governance?.data?.voter;
                  return voter === activeAccount;
                })
                .sort((a: any, b: any) => {
                  if (b.block_height !== a.block_height) return b.block_height - a.block_height;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
              if (accountVotes.length > 0) {
                const latestVote = accountVotes[0];
                if (latestVote.function === 'revoke_vote') {
                  setMyVote(null);
                  return;
                }
                const option = latestVote.data?.option || latestVote.data?.governance?.data?.option;
                const hasLaterRevoke = accountVotes.some((v: any) => {
                  if (v.function !== 'revoke_vote') return false;
                  if (v.block_height > latestVote.block_height) return true;
                  if (v.block_height === latestVote.block_height) {
                    return new Date(v.created_at).getTime() > new Date(latestVote.created_at).getTime();
                  }
                  return false;
                });
                setMyVote(hasLaterRevoke ? null : (typeof option === 'number' ? option : null));
              } else {
                setMyVote(null);
              }
            } catch {}
          }, [activeAccount, pollAddress]);
          useEffect(() => { refreshMyVote(); }, [refreshMyVote]);
          const rebuildFromPollData = useCallback((pollWithVotes: any) => {
            const pollData = pollWithVotes?.poll;
            if (!pollData) return;
            const voteOptionsArray = pollData?.vote_options || [];
            const optsRec = voteOptionsArray.reduce((acc: Record<string, string>, opt: { key: number; val: string }) => {
              acc[String(opt.key)] = opt.val;
              return acc;
            }, {} as Record<string, string>);
            const votesByOption = pollData?.votes_count_by_option || {};
            const nextOptions = Object.entries(optsRec).map(([k, v]) => ({
              id: Number(k),
              label: String(v),
              votes: Number(votesByOption[k] || 0),
            }));
            const nextTotal = typeof pollData?.votes_count === 'number' && !Number.isNaN(pollData.votes_count)
              ? pollData.votes_count
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
              } catch {}
            })();
            return () => { cancelled = true; };
          }, [sdk]);
          const APPROX_BLOCK_MS = 180000;
          const createdAtIso = (currentHeight != null && createHeight != null)
            ? new Date(Date.now() - Math.max(0, Number(currentHeight) - Number(createHeight)) * APPROX_BLOCK_MS).toISOString()
            : entry.createdAt;
          const handleOpen = () => onOpen?.(String(pollAddress));
          const submitVote = async (opt: number) => {
            if (!sdk || voting) return;
            if (myVote === opt) return;
            try {
              setVoting(true);
              setPendingOption(opt);
              const poll = await (await import('@aeternity/aepp-sdk')).Contract.initialize<{ vote: (o: number) => void }>({
                ...(sdk as any).getContext(),
                aci: (await import('@/api/GovernancePollACI.json')).default as any,
                address: pollAddress,
              } as any);
              await (poll as any).vote(opt);
              const prev = myVote;
              setMyVote(opt);
              setDisplayOptions((curr) => curr.map((o) => {
                if (prev == null) {
                  if (o.id === opt) return { ...o, votes: (o.votes || 0) + 1 };
                  return o;
                }
                if (prev !== opt) {
                  if (o.id === opt) return { ...o, votes: (o.votes || 0) + 1 };
                  if (o.id === prev) return { ...o, votes: Math.max(0, (o.votes || 0) - 1) };
                  return o;
                }
                return o;
              }));
              setDisplayTotalVotes((curr) => (prev == null ? curr + 1 : curr));
              try { await GovernanceApi.submitContractEvent('Vote', pollAddress as any); } catch {}
              try { const pollWithVotes = await GovernanceApi.getPollWithVotes(pollAddress as any); rebuildFromPollData(pollWithVotes); } catch {}
              window.setTimeout(() => { refreshMyVote(); }, 2000);
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
              const prev = myVote;
              const poll = await (await import('@aeternity/aepp-sdk')).Contract.initialize<{ revoke_vote: () => void }>({
                ...(sdk as any).getContext(),
                aci: (await import('@/api/GovernancePollACI.json')).default as any,
                address: pollAddress,
              } as any);
              await (poll as any).revoke_vote();
              setMyVote(null);
              if (prev != null) {
                setDisplayOptions((curr) => curr.map((o) => (o.id === prev ? { ...o, votes: Math.max(0, (o.votes || 0) - 1) } : o)));
                setDisplayTotalVotes((curr) => Math.max(0, curr - 1));
              }
              try { await GovernanceApi.submitContractEvent('RevokeVote', pollAddress as any); } catch {}
              try { const pollWithVotes = await GovernanceApi.getPollWithVotes(pollAddress as any); rebuildFromPollData(pollWithVotes); } catch {}
              window.setTimeout(() => { refreshMyVote(); }, 2000);
            } finally {
              setVoting(false);
              setPendingOption(null);
            }
          };
          return (
            <PollCreatedCard
              title={title}
              description={description}
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
      },
      attachments: () => [pollAttachmentSpec],
    });
  },
});

export default plugin;

