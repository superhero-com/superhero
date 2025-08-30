import { CONFIG } from '../config';

// Governance API client (aepp-governance backend compatibility)
async function fetchGovernance(path: string, init?: RequestInit) {
  const res = await fetch(`${CONFIG.GOVERNANCE_API_URL.replace(/\/$/, '')}/${path}`, init);
  if (!res.ok) throw new Error(`Governance request failed: ${res.status}`);
  return res.json();
}

export const GovernanceApi = {
  // Get poll votes state for a specific address
  getVotesState: (address: string) => fetchGovernance(`votesState/${address}`),
  
  // Get delegated power for an account (optionally for a specific poll)
  getDelegatedPower: (address: string, poll?: string) => {
    const path = poll ? `delegatedPower/${address}?poll=${poll}` : `delegatedPower/${address}`;
    return fetchGovernance(path);
  },
  
  // Get poll overview for a specific address
  getPollOverview: (address: string) => fetchGovernance(`pollOverview/${address}`),
  
  // Get account poll voter author information
  getAccountPollVoterAuthor: (address: string) => fetchGovernance(`accountPollVoterAuthor/${address}`),
  
  // Submit contract event
  submitContractEvent: (topic: string, poll?: string) => fetchGovernance('contractEvent', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, poll }),
  }),
  
  // Get poll ordering (optionally for closed polls)
  getPollOrdering: (closed: boolean = false) => fetchGovernance(`pollOrdering?closed=${closed ? "true" : "false"}`),
  
  // Get backend version
  getVersion: () => fetchGovernance('version'),
};
