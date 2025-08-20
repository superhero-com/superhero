import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { GovernanceApi } from '../../api/backend';
import type { RootState } from '../store';

interface GovernanceState {
  polls: any[];
  pollsLoading: boolean;
  pollById: Record<string, any>;
  resultsById: Record<string, any>;
  delegation: { to?: string | null; loading: boolean };
  myVoteById: Record<string, any>;
  delegatorsByAddress: Record<string, any[]>;
  accountByAddress: Record<string, any>;
  pollComments: Record<string, any[]>;
  pollCommentsLoading: Record<string, boolean>;
}

const initialState: GovernanceState = {
  polls: [],
  pollsLoading: false,
  pollById: {},
  resultsById: {},
  delegation: { to: null, loading: false },
  myVoteById: {},
  delegatorsByAddress: {},
  accountByAddress: {},
  pollComments: {},
  pollCommentsLoading: {},
};

export const loadPolls = createAsyncThunk(
  'governance/loadPolls',
  async (params: { page?: number; pageSize?: number; status?: string; search?: string } | undefined) => {
    const res = await GovernanceApi.getPolls(params || {});
    const polls = (res && (
      res.polls || res.items || res.data || res.results || (Array.isArray(res) ? res : null)
    )) || [];
    return polls;
  },
);

export const loadPoll = createAsyncThunk('governance/loadPoll', async (id: string) => {
  const res = await GovernanceApi.getPoll(id);
  return res;
});

export const loadPollResults = createAsyncThunk('governance/loadPollResults', async (id: string) => {
  const res = await GovernanceApi.getPollResults(id);
  return { id, res };
});

export const loadMyVote = createAsyncThunk('governance/loadMyVote', async (id: string, { getState }) => {
  const state = getState() as RootState;
  const address = state.root.address as string;
  if (!address) return { id, vote: null };
  const vote = await GovernanceApi.getMyVote(id, address);
  return { id, vote };
});

export const loadDelegation = createAsyncThunk('governance/loadDelegation', async (address: string) => {
  try {
    return await GovernanceApi.getDelegation(address);
  } catch {
    return { to: null };
  }
});

export const revokeDelegation = createAsyncThunk(
  'governance/revokeDelegation',
  async (_: void, { getState, dispatch }) => {
    const state = getState() as RootState;
    const address = state.root.address as string;
    if (!address) throw new Error('No wallet connected');
    const first = await GovernanceApi.revokeDelegation(address, {} as any);
    if ((first as any)?.challenge) {
      const sdk = (window as any).__aeSdk;
      const signature = (await sdk.signMessage((first as any).challenge)).toString('hex');
      await GovernanceApi.revokeDelegation(address, { challenge: (first as any).challenge, signature });
    }
    await dispatch(loadDelegation(address));
  },
);

export const revokeMyVote = createAsyncThunk(
  'governance/revokeMyVote',
  async (pollId: string, { getState, dispatch }) => {
    const state = getState() as RootState;
    const address = state.root.address as string;
    if (!address) throw new Error('No wallet connected');
    const first = await GovernanceApi.revokeVote(address, { pollId } as any);
    if ((first as any)?.challenge) {
      const sdk = (window as any).__aeSdk;
      const signature = (await sdk.signMessage((first as any).challenge)).toString('hex');
      await GovernanceApi.revokeVote(address, { pollId, challenge: (first as any).challenge, signature });
    }
    await dispatch(loadPollResults(pollId));
    await dispatch(loadMyVote(pollId));
  },
);

export const loadDelegators = createAsyncThunk('governance/loadDelegators', async (to: string) => {
  const res = await GovernanceApi.listDelegators(to);
  const list = (res && (res.delegators || res.items || res.data || (Array.isArray(res) ? res : null))) || [];
  return { to, list } as { to: string; list: any[] };
});

export const loadAccount = createAsyncThunk('governance/loadAccount', async (address: string) => {
  const res = await GovernanceApi.getAccount(address);
  return { address, res } as { address: string; res: any };
});

export const loadPollComments = createAsyncThunk('governance/loadPollComments', async (pollId: string) => {
  const comments = await GovernanceApi.getPollComments(pollId);
  return { pollId, comments: Array.isArray(comments) ? comments : [] };
});

export const sendPollComment = createAsyncThunk(
  'governance/sendPollComment',
  async ({ pollId, text }: { pollId: string; text: string }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const address = state.root.address as string;
    if (!address) throw new Error('No wallet connected');
    
    await GovernanceApi.sendPollComment(address, { pollId, text });
    // Reload comments after sending
    await dispatch(loadPollComments(pollId));
  },
);

export const submitVote = createAsyncThunk(
  'governance/submitVote',
  async ({ pollId, option }: { pollId: string; option: string }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const address = state.root.address as string;
    if (!address) throw new Error('No wallet connected');
    // First call may return challenge
    const first = await GovernanceApi.vote(address, { pollId, option });
    if (first?.challenge) {
      const sdk = (window as any).__aeSdk;
      const signature = (await sdk.signMessage(first.challenge)).toString('hex');
      await GovernanceApi.vote(address, { pollId, option, challenge: first.challenge, signature });
    }
    await dispatch(loadPollResults(pollId));
  },
);

export const setDelegation = createAsyncThunk(
  'governance/setDelegation',
  async ({ to }: { to: string }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const address = state.root.address as string;
    if (!address) throw new Error('No wallet connected');
    const first = await GovernanceApi.setDelegation(address, { to });
    if (first?.challenge) {
      const sdk = (window as any).__aeSdk;
      const signature = (await sdk.signMessage(first.challenge)).toString('hex');
      await GovernanceApi.setDelegation(address, { to, challenge: first.challenge, signature });
    }
    await dispatch(loadDelegation(address));
  },
);

const slice = createSlice({
  name: 'governance',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(loadPolls.pending, (s) => { s.pollsLoading = true; })
      .addCase(loadPolls.fulfilled, (s, a) => { s.pollsLoading = false; s.polls = a.payload; })
      .addCase(loadPoll.fulfilled, (s, a) => { if (a.payload?.id) s.pollById[a.payload.id] = a.payload; })
      .addCase(loadPollResults.fulfilled, (s, a) => { s.resultsById[a.payload.id] = a.payload.res; })
      .addCase(loadMyVote.fulfilled, (s, a) => { s.myVoteById[a.payload.id] = a.payload.vote; })
      .addCase(loadDelegation.pending, (s) => { s.delegation.loading = true; })
      .addCase(loadDelegation.fulfilled, (s, a) => { s.delegation.loading = false; s.delegation.to = a.payload?.to ?? null; })
      .addCase(loadDelegators.fulfilled, (s, a) => { s.delegatorsByAddress[a.payload.to] = a.payload.list; })
      .addCase(loadAccount.fulfilled, (s, a) => { s.accountByAddress[a.payload.address] = a.payload.res; })
      .addCase(loadPollComments.pending, (s, a) => { s.pollCommentsLoading[a.meta.arg] = true; })
      .addCase(loadPollComments.fulfilled, (s, a) => { 
        s.pollCommentsLoading[a.payload.pollId] = false; 
        s.pollComments[a.payload.pollId] = a.payload.comments; 
      })
      .addCase(loadPollComments.rejected, (s, a) => { s.pollCommentsLoading[a.meta.arg] = false; });
  },
});

export default slice.reducer;


