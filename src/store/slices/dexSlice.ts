import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ACI, DEX_ADDRESSES, getPairInfo, getPairAddress, getLpBalance } from '../../libs/dex';
import { getPairs } from '../../libs/dexBackend';

type ProvidedLiquidity = Record<string, { balance: string; token0: string; token1: string } | undefined>;

export interface DexState {
  slippagePct: number;
  deadlineMins: number;
  providedLiquidity: Record<string, ProvidedLiquidity>; // by address → pairId → info
  poolInfo: Record<string, { totalSupply: string | null; reserveA: string; reserveB: string } | undefined>;
}

const initialState: DexState = {
  slippagePct: (() => {
    try { const v = localStorage.getItem('dex:slippage'); return v != null ? Math.max(0, Math.min(50, Number(v) || 5)) : 5; } catch { return 5; }
  })(),
  deadlineMins: (() => {
    try { const v = localStorage.getItem('dex:deadline'); return v != null ? Math.max(1, Math.min(60, Number(v) || 30)) : 30; } catch { return 30; }
  })(),
  providedLiquidity: {},
  poolInfo: {},
};

export const loadPairInfo = createAsyncThunk(
  'dex/loadPairInfo',
  async ({ tokenA, tokenB }: { tokenA: string; tokenB: string }, { getState }) => {
    const sdk = (window as any).__aeSdk;
    const factory = await sdk.initializeContract({ aci: ACI.Factory, address: DEX_ADDRESSES.factory });
    return getPairInfo(sdk, factory, tokenA, tokenB);
  },
);

export const loadAccountLp = createAsyncThunk(
  'dex/loadAccountLp',
  async (
    { address, tokenA, tokenB }: { address: string; tokenA: string; tokenB: string },
    { getState },
  ) => {
    const sdk = (window as any).__aeSdk;
    const factory = await sdk.initializeContract({ aci: ACI.Factory, address: DEX_ADDRESSES.factory });
    const pairAddr = await getPairAddress(sdk, factory, tokenA, tokenB);
    if (!pairAddr) return { pairId: null, balance: 0n };
    const bal = await getLpBalance(sdk, pairAddr, address);
    return { pairId: pairAddr, balance: bal };
  },
);

export const scanAccountLiquidity = createAsyncThunk(
  'dex/scanAccountLiquidity',
  async (address: string, { dispatch }) => {
    const pairs = await getPairs(false);
    const arr: any[] = pairs ? (Array.isArray(pairs) ? pairs : Object.values(pairs as any)) : [];
    const sdk = (window as any).__aeSdk;
    for (const p of arr) {
      const balance = await getLpBalance(sdk, p.address, address).catch(() => 0n);
      if (balance && balance > 0n) {
        dispatch(updateProvidedLiquidity({
          address,
          pairId: p.address,
          balance: balance.toString(),
          token0: { address: p.token0 || p.token0Address, symbol: p.token0Symbol || p.token0?.symbol },
          token1: { address: p.token1 || p.token1Address, symbol: p.token1Symbol || p.token1?.symbol },
        }));
      }
    }
  },
);

const slice = createSlice({
  name: 'dex',
  initialState,
  reducers: {
    setSlippage(state, action: PayloadAction<number>) {
      state.slippagePct = Math.max(0, Math.min(50, action.payload || 0));
      try { localStorage.setItem('dex:slippage', String(state.slippagePct)); } catch {}
    },
    setDeadline(state, action: PayloadAction<number>) {
      state.deadlineMins = Math.max(1, Math.min(60, action.payload || 10));
      try { localStorage.setItem('dex:deadline', String(state.deadlineMins)); } catch {}
    },
    resetAccountLiquidity(state, action: PayloadAction<{ address: string }>) {
      state.providedLiquidity[action.payload.address] = {};
    },
    updateProvidedLiquidity(
      state,
      action: PayloadAction<{ address: string; pairId: string; balance: string; token0?: { address: string; symbol?: string }; token1?: { address: string; symbol?: string } }>,
    ) {
      const { address, pairId, balance, token0, token1 } = action.payload;
      if (!state.providedLiquidity[address]) state.providedLiquidity[address] = {};
      state.providedLiquidity[address][pairId] = {
        balance,
        token0: token0?.symbol || token0?.address || '',
        token1: token1?.symbol || token1?.address || '',
      };
    },
  },
  extraReducers(builder) {
    builder.addCase(loadPairInfo.fulfilled, (state, action) => {
      const info = action.payload;
      if (!info) return;
      state.poolInfo[info.pairAddress] = {
        totalSupply: info.totalSupply != null ? info.totalSupply.toString() : null,
        reserveA: info.reserveA.toString(),
        reserveB: info.reserveB.toString(),
      };
    });
    builder.addCase(loadAccountLp.fulfilled, (state, action) => {
      const { pairId, balance } = action.payload as any;
      if (!pairId) return;
      const addr = (window as any).__aeSdk?.addresses?.()[0] || 'unknown';
      if (!state.providedLiquidity[addr]) state.providedLiquidity[addr] = {};
      state.providedLiquidity[addr][pairId] = {
        balance: balance.toString(),
        token0: '',
        token1: '',
      };
    });
  },
});

export const { setSlippage, setDeadline, resetAccountLiquidity } = slice.actions;
export const { updateProvidedLiquidity } = slice.actions;
export default slice.reducer;


