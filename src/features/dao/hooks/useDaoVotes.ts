import { useQuery } from '@tanstack/react-query';
import type { AeSdkBase, Encoded } from '@aeternity/aepp-sdk';
import { initDAOVote, initFallBack, VoteState } from 'bctsl-sdk';
import { useAeSdk } from '@/hooks/useAeSdk';
import { DaoVoteStatus, voteStatus } from '../utils/voteRules';

export interface DaoVoteItem {
  id: bigint;
  address: Encoded.ContractAddress;
  applied: boolean;
  state: VoteState;
}

export interface DaoVotesData {
  voteTimeout: number;
  tokenSupply?: bigint;
  /** Newest first. */
  votes: DaoVoteItem[];
}

export interface DaoVoteWithStatus extends DaoVoteItem {
  status: DaoVoteStatus;
}

export const daoVotesQueryKey = (saleAddress?: string) => ['dao-votes', saleAddress] as const;

// The sale's owner, as `useDao` reads it. A passed ChangeDAO vote moves the sale to a new DAO;
// the backend's `dao_address` keeps the one the token was created with.
const saleDao = async (sdk: AeSdkBase, saleAddress: Encoded.ContractAddress) => (
  (await initFallBack(sdk, saleAddress)).checkAndGetDAO()
);

/** Reads the votes of the DAO that owns the sale, with dry-runs only: no wallet needed. */
export async function fetchDaoVotes(
  sdk: AeSdkBase,
  saleAddress: Encoded.ContractAddress,
): Promise<DaoVotesData> {
  const dao = await saleDao(sdk, saleAddress);
  const daoState = await dao.state();
  const entries = Array.from(daoState.votes.entries());

  const votes = await Promise.all(entries.map(async ([id, [applied, address]]) => {
    const vote = await initDAOVote(sdk, address, id);
    return {
      id, address, applied, state: await vote.state(),
    };
  }));
  votes.sort((a, b) => Number(b.id - a.id));

  // Turnout is measured against the token supply.
  let tokenSupply: bigint | undefined;
  if (votes.length) {
    const token = await dao.tokenContractInstance();
    tokenSupply = (await token.total_supply()).decodedResult as bigint;
  }

  return { voteTimeout: Number(daoState.vote_timeout), tokenSupply, votes };
}

export function withStatus(
  data: DaoVotesData | undefined,
  height: number | null | undefined,
): DaoVoteWithStatus[] {
  if (!data || height == null) return [];
  return data.votes.map((vote) => ({
    ...vote,
    status: voteStatus({
      voteState: vote.state,
      applied: vote.applied,
      height,
      voteTimeout: data.voteTimeout,
      tokenSupply: data.tokenSupply,
    }),
  }));
}

/** All votes of a token's DAO with their status, for the DAO page and the token page tab. */
export function useDaoVotes(saleAddress?: string) {
  const { staticAeSdk, currentBlockHeight } = useAeSdk();
  const query = useQuery({
    queryKey: daoVotesQueryKey(saleAddress),
    queryFn: () => fetchDaoVotes(staticAeSdk, saleAddress as Encoded.ContractAddress),
    enabled: !!staticAeSdk && !!saleAddress?.startsWith('ct_'),
    staleTime: 60_000,
    retry: 1,
  });
  const votes = withStatus(query.data, currentBlockHeight);

  return {
    ...query,
    votes,
    openCount: votes.filter((v) => v.status === 'open').length,
    currentBlockHeight,
  };
}
