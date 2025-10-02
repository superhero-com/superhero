import { TokensService } from "@/api/generated";
import { LivePriceFormatter } from "@/features/shared/components";
import VoteDetail from "@/features/trendminer/components/Dao/VoteDetail";
import { useDao } from "@/features/trendminer/hooks/useDao";
import { Decimal } from "@/libs/decimal";
import { Encoded, toAe } from "@aeternity/aepp-sdk";
import { useQuery } from "@tanstack/react-query";
import { VOTE_TYPE, VoteMetadata } from "bctsl-sdk";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AeButton from "../../components/AeButton";

let bctsl: any;
async function ensureBctsl() {
  if (!bctsl) bctsl = await import("bctsl-sdk");
  return bctsl;
}

const voteTypes = [
  VOTE_TYPE.VotePayout,
  // VOTE_TYPE.VotePayoutAmount, // two fields
  VOTE_TYPE.ChangeDAO,
  // VOTE_TYPE.ChangeMetaInfo, // a map
  VOTE_TYPE.ChangeMinimumTokenThreshold,
  VOTE_TYPE.AddModerator,
  VOTE_TYPE.DeleteModerator,
] as const;

export default function Dao() {
  const { saleAddress } = useParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newVote, setNewVote] = useState<{
    type: string;
    value?: string;
    description?: string;
    link?: string;
  }>({ type: "VotePayout", value: "" });

  const { data: token, isLoading, error } = useQuery({
    queryFn: () => TokensService.findByAddress({ address: saleAddress }),
    queryKey: ['TokensService.findByAddress', saleAddress],
    retry: 3,
    retryDelay: 1000 * 5,
  });

  const { addVote, state, updateState } = useDao({
    tokenSaleAddress: saleAddress as Encoded.ContractAddress, 
  });

  useEffect(() => {
    setNewVote({
      type: VOTE_TYPE.VotePayout as (typeof voteTypes)[number],
      value: 'ak_LF4siZQxMqjGBAcHS2MMacMYgYjHjRh4HkDwqF3sA59oLfcMA',
      description: 'abc',
      link: 'http://localhost:8080/dao/ct_215VAdtTqmNH8PcdwWcfQNju1qioAXb1XMwDP5hoNZJEeYhHqz',
    });
  }, [saleAddress]);
  
  async function createVote() {
    if (!saleAddress) return;
    setCreating(true);
    try {
      const metadata: any = {
        subject: {VotePayout :[newVote.value]},
        description: newVote.description || "",
        link: newVote.link || "",
        
      };
      await addVote(metadata as VoteMetadata);
      await updateState();
      // await refreshDao();
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to create vote");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      {token && (
        <div className="text-3xl font-black text-white mb-2">
          {token.name || token.symbol} [DAO]
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <Link
          to={`/trendminer/tokens/${encodeURIComponent(saleAddress || "")}`}
          className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
        >
          ← Back to token sale
        </Link>
        <div className="flex flex-row gap-2 items-center font-bold text-white">
          <div className="font-bold opacity-80 text-white/80">Treasury</div>
          <div className="font-bold text-white">
            {token?.dao_balance ? (
              <LivePriceFormatter
                aePrice={Decimal.from(toAe(token?.dao_balance))}
                watchKey={token?.sale_address}
                className="text-xs sm:text-base"
                hideFiatPrice={true}
              />
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {isLoading && <div className="p-4 text-white/80">Loading…</div>}
      {error && <div className="p-4 text-red-400">{error.message}</div>}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-4 mt-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <div>
              <span className="opacity-75 text-xs text-white/75">
                Proposals:
              </span>{" "}
              <strong className="text-white">
                {Array.isArray((state as any)?.votes)
                  ? (state as any).votes.length
                  : 0}
              </strong>
            </div>
            {token?.holders_count != null && (
              <div>
                <span className="opacity-75 text-xs text-white/75">
                  Holders:
                </span>{" "}
                <strong className="text-white">
                  {Number(token.holders_count).toLocaleString()}
                </strong>
              </div>
            )}
            {token?.market_cap != null && (
              <div className="flex flex-row gap-2 items-center">
                <span className="opacity-75 text-xs text-white/75">
                  Market Cap:
                </span>{" "}
                <strong className="text-white">
                  <LivePriceFormatter
                    aePrice={Decimal.from(toAe(token.market_cap))}
                    watchKey={token.sale_address}
                    className="text-xs"
                    hideFiatPrice={true}
                  />
                </strong>
              </div>
            )}
            <div>
              <a
                href={`https://aescan.io/contracts/${encodeURIComponent(
                  saleAddress || ""
                )}?type=call-transactions`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                View on æScan ↗
              </a>
            </div>
          </div>
          <div className="text-sm opacity-80 text-white/80 leading-relaxed">
            The DAO manages the token's treasury. Holders can create proposals
            and vote. Approved proposals can be applied to execute on-chain
            actions such as payouts.
          </div>
          <div className="border border-white/10 rounded-xl p-3 bg-black/20 backdrop-blur-lg text-white shadow-lg">
            <div className="font-extrabold mb-2 text-white">Create Vote</div>
            <div className="grid gap-2">
              <select
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                value={newVote.type}
                onChange={(e) =>
                  setNewVote((v) => ({ ...v, type: e.target.value }))
                }
              >
                {
                  voteTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))
                }
              </select>
              <input
                placeholder="Subject value (address or data)"
                value={newVote.value}
                onChange={(e) =>
                  setNewVote((v) => ({ ...v, value: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
              <input
                placeholder="Description (optional)"
                value={newVote.description || ""}
                onChange={(e) =>
                  setNewVote((v) => ({ ...v, description: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
              <input
                placeholder="Link (optional)"
                value={newVote.link || ""}
                onChange={(e) =>
                  setNewVote((v) => ({ ...v, link: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
              <AeButton
                onClick={createVote}
                disabled={creating}
                loading={creating}
                size="small"
                variant="primary"
              >
                {creating ? "Creating…" : "Create vote"}
              </AeButton>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl p-3 bg-black/20 backdrop-blur-lg text-white shadow-lg">
            <div className="font-extrabold mb-2 text-white">Votes</div>
            {!state && <div className="text-slate-400">No votes yet</div>}
              {state?.votes &&
                Array.from(state?.votes).map((vote: any, index: number) => 
                  (
                  <VoteDetail
                    key={index}
                    address={vote[1][1]}
                    saleAddress={saleAddress as Encoded.ContractAddress}
                    voteId={vote[0]}
                  />
                )
                )}
          </div>
        </div>
      )}
    </div>
  );
}
