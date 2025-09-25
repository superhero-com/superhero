import { Decimal } from "@/libs/decimal";
import { FormattedFractionalPrice } from "./types";

export async function fetchJson<T = any>(
  url: string,
  options?: RequestInit
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
  const inputStr = input.prettify(18);
  const [, fractionalPart = ''] = inputStr.split('.');

  // Handle fractional parts
  const nonZeroIndex = fractionalPart.search(/[1-9]/);
  // if contain -e
  let zerosCount = 0;
  if (inputStr.includes('e')) {
    const [, exponent] = inputStr.split('e-');
    const exp = parseInt(exponent, 10);

    zerosCount = exp - 1;
  } else {
    zerosCount = nonZeroIndex;
  }

  const value = `0.0 (${zerosCount}) ${fractionalPart.substr(nonZeroIndex, 4)}`;
  return {
    number: '0.0',
    zerosCount,
    significantDigits: fractionalPart.substr(nonZeroIndex, 4),
    value,
  };
}
