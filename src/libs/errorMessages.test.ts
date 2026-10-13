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
    expect(errorToUserMessage(wrap('AedexV2Router:INSUFFICIENT_A_AMOUNT'))).toContain('pool price moved');
    expect(errorToUserMessage(wrap('AedexV2Router:INSUFFICIENT_B_AMOUNT'))).toContain('pool price moved');
    expect(errorToUserMessage(wrap('AedexV2Router:INSUFFICIENT_OUTPUT_AMOUNT')).toLowerCase()).toContain('minimum output');
    expect(errorToUserMessage(wrap('AedexV2Router:EXPIRED')).toLowerCase()).toContain('deadline');
    expect(errorToUserMessage(wrap('AedexV2Router:INVALID_PATH')).toLowerCase()).toContain('invalid route');
    expect(errorToUserMessage(wrap('AedexV2Router:INVALID_TO')).toLowerCase()).toContain('invalid recipient');
    expect(errorToUserMessage(wrap('AedexV2Router:PAIR_EXISTS')).toLowerCase()).toContain('already exists');
  });

  it('maps DEX contract error codes to readable messages', () => {
    const wrap = (r: string) => ({ message: `Invocation failed: "${r}"` });
    expect(errorToUserMessage(wrap('AedexV2Library: IDENTICAL_ADDRESSES'), { action: 'swap' })).toContain('Both tokens are the same');
    expect(errorToUserMessage(wrap('AedexV2Pair: INSUFFICIENT_LIQUIDITY_MINTED'), { action: 'add-liquidity' })).toContain('too small to mint');
    expect(errorToUserMessage(wrap('AedexV2Router: INSUFFICIENT_B_AMOUNT'), { slippagePct: 1 })).toContain('1%');
    expect(errorToUserMessage(wrap('AedexV2Router: EXCESSIVE_INPUT_AMOUNT'), { slippagePct: 2 })).toContain('2%');
    expect(errorToUserMessage(wrap('AedexV2Router: EXPIRED'), { deadlineMins: 20 })).toContain('20');
    expect(errorToUserMessage(new Error('Invocation failed: WAE: LOW_BALANCE'))).toContain('Not enough balance');
    expect(errorToUserMessage(new Error('AedexV2Pair: BALANCE_ACCOUNT_NOT_EXISTENT'))).toContain('no liquidity in this pool');
  });

  it('fallbacks by action', () => {
    expect(errorToUserMessage(new Error('foo'), { action: 'quote' }).toLowerCase()).toContain('price quote');
    expect(errorToUserMessage(new Error('foo'), { action: 'swap' }).toLowerCase()).toContain('swap failed');
    expect(errorToUserMessage(new Error('foo'), { action: 'add-liquidity' }).toLowerCase()).toContain('adding liquidity failed');
    expect(errorToUserMessage(new Error('foo'), { action: 'remove-liquidity' }).toLowerCase()).toContain('removing liquidity failed');
  });
});
