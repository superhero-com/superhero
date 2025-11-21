import { CONFIG } from '../config';
import { Encoded } from '@aeternity/aepp-sdk';

interface GovernanceVersion {
  version: string;
}

interface PollData {
  id: number;
  poll: Encoded.ContractAddress;
  totalStake: string;
  voteCount: number;
  closeHeight: number;
  delegationCount: number;
  score: number;
}

interface PollOrderingResponse {
  ordering: number[];
  data: PollData[];
}

interface PollMetadata {
  title: string;
  description: string;
  link: string;
}

interface PollState {
  metadata: PollMetadata;
  vote_options: Record<string, string>;
  close_height: number;
  create_height: number;
  votes: Record<Encoded.AccountAddress, number>;
  author: Encoded.AccountAddress;
}

interface StakeAtHeight {
  account: Encoded.AccountAddress;
  option: number;
  stake: string;
  balance: string;
  delegated: string;
  delegators: Encoded.AccountAddress[];
  delegationTree: Record<string, unknown>;
}

interface StakeForOption {
  option: string;
  optionStake: string;
  percentageOfTotal: string;
  votes: unknown[];
}

interface PollOverviewResponse {
  pollState: PollState;
  stakesAtHeight: StakeAtHeight[];
  stakesForOption: StakeForOption[];
  totalStake: string;
  percentOfTotalSupply: string;
  voteCount: number;
}

export type VotesStateResponse = PollOverviewResponse;

interface DelegatedPowerResponse {
  delegatedPower: string;
  delegationTree: Record<string, unknown>;
  flattenedDelegationTree: unknown[];
}

interface AccountPollVoterAuthorResponse {
  votedInPolls: unknown[];
  authorOfPolls: unknown[];
  delegateeVotes: unknown[];
}

interface ContractEventRequest {
  topic: string;
  poll?: Encoded.ContractAddress;
}

// New API types for /api/governance/votes endpoints
export interface GovernancePollDto {
  hash: string;
  block_hash: string;
  block_height: number;
  caller_id?: string;
  function: string;
  created_at: string;
  _version: number;
  author?: string;
  metadata?: {
    link: string;
    title: string;
    spec_ref: number[];
    description: string;
  };
  poll_seq_id?: string;
  close_height?: number;
  poll_address?: string;
  vote_options?: Array<{
    key: number;
    val: string;
  }>;
  create_height?: number;
  close_at_height?: number;
  votes_count: number;
  votes_revoked_count: number;
  votes_count_by_option?: Record<string, number>;
}

export interface GovernancePollVoteDto {
  hash: string;
  block_hash: string;
  block_height: number;
  caller_id?: string;
  function: string;
  created_at: string;
  data: any;
  _version: number;
  poll_address?: string;
}

export interface GovernanceVoteDto {
  poll: GovernancePollDto;
  votes: GovernancePollVoteDto[];
}

export interface PaginatedGovernancePolls {
  items: GovernancePollDto[];
  meta: {
    itemCount: number;
    totalItems: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

// Governance API client (aepp-governance backend compatibility)
async function fetchGovernance<T>(path: string, init?: RequestInit, ignoreOutput?: boolean): Promise<T> {
  const res = await fetch(`${CONFIG.GOVERNANCE_API_URL.replace(/\/$/, '')}/${path}`, init);
  if (!res.ok) throw new Error(`Governance request failed: ${res.status}`);
  if (ignoreOutput) return undefined as T;
  return res.json();
}

// New Superhero API client for governance endpoints
async function fetchSuperheroGovernance<T>(path: string, init?: RequestInit, ignoreOutput?: boolean): Promise<T> {
  const base = (CONFIG.SUPERHERO_API_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('SUPERHERO_API_URL not configured');
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Superhero governance request failed: ${res.status}`);
  if (ignoreOutput) return undefined as T;
  return res.json();
}

export const GovernanceApi = {
  // Get poll votes state for a specific address
  getVotesState: (address: string): Promise<VotesStateResponse> => 
    fetchGovernance<VotesStateResponse>(`votesState/${address}`),
  
  // Get delegated power for an account (optionally for a specific poll)
  getDelegatedPower: (address: string, poll?: string): Promise<DelegatedPowerResponse> => {
    const path = poll ? `delegatedPower/${address}?poll=${poll}` : `delegatedPower/${address}`;
    return fetchGovernance<DelegatedPowerResponse>(path);
  },
  
  // Get poll overview for a specific address
  getPollOverview: (address: Encoded.ContractAddress): Promise<PollOverviewResponse> => 
    fetchGovernance<PollOverviewResponse>(`pollOverview/${address}`),
  
  // Get account poll voter author information
  getAccountPollVoterAuthor: (address: string): Promise<AccountPollVoterAuthorResponse> => 
    fetchGovernance<AccountPollVoterAuthorResponse>(`accountPollVoterAuthor/${address}`),
  
  // Submit contract event
  submitContractEvent: (topic: string, poll?: string): Promise<void> => 
    fetchGovernance<void>('contractEvent', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, poll }),
    }, true),
  
  // Get poll ordering (optionally for closed polls)
  getPollOrdering: (closed: boolean = false): Promise<PollOrderingResponse> => 
    fetchGovernance<PollOrderingResponse>(`pollOrdering?closed=${closed ? "true" : "false"}`),
  
  // Get backend version
  getVersion: (): Promise<GovernanceVersion> => 
    fetchGovernance<GovernanceVersion>('version'),

  // New endpoints using /api/governance/votes
  // Get all governance polls (paginated)
  getAllPolls: (page: number = 1, limit: number = 100): Promise<PaginatedGovernancePolls> => {
    return fetchSuperheroGovernance<PaginatedGovernancePolls>(`/api/governance/votes?page=${page}&limit=${limit}`);
  },
  
  // Get a governance poll with its votes
  getPollWithVotes: (pollAddress: string): Promise<GovernanceVoteDto> => 
    fetchSuperheroGovernance<GovernanceVoteDto>(`/api/governance/votes/${pollAddress}`),
};
