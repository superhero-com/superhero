import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Shell from '@/components/layout/Shell';
import LeftRail from '@/components/layout/LeftRail';
import RightRail from '@/components/layout/RightRail';
import AeButton from '@/components/AeButton';
import PollCreatedCard from '@/features/social/feed-plugins/poll-created/PollCreatedCard';
import { GovernanceApi } from '@/api/governance';
import { useAeSdk } from '@/hooks/useAeSdk';

type PollDetailProps = { standalone?: boolean };

export default function PollDetail({ standalone = true }: PollDetailProps = {}) {
  const { pollAddress } = useParams();
  const navigate = useNavigate();
  const { sdk, activeAccount } = useAeSdk() as any;

  const [currentHeight, setCurrentHeight] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string | undefined>(undefined);
  const [closeHeight, setCloseHeight] = useState<number | undefined>(undefined);
  const [createHeight, setCreateHeight] = useState<number | undefined>(undefined);
  const [options, setOptions] = useState<Array<{ id: number; label: string; votes?: number }>>([]);
  const [totalVotes, setTotalVotes] = useState<number | undefined>(undefined);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [voting, setVoting] = useState<boolean>(false);
  const [pendingOption, setPendingOption] = useState<number | null>(null);

  // Fetch current chain height
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

  const rebuildFromOverview = useCallback((ov: any) => {
    const md = ov?.pollState?.metadata || {};
    setTitle(String(md.title || ''));
    setAuthor(ov?.pollState?.author);
    setCloseHeight(ov?.pollState?.close_height);
    setCreateHeight(ov?.pollState?.create_height);

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
    setOptions(nextOptions);
    setTotalVotes(nextTotal);
  }, []);

  const refreshMyVote = useCallback(async () => {
    try {
      if (!activeAccount || !pollAddress) { setMyVote(null); return; }
      const ov = await GovernanceApi.getPollOverview(pollAddress as any);
      const votesMap = (ov?.pollState?.votes || {}) as Record<string, number>;
      const v = votesMap[activeAccount as string];
      setMyVote(typeof v === 'number' ? v : null);
    } catch {
      // ignore
    }
  }, [activeAccount, pollAddress]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pollAddress) { setError('Missing poll address'); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const ov = await GovernanceApi.getPollOverview(pollAddress as any);
        if (cancelled) return;
        rebuildFromOverview(ov);
        // Also resolve my vote
        const votesMap = (ov?.pollState?.votes || {}) as Record<string, number>;
        const v = votesMap[activeAccount as string];
        setMyVote(typeof v === 'number' ? v : null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load poll');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pollAddress, activeAccount, rebuildFromOverview]);

  // Ensure detail page scrolls to top when opened
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const APPROX_BLOCK_MS = 180000; // ~3m per block
  const createdAtIso = useMemo(() => {
    if (currentHeight != null && createHeight != null) {
      return new Date(
        Date.now() - Math.max(0, Number(currentHeight) - Number(createHeight)) * APPROX_BLOCK_MS
      ).toISOString();
    }
    return undefined;
  }, [currentHeight, createHeight]);

  const submitVote = useCallback(async (opt: number) => {
    if (!sdk || voting || !pollAddress) return;
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
      setOptions((curr) => curr.map((o) => {
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
      setTotalVotes((curr) => (prev == null ? (curr ?? 0) + 1 : curr));
      try { await GovernanceApi.submitContractEvent('Vote', pollAddress as any); } catch {}
      try {
        const ov = await GovernanceApi.getPollOverview(pollAddress as any);
        rebuildFromOverview(ov);
      } catch {}
      window.setTimeout(() => { refreshMyVote(); }, 2000);
    } finally {
      setVoting(false);
      setPendingOption(null);
    }
  }, [sdk, voting, pollAddress, myVote, rebuildFromOverview, refreshMyVote]);

  const revokeVote = useCallback(async () => {
    if (!sdk || voting || !pollAddress) return;
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
        setOptions((curr) => curr.map((o) => (o.id === prev ? { ...o, votes: Math.max(0, (o.votes || 0) - 1) } : o)));
        setTotalVotes((curr) => Math.max(0, (curr ?? 0) - 1));
      }
      try { await GovernanceApi.submitContractEvent('RevokeVote', pollAddress as any); } catch {}
      try {
        const ov = await GovernanceApi.getPollOverview(pollAddress as any);
        rebuildFromOverview(ov);
      } catch {}
      window.setTimeout(() => { refreshMyVote(); }, 2000);
    } finally {
      setVoting(false);
      setPendingOption(null);
    }
  }, [sdk, voting, pollAddress, myVote, rebuildFromOverview, refreshMyVote]);

  const content = (
    <div className="w-full p-0">
      <div className="mb-4">
        <AeButton onClick={() => { navigate('/'); }} variant="ghost" size="sm" outlined className="!border !border-solid !border-white/15 hover:!border-white/35">
          ← Back
        </AeButton>
      </div>

      {error && (
        <div className="text-red-400 text-sm p-2">{error}</div>
      )}

      {!error && (
        <article className="grid gap-4">
          <PollCreatedCard
            title={title}
            author={author}
            closeHeight={closeHeight}
            currentHeight={currentHeight as any}
            options={options}
            totalVotes={totalVotes}
            createdAtIso={createdAtIso}
            myVote={myVote}
            onVoteOption={submitVote}
            onRevoke={revokeVote}
            voting={voting}
            contractAddress={pollAddress as any}
            pendingOption={pendingOption}
          />
        </article>
      )}
    </div>
  );

  return standalone ? (
    <Shell left={<LeftRail />} right={<RightRail />} containerClassName="max-w-[1080px] mx-auto">
      {content}
    </Shell>
  ) : (
    content
  );
}


