import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Backend } from '../../api/backend';
import { performAuthedCall } from '../../auth/deeplink';

interface BackendState {
  tips: Record<string, any[]>;
  tipsPageCount: Record<string, number>;
  tipsReloading: Record<string, boolean>;
  tipsNextPageLoading: Record<string, boolean>;
  tipsEndReached: Record<string, boolean>;
  userComments: Record<string, any[]>;
  tip: Record<string, any>;
  comment: Record<string, any>;
  stats: any | null;
  prices: Record<string, number>;
  commentCounts: Record<string, number>;
  commentCountsLoading: Record<string, boolean>;
}

const initialState: BackendState = {
  tips: {},
  tipsPageCount: {},
  tipsReloading: {},
  tipsNextPageLoading: {},
  tipsEndReached: {},
  userComments: {},
  tip: {},
  comment: {},
  stats: null,
  prices: {},
  commentCounts: {},
  commentCountsLoading: {},
};

export const reloadTips = createAsyncThunk(
  'backend/reloadTips',
  async (args: [string, string | null, string | null, boolean, boolean, boolean], { getState }) => {
    // args: [ordering, address, search, blacklist, tips, posts] with keying
    const [ordering, address, search, blacklist, tips, posts] = args;
    const state = getState() as any;
    const key = JSON.stringify(args);
    const pages = state.backend.tipsPageCount[key] || 1;
    const results = await Promise.all(new Array(pages).fill(0).map((_, i) =>
      Backend.getFeed(i + 1, ordering, address, search, blacklist, tips, posts)));
    return { key, list: results.flat().filter(Boolean) };
  },
);

export const loadNextPageOfTips = createAsyncThunk(
  'backend/loadNextPageOfTips',
  async (args: [string, string | null, string | null, boolean, boolean, boolean], { getState }) => {
    const [ordering, address, search, blacklist, tips, posts] = args;
    const state = getState() as any;
    const key = JSON.stringify(args);
    const next = (state.backend.tipsPageCount[key] || 1) + 1;
    const value = await Backend.getFeed(next, ordering, address, search, blacklist, tips, posts);
    return { key, list: value };
  },
);

export const loadCommentCount = createAsyncThunk(
  'backend/loadCommentCount',
  async (postId: string) => {
    try {
      const comments = await Backend.getPostChildren(postId);
      return { postId, count: Array.isArray(comments) ? comments.length : 0 };
    } catch (error) {
      console.error('Failed to load comment count for post:', postId, error);
      return { postId, count: 0 };
    }
  },
);

export const loadCommentCountsForPosts = createAsyncThunk(
  'backend/loadCommentCountsForPosts',
  async (postIds: string[]) => {
    console.log('Loading comment counts for posts:', postIds);
    const results = await Promise.all(
      postIds.map(async (postId) => {
        try {
          const comments = await Backend.getPostChildren(postId);
          const count = Array.isArray(comments) ? comments.length : 0;
          console.log(`Comment count for post ${postId}: ${count}`);
          return { postId, count };
        } catch (error) {
          console.error('Failed to load comment count for post:', postId, error);
          return { postId, count: 0 };
        }
      })
    );
    console.log('Comment count results:', results);
    return results;
  },
);

const slice = createSlice({
  name: 'backend',
  initialState,
  reducers: {
    setUserComments(state, action: PayloadAction<{ address: string; value: any[] }>) {
      state.userComments[action.payload.address] = action.payload.value;
    },
    setTip(state, action: PayloadAction<{ id: string; value: any }>) {
      state.tip[action.payload.id] = action.payload.value;
    },
    setComment(state, action: PayloadAction<{ id: string; value: any }>) {
      state.comment[action.payload.id] = action.payload.value;
    },
    setStats(state, action: PayloadAction<any>) { state.stats = action.payload; },
    setPrices(state, action: PayloadAction<Record<string, number>>) { state.prices = action.payload; },
    markTipsReloading(state, action: PayloadAction<string>) {
      state.tipsReloading[action.payload] = true;
      state.tipsPageCount[action.payload] = state.tipsPageCount[action.payload] || 1;
    },
    markTipsNextLoading(state, action: PayloadAction<string>) {
      state.tipsNextPageLoading[action.payload] = true;
      state.tipsPageCount[action.payload] = state.tipsPageCount[action.payload] || 1;
    },
    markCommentCountLoading(state, action: PayloadAction<string>) {
      state.commentCountsLoading[action.payload] = true;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(reloadTips.fulfilled, (state, action) => {
        state.tips[action.payload.key] = action.payload.list;
        state.tipsReloading[action.payload.key] = false;
      })
      .addCase(loadNextPageOfTips.fulfilled, (state, action) => {
        const key = action.payload.key;
        const list = action.payload.list;
        if (!list || list.length === 0) {
          state.tipsEndReached[key] = true;
        } else {
          state.tips[key] = [...(state.tips[key] || []), ...list];
          state.tipsPageCount[key] = (state.tipsPageCount[key] || 1) + 1;
        }
        state.tipsNextPageLoading[key] = false;
      })
      .addCase(loadCommentCount.fulfilled, (state, action) => {
        state.commentCounts[action.payload.postId] = action.payload.count;
        state.commentCountsLoading[action.payload.postId] = false;
      })
      .addCase(loadCommentCountsForPosts.fulfilled, (state, action) => {
        action.payload.forEach(({ postId, count }) => {
          state.commentCounts[postId] = count;
          state.commentCountsLoading[postId] = false;
        });
      });
  },
});

export const { setUserComments, setTip, setComment, setStats, setPrices, markTipsReloading, markTipsNextLoading, markCommentCountLoading } = slice.actions;
export default slice.reducer;

// Authenticated backend call via deeplink or SDK
export const callWithAuth = createAsyncThunk('backend/callWithAuth', async (
  { method, arg, to, forceDeeplink }: { method: keyof typeof Backend; arg?: any; to?: string; forceDeeplink?: boolean },
  { dispatch, getState },
) => performAuthedCall(dispatch as any, getState as any, { method, arg, to }, { forceDeeplink }));

export const setCookies = createAsyncThunk('backend/setCookies', async (
  { scope, status }: { scope: string; status: boolean },
  { dispatch },
) => {
  await (dispatch as any)(callWithAuth({ method: 'setCookiesConsent' as any, arg: { scope, status } }));
  return { scope, status };
});


