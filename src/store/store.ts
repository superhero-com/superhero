import { configureStore } from '@reduxjs/toolkit';
import { loadState, saveState, listenCrossTabSync } from './persist';
import rootReducer from './slices/rootSlice';
import backendReducer from './slices/backendSlice';
import aeternityReducer from './slices/aeternitySlice';
import modalsReducer from './slices/modalsSlice';
import governanceReducer from './slices/governanceSlice';
import txQueueReducer from './slices/txQueueSlice';
import dexReducer from './slices/dexSlice';

const preloaded = loadState();
export const store = configureStore({
  reducer: {
    root: rootReducer,
    backend: backendReducer,
    aeternity: aeternityReducer,
    modals: modalsReducer,
    governance: governanceReducer,
    txQueue: txQueueReducer,
    dex: dexReducer,
  },
  preloadedState: preloaded as any,
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

store.subscribe(() => saveState(store.getState() as any));
listenCrossTabSync((state) => {
  store.dispatch({ type: 'root/setAddress', payload: (state as any).root?.address || null });
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


