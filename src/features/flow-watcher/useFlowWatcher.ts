import { useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { flowRecordsAtom } from '@/atoms/flowAtoms';
import type {
  FlowRecord,
  FlowRecordMap,
  FlowStep,
  FlowStepStatus,
  StartFlowInput,
} from './types';

const now = () => Date.now();

const createFlowId = (flowType: string) => `${flowType}_${Math.random().toString(36).slice(2, 10)}_${now()}`;

export const useFlowWatcher = () => {
  const [flowRecords, setFlowRecords] = useAtom(flowRecordsAtom);

  const startFlow = useCallback((input: StartFlowInput): string => {
    const id = createFlowId(input.flowType);
    const timestamp = now();
    const flow: FlowRecord = {
      id,
      flowType: input.flowType,
      status: 'running',
      currentStepIndex: 0,
      steps: input.steps.map((step) => ({
        ...step,
        status: step.status ?? 'pending',
        startedAt: step.startedAt ?? timestamp,
        updatedAt: timestamp,
      })),
      context: input.context,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setFlowRecords((prev) => ({ ...prev, [id]: flow }));
    return id;
  }, [setFlowRecords]);

  const updateFlow = useCallback((flowId: string, patch: Partial<FlowRecord>) => {
    setFlowRecords((prev) => {
      const existing = prev[flowId];
      if (!existing) return prev;
      return {
        ...prev,
        [flowId]: {
          ...existing,
          ...patch,
          updatedAt: now(),
        },
      };
    });
  }, [setFlowRecords]);

  const updateFlowStep = useCallback((
    flowId: string,
    stepId: string,
    patch: Partial<FlowStep>,
  ) => {
    setFlowRecords((prev) => {
      const existing = prev[flowId];
      if (!existing) return prev;
      return {
        ...prev,
        [flowId]: {
          ...existing,
          steps: existing.steps.map((step) => (step.id === stepId
            ? { ...step, ...patch, updatedAt: now() }
            : step)),
          updatedAt: now(),
        },
      };
    });
  }, [setFlowRecords]);

  const setCurrentStepStatus = useCallback((
    flowId: string,
    status: FlowStepStatus,
    extra: Partial<FlowStep> = {},
  ) => {
    setFlowRecords((prev) => {
      const existing = prev[flowId];
      if (!existing) return prev;
      const step = existing.steps[existing.currentStepIndex];
      if (!step) return prev;
      const steps = existing.steps.map((item, index) => (
        index === existing.currentStepIndex
          ? {
            ...item,
            ...extra,
            status,
            updatedAt: now(),
          }
          : item
      ));
      return {
        ...prev,
        [flowId]: {
          ...existing,
          steps,
          updatedAt: now(),
        },
      };
    });
  }, [setFlowRecords]);

  const advanceFlowStep = useCallback((flowId: string) => {
    setFlowRecords((prev) => {
      const existing = prev[flowId];
      if (!existing) return prev;
      const currentIndex = existing.currentStepIndex;
      if (currentIndex >= existing.steps.length - 1) {
        return {
          ...prev,
          [flowId]: {
            ...existing,
            status: 'completed',
            updatedAt: now(),
          },
        };
      }
      return {
        ...prev,
        [flowId]: {
          ...existing,
          currentStepIndex: currentIndex + 1,
          steps: existing.steps.map((step, index) => (
            index === currentIndex
              ? { ...step, status: 'confirmed', updatedAt: now() }
              : step
          )),
          updatedAt: now(),
        },
      };
    });
  }, [setFlowRecords]);

  const failFlow = useCallback((flowId: string, message: string) => {
    setFlowRecords((prev) => {
      const existing = prev[flowId];
      if (!existing) return prev;
      return {
        ...prev,
        [flowId]: {
          ...existing,
          status: 'failed',
          lastError: message,
          steps: existing.steps.map((step, index) => (
            index === existing.currentStepIndex
              ? {
                ...step,
                status: 'failed',
                error: message,
                updatedAt: now(),
              }
              : step
          )),
          updatedAt: now(),
        },
      };
    });
  }, [setFlowRecords]);

  const cancelFlow = useCallback((flowId: string) => {
    updateFlow(flowId, { status: 'cancelled' });
  }, [updateFlow]);

  const completeFlow = useCallback((flowId: string) => {
    updateFlow(flowId, { status: 'completed' });
  }, [updateFlow]);

  const removeFlow = useCallback((flowId: string) => {
    setFlowRecords((prev) => {
      if (!prev[flowId]) return prev;
      const next: FlowRecordMap = { ...prev };
      delete next[flowId];
      return next;
    });
  }, [setFlowRecords]);

  const getFlowById = useCallback((flowId: string) => flowRecords[flowId], [flowRecords]);

  const activeFlows = useMemo(
    () => Object.values(flowRecords).filter((flow) => flow.status === 'running'),
    [flowRecords],
  );

  return {
    flowRecords,
    activeFlows,
    startFlow,
    updateFlow,
    updateFlowStep,
    setCurrentStepStatus,
    advanceFlowStep,
    failFlow,
    cancelFlow,
    completeFlow,
    removeFlow,
    getFlowById,
  };
};
