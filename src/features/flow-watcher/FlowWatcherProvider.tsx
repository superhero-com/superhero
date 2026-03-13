import { useAtom } from 'jotai';
import {
  createContext, useContext, useEffect, useMemo, useRef,
} from 'react';
import { CONFIG } from '@/config';
import { flowRecordsAtom } from '@/atoms/flowAtoms';
import { getTokenBalance } from '@/libs/dex';
import { useAeSdk } from '@/hooks/useAeSdk';
import type {
  FlowRecord,
  FlowRecordMap,
  FlowStep,
  FlowStepStatus,
} from './types';
import { useFlowWatcher } from './useFlowWatcher';

const FLOW_POLL_INTERVAL_MS = 5000;
const FLOW_STALE_TIMEOUT_MS = 30 * 60 * 1000;

type FlowWatcherContextValue = ReturnType<typeof useFlowWatcher>;

const FlowWatcherContext = createContext<FlowWatcherContextValue | null>(null);

const markStep = (
  flow: FlowRecord,
  status: FlowStepStatus,
  patch: Partial<FlowStep> = {},
): FlowRecord => {
  const current = flow.steps[flow.currentStepIndex];
  if (!current) return flow;
  const nextSteps = flow.steps.map((step, idx) => (idx === flow.currentStepIndex
    ? {
      ...step,
      ...patch,
      status,
      updatedAt: Date.now(),
      startedAt: step.startedAt || Date.now(),
    }
    : step));
  return { ...flow, steps: nextSteps, updatedAt: Date.now() };
};

const moveToNextStep = (flow: FlowRecord): FlowRecord => {
  const nextSteps = flow.steps.map((step, idx) => (idx === flow.currentStepIndex
    ? { ...step, status: 'confirmed', updatedAt: Date.now() }
    : step));
  const nextIndex = flow.currentStepIndex + 1;
  if (nextIndex >= flow.steps.length) {
    return {
      ...flow,
      status: 'completed',
      steps: nextSteps,
      updatedAt: Date.now(),
    };
  }
  return {
    ...flow,
    steps: nextSteps,
    currentStepIndex: nextIndex,
    updatedAt: Date.now(),
  };
};

const failFlow = (flow: FlowRecord, message: string): FlowRecord => ({
  ...flow,
  status: 'failed',
  lastError: message,
  steps: flow.steps.map((step, idx) => (idx === flow.currentStepIndex
    ? {
      ...step,
      status: 'failed',
      error: message,
      updatedAt: Date.now(),
    }
    : step)),
  updatedAt: Date.now(),
});

const getAeTxStatus = async (
  sdk: any,
  hash: string,
): Promise<{ confirmed: boolean; pending: boolean; failed: boolean }> => {
  if (!hash || !hash.startsWith('th_')) return { confirmed: false, pending: true, failed: false };

  const fetchFromMiddleware = async () => {
    const baseUrl = CONFIG.MIDDLEWARE_URL?.replace(/\/$/, '');
    if (!baseUrl) return null;
    const response = await fetch(`${baseUrl}/v3/transactions/${hash}`);
    if (!response.ok) {
      if (response.status === 404) return { confirmed: false, pending: true, failed: false };
      return null;
    }
    const tx = await response.json();
    const blockHeight = tx?.blockHeight ?? tx?.block_height;
    const nodeResult = tx?.tx?.result ?? tx?.result;
    const failed = typeof nodeResult === 'string' && nodeResult.toLowerCase() !== 'ok';
    return { confirmed: Boolean(blockHeight) && !failed, pending: !blockHeight, failed };
  };

  try {
    const tx = await sdk.getTransactionByHash(hash);
    if (!tx) return (await fetchFromMiddleware()) || { confirmed: false, pending: true, failed: false };
    const blockHeight = tx?.blockHeight ?? tx?.block_height;
    const txInfo = await sdk.getTransactionInfoByHash(hash).catch(() => null);
    const nodeReturnType = txInfo?.callInfo?.returnType;
    const failed = nodeReturnType ? nodeReturnType !== 'ok' : false;
    return { confirmed: Boolean(blockHeight) && !failed, pending: !blockHeight, failed };
  } catch {
    return (await fetchFromMiddleware()) || { confirmed: false, pending: true, failed: false };
  }
};

const evaluateFlow = async (flow: FlowRecord, sdk: any): Promise<FlowRecord> => {
  if (flow.status !== 'running') return flow;

  if (Date.now() - flow.updatedAt > FLOW_STALE_TIMEOUT_MS) {
    return { ...flow, status: 'stale', updatedAt: Date.now() };
  }

  const current = flow.steps[flow.currentStepIndex];
  if (!current) {
    return { ...flow, status: 'completed', updatedAt: Date.now() };
  }

  if (current.timeoutMs && current.startedAt && Date.now() - current.startedAt > current.timeoutMs) {
    return failFlow(flow, `${current.label} timed out`);
  }

  if (current.kind === 'tx_confirm' && current.txConfirm?.txHash) {
    const currentStatus = current.status;
    if (currentStatus === 'pending') {
      return markStep(flow, 'monitoring');
    }
    if (currentStatus === 'submitted' || currentStatus === 'monitoring') {
      if (current.txConfirm.chain !== 'ae') {
        return flow;
      }
      const txStatus = await getAeTxStatus(sdk, current.txConfirm.txHash);
      if (txStatus.failed) return failFlow(flow, `${current.label} failed on chain`);
      if (txStatus.confirmed) return moveToNextStep(flow);
      return markStep(flow, 'monitoring');
    }
  }

  if (current.kind === 'balance_condition' && current.balanceCondition) {
    const status = current.status === 'pending' ? 'monitoring' : current.status;
    let nextFlow = flow;
    if (status !== current.status) {
      nextFlow = markStep(flow, status);
    }

    try {
      const {
        tokenAddress,
        account,
        previousBalance,
        expectedIncrease,
        toleranceBps = 10,
      } = current.balanceCondition;
      const currentBalance = await getTokenBalance(sdk, tokenAddress, account);
      const baseBalance = BigInt(previousBalance);
      const expected = BigInt(expectedIncrease);
      const tolerance = (expected * BigInt(toleranceBps)) / 10000n;
      if (currentBalance - baseBalance >= expected - tolerance) {
        return moveToNextStep(nextFlow);
      }
    } catch {
      return nextFlow;
    }
    return nextFlow;
  }

  return flow;
};

export const FlowWatcherProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useFlowWatcher();
  const { sdk } = useAeSdk();
  const [flowRecords, setFlowRecords] = useAtom(flowRecordsAtom);
  const flowRecordsRef = useRef(flowRecords);

  useEffect(() => {
    flowRecordsRef.current = flowRecords;
  }, [flowRecords]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const snapshot = flowRecordsRef.current;
      const runningFlows = Object.values(snapshot).filter((flow) => flow.status === 'running');
      if (!runningFlows.length) return;

      let changed = false;
      const nextMap: FlowRecordMap = { ...snapshot };
      const evaluated = await Promise.all(
        runningFlows.map(async (flow) => ({ flow, nextFlow: await evaluateFlow(flow, sdk) })),
      );
      evaluated.forEach(({ flow, nextFlow }) => {
        if (JSON.stringify(nextFlow) !== JSON.stringify(flow)) {
          changed = true;
          nextMap[flow.id] = nextFlow;
        }
      });
      if (!cancelled && changed) {
        setFlowRecords(nextMap);
      }
    };

    const interval = setInterval(() => {
      tick();
    }, FLOW_POLL_INTERVAL_MS);
    tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sdk, setFlowRecords]);

  const contextValue = useMemo(() => value, [value]);

  return (
    <FlowWatcherContext.Provider value={contextValue}>
      {children}
    </FlowWatcherContext.Provider>
  );
};

export const useFlowWatcherContext = () => {
  const context = useContext(FlowWatcherContext);
  if (!context) throw new Error('useFlowWatcherContext must be used inside FlowWatcherProvider');
  return context;
};
