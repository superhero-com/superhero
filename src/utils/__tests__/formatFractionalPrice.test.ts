import { describe, expect, it } from 'vitest';
import { Decimal } from '@/libs/decimal';
import { formatFractionalPrice } from '../common';

const format = (value: string) => formatFractionalPrice(Decimal.from(value));

describe('formatFractionalPrice', () => {
  it('writes tiny prices out in full instead of compressing the zeros', () => {
    expect(format('0.00004111')).toEqual({ number: '0.00004111', value: '0.00004111' });
    expect(format('0.000000204')).toMatchObject({ number: '0.000000204' });
    expect(format('0.000000004106')).toMatchObject({ number: '0.000000004106' });
  });

  it('keeps four significant digits and drops trailing zeros', () => {
    expect(format('0.0000123456789')).toMatchObject({ number: '0.00001234' });
    expect(format('0.00005')).toMatchObject({ number: '0.00005' });
  });

  it('leaves ordinary prices unchanged', () => {
    expect(format('0').number).toBe('0.00');
    expect(format('0.005956').number).toBe('0.005956');
    expect(format('12.5').number).toBe('12.50');
  });
});
