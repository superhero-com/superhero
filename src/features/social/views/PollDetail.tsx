import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Shell from '@/components/layout/Shell';
import LeftRail from '@/components/layout/LeftRail';
import RightRail from '@/components/layout/RightRail';
import AeButton from '@/components/AeButton';
import PollCreatedCard from '@/features/social/feed-plugins/poll-created/PollCreatedCard';
import { GovernanceApi } from '@/api/governance';
import { CONFIG } from '@/config';
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
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [author, setAuthor] = useState<string | undefined>(undefined);
  const [closeHeight, setCloseHeight] = useState<number | undefined>(undefined);
  const [createHeight, setCreateHeight] = useState<number | undefined>(undefined);
  const [options, setOptions] = useState<Array<{ id: number; label: string; votes?: number }>>([]);
  const [totalVotes, setTotalVotes] = useState<number | undefined>(undefined);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [voting, setVoting] = useState<boolean>(false);
  const [pendingOption, setPendingOption] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

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

  const rebuildFromPollData = useCallback((pollWithVotes: any) => {
    const poll = pollWithVotes?.poll;
    if (!poll) return;
    const md = poll?.metadata || {};
    setTitle(String(md.title || ''));
    setDescription(md.description ? String(md.description) : undefined);
    setAuthor(poll?.author);
    setCloseHeight(poll?.close_height);
    setCreateHeight(poll?.create_height);

    // Convert vote_options from array to Record
    const voteOptionsArray = poll?.vote_options || [];
    const optsRec = voteOptionsArray.reduce((acc: Record<string, string>, opt: { key: number; val: string }) => {
      acc[String(opt.key)] = opt.val;
      return acc;
    }, {} as Record<string, string>);
    
    // Get votes per option from votes_count_by_option
    const votesByOption = poll?.votes_count_by_option || {};
    const nextOptions = Object.entries(optsRec).map(([k, v]) => ({
      id: Number(k),
      label: String(v),
      votes: Number(votesByOption[k] || 0),
    }));
    const nextTotal = typeof poll?.votes_count === 'number' && !Number.isNaN(poll.votes_count)
      ? poll.votes_count
      : nextOptions.reduce((acc, o) => acc + (o.votes || 0), 0);
    setOptions(nextOptions);
    setTotalVotes(nextTotal);
  }, []);

  const refreshMyVote = useCallback(async () => {
    try {
      if (!activeAccount || !pollAddress) { setMyVote(null); return; }
      const pollWithVotes = await GovernanceApi.getPollWithVotes(pollAddress as any);
      // Find the latest vote for the active account
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
        const pollWithVotes = await GovernanceApi.getPollWithVotes(pollAddress as any);
        if (cancelled) return;
        rebuildFromPollData(pollWithVotes);
        // Also resolve my vote
        if (activeAccount) {
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
            if (latestVote.function !== 'revoke_vote') {
              const option = latestVote.data?.option || latestVote.data?.governance?.data?.option;
              const hasLaterRevoke = pollWithVotes.votes.some((v: any) => {
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
          } else {
            setMyVote(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load poll');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pollAddress, activeAccount, rebuildFromPollData]);

  // Ensure detail page scrolls to top when opened
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Resolve creation transaction hash for on-chain badge (same behavior as feed)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pollAddress) return;
      try {
        const mdwBase = CONFIG.MIDDLEWARE_URL.replace(/\/$/, '');
        // Attempt to fetch contract to get the source tx hash
        const cRes = await fetch(`${mdwBase}/v3/contracts/${pollAddress}`);
        if (cRes.ok) {
          const c = await cRes.json();
          const sourceTxHash = c?.source_tx_hash || c?.create_tx || c?.creation_tx || null;
          if (sourceTxHash && !cancelled) {
            setTxHash(String(sourceTxHash));
            return;
          }
        }
        // Fallback query
        try {
          const qRes = await fetch(`${mdwBase}/v3/transactions?type=contract_create&contract_id=${pollAddress}&direction=forward&limit=1`);
          if (qRes.ok) {
            const json = await qRes.json();
            const tx = json?.data?.[0] || json?.transactions?.[0] || json?.[0];
            const hash = tx?.hash || tx?.tx_hash || tx?.tx_hash_str || null;
            if (hash && !cancelled) setTxHash(String(hash));
          }
        } catch {}
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pollAddress]);

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
        const pollWithVotes = await GovernanceApi.getPollWithVotes(pollAddress as any);
        rebuildFromPollData(pollWithVotes);
      } catch {}
      window.setTimeout(() => { refreshMyVote(); }, 2000);
    } finally {
      setVoting(false);
      setPendingOption(null);
    }
  }, [sdk, voting, pollAddress, myVote, rebuildFromPollData, refreshMyVote]);

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
        const pollWithVotes = await GovernanceApi.getPollWithVotes(pollAddress as any);
        rebuildFromPollData(pollWithVotes);
      } catch {}
      window.setTimeout(() => { refreshMyVote(); }, 2000);
    } finally {
      setVoting(false);
      setPendingOption(null);
    }
  }, [sdk, voting, pollAddress, myVote, rebuildFromPollData, refreshMyVote]);

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
            description={description}
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
            txHash={txHash}
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


