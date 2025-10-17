import { TokensService } from "@/api/generated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TokenVoteCard from "@/features/dao/components/TokenVoteCard";
import { useDao } from "@/features/dao/hooks/useDao";
import { LivePriceFormatter } from "@/features/shared/components";
import { Decimal } from "@/libs/decimal";
import { ensureAddress, ensureString } from "@/utils/common";
import { Encoded, Encoding, toAe } from "@aeternity/aepp-sdk";
import { useQuery } from "@tanstack/react-query";
import { VOTE_TYPE, VoteMetadata } from "bctsl-sdk";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

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
  const [validationErrors, setValidationErrors] = useState<{
    value?: string;
    description?: string;
    link?: string;
  }>({});
  const [newVote, setNewVote] = useState<{
    type: (typeof voteTypes)[number];
    value?: string;
    description?: string;
    link?: string;
  }>({ type: VOTE_TYPE.VotePayout, value: "" });

  const { data: token, isLoading, error } = useQuery({
    queryFn: () => TokensService.findByAddress({ address: saleAddress }),
    queryKey: ['TokensService.findByAddress', saleAddress],
    retry: 3,
    retryDelay: 1000 * 5,
  });

  const { addVote, state, updateState } = useDao({
    tokenSaleAddress: saleAddress as Encoded.ContractAddress,
  });

  const validateForm = () => {
    const errors: { value?: string; description?: string; link?: string } = {};
    
    // Validate subject value (should be an address)
    if (!newVote.value || newVote.value.trim() === '') {
      errors.value = 'Subject value is required';
    } else {
      try {
        ensureAddress(newVote.value.trim(), Encoding.ContractAddress);
      } catch (e) {
        errors.value = 'Subject value must be a valid contract address';
      }
    }
    
    // Validate description (should be a string)
    if (!newVote.description || newVote.description.trim() === '') {
      errors.description = 'Description is required';
    } else {
      try {
        ensureString(newVote.description.trim());
      } catch (e) {
        errors.description = 'Description must be a valid string';
      }
    }
    
    // Validate link (should be a string)
    if (!newVote.link || newVote.link.trim() === '') {
      errors.link = 'Link is required';
    } else {
      try {
        ensureString(newVote.link.trim());
      } catch (e) {
        errors.link = 'Link must be a valid string';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: keyof typeof validationErrors) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  async function createVote() {
    if (!saleAddress) return;
    
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }
    
    setCreating(true);
    setErrorMessage(null);
    try {
      const metadata: any = {
        subject: { VotePayout: [newVote.value] },
        description: newVote.description || "",
        link: newVote.link || "",

      };
      await addVote(metadata as VoteMetadata);
      await updateState();
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to create vote");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-[min(1200px,100%)] mx-auto min-h-screen text-white px-4">
      {/* Header Section */}
      <div className="mb-6">
        {token && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent leading-tight">
                {token.name || token.symbol} [DAO]
              </h1>
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-slate-600/80 to-slate-700/80 text-white text-xs font-medium px-2.5 py-1 rounded-full border-0 shadow-sm"
              >
                DAO
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
          </div>
        )}
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
          <Link
            to={`/trends/tokens/${encodeURIComponent(saleAddress || "")}`}
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            ← Back to token sale
          </Link>
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

      {isLoading && (
        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-6">
            <div className="text-white/80">Loading…</div>
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6">
            <div className="text-red-400">{error.message}</div>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-6">
          {/* Stats Card */}
          <Card className="bg-white/[0.02] border-white/10">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-6 text-sm mb-4">
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
              </div>
              <div className="text-sm opacity-80 text-white/80 leading-relaxed">
                The DAO manages the token's treasury. Holders can create proposals
                and vote. Approved proposals can be applied to execute on-chain
                actions such as payouts.
              </div>
            </CardContent>
          </Card>
          {/* Create Vote and Votes in a row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Vote Card */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Create Vote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">
                      Vote Type
                    </label>
                    <Select
                      value={newVote.type}
                      onValueChange={(value) =>
                        setNewVote((v) => ({ ...v, type: value as (typeof voteTypes)[number] }))
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select vote type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/20">
                        {voteTypes.map((type) => (
                          <SelectItem key={type} value={type} className="text-white">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">
                      Subject Value
                    </label>
                    <Input
                      placeholder="Subject value (address or data)"
                      value={newVote.value}
                      onChange={(e) => {
                        setNewVote((v) => ({ ...v, value: e.target.value }));
                        clearFieldError('value');
                      }}
                      className={`bg-white/5 border-white/20 text-white placeholder:text-white/60 ${
                        validationErrors.value ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.value && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.value}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">
                      Description
                    </label>
                    <Input
                      placeholder="Description"
                      value={newVote.description || ""}
                      onChange={(e) => {
                        setNewVote((v) => ({ ...v, description: e.target.value }));
                        clearFieldError('description');
                      }}
                      className={`bg-white/5 border-white/20 text-white placeholder:text-white/60 ${
                        validationErrors.description ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.description && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.description}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">
                      Link
                    </label>
                    <Input
                      placeholder="Link"
                      value={newVote.link || ""}
                      onChange={(e) => {
                        setNewVote((v) => ({ ...v, link: e.target.value }));
                        clearFieldError('link');
                      }}
                      className={`bg-white/5 border-white/20 text-white placeholder:text-white/60 ${
                        validationErrors.link ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.link && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.link}</p>
                    )}
                  </div>
                  
                  {errorMessage && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      {errorMessage}
                    </div>
                  )}
                  
                  <Button
                    onClick={createVote}
                    disabled={creating}
                    className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:shadow-lg"
                  >
                    {creating ? "Creating…" : "Create vote"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Votes Card */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Votes</CardTitle>
              </CardHeader>
              <CardContent>
                {!state || !state?.votes || Array.from(state?.votes).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No votes yet</h3>
                    <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                      Be the first to create a proposal and start the democratic process for this token.
                    </p>
                  </div>
                ) : (
                  Array.from(state?.votes).map((vote: any, index: number) =>
                  (
                    <TokenVoteCard
                      key={index}
                      address={vote[1][1]}
                      saleAddress={saleAddress as Encoded.ContractAddress}
                      voteId={vote[0]}
                    />
                  )
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
