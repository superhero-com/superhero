import { describe, it, expect } from 'vitest';
import { errorToUserMessage } from './errorMessages';

describe('errorToUserMessage', () => {
  it('maps insufficient output amount with slippage hint', () => {
    const msg = errorToUserMessage(new Error('INSUFFICIENT_OUTPUT_AMOUNT'), { slippagePct: 0.5 });
    expect(msg.toLowerCase()).toContain('minimum output not met');
    expect(msg).toContain('0.5');
  });

  it('maps deadline/expired with mins', () => {
    const msg = errorToUserMessage(new Error('Deadline'), { deadlineMins: 15 });
    expect(msg.toLowerCase()).toContain('deadline');
    expect(msg).toContain('15');
  });

  it('maps router invocation reasons', () => {
    const wrap = (r: string) => ({ message: `Invocation failed: "${r}"` });
    expect(errorToUserMessage(wrap('AedexV2Router:INSUFFICIENT_A_AMOUNT'))).toContain('Amount too low');
    expect(errorToUserMessage(wrap('AedexV2Router:INSUFFICIENT_B_AMOUNT'))).toContain('Amount too low');
    expect(errorToUserMessage(wrap('AedexV2Router:INSUFFICIENT_OUTPUT_AMOUNT')).toLowerCase()).toContain('minimum output');
    expect(errorToUserMessage(wrap('AedexV2Router:EXPIRED')).toLowerCase()).toContain('deadline');
    expect(errorToUserMessage(wrap('AedexV2Router:INVALID_PATH')).toLowerCase()).toContain('invalid route');
    expect(errorToUserMessage(wrap('AedexV2Router:INVALID_TO')).toLowerCase()).toContain('invalid recipient');
    expect(errorToUserMessage(wrap('AedexV2Router:PAIR_EXISTS')).toLowerCase()).toContain('already exists');
  });

  it('fallbacks by action', () => {
    expect(errorToUserMessage(new Error('foo'), { action: 'quote' }).toLowerCase()).toContain('price quote');
    expect(errorToUserMessage(new Error('foo'), { action: 'swap' }).toLowerCase()).toContain('swap failed');
    expect(errorToUserMessage(new Error('foo'), { action: 'add-liquidity' }).toLowerCase()).toContain('adding liquidity failed');
    expect(errorToUserMessage(new Error('foo'), { action: 'remove-liquidity' }).toLowerCase()).toContain('removing liquidity failed');
  });
});


