import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { GovernanceApi } from '../governance';

const mockFetch = vi.fn();
const GOVERNANCE_API_URL = 'https://governance-server-mainnet.prd.service.aepps.com';

describe('GovernanceApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('fetches the backend version', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ version: '1.2.3' }),
    });

    await expect(GovernanceApi.getVersion()).resolves.toEqual({ version: '1.2.3' });
    expect(mockFetch).toHaveBeenCalledWith(`${GOVERNANCE_API_URL}/version`, undefined);
  });

  it('requests closed poll ordering with the expected query string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ordering: [], data: [] }),
    });

    await expect(GovernanceApi.getPollOrdering(true)).resolves.toEqual({ ordering: [], data: [] });
    expect(mockFetch).toHaveBeenCalledWith(`${GOVERNANCE_API_URL}/pollOrdering?closed=true`, undefined);
  });

  it.each([
    ['getPollOverview', () => GovernanceApi.getPollOverview('ct_poll' as any), `${GOVERNANCE_API_URL}/pollOverview/ct_poll`],
    ['getVotesState', () => GovernanceApi.getVotesState('ak_account'), `${GOVERNANCE_API_URL}/votesState/ak_account`],
  ])('builds the correct path for %s', async (_label, callApi, expectedUrl) => {
    const response = {
      pollState: {
        metadata: {},
        vote_options: {},
        votes: {},
        author: 'ak_author',
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => response,
    });

    await expect(callApi()).resolves.toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, undefined);
  });

  it('encodes delegated power poll filters in the request URL', async () => {
    const response = {
      delegatedPower: '10',
      delegationTree: {},
      flattenedDelegationTree: [],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => response,
    });

    await expect(GovernanceApi.getDelegatedPower('ak_user', 'ct_poll')).resolves.toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(
      `${GOVERNANCE_API_URL}/delegatedPower/ak_user?poll=ct_poll`,
      undefined,
    );
  });

  it('posts contract events and ignores the response body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ignored: true }),
    });

    await expect(GovernanceApi.submitContractEvent('RevokeVote', 'ct_poll')).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(`${GOVERNANCE_API_URL}/contractEvent`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'RevokeVote', poll: 'ct_poll' }),
    });
  });

  it('throws a stable error when the backend responds with a failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(GovernanceApi.getAccountPollVoterAuthor('ak_user'))
      .rejects
      .toThrow('Governance request failed: 503');
  });
});
