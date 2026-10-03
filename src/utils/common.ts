import { Decimal } from '@/libs/decimal';
import moment, { Moment } from 'moment';
import { Encoded, Encoding, isAddressValid } from '@aeternity/aepp-sdk';
import { FormattedFractionalPrice } from './types';
import { DATE_LONG } from './constants';

export async function fetchJson<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T | null> {
  const response = await fetch(url, options);
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

/**
 * Formats a fractional price string into an object containing the number, zeros count,
 * significant digits, and a formatted value string.
 */
export function formatFractionalPrice(input: Decimal): FormattedFractionalPrice {
  if (!input || input.isZero) {
    return {
      number: '0.00',
    };
  }
  if (input.gte(Decimal.from('1'))) {
    return {
      number: input.prettify(2),
    };
  }
  if (input.gte(Decimal.from('0.0001'))) {
    return {
      number: input.prettify(6),
    };
  }
  // Tiny prices are written out in full (e.g. 0.00004111) with four significant
  // digits. The previous compressed-zeros notation ("0.0₄4111") read as noise to
  // anyone who has not seen it on a crypto exchange.
  const [, fractionalPart = ''] = input.toString(18).split('.');
  const nonZeroIndex = fractionalPart.search(/[1-9]/);
  if (nonZeroIndex < 0) {
    return {
      number: '0.00',
    };
  }
  const digits = fractionalPart.slice(0, nonZeroIndex + 4).replace(/0+$/, '');
  const value = `0.${digits}`;
  return {
    number: value,
    value,
  };
}

export function formatLongDate(value: string | Moment) {
  const date = moment(value);
  return date.isBefore(moment().subtract(1, 'days'))
    ? date.format(DATE_LONG)
    : date.fromNow();
}

export function ensureAddress<T extends Encoding>(
  value: string,
  encoding: T,
): asserts value is Encoded.Generic<T> {
  if (!isAddressValid(value, encoding)) {
    throw new Error(`value must be a ${encoding} address, got ${value}`);
  }
}

export function ensureString(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new Error(`value must be a string, got ${value}`);
}
export function formatVolume(volume: string | number): string {
  if (!volume) return '0';
  const num = typeof volume === 'string' ? parseFloat(volume) : volume;
  if (!Number.isFinite(num)) return '0';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}
