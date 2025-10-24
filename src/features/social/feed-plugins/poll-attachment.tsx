import React, { useEffect, useMemo, useState } from 'react';
import type { ComposerAttachmentSpec, AttachmentPanelProps } from '@/plugin-sdk';
import { attachmentRegistry } from '@/features/social/plugins/registries';
import { CONFIG } from '@/config';
import REGISTRY_WITH_EVENTS_ACI from '@/api/GovernanceRegistryACI.json';
import POLL_ACI from '@/api/GovernancePollACI.json';
import BYTECODE_HASHES from '@/api/GovernanceBytecodeHashes.json';
import { Contract, Encoded } from '@aeternity/aepp-sdk';
import { GovernanceApi } from '@/api/governance';
import PollCreatedCard from './poll-created/PollCreatedCard';
import { ChevronDown } from 'lucide-react';

function blocksFromMs(ms: number): number {
  const APPROX_BLOCK_MS = 180000; // ~3m per block
  return Math.max(0, Math.round(ms / APPROX_BLOCK_MS));
}

function estimateClose(currentHeight?: number, targetHeight?: number) {
  if (!currentHeight || !targetHeight) return null;
  const APPROX_BLOCK_MS = 180000;
  const diff = Math.max(0, targetHeight - currentHeight);
  return new Date(Date.now() + diff * APPROX_BLOCK_MS);
}

function useOptionsField(ctx: any) {
  const ns = 'poll.options';
  const options = ((ctx.getValue as any)(ns) as string[] | undefined || ['', '']).slice(0, 4);
  const set = (next: string[]) => ctx.setValue(ns, next.slice(0, 4));
  const visible = useMemo(() => {
    const arr = options.length < 2 ? ['', ''] : options;
    // Grow: if last non-empty is filled, add a new empty (until cap 4)
    if (arr.length < 4 && arr[arr.length - 1].trim()) return [...arr, ''];
    return arr;
  }, [options]);
  return { visible, set };
}

const PollPanel: React.FC<AttachmentPanelProps> = ({ ctx, onRemove }) => {
  const { visible, set } = useOptionsField(ctx);
  // Duration selectors (default 3 days)
  const [days, setDays] = useState<number>(3);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const currentHeight = (ctx as any).currentBlockHeight as number | undefined;
  const totalMs = ((Math.max(0, days) * 24 + Math.max(0, hours)) * 60 + Math.max(0, minutes)) * 60 * 1000;
  const computedCloseHeight = totalMs === 0 ? 0 : (currentHeight ? currentHeight + blocksFromMs(totalMs) : 0);
  const estCloseDate = totalMs === 0 ? null : new Date(Date.now() + totalMs);

  useEffect(() => { ctx.setValue('poll.closeHeight', computedCloseHeight); }, [computedCloseHeight]);

  return (
    <div className="bg-white/[0.04] border border-white/15 rounded-xl p-3 md:p-4">
      <div className="text-[13px] text-white/80 mb-2">Options</div>
      <div className="grid gap-2">
        {visible.map((val, idx) => (
          <input
            key={idx}
            value={val}
            onChange={(e) => {
              const next = [...visible];
              next[idx] = e.target.value;
              set(next);
            }}
            placeholder="Add Option"
            className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-white/30"
          />
        ))}
      </div>

        <div className="mt-4 grid gap-2">
        <div className="text-[13px] text-white/80">Poll length</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <div className="absolute top-1 left-3 text-[11px] text-white/60 pointer-events-none">Days</div>
            <select
              value={String(days)}
              onChange={(e) => setDays(Math.max(0, Math.min(30, Number(e.target.value || 0))))}
              className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 pt-5 pb-2 text-white outline-none focus:border-white/30 appearance-none"
            >
              {Array.from({ length: 31 }, (_, i) => i).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
          <div className="relative">
            <div className="absolute top-1 left-3 text-[11px] text-white/60 pointer-events-none">Hours</div>
            <select
              value={String(hours)}
              onChange={(e) => setHours(Math.max(0, Math.min(23, Number(e.target.value || 0))))}
              className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 pt-5 pb-2 text-white outline-none focus:border-white/30 appearance-none"
            >
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
          <div className="relative">
            <div className="absolute top-1 left-3 text-[11px] text-white/60 pointer-events-none">Minutes</div>
            <select
              value={String(minutes)}
              onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value || 0))))}
              className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 pt-5 pb-2 text-white outline-none focus:border-white/30 appearance-none"
            >
              {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
        </div>
        <div className="text-[12px] text-white/70">
          Closes at ~{estCloseDate ? `${estCloseDate.toLocaleDateString()} ${estCloseDate.toLocaleTimeString().slice(0,5)}` : '—'}{computedCloseHeight ? ` (#${computedCloseHeight.toLocaleString()})` : ''}
        </div>
      </div>
      {/* Remove inline remove button; Poll toolbar button toggles remove */}
    </div>
  );
};

export function registerPollAttachment() {
  const spec: ComposerAttachmentSpec = {
    id: 'poll',
    label: 'Poll',
    Panel: PollPanel,
    validate: (ctx) => {
      const opts = (ctx.getValue<string[]>('poll.options') || []).map((o) => o.trim()).filter(Boolean);
      const uniq = new Set(opts.map((o) => o.toLowerCase()));
      const errs: { field?: string; message: string }[] = [];
      if (opts.length < 2) errs.push({ message: 'At least two options are required.' });
      if (uniq.size !== opts.length) errs.push({ message: 'Options must be unique.' });
      const ch = Number(ctx.getValue<number>('poll.closeHeight') || 0);
      if (!(ch === 0 || (ctx as any).currentBlockHeight == null || ch > (ctx as any).currentBlockHeight)) {
        errs.push({ message: 'Close height must be 0 or greater than the current height.' });
      }
      return errs;
    },
    onAfterPost: async (ctx, post) => {
      // show pending inline immediately
      const options = (ctx.getValue<string[]>('poll.options') || []).map((o) => o.trim()).filter(Boolean).slice(0, 4);
      const ch = Number(ctx.getValue<number>('poll.closeHeight') || 0) || 0;
      ctx.cacheLink?.(String(post.id), 'poll:pending', { options, closeHeight: ch });
      try {
        const { sdk } = await ctx.ensureWallet();
        const pollBytecode = (BYTECODE_HASHES as any)["8.0.0"]["Poll_Iris.aes"].bytecode as Encoded.ContractBytearray;
        const pollContract = await (sdk as any).initializeContract({ aci: POLL_ACI as any, bytecode: pollBytecode });
        const meta = { title: post.text.trim(), description: '', link: '', spec_ref: undefined as any };
        const rec = options.reduce((acc, t, i) => ({ ...acc, [i]: t }), {} as Record<number, string>);
        const init = await (pollContract as any).init(meta, rec as any, ch === 0 ? undefined : ch, { omitUnknown: true });
        const createdAddress = (init as any).address as string;
        // add to registry
        const registry = await Contract.initialize<{
          add_poll: (poll: any, is_listed: boolean) => Promise<{ decodedResult: number }>
        }>({
          ...(sdk as any).getContext(),
          aci: REGISTRY_WITH_EVENTS_ACI as any,
          address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
        } as any);
        await (registry as any).add_poll(createdAddress as Encoded.ContractAddress, true);
        // update inline cache
        ctx.cacheLink?.(String(post.id), 'poll:ct', { address: createdAddress });
        // push feed entry for immediate visibility
        try {
          const ov = await GovernanceApi.getPollOverview(createdAddress as any);
          const optsRec = (ov?.pollState?.vote_options || {}) as Record<string, string>;
          const optionsArr = Object.entries(optsRec).map(([k, v]) => ({ id: Number(k), label: String(v) }));
          ctx.pushFeedEntry?.('poll-created', {
            id: `poll-created:${createdAddress}`,
            kind: 'poll-created',
            createdAt: new Date().toISOString(),
            data: {
              pollAddress: createdAddress,
              title: post.text,
              description: undefined,
              author: undefined,
              closeHeight: ov?.pollState?.close_height as any,
              createHeight: ov?.pollState?.create_height as any,
              options: optionsArr,
              totalVotes: 0,
            }
          });
        } catch {}
      } catch (e) {
        ctx.cacheLink?.(String(post.id), 'poll:failed', { error: String(e) });
      }
    },
  };
  if (!attachmentRegistry.find((a) => a.id === spec.id)) attachmentRegistry.push(spec);
}

// Inline helper to render a pending/ready poll given a postId
export function InlinePoll({ postId }: { postId: string }) {
  const [state, setState] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('sh:plugin:post-links') || '{}')[String(postId)] || null; } catch { return null; }
  });
  useEffect(() => {
    const fn = (ev: any) => {
      if (String(ev?.detail?.postId) === String(postId)) setState({ kind: ev.detail.kind, payload: ev.detail.payload });
    };
    window.addEventListener('sh:plugin:post-links:update' as any, fn as any);
    return () => window.removeEventListener('sh:plugin:post-links:update' as any, fn as any);
  }, [postId]);

  if (!state) return null;
  if (state.kind === 'poll:pending') {
    const ch = state?.payload?.closeHeight;
    return (
      <div className="mt-3 bg-white/[0.04] border border-white/15 rounded-xl p-3 text-[13px] text-white/80">
        Creating poll… {typeof ch === 'number' ? `(close @ ${ch}, est.)` : ''}
      </div>
    );
  }
  if (state.kind === 'poll:failed') {
    return (
      <div className="mt-3 bg-red-900/30 border border-red-400/30 rounded-xl p-3 text-[13px] text-red-200">
        Could not create poll. Please retry.
      </div>
    );
  }
  if (state.kind === 'poll:ct') {
    const address = state?.payload?.address as Encoded.ContractAddress;
    // We rely on PollCreatedCard to present; fetch overview
    const [ov, setOv] = useState<any>(null);
    useEffect(() => {
      (async () => {
        try { setOv(await GovernanceApi.getPollOverview(address as any)); } catch {}
      })();
    }, [address]);
    if (!ov) return (
      <div className="mt-3 bg-white/[0.04] border border-white/15 rounded-xl p-3 text-[13px] text-white/80">Loading poll…</div>
    );
    const optsRec = (ov?.pollState?.vote_options || {}) as Record<string, string>;
    const options = Object.entries(optsRec).map(([k, v]) => ({ id: Number(k), label: String(v), votes: 0 }));
    return (
      <div className="mt-3">
        <PollCreatedCard
          title={ov?.pollState?.metadata?.title || ''}
          description={ov?.pollState?.metadata?.description || ''}
          author={ov?.pollState?.author as any}
          closeHeight={ov?.pollState?.close_height as any}
          currentHeight={undefined as any}
          options={options}
          totalVotes={0}
          onOpen={() => { window.location.href = `/poll/${address}`; }}
          createdAtIso={new Date().toISOString()}
          myVote={null}
          onVoteOption={() => {}}
          onRevoke={() => {}}
          voting={false}
          txHash={undefined as any}
          contractAddress={address as any}
          pendingOption={null}
        />
      </div>
    );
  }
  return null;
}


