import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TxQueueEntry = Record<string, any>;

export interface TxQueueState {
  entries: Record<string, TxQueueEntry>;
}

const initialState: TxQueueState = {
  entries: {},
};

const slice = createSlice({
  name: 'txQueue',
  initialState,
  reducers: {
    upsert(state, action: PayloadAction<{ id: string; data: TxQueueEntry }>) {
      state.entries[action.payload.id] = {
        ...(state.entries[action.payload.id] || {}),
        ...action.payload.data,
      };
    },
    clear(state, action: PayloadAction<string | undefined>) {
      if (action.payload) delete state.entries[action.payload];
      else state.entries = {};
    },
  },
});

export const { upsert, clear } = slice.actions;
export default slice.reducer;


