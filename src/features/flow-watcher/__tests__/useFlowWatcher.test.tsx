import { Provider } from 'jotai';
import { renderHook, act } from '@testing-library/react';
import {
  describe, expect, it,
} from 'vitest';
import { useFlowWatcher } from '@/features/flow-watcher/useFlowWatcher';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider>{children}</Provider>
);

describe('useFlowWatcher', () => {
  it('starts and completes a flow through step advancement', () => {
    const { result } = renderHook(() => useFlowWatcher(), { wrapper });

    let flowId = '';
    act(() => {
      flowId = result.current.startFlow({
        flowType: 'custom',
        steps: [
          {
            id: 'step_1',
            label: 'First step',
            kind: 'manual_action',
            status: 'pending',
          },
          {
            id: 'step_2',
            label: 'Second step',
            kind: 'manual_action',
            status: 'pending',
          },
        ],
      });
    });

    const started = result.current.getFlowById(flowId);
    expect(started?.status).toBe('running');
    expect(started?.currentStepIndex).toBe(0);

    act(() => {
      result.current.advanceFlowStep(flowId);
    });
    const advanced = result.current.getFlowById(flowId);
    expect(advanced?.currentStepIndex).toBe(1);
    expect(advanced?.steps[0].status).toBe('confirmed');

    act(() => {
      result.current.advanceFlowStep(flowId);
    });
    const completed = result.current.getFlowById(flowId);
    expect(completed?.status).toBe('completed');
  });

  it('marks current step and flow as failed', () => {
    const { result } = renderHook(() => useFlowWatcher(), { wrapper });
    let flowId = '';
    act(() => {
      flowId = result.current.startFlow({
        flowType: 'custom',
        steps: [{
          id: 'step_1',
          label: 'Failing step',
          kind: 'manual_action',
          status: 'pending',
        }],
      });
    });

    act(() => {
      result.current.failFlow(flowId, 'Rejected by user');
    });
    const failed = result.current.getFlowById(flowId);
    expect(failed?.status).toBe('failed');
    expect(failed?.lastError).toBe('Rejected by user');
    expect(failed?.steps[0].status).toBe('failed');
  });
});
