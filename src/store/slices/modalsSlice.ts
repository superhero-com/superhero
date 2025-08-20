import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ModalItem {
  key: number;
  name: string;
  props?: Record<string, any>;
}

interface ModalsState {
  opened: ModalItem[];
}

let counter = 0;
const initialState: ModalsState = { opened: [] };

const slice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    open(state, action: PayloadAction<Omit<ModalItem, 'key'>>) {
      state.opened.push({ ...action.payload, key: counter++ });
    },
    close(state, action: PayloadAction<number>) {
      state.opened = state.opened.filter((m) => m.key !== action.payload);
    },
  },
});

export const { open, close } = slice.actions;
export default slice.reducer;


