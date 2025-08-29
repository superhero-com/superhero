import { CONFIG } from '../config';

// Governance API client (aepp-governance backend compatibility)
async function fetchGovernance(path: string, init?: RequestInit) {
  // Always route through Vite proxy in development to avoid CORS
  const isDev = (import.meta as any).env?.MODE === 'development';
  let raw = CONFIG.GOVERNANCE_API_URL;
  if (isDev) raw = '/governance-api';
  if (!raw) raw = 'https://governance.aeternity.com/api';
  const base = /\/api(\/|$)/.test(raw) || raw.startsWith('/governance-api')
    ? raw.replace(/\/$/, '')
    : `${raw.replace(/\/$/, '')}/api`;
  const res = await fetch(`${base}/${path}`, init);
  if (!res.ok) throw new Error(`Governance request failed: ${res.status}`);
  return res.json();
}

// Helper function for regular backend API calls
async function fetchJson(path: string, init?: RequestInit) {
  const mode = (import.meta as any).env?.MODE;
  const isDevLike = mode === 'development' || mode === 'test';
  const base = (CONFIG.BACKEND_URL || '').replace(/\/$/, '');
  if ((false || !base) && isDevLike) {
    return Promise.resolve({});
  }
  const url = base ? `${base}/${path}` : `/${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status} ${body || ''}`.trim());
  }
  return res.json();
}

export const GovernanceApi = {
  // Note: endpoints based on aepp-governance server conventions
  // List polls
  getPolls: async (params: { page?: number; pageSize?: number; status?: string; search?: string } = {}) => {
    const qp: Record<string, string> = {
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
    };
    if (params.status) qp.status = String(params.status);
    if (params.search) qp.search = params.search;
    const query = new URLSearchParams(qp).toString();
    try {
      return await fetchGovernance(`polls?${query}`);
    } catch (_) {
      // Fallback for servers exposing /poll instead of /polls
      return await fetchGovernance(`poll?${query}`);
    }
  },
  // Poll detail
  getPoll: (id: string) => fetchGovernance(`polls/${id}`),
  // Poll results/aggregation
  getPollResults: (id: string) => fetchGovernance(`polls/${id}/results`),
  // Submit vote (signed off-chain, verified against chain state by server)
  vote: (address: string, { pollId, option, challenge, signature }: { pollId: string; option: string; challenge?: string; signature?: string }) => fetchGovernance(`polls/${pollId}/vote`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter: address, option, challenge, signature }),
  }),
  revokeVote: (address: string, { pollId, challenge, signature }: { pollId: string; challenge?: string; signature?: string }) => fetchGovernance(`polls/${pollId}/vote/revoke`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter: address, challenge, signature }),
  }),
  getMyVote: (pollId: string, address: string) => fetchGovernance(`polls/${pollId}/vote?address=${address}`),
  // Delegation endpoints
  getDelegation: (address: string) => fetchGovernance(`delegations/${address}`),
  setDelegation: (address: string, { to, challenge, signature }: { to: string; challenge?: string; signature?: string }) => fetchGovernance('delegations', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: address, to, challenge, signature }),
  }),
  revokeDelegation: (address: string, { challenge, signature }: { challenge?: string; signature?: string }) => fetchGovernance('delegations/revoke', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: address, challenge, signature }),
  }),
  listDelegators: (to: string) => fetchGovernance(`delegations?to=${to}`),
  getAccount: (address: string) => fetchGovernance(`accounts/${address}`),
  createPoll: (address: string, payload: any) => fetchGovernance('polls', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: address, ...payload }),
  }),
  // Comment endpoints for governance polls
  getPollComments: (pollId: string) => fetchJson(`comment/api/poll/${encodeURIComponent(pollId)}`),
  sendPollComment: (address: string, body: any) => fetchJson('comment/api/', {
    method: 'post',
    body: JSON.stringify({ ...body, author: address, type: 'poll' }),
    headers: { 'Content-Type': 'application/json' },
  }),
};
