import { describe, it, expect } from 'vitest';
import { errorToUserMessage } from '../errorMessages';

describe('Router reason mapping coverage', () => {
  const wrap = (r: string) => ({ message: `Invocation failed: "${r}"` });
  it('maps INVALID_PATH/TO and PAIR_EXISTS', () => {
    expect(errorToUserMessage(wrap('AedexV2Router:INVALID_PATH')).toLowerCase()).toContain('invalid route');
    expect(errorToUserMessage(wrap('AedexV2Router:INVALID_TO')).toLowerCase()).toContain('invalid recipient');
    expect(errorToUserMessage(wrap('AedexV2Router:PAIR_EXISTS')).toLowerCase()).toContain('already exists');
  });
});


