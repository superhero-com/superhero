import { AeSdk, toAe } from "@aeternity/aepp-sdk";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TrendminerApi } from "../../api/backend";
import AeButton from "../../components/AeButton";
import { useAeSdk } from "../../hooks";
import { TokensService } from "@/api/generated";
import { Decimal } from "@/libs/decimal";
import { LivePriceFormatter } from "@/features/shared/components";

let bctsl: any;
async function ensureBctsl() {
  if (!bctsl) bctsl = await import("bctsl-sdk");
  return bctsl;
}

export default function Dao() {
  const { sdk } = useAeSdk();
  const { saleAddress } = useParams();
  const [token, setToken] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daoState, setDaoState] = useState<any | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newVote, setNewVote] = useState<{
    type: string;
    value?: string;
    description?: string;
    link?: string;
  }>({ type: "VotePayout", value: "" });

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (saleAddress) {
          const tok = await TokensService.findByAddress({
            address: saleAddress,
          });
          if (!cancel) setToken(tok || null);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || "Failed to load DAO");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [saleAddress]);

  async function refreshDao() {
    if (!saleAddress) return;
    try {
      const { initFallBack } = await ensureBctsl();
      const factory = await initFallBack(sdk, saleAddress);
      const dao = await factory.checkAndGetDAO();
      const state = await dao.state();
      setDaoState(state);
      const bal = await dao.balanceAettos();
      setBalance(Number(bal) / 1e18);
    } catch (e) {
      // ignore for read errors
    }
  }

  useEffect(() => {
    refreshDao();
  }, [saleAddress]);

  async function createVote() {
    if (!saleAddress) return;
    setCreating(true);
    try {
      const { initFallBack } = await ensureBctsl();
      const factory = await initFallBack(sdk, saleAddress);
      const dao = await factory.checkAndGetDAO();
      const metadata: any = {
        subject_type: newVote.type,
        subject_value: newVote.value,
        description: newVote.description || "",
        link: newVote.link || "",
        subject: { [newVote.type]: [newVote.value] },
      };
      await dao.addVote(metadata);
      await refreshDao();
    } catch (e: any) {
      setError(e?.message || "Failed to create vote");
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
            {token.dao_balance ? (
              <LivePriceFormatter
                aePrice={Decimal.from(toAe(token.dao_balance))}
                watchKey={token.sale_address}
                className="text-xs sm:text-base"
                hideFiatPrice={true}
              />
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {loading && <div className="p-4 text-white/80">Loading…</div>}
      {error && <div className="p-4 text-red-400">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 mt-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <div>
              <span className="opacity-75 text-xs text-white/75">
                Proposals:
              </span>{" "}
              <strong className="text-white">
                {Array.isArray((daoState as any)?.votes)
                  ? (daoState as any).votes.length
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
                <option value="VotePayout">Payout</option>
                <option value="Generic">Generic</option>
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
            {!daoState && <div className="text-slate-400">No votes yet</div>}
            {/* {daoState &&
              Array.isArray(daoState.votes) &&
              daoState.votes.map((vote: any, index: number) => (
                <DaoVoteItem
                  key={index}
                  saleAddress={saleAddress!}
                  vote={vote}
                  id={index}
                  onChanged={refreshDao}
                />
              ))} */}
          </div>
        </div>
      )}
    </div>
  );
}

function DaoVoteItem({
  saleAddress,
  vote,
  id,
  onChanged,
}: {
  saleAddress: string;
  vote: any;
  id: number;
  onChanged: () => void;
}) {
  const { sdk } = useAeSdk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(fn: (dao: any) => Promise<any>) {
    setLoading(true);
    setError(null);
    try {
      const { initFallBack } = await ensureBctsl();
      const factory = await initFallBack(sdk, saleAddress);
      const dao = await factory.checkAndGetDAO();
      await fn(dao);
      await onChanged();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-white/10 rounded-xl p-3 mb-2 bg-black/20 backdrop-blur-lg text-white">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-white/80">Vote #{id}</div>
        <div className="text-sm text-white">
          State: {(vote && vote[0]) || "—"}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <AeButton
          disabled={loading}
          onClick={() => action((dao) => dao.vote(true))}
          size="small"
          variant="success"
        >
          Vote Yes
        </AeButton>
        <AeButton
          disabled={loading}
          onClick={() => action((dao) => dao.vote(false))}
          size="small"
          variant="error"
        >
          Vote No
        </AeButton>
        <AeButton
          disabled={loading}
          onClick={() => action((dao) => dao.revokeVote())}
          size="small"
          variant="warning"
        >
          Revoke
        </AeButton>
        <AeButton
          disabled={loading}
          onClick={() => action((dao) => dao.withdraw())}
          size="small"
          variant="secondary"
        >
          Withdraw
        </AeButton>
        <AeButton
          disabled={loading}
          onClick={() => action((dao) => dao.apply())}
          size="small"
          variant="accent"
        >
          Apply
        </AeButton>
      </div>
      {error && <div className="text-red-400 mt-2 text-sm">{error}</div>}
    </div>
  );
}
